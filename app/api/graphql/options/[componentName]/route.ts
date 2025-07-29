import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient, HasuraAdminClient } from "@/lib/hasura/client";
import { SchemaManager } from "@/lib/schema/SchemaManager";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ componentName: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const orderBy = searchParams.get("orderBy") || "name";
    const direction = searchParams.get("direction") || "asc";

    const resolvedParams = await params;
    const componentName = resolvedParams.componentName;

    const adminClient = getHasuraAdminClient();

    let data = [];
    let queryExecuted = false;

    try {
      const query = `
          query GetComponentOptions($limit: Int, $orderBy: ${componentName}_order_by!) {
            ${componentName}(limit: $limit, order_by: [$orderBy]) {
              id
              ${await getOptionTitleField(componentName, adminClient)}
            }
          }
        `;

      const variables = {
        limit,
        orderBy: { [orderBy]: direction },
      };

      const result = await adminClient.request(query, variables);
      data = result[componentName] || [];

      queryExecuted = true;
    } catch (error) {
      console.log(
        `Query failed for ${componentName}:`,
        (error as Error).message
      );
    }

    if (!queryExecuted) {
      throw new Error(`No valid table found for component: ${componentName}`);
    }

    return NextResponse.json({
      data,
      componentName,
      count: data.length,
    });
  } catch (error: any) {
    console.error("Options API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch options",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

async function getOptionTitleField(
  componentName: string,
  adminClient: HasuraAdminClient
): Promise<string> {
  const schemaManager = new SchemaManager(adminClient);
  const schema = await schemaManager.getSchema(componentName);

  const field = schema?.schema_definition.fields.find(
    (field) => field.is_option_title
  );

  return field?.name || "name";
}
