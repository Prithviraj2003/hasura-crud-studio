import { GraphQLGenerator } from "@/lib/schema/GraphQLGenerator";
import { SchemaManager } from "@/lib/schema/SchemaManager";
import { CacheManager } from "@/lib/schema/CacheManager";
import { getHasuraAdminClient } from "@/lib/hasura/client";

export interface Operation {
  query: string;
  variables: string[];
  type: "query" | "mutation";
  schema?: string;
  description?: string;
}

export class OperationLoader {
  private schemaManager: SchemaManager;
  private graphqlGenerator: GraphQLGenerator;
  private cacheManager: CacheManager;
  private operationCache: Map<string, Operation> = new Map();

  constructor() {
    const hasuraClient = getHasuraAdminClient();
    this.cacheManager = new CacheManager();
    this.schemaManager = new SchemaManager(hasuraClient, this.cacheManager);
    this.graphqlGenerator = new GraphQLGenerator();
  }

  async loadOperation(operationName: string): Promise<Operation | null> {
    // Check memory cache first
    if (this.operationCache.has(operationName)) {
      return this.operationCache.get(operationName)!;
    }

    // Check Redis cache
    const cacheKey = `operation_def:${operationName}`;
    let operation = await this.cacheManager.get(cacheKey);

    if (operation) {
      this.operationCache.set(operationName, operation);
      return operation;
    }

    // Generate operation from schema
    operation = await this.generateOperation(operationName);

    if (operation) {
      // Cache for 1 hour
      await this.cacheManager.set(cacheKey, operation, 3600);
      this.operationCache.set(operationName, operation);
    }

    return operation;
  }

  private async generateOperation(
    operationName: string
  ): Promise<Operation | null> {
    try {
      // Parse operation name to extract schema and operation type
      const parsed = this.parseOperationName(operationName);
      if (!parsed) {
        return this.getStaticOperation(operationName);
      }

      const { schemaName, operationType, action } = parsed;

      // Get schema definition
      const schema = await this.schemaManager.getSchema(schemaName);
      if (!schema) {
        console.warn(`Schema not found: ${schemaName}`);
        return this.getStaticOperation(operationName);
      }

      // Generate GraphQL operations for the schema
      const generatedOps = this.graphqlGenerator.generateForSchema(schema);

      // Extract the specific operation
      const operation = this.extractOperation(
        generatedOps,
        operationType,
        action,
        schemaName
      );

      if (operation) {
        operation.schema = schemaName;
        operation.description = `Auto-generated ${operationType} for ${schemaName}`;
      }

      return operation;
    } catch (error) {
      console.error(`Failed to generate operation ${operationName}:`, error);
      return this.getStaticOperation(operationName);
    }
  }

  private parseOperationName(operationName: string): {
    schemaName: string;
    operationType: "query" | "mutation";
    action: string;
  } | null {
    // Parse patterns like:
    // - getVariants -> { schema: "variants", type: "query", action: "get" }
    // - listHealthProductVariants -> { schema: "health_product_variants", type: "query", action: "list" }
    // - createVariant -> { schema: "variants", type: "mutation", action: "create" }
    // - updateVariantWithRelations -> { schema: "variants", type: "mutation", action: "updateWithRelations" }

    const queryPatterns = [
      /^get([A-Z][a-zA-Z0-9_]*)(?:Options|Basic)?$/,
      /^list([A-Z][a-zA-Z0-9_]*)$/,
      /^search([A-Z][a-zA-Z0-9_]*)$/,
      /^find([A-Z][a-zA-Z0-9_]*)$/,
    ];

    const mutationPatterns = [
      /^create([A-Z][a-zA-Z0-9_]*)(WithRelations)?$/,
      /^update([A-Z][a-zA-Z0-9_]*)(WithRelations)?$/,
      /^delete([A-Z][a-zA-Z0-9_]*)(WithRelations)?$/,
      /^upsert([A-Z][a-zA-Z0-9_]*)(WithRelations)?$/,
    ];

    // Check query patterns
    for (const pattern of queryPatterns) {
      const match = operationName.match(pattern);
      if (match) {
        const action = operationName
          .replace(match[1], "")
          .replace(/^(get|list|search|find)/, "$1");
        return {
          schemaName: this.pascalToSnake(match[1]),
          operationType: "query",
          action: action || "get",
        };
      }
    }

    // Check mutation patterns
    for (const pattern of mutationPatterns) {
      const match = operationName.match(pattern);
      console.log("match", match);
      if (match) {
        const action = operationName
          .replace(match[1], "")
          .replace(/^(create|update|delete|upsert)/, "$1");
        return {
          schemaName: this.pascalToSnake(match[1]),
          operationType: "mutation",
          action: action || "create",
        };
      }
    }

    return null;
  }

