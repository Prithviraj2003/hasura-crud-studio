import { gql } from "@apollo/client";
import { CacheManager } from "./CacheManager";
import { GraphQLGenerator } from "./GraphQLGenerator";
import { Schema } from "./types";

export class SchemaManager {
  private hasuraClient: any;
  private cache: CacheManager;
  private generator: GraphQLGenerator;

  constructor(hasuraClient: any, cacheManager?: CacheManager) {
    this.hasuraClient = hasuraClient;
    this.cache =
      cacheManager || new CacheManager("", process.env.CACHE === "true");
    this.generator = new GraphQLGenerator();
  }

  async getSchema(
    name: string,
    version: string = "latest",
    includeRelated: boolean = false
  ): Promise<Schema | null> {
    const cacheKey = `schema:${name}:${version}`;

    // Check cache first
    let schema = await this.cache.get<Schema>(cacheKey);
    if (schema) return schema;

    // Fetch from database
    let query;
    let variables;

    if (version === "latest") {
      query = gql`
        query GetLatestSchema($name: String!) {
          cms_config_page_schemas(
            where: { name: { _eq: $name } }
            order_by: { version: desc }
            limit: 1
          ) {
            id
            name
            schema_type
            version
            schema_definition
            relationships
            ui_schema
            generated_operations
            description
            updated_at
          }
        }
      `;
      variables = { name };
    } else {
      query = gql`
        query GetSchemaByVersion($name: String!, $version: String!) {
          cms_config_page_schemas(
            where: { name: { _eq: $name }, version: { _eq: $version } }
            order_by: { version: desc }
            limit: 1
          ) {
            id
            name
            schema_type
            version
            schema_definition
            relationships
            ui_schema
            generated_operations
            description
            updated_at
          }
        }
      `;
      variables = { name, version };
    }

    try {
      const response = await this.hasuraClient.query({
        query,
        variables,
      });

      schema = response.cms_config_page_schemas?.[0] || null;

      const relatedSchemas: Record<string, Schema> = {};

      // Fetch all related component schemas
      if (schema?.relationships && includeRelated) {
        for (const relationship of schema.relationships) {
          const relatedSchema = await this.getSchema(
            relationship.target_component
          );
          if (relatedSchema) {
            relatedSchemas[relationship.target_component] = relatedSchema;

            // Recursively fetch nested relationships for the related schema
            if (relatedSchema.relationships) {
              for (const nestedRel of relatedSchema.relationships) {
                const nestedSchema = await this.getSchema(
                  nestedRel.target_component
                );
                if (
                  nestedSchema &&
                  !relatedSchemas[nestedRel.target_component]
                ) {
                  relatedSchemas[nestedRel.target_component] = nestedSchema;
                }
              }
            }
          }
        }
        schema.related_schemas = relatedSchemas;
      }
    } catch (error: any) {
      console.error("Error fetching schema from Hasura:", error.message);

      // If the table doesn't exist or connection fails, return null
      // This allows the application to continue working without the backend
      if (
        error.message.includes("unexpected variables") ||
        error.message.includes("table") ||
        error.message.includes("connection") ||
        error.message.includes("field 'page_schemas' not found")
      ) {
        console.warn(
          "Hasura connection issue or table not found - returning null schema"
        );
        return null;
      }

      throw error;
    }

    if (schema) {
      await this.cache.set(cacheKey, schema, 300); // 5 min cache
    }

    return schema;
  }

  async getSchemaWithRelated(
    name: string,
    version: string = "latest"
  ): Promise<{
    schema: Schema;
    relatedSchemas: Record<string, Schema>;
  } | null> {
    const schema = await this.getSchema(name, version);
    if (!schema) return null;

    const relatedSchemas: Record<string, Schema> = {};

    // Fetch all related component schemas
    if (schema.relationships) {
      for (const relationship of schema.relationships) {
        const relatedSchema = await this.getSchema(
          relationship.target_component
        );
        if (relatedSchema) {
          relatedSchemas[relationship.target_component] = relatedSchema;

          // Recursively fetch nested relationships for the related schema
          if (relatedSchema.relationships) {
            for (const nestedRel of relatedSchema.relationships) {
              const nestedSchema = await this.getSchema(
                nestedRel.target_component
              );
              if (nestedSchema && !relatedSchemas[nestedRel.target_component]) {
                relatedSchemas[nestedRel.target_component] = nestedSchema;
              }
            }
          }
        }
      }
    }

    return { schema, relatedSchemas };
  }

