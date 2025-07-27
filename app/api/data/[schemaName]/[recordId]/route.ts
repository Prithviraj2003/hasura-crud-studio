import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";
import { SchemaManager } from "@/lib/schema/SchemaManager";
import { CacheManager } from "@/lib/schema/CacheManager";
import { CascadingDeleteService } from "@/lib/services/CascadingDeleteService";
import { gql } from "@apollo/client";

const cacheManager = new CacheManager(process.env.REDIS_URL);

// Helper function to build table name from schema name
function getTableName(schemaName: string): string {
  const snakeCase = schemaName
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, "");

  return snakeCase;
}

// Helper function to build GraphQL query for single record
function buildGetQuery(
  tableName: string,
  fields: any[],
  relationships: any[] = []
): string {
  const fieldSelections = fields.map((field) => field.name).join("\n    ");

  const relationshipSelections = relationships
    .map((rel) => {
      if (rel.type === "one-to-many") {
        return `
    ${rel.graphql_field} {
      id
      ${rel.ui_config?.display_field || "name"}
    }`;
      } else if (rel.type === "many-to-one") {
        return `
    ${rel.graphql_field} {
      id
      ${rel.ui_config?.display_field || "name"}
    }`;
      } else if (rel.type === "many-to-many") {
        return `
    ${rel.graphql_field} {
      id
      ${rel.ui_config?.display_field || "name"}
    }`;
      }
      return "";
    })
    .join("\n    ");

  return `
    query Get${tableName}ById($id: String!) {
      ${tableName}_by_pk(id: $id) {
        ${fieldSelections}
        ${relationshipSelections}
      }
    }
  `;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schemaName: string; recordId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { schemaName, recordId } = resolvedParams;

    const hasuraClient = getHasuraAdminClient();
    const schemaManager = new SchemaManager(hasuraClient, cacheManager);

    // Get schema definition
    const schema = await schemaManager.getSchema(schemaName);
    if (!schema) {
      return NextResponse.json({ error: "Schema not found" }, { status: 404 });
    }

    const tableName = getTableName(schemaName);
    const fields = schema.schema_definition.fields;
    const relationships = schema.relationships || [];

    try {
      const query = buildGetQuery(tableName, fields, relationships);

      const response = await hasuraClient.query({
        query: gql(query),
        variables: { id: recordId },
      });

      const record = response[`${tableName}_by_pk`];

      if (!record) {
        return NextResponse.json(
          { error: "Record not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(record);
    } catch (queryError: any) {
      console.error("GraphQL query error:", queryError);

      if (
        queryError.message.includes("table") ||
        queryError.message.includes("relation")
      ) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      }

      throw queryError;
    }
  } catch (error: any) {
    console.error("Data API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ schemaName: string; recordId: string }> }
) {
  try {
    const { data } = await request.json();
    const resolvedParams = await params;
    const { schemaName, recordId } = resolvedParams;

    const hasuraClient = getHasuraAdminClient();
    const schemaManager = new SchemaManager(hasuraClient, cacheManager);

    // Get schema definition
    const schema = await schemaManager.getSchema(schemaName);
    if (!schema) {
      return NextResponse.json({ error: "Schema not found" }, { status: 404 });
    }

    const tableName = getTableName(schemaName);

    // Filter update data to only include fields defined in the schema
    const updateData: any = {};
    const schemaFieldNames = new Set(
      schema.schema_definition.fields.map((field: any) => field.name)
    );

    // Only include fields that are defined in the schema and are not auto-generated/primary key/auto-update
    for (const [fieldName, fieldValue] of Object.entries(data)) {
      if (schemaFieldNames.has(fieldName)) {
        const field = schema.schema_definition.fields.find(
          (f: any) => f.name === fieldName
        );
        if (
          field &&
          !field.auto_generate &&
          !field.primary_key &&
          !field.auto_update
        ) {
          updateData[fieldName] = fieldValue;
        }
      }
    }

    console.log(
      `Filtered update data for ${schemaName}:`,
      Object.keys(updateData)
    );

    const mutation = gql`
      mutation Update${tableName}($id: String!, $_set: ${tableName}_set_input!) {
        update_${tableName}_by_pk(pk_columns: {id: $id}, _set: $_set) {
          id
        }
      }
    `;

    try {
      const response = await hasuraClient.mutate({
        mutation,
        variables: {
          id: recordId,
          _set: updateData,
        },
      });

      const updatedRecord = response[`update_${tableName}_by_pk`];

      if (!updatedRecord) {
        return NextResponse.json(
          { error: "Record not found or could not be updated" },
          { status: 404 }
        );
      }

      return NextResponse.json(updatedRecord);
    } catch (mutationError: any) {
      console.error("GraphQL mutation error:", mutationError);

      if (
        mutationError.message.includes("table") ||
        mutationError.message.includes("relation")
      ) {
        return NextResponse.json({ error: "Table not found" }, { status: 400 });
      }

      return NextResponse.json(
        { error: "Failed to update record", details: mutationError.message },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Data API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schemaName: string; recordId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { schemaName, recordId } = resolvedParams;

    // Check if cascading delete is requested
    const { searchParams } = new URL(request.url);
    const cascade = searchParams.get("cascade") === "true";

    const hasuraClient = getHasuraAdminClient();
    const schemaManager = new SchemaManager(hasuraClient, cacheManager);

    // Get schema definition
    const schema = await schemaManager.getSchema(schemaName);
    if (!schema) {
      return NextResponse.json({ error: "Schema not found" }, { status: 404 });
    }

    if (cascade) {
      // Use cascading delete service
      console.log(`Starting cascading delete for ${schemaName}:${recordId}`);

      const cascadingDeleteService = new CascadingDeleteService(hasuraClient);

      // Get all schemas for dependency analysis
      const allSchemas = await schemaManager.getAllSchemas();

      const result = await cascadingDeleteService.deleteWithCascade(
        schemaName,
        recordId,
        allSchemas
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          cascading: true,
          deletedRecords: result.deletedRecords,
          message: `Successfully deleted ${schemaName} and all dependent records`,
        });
      } else {
        return NextResponse.json(
          {
            error: "Cascading delete failed",
            details: result.errors,
            partialSuccess: Object.keys(result.deletedRecords).length > 0,
            deletedRecords: result.deletedRecords,
          },
          { status: 400 }
        );
      }
    } else {
      // Original simple delete logic
      const tableName = getTableName(schemaName);

      const mutation = gql`
        mutation Delete${tableName}($id: String!) {
          delete_${tableName}_by_pk(id: $id) {
            id
          }
        }
      `;

      try {
        const response = await hasuraClient.mutate({
          mutation,
          variables: { id: recordId },
        });

        const deletedRecord = response[`delete_${tableName}_by_pk`];

        if (!deletedRecord) {
          return NextResponse.json(
            { error: "Record not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true, id: deletedRecord.id });
      } catch (mutationError: any) {
        console.error("GraphQL mutation error:", mutationError);

        if (
          mutationError.message.includes("table") ||
          mutationError.message.includes("relation")
        ) {
          return NextResponse.json(
            { error: "Table not found" },
            { status: 400 }
          );
        }

        if (mutationError.message.includes("foreign key")) {
          return NextResponse.json(
            {
              error: "Cannot delete record: it is referenced by other records",
              suggestion:
                "Use cascade=true parameter to delete dependent records first",
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { error: "Failed to delete record", details: mutationError.message },
          { status: 400 }
        );
      }
    }
  } catch (error: any) {
    console.error("Data API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
