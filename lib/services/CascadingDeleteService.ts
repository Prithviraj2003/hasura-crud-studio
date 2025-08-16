import { gql } from "@apollo/client";
import { Relationship, Schema } from "../schema/types";

interface DeleteOrder {
  schemaName: string;
  tableName: string;
  recordIds: string[];
  dependsOn: string[]; // Schema names this depends on
}

interface DeleteResult {
  success: boolean;
  deletedRecords: { [schemaName: string]: string[] };
  errors: string[];
}

export class CascadingDeleteService {
  private hasuraClient: any;

  constructor(hasuraClient: any) {
    this.hasuraClient = hasuraClient;
  }

  /**
   * Deletes a record and all its dependent records in the correct order
   * @param primarySchemaName The main schema to delete
   * @param primaryRecordId The ID of the main record to delete
   * @param allSchemas All available schemas to determine relationships
   */
  async deleteWithCascade(
    primarySchemaName: string,
    primaryRecordId: string,
    allSchemas: any[]
  ): Promise<DeleteResult> {
    try {
      console.log(
        `Starting cascading delete for ${primarySchemaName}:${primaryRecordId}`
      );

      // Find the primary schema
      const primarySchema = allSchemas.find(
        (s) => s.name === primarySchemaName
      );
      if (!primarySchema) {
        throw new Error(`Schema ${primarySchemaName} not found`);
      }

      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(allSchemas);
      console.log("Dependency graph:", dependencyGraph);

      // Find all dependent records
      const dependentRecords = await this.findDependentRecords(
        primarySchemaName,
        primaryRecordId,
        allSchemas,
        dependencyGraph
      );
      console.log("Dependent records:", dependentRecords);

      // Order deletions (dependents first, then parent)
      const deleteOrder = this.orderDeletions(
        dependentRecords,
        dependencyGraph
      );
      console.log("Delete order:", deleteOrder);

      // Execute deletions in order
      const result = await this.executeDeletions(deleteOrder);

      console.log("Cascading delete completed:", result);
      return result;
    } catch (error: any) {
      console.error("Cascading delete failed:", error);
      return {
        success: false,
        deletedRecords: {},
        errors: [error.message],
      };
    }
  }