  private extractOperation(
    generatedOps: any,
    operationType: "query" | "mutation",
    action: string,
    schemaName: string
  ): Operation | null {
    const operations =
      generatedOps[operationType === "query" ? "queries" : "mutations"];

    if (!operations) return null;

    // Map action to operation key
    const typeName = this.snakeToPascal(schemaName);
    let operationKey = "";

    if (operationType === "query") {
      switch (action) {
        case "get":
        case "getOptions":
        case "getBasic":
          operationKey = `get${typeName}`;
          break;
        case "list":
          operationKey = `list${typeName}s`;
          break;
        case "getWithRelations":
          operationKey = `get${typeName}WithRelations`;
          break;
        default:
          operationKey = `get${typeName}`;
      }
    } else {
      switch (action) {
        case "create":
          operationKey = `create${typeName}`;
          break;
        case "createWithRelations":
          operationKey = `create${typeName}WithRelations`;
          break;
        case "update":
          operationKey = `update${typeName}`;
          break;
        case "updateWithRelations":
          operationKey = `update${typeName}WithRelations`;
          break;
        case "delete":
          operationKey = `delete${typeName}`;
          break;
        default:
          operationKey = `create${typeName}`;
      }
    }

    const operation = operations[operationKey];
    if (!operation) return null;

    return {
      query:
        typeof operation.resolver === "string"
          ? operation.resolver
          : this.buildQueryFromOperation(operation, operationKey),
      variables: operation.args
        ? this.extractVariablesFromArgs(operation.args)
        : [],
      type: operationType,
    };
  }

  private buildQueryFromOperation(
    operation: any,
    operationKey: string
  ): string {
    // Build a basic GraphQL query/mutation from operation definition
    const operationType =
      operationKey.includes("create") ||
      operationKey.includes("update") ||
      operationKey.includes("delete")
        ? "mutation"
        : "query";
    const args = operation.args || "";
    const returnType = operation.type;

    if (operationType === "query") {
      return `
        query ${operationKey}${args ? `(${args})` : ""} {
          # This would be generated based on the schema
          # Placeholder for actual implementation
        }
      `;
    } else {
      return `
        mutation ${operationKey}${args ? `(${args})` : ""} {
          # This would be generated based on the schema
          # Placeholder for actual implementation
        }
      `;
    }
  }

  private extractVariablesFromArgs(args: string): string[] {
    // Extract variable names from GraphQL args string like "$id: ID!, $input: InputType!"
    const matches = args.match(/\$(\w+):/g);
    return matches ? matches.map((match) => match.slice(1, -1)) : [];
  }

  private getStaticOperation(operationName: string): Operation | null {
    // Fallback to static operation definitions
    const staticOperations: Record<string, Operation> = {
      // Schema operations
      listSchemas: {
        query: `
          query ListSchemas($limit: Int, $offset: Int, $where: page_schemas_bool_exp) {
            page_schemas(limit: $limit, offset: $offset, where: $where, order_by: {updated_at: desc}) {
              id
              name
              title
              type
              schema_definition
              created_at
              updated_at
            }
          }
        `,
        variables: ["limit", "offset", "where"],
        type: "query",
      },

      getSchema: {
        query: `
          query GetSchema($name: String!) {
            page_schemas(where: {name: {_eq: $name}}) {
              id
              name
              title
              type
              schema_definition
              relationships
              graphql_operations
              created_at
              updated_at
            }
          }
        `,
        variables: ["name"],
        type: "query",
      },

      createSchema: {
        query: `
          mutation CreateSchema($object: page_schemas_insert_input!) {
            insert_page_schemas_one(object: $object) {
              id
              name
              title
              type
              schema_definition
            }
          }
        `,
        variables: ["object"],
        type: "mutation",
      },
    };

    return staticOperations[operationName] || null;
  }

  private pascalToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter, index) => {
      return index === 0 ? letter.toLowerCase() : "_" + letter.toLowerCase();
    });
  }

  private snakeToPascal(str: string): string {
    return str.replace(/(^\w|_\w)/g, (match) =>
      match.replace("_", "").toUpperCase()
    );
  }

  async invalidateOperation(operationName: string): Promise<void> {
    this.operationCache.delete(operationName);
    await this.cacheManager.invalidate(`operation_def:${operationName}`);
  }

  async invalidateSchemaOperations(schemaName: string): Promise<void> {
    // Invalidate all operations related to a schema
    const pattern = `operation_def:*${schemaName}*`;
    await this.cacheManager.invalidatePattern(pattern);

    // Clear memory cache
    for (const [key] of this.operationCache) {
      if (key.toLowerCase().includes(schemaName.toLowerCase())) {
        this.operationCache.delete(key);
      }
    }
  }
}