  async saveSchema(schemaData: Schema): Promise<Schema> {
    // Validate schema
    const validationResult = this.validateSchema(schemaData);
    if (!validationResult.valid) {
      throw new Error(
        `Schema validation failed: ${validationResult.errors.join(", ")}`
      );
    }

    // Generate GraphQL operations
    const operations = await this.generateOperations(schemaData);

    const mutation = gql`
      mutation SaveSchema($schema: page_schemas_insert_input!) {
        insert_page_schemas_one(
          object: $schema
          on_conflict: {
            constraint: page_schemas_name_version_key
            update_columns: [
              schema_definition
              relationships
              ui_schema
              generated_operations
              updated_at
            ]
          }
        ) {
          id
          name
          schema_type
          version
        }
      }
    `;

    const result = await this.hasuraClient.mutate({
      mutation,
      variables: { schema: schemaData },
    });

    // Invalidate cache
    await this.cache.invalidatePattern(`schema:${schemaData.name}:*`);

    return result.insert_page_schemas_one;
  }

  validateSchema(schema: Schema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!schema.name) errors.push("Schema name is required");
    if (!schema.type || !["component", "page"].includes(schema.type)) {
      errors.push('Schema type must be either "component" or "page"');
    }
    if (!schema.schema_definition) errors.push("Schema definition is required");

    // Field validation
    const fields = schema.schema_definition?.fields || [];
    if (fields.length === 0) errors.push("At least one field is required");

    const primaryKeys = fields.filter((f) => f.primary_key);
    if (primaryKeys.length !== 1)
      errors.push("Exactly one primary key field is required");

    // Check for duplicate field names
    const fieldNames = fields.map((f) => f.name);
    const duplicates = fieldNames.filter(
      (name, index) => fieldNames.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      errors.push(`Duplicate field names found: ${duplicates.join(", ")}`);
    }

    // Relationship validation
    if (schema.relationships) {
      for (const rel of schema.relationships) {
        if (!rel.name) errors.push(`Relationship missing name`);
        if (
          !rel.type ||
          ![
            "one-to-one",
            "one-to-many",
            "many-to-one",
            "many-to-many",
          ].includes(rel.type)
        ) {
          errors.push(`Invalid relationship type: ${rel.type}`);
        }
        if (!rel.target_component)
          errors.push(`Relationship ${rel.name} missing target_component`);

        // Validate relationship fields exist
        if (
          rel.source_field &&
          !fields.find((f) => f.name === rel.source_field)
        ) {
          errors.push(
            `Relationship ${rel.name} references non-existent field: ${rel.source_field}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async generateOperations(schema: Schema): Promise<any> {
    return this.generator.generateForSchema(schema);
  }

  async listSchemas(type?: "component" | "page"): Promise<Schema[]> {
    const query = gql`
      query ListSchemas${type ? `($type: String)` : ""} {
        cms_config_page_schemas(
          where: {
            is_active: {_eq: true}
            ${type ? ", schema_type: {_eq: $type}" : ""}
          }
          order_by: {name: asc}
        ) {
          id
          name
          schema_type
          version
          description
          updated_at
        }
      }
    `;

    const response = await this.hasuraClient.query({
      query,
      variables: { type },
    });

    return response?.cms_config_page_schemas || [];
  }

  async getAllSchemas(): Promise<Schema[]> {
    const query = gql`
      query GetAllSchemas {
        cms_config_page_schemas(
          where: { is_active: { _eq: true } }
          order_by: { name: asc }
        ) {
          id
          name
          schema_type
          version
          schema_definition
          relationships
          ui_schema
          generated_operations
          description
          updated_at
        }
      }
    `;

    try {
      const response = await this.hasuraClient.query({
        query,
        fetchPolicy: "network-only",
      });

      return response?.cms_config_page_schemas || [];
    } catch (error: any) {
      console.error("Error fetching all schemas:", error);
      return [];
    }
  }

  async deleteSchema(name: string, version?: string): Promise<void> {
    const mutation = gql`
      mutation DeleteSchema($name: String!, $version: String) {
        update_page_schemas(
          where: {
            name: {_eq: $name}
            ${version ? ", version: {_eq: $version}" : ""}
          },
          _set: {is_active: false}
        ) {
          affected_rows
        }
      }
    `;

    await this.hasuraClient.mutate({
      mutation,
      variables: { name, version },
    });

    await this.cache.invalidatePattern(`schema:${name}:*`);
  }

  async cloneSchema(
    sourceName: string,
    targetName: string,
    version: string = "1.0"
  ): Promise<Schema> {
    const sourceSchema = await this.getSchema(sourceName);
    if (!sourceSchema) {
      throw new Error(`Source schema not found: ${sourceName}`);
    }

    const clonedSchema: Schema = {
      ...sourceSchema,
      id: undefined,
      name: targetName,
      version,
      created_at: undefined,
      updated_at: undefined,
    };

    return this.saveSchema(clonedSchema);
  }

  async getSchemaHistory(name: string): Promise<any[]> {
    const query = gql`
      query GetSchemaHistory($name: String!) {
        schema_change_log(
          where: { schema: { name: { _eq: $name } } }
          order_by: { changed_at: desc }
        ) {
          id
          change_type
          old_definition
          new_definition
          changed_by
          changed_at
          reason
        }
      }
    `;

    const response = await this.hasuraClient.query({
      query,
      variables: { name },
    });

    return response?.schema_change_log || [];
  }
}
