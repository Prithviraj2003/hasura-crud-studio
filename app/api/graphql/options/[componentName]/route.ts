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
    const labelField = searchParams.get("labelField") || "name";
    const valueField = searchParams.get("valueField") || "id";

    const resolvedParams = await params;
    const componentName = resolvedParams.componentName;

    const adminClient = getHasuraAdminClient();

    let data = [];
    let queryExecuted = false;

    try {
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
          [labelField]: { _ilike: `%${search}%` },
        };
      }

      const query = `
          query GetComponentOptions($limit: Int, $orderBy: ${componentName}_order_by!, ${
        search ? "$where: " + componentName + "_bool_exp!" : ""
      }) {
            ${componentName}(${whereCondition}limit: $limit, order_by: [$orderBy]) {
              ${valueField}
              ${labelField}
            }
          }
        `;
      console.log("query", query);

      const result = await adminClient.request(query, variables);
      data = result[componentName] || [];

      queryExecuted = true;
    } catch (error) {
      console.error(`Query failed for ${componentName}:`, error);
    }

    if (!queryExecuted) {
      throw new Error(`No valid table found for component: ${componentName}`);
    }

    return NextResponse.json({
      data: data.map((item: { [key: string]: string }) => ({
        value: item[valueField],
        label: item[labelField],
      })),
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
