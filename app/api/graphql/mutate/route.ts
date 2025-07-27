import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";
import { CacheManager } from "@/lib/schema/CacheManager";
import { OperationLoader } from "@/lib/graphql/OperationLoader";

export async function POST(request: NextRequest) {
  try {
    const { operationName, variables } = await request.json();

    if (!operationName) {
      return NextResponse.json(
        { error: "Operation name is required" },
        { status: 400 }
      );
    }

    const adminClient = getHasuraAdminClient();
    const operationLoader = new OperationLoader();

    // Load operation from schema cache or generate it
    const operation = await operationLoader.loadOperation(operationName);

    if (!operation) {
      return NextResponse.json(
        { error: `Mutation ${operationName} not found` },
        { status: 404 }
      );
    }

    // Execute the mutation through Hasura admin client
    const result = await adminClient.request(operation.query, variables);

    // Invalidate related caches after mutation
    await invalidateRelatedCaches(operationName, operationLoader);

    return NextResponse.json({
      data: result,
      operationName,
    });
  } catch (error: any) {
    console.error("GraphQL Mutation Error:", error);
    return NextResponse.json(
      {
        error: "Mutation execution failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

async function invalidateRelatedCaches(
  operationName: string,
  operationLoader: OperationLoader
) {
  // Invalidate caches based on operation type
  const schemaPatterns: Record<string, string[]> = {
    createSchema: ["page_schemas"],
    updateSchema: ["page_schemas"],
  };

  const schemas = schemaPatterns[operationName] || [];
  for (const schema of schemas) {
    await operationLoader.invalidateSchemaOperations(schema);
  }

  // Also invalidate the specific operation
  await operationLoader.invalidateOperation(operationName);
}
