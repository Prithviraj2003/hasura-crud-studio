import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient, HasuraAdminClient } from "@/lib/hasura/client";
import { SchemaManager } from "@/lib/schema/SchemaManager";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ componentName: string; optionId: string }> }
) {
  try {
    const resolvedParams = await params;
    const componentName = resolvedParams.componentName;
    const optionId = resolvedParams.optionId;

    const adminClient = getHasuraAdminClient();

    let data = null;
    let queryExecuted = false;

    try {
      const query = `
          query GetSingleOption($id: String!) {
            ${componentName}_by_pk(id: $id) {
              id
              ${await getOptionTitleField(componentName, adminClient)}
            }
          }
        `;

      const variables = {
        id: optionId,
      };

      const result = await adminClient.request(query, variables);
      data = result[`${componentName}_by_pk`];

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
      optionId,
    });
  } catch (error: any) {
    console.error("Single Option API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch option",
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