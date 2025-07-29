import { GraphQLClient } from "graphql-request";

// Admin client for schema management (server-side only)
export class HasuraAdminClient {
  private client: GraphQLClient;

  constructor() {
    const endpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
    const adminSecret = process.env.HASURA_ADMIN_SECRET;

    if (!endpoint) {
      throw new Error("Missing Hasura configuration in environment variables");
    }

    this.client = new GraphQLClient(endpoint, {
      headers: {
        // "x-hasura-admin-secret": adminSecret,
        "Content-Type": "application/json",
      },
    });
  }

  async request<T = any>(query: string, variables: any = {}): Promise<T> {
    try {
      return await this.client.request<T>(query, variables);
    } catch (error: any) {
      console.error("Hasura Admin Error:", error);
      throw new Error(`Admin operation failed: ${error.message}`);
    }
  }

  async query(options: any): Promise<any> {
    try {
      const queryString = options.query.loc?.source?.body || options.query;
      return await this.client.request(queryString, options.variables);
    } catch (error: any) {
      console.error("Hasura Admin Query Error:", error);
      throw error;
    }
  }

  async mutate(options: any): Promise<any> {
    try {
      const mutationString =
        options.mutation.loc?.source?.body || options.mutation;
      return await this.client.request(mutationString, options.variables);
    } catch (error: any) {
      console.error("Hasura Admin Mutation Error:", error);
      throw error;
    }
  }

  async transaction(
    callback: (client: HasuraAdminClient) => Promise<any>
  ): Promise<any> {
    // Hasura doesn't have explicit transactions for GraphQL
    // but multiple mutations in one request are atomic
    return await callback(this);
  }
}

// Server-side data operations client
export class ServerDataClient {
  async query(operationName: string, variables: any = {}): Promise<any> {
    const response = await fetch(`/api/graphql/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operationName,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server query failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async mutate(operationName: string, variables: any = {}): Promise<any> {
    const response = await fetch(`/api/graphql/mutate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operationName,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server mutation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async executeCustomQuery(query: string, variables: any = {}): Promise<any> {
    const response = await fetch(`/api/graphql/custom`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Custom query failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Server-side dynamic operations client
export class DynamicOperationsClient {
  private serverClient: ServerDataClient;
  private adminClient: HasuraAdminClient | null;
  private operationCache: Map<string, any> = new Map();

  constructor(serverClient: ServerDataClient, adminClient?: HasuraAdminClient) {
    this.serverClient = serverClient;
    this.adminClient = adminClient || null;
  }

  async executeOperation(
    operationName: string,
    variables: any = {},
    context: "user" | "admin" = "user"
  ): Promise<any> {
    if (context === "admin" && this.adminClient) {
      const operation = await this.getOperation(operationName);
      if (operation.type === "query") {
        return await this.adminClient.query({
          query: operation.query,
          variables,
        });
      } else if (operation.type === "mutation") {
        return await this.adminClient.mutate({
          mutation: operation.query,
          variables,
        });
      }
    } else {
      // All user operations go through server API
      const operation = await this.getOperation(operationName);
      if (operation.type === "query") {
        return await this.serverClient.query(operationName, variables);
      } else if (operation.type === "mutation") {
        return await this.serverClient.mutate(operationName, variables);
      }
    }
  }

  async getOperation(operationName: string): Promise<any> {
    if (this.operationCache.has(operationName)) {
      return this.operationCache.get(operationName);
    }

    const operation = await this.loadOperation(operationName);
    this.operationCache.set(operationName, operation);
    return operation;
  }

  async loadOperation(operationName: string): Promise<any> {
    return {
      type:
        operationName.includes("create") ||
        operationName.includes("update") ||
        operationName.includes("delete")
          ? "mutation"
          : "query",
      query: `# Generated operation for ${operationName}`,
    };
  }

  clearCache(): void {
    this.operationCache.clear();
  }
}

// Factory functions for creating clients
let hasuraAdminClient: HasuraAdminClient | null = null;
let serverDataClient: ServerDataClient | null = null;
let dynamicClient: DynamicOperationsClient | null = null;

export function getHasuraAdminClient(): HasuraAdminClient {
  if (!hasuraAdminClient) {
    hasuraAdminClient = new HasuraAdminClient();
  }
  return hasuraAdminClient;
}

export function getServerDataClient(): ServerDataClient {
  if (!serverDataClient) {
    serverDataClient = new ServerDataClient();
  }
  return serverDataClient;
}

export function getDynamicClient(): DynamicOperationsClient {
  if (!dynamicClient) {
    const serverClient = getServerDataClient();
    const adminClient =
      typeof window === "undefined" ? getHasuraAdminClient() : undefined;
    dynamicClient = new DynamicOperationsClient(serverClient, adminClient);
  }
  return dynamicClient;
}
