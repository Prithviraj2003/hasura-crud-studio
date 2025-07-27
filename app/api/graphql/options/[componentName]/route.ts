import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";

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

    console.log("Fetching options for component:", componentName);

    const adminClient = getHasuraAdminClient();

    let data = [];
    let queryExecuted = false;

    // Map component names to actual table names based on schema
    const componentToTableMap: Record<string, string> = {};

    // Try different query variations including mapped table names
    const queryVariations = [
      componentToTableMap[componentName] || componentName,
      componentName,
      componentName.toLowerCase(),
      `health_${componentName.toLowerCase()}`,
      `health_${componentName.toLowerCase()}s`,
    ];

    for (const tableName of queryVariations) {
      try {
        const query = `
          query GetComponentOptions($limit: Int, $orderBy: ${tableName}_order_by!) {
            ${tableName}(limit: $limit, order_by: [$orderBy]) {
              id
              ${getDisplayFields(tableName)}
            }
          }
        `;

        const variables = {
          limit,
          orderBy: { [orderBy]: direction },
        };

        console.log(`Trying query for table: ${tableName}`);
        console.log("Query:", query);

        const result = await adminClient.request(query, variables);
        data = result[tableName] || [];

        queryExecuted = true;
        break;
      } catch (error) {
        console.log(`Query failed for ${tableName}:`, (error as Error).message);
        continue;
      }
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

function getDisplayFields(componentName: string): string {
  // Map component names to table names for lookups
  const componentToTableMap: Record<string, string> = {
    product: "products",
    insurer: "insurers",
    compare_feature: "compare_features",
    health_feature_value: "health_feature_value",
    health_product_variants: "health_product_variants",
  };

  const tableName = componentToTableMap[componentName] || componentName;

  // Field mappings based on actual table names from schema
  const fieldMappings: Record<string, string[]> = {
    default: ["name", "title", "label"],
  };

  const fields =
    fieldMappings[tableName] ||
    fieldMappings[componentName] ||
    fieldMappings.default;

  // Process fields to handle dotted notation
  const processedFields = fields.map((field) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      return `${parent} {\n              ${child}\n            }`;
    }
    return field;
  });

  return processedFields.join("\n            ");
}