  /**
   * Builds a graph of schema dependencies based on relationships
   * For deletion order: dependencies = schemas that must be deleted BEFORE this schema
   */
  private buildDependencyGraph(allSchemas: any[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    // Initialize all schemas with empty dependencies
    for (const schema of allSchemas) {
      graph.set(schema.name, []);
    }

    for (const schema of allSchemas) {
      if (schema.relationships) {
        for (const rel of schema.relationships) {
          if (rel.type === "one-to-many") {
            // In one-to-many: parent has children
            // Children (target_component) must be deleted BEFORE parent (current schema)
            // So parent depends on children being deleted first
            const parentDeps = graph.get(schema.name) || [];
            if (!parentDeps.includes(rel.target_component)) {
              parentDeps.push(rel.target_component);
            }
            graph.set(schema.name, parentDeps);
          }
          // Skip many-to-one as it's the reverse of one-to-many and would create duplicates
        }
      }
    }

    return graph;
  }

  /**
   * Finds all records that depend on the primary record
   */
  private async findDependentRecords(
    primarySchemaName: string,
    primaryRecordId: string,
    allSchemas: any[],
    dependencyGraph: Map<string, string[]>
  ): Promise<Map<string, string[]>> {
    const dependentRecords = new Map<string, string[]>();
    const visited = new Set<string>();

    // Start with the primary record
    dependentRecords.set(primarySchemaName, [primaryRecordId]);

    // Find all dependent records starting from the primary
    await this.findDependentsRecursive(
      primarySchemaName,
      [primaryRecordId],
      allSchemas,
      dependentRecords,
      visited
    );

    return dependentRecords;
  }

  /**
   * Recursively finds dependent records
   */
  private async findDependentsRecursive(
    schemaName: string,
    recordIds: string[],
    allSchemas: any[],
    dependentRecords: Map<string, string[]>,
    visited: Set<string>
  ): Promise<void> {
    const key = `${schemaName}:${recordIds.join(",")}`;
    if (visited.has(key)) return;
    visited.add(key);

    const schema = allSchemas.find((s) => s.name === schemaName);
    if (!schema) return;

    // Find all schemas that reference this schema (children that depend on this parent)
    for (const otherSchema of allSchemas) {
      if (otherSchema.name === schemaName) continue; // Skip self

      if (otherSchema.relationships) {
        for (const relationship of otherSchema.relationships) {
          // Look for many-to-one relationships where this schema is the target
          if (
            relationship.type === "many-to-one" &&
            relationship.target_component === schemaName
          ) {
            console.log("many-to-one relationship", relationship);
            const childSchemaName = otherSchema.name;

            // Query for child records that reference this parent
            try {
              const childRecordIds = await this.queryDependentRecords(
                otherSchema,
                relationship,
                recordIds
              );

              if (childRecordIds.length > 0) {
                console.log(
                  `Found ${childRecordIds.length} ${childSchemaName} records dependent on ${schemaName}`
                );

                // Add to dependent records
                const existing = dependentRecords.get(childSchemaName) || [];
                const combined = [...new Set([...existing, ...childRecordIds])];
                dependentRecords.set(childSchemaName, combined);

                // Recursively find dependents of these child records
                await this.findDependentsRecursive(
                  childSchemaName,
                  childRecordIds,
                  allSchemas,
                  dependentRecords,
                  visited
                );
              }
            } catch (error) {
              console.error(
                `Error finding dependents for ${childSchemaName}:`,
                error
              );
            }
          }
        }
      }
    }
  }

  /**
   * Queries the database to find dependent records
   */
  private async queryDependentRecords(
    dependentSchema: Schema,
    relationship: Relationship,
    parentRecordIds: string[]
  ): Promise<string[]> {
    const tableName = this.getTableName(dependentSchema);
    // For many-to-one relationships, the foreign key is the source_field in the child schema
    const foreignKeyField = relationship.source_field;

    console.log(
      `Querying ${tableName} for records where ${foreignKeyField} in [${parentRecordIds.join(
        ", "
      )}]`
    );

    const query = gql`
      query FindDependentRecords($parentIds: [String!]!) {
        ${tableName}(where: {${foreignKeyField}: {_in: $parentIds}}) {
          id
        }
      }
    `;

    try {
      const response = await this.hasuraClient.query({
        query,
        variables: { parentIds: parentRecordIds },
        fetchPolicy: "network-only",
      });

      const records = response[tableName] || [];
      console.log(`Found ${records.length} dependent records in ${tableName}`);
      return records.map((record: any) => record.id);
    } catch (error) {
      console.error(
        `Error querying dependent records for ${tableName}:`,
        error
      );
      return [];
    }
  }

  /**
   * Orders deletions so dependencies are deleted before their parents
   */
  private orderDeletions(
    dependentRecords: Map<string, string[]>,
    dependencyGraph: Map<string, string[]>
  ): DeleteOrder[] {
    const ordered: DeleteOrder[] = [];
    const schemasWithRecords = Array.from(dependentRecords.keys());

    // Simple approach: children first (no dependencies), then parents
    const childSchemas = schemasWithRecords.filter((schema) => {
      const deps = dependencyGraph.get(schema) || [];
      return deps.length === 0; // No dependencies = child/leaf node
    });

    const parentSchemas = schemasWithRecords.filter((schema) => {
      const deps = dependencyGraph.get(schema) || [];
      return deps.length > 0; // Has dependencies = parent node
    });

    // Add children first (they have no dependencies)
    for (const schemaName of childSchemas) {
      const recordIds = dependentRecords.get(schemaName);
      if (recordIds && recordIds.length > 0) {
        ordered.push({
          schemaName,
          tableName: this.getTableName(schemaName),
          recordIds,
          dependsOn: [],
        });
      }
    }

    // Add parents after children (they depend on children being deleted first)
    for (const schemaName of parentSchemas) {
      const recordIds = dependentRecords.get(schemaName);
      if (recordIds && recordIds.length > 0) {
        ordered.push({
          schemaName,
          tableName: this.getTableName(schemaName),
          recordIds,
          dependsOn: dependencyGraph.get(schemaName) || [],
        });
      }
    }

    return ordered;
  }

  /**
   * Performs topological sort on the dependency graph
   */
  private topologicalSort(dependencyGraph: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const sorted: string[] = [];

    const visit = (node: string) => {
      if (visiting.has(node)) {
        throw new Error(`Circular dependency detected involving ${node}`);
      }
      if (visited.has(node)) return;

      visiting.add(node);
      const dependencies = dependencyGraph.get(node) || [];

      for (const dep of dependencies) {
        visit(dep);
      }

      visiting.delete(node);
      visited.add(node);
      sorted.push(node);
    };

    for (const node of dependencyGraph.keys()) {
      if (!visited.has(node)) {
        visit(node);
      }
    }

    return sorted;
  }

  /**
   * Executes the deletions in order
   */
  private async executeDeletions(
    deleteOrder: DeleteOrder[]
  ): Promise<DeleteResult> {
    const result: DeleteResult = {
      success: true,
      deletedRecords: {},
      errors: [],
    };

    for (const order of deleteOrder) {
      try {
        console.log(
          `Deleting ${order.recordIds.length} records from ${order.tableName}`
        );

        // Delete records in batches
        const deletedIds = await this.deleteRecords(
          order.tableName,
          order.recordIds
        );
        result.deletedRecords[order.schemaName] = deletedIds;

        console.log(
          `Successfully deleted ${deletedIds.length} records from ${order.tableName}`
        );
      } catch (error: any) {
        console.error(
          `Failed to delete records from ${order.tableName}:`,
          error
        );
        result.success = false;
        result.errors.push(
          `Failed to delete from ${order.tableName}: ${error.message}`
        );
        break; // Stop on first error to prevent orphaned records
      }
    }

    return result;
  }

  /**
   * Deletes multiple records from a table
   */
  private async deleteRecords(
    tableName: string,
    recordIds: string[]
  ): Promise<string[]> {
    // Delete in batches to avoid query size limits
    const batchSize = 50;
    const deletedIds: string[] = [];

    for (let i = 0; i < recordIds.length; i += batchSize) {
      const batch = recordIds.slice(i, i + batchSize);

      const mutation = gql`
        mutation DeleteRecords($ids: [String!]!) {
          delete_${tableName}(where: {id: {_in: $ids}}) {
            affected_rows
            returning {
              id
            }
          }
        }
      `;

      try {
        const response = await this.hasuraClient.mutate({
          mutation,
          variables: { ids: batch },
        });

        const deleted = response[`delete_${tableName}`];
        if (deleted?.returning) {
          deletedIds.push(...deleted.returning.map((r: any) => r.id));
        }
      } catch (error) {
        console.error(`Error deleting batch from ${tableName}:`, error);
        throw error;
      }
    }

    return deletedIds;
  }

  /**
   * Helper to get table name from schema
   */
  private getTableName(schema: Schema | string): string {
    if (typeof schema === "string") {
      const snakeCase = schema
        .replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`)
        .replace(/^_/, "");

      return snakeCase.endsWith("s") ? snakeCase : `${snakeCase}s`;
    }

    if (schema.schema_definition?.table?.name) {
      return schema.schema_definition.table.name;
    }

    throw new Error("Invalid schema");
  }
}
