import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";

export async function POST(request: NextRequest) {
  try {
    const { query, variables } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "GraphQL query is required" },
        { status: 400 }
      );
    }

    // Validate query for security (basic validation)
    if (!isQuerySafe(query)) {
      return NextResponse.json(
        { error: "Query contains potentially unsafe operations" },
        { status: 400 }
      );
    }

    const adminClient = getHasuraAdminClient();

    // Execute the custom query through Hasura admin client
    const result = await adminClient.request(query, variables || {});

    return NextResponse.json({
      data: result,
    });

  } catch (error: any) {
    console.error("Custom GraphQL Error:", error);
    return NextResponse.json(
      { 
        error: "Query execution failed",
        message: error.message 
      },
      { status: 500 }
    );
  }
}

function isQuerySafe(query: string): boolean {
  // Basic security validation
  const lowerQuery = query.toLowerCase();
  
  // Block potentially dangerous operations
  const dangerousPatterns = [
    'drop',
    'delete.*where.*true',
    'update.*where.*true',
    '__schema',
    '__type',
    'introspection'
  ];

  for (const pattern of dangerousPatterns) {
    if (new RegExp(pattern).test(lowerQuery)) {
      return false;
    }
  }

  // Only allow SELECT-like operations and safe mutations
  const allowedOperations = [
    'query',
    'mutation.*insert',
    'mutation.*update.*by_pk',
    'mutation.*delete.*by_pk'
  ];

  const hasAllowedOperation = allowedOperations.some(pattern => 
    new RegExp(pattern).test(lowerQuery)
  );

  return hasAllowedOperation;
}