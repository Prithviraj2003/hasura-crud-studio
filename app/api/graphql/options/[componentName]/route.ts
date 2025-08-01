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
    const search = searchParams.get("search");

    const resolvedParams = await params;
    const componentName = resolvedParams.componentName;

    const adminClient = getHasuraAdminClient();

    let data = [];
    let queryExecuted = false;

    try {
      const titleField = await getOptionTitleField(componentName, adminClient);

      // Build where condition for search
      let whereCondition = "";
      const variables: any = {
        limit,
        orderBy: { [orderBy]: direction },
      };

      if (search) {
        // Add search condition
        whereCondition = `where: $where, `;
        variables.where = {
          [titleField]: { _ilike: `%${search}%` },
        };
      }

      const query = `
          query GetComponentOptions($limit: Int, $orderBy: ${componentName}_order_by!, ${
        search ? "$where: " + componentName + "_bool_exp!" : ""
      }) {
            ${componentName}(${whereCondition}limit: $limit, order_by: [$orderBy]) {
              id
              ${titleField}
            }
          }
        `;
      console.log("query", query);

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
