import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";
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
        { error: `Operation ${operationName} not found` },
        { status: 404 }
      );
    }

    // Execute the query through Hasura admin client
    const result = await adminClient.request(operation.query, variables);

    return NextResponse.json({
      data: result,
      operationName,
    });
  } catch (error: any) {
    console.error("GraphQL Query Error:", error);
    return NextResponse.json(
      {
        error: "Query execution failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
