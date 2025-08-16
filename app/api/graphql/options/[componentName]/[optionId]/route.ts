import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ componentName: string; optionId: string }> }
) {
  try {
    const resolvedParams = await params;
    const componentName = resolvedParams.componentName;
    const optionId = resolvedParams.optionId;
    const { searchParams } = new URL(request.url);
    const labelField = searchParams.get("labelField") || "name";
    const valueField = searchParams.get("valueField") || "id";

    const adminClient = getHasuraAdminClient();

    let data = null;
    let queryExecuted = false;

    try {
      const query = `
          query GetSingleOption($id: String!) {
            ${componentName}_by_pk(id: $id) {
              ${valueField}
              ${labelField}
            }
          }
        `;

      const variables = {
        [valueField]: optionId,
      };

      const result = await adminClient.request(query, variables);
      data = result[`${componentName}_by_pk`];

      queryExecuted = true;
    } catch (error) {
      console.error(`Query failed for ${componentName}:`, error);
    }

    if (!queryExecuted) {
      throw new Error(`No valid table found for component: ${componentName}`);
    }

    return NextResponse.json({
      data: {
        value: data[valueField],
        label: data[labelField],
      },
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
