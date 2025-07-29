import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";
import { SchemaManager } from "@/lib/schema/SchemaManager";
import { CacheManager } from "@/lib/schema/CacheManager";
import { gql } from "@apollo/client";
import { IdGeneratorService } from "@/lib/services/IdGeneratorService";

const cacheManager = new CacheManager(
  process.env.REDIS_URL,
  process.env.CACHE === "true"
);

// Helper function to build table name from schema name
function getTableName(schemaName: string): string {
  // Convert camelCase or PascalCase to snake_case and pluralize
  const snakeCase = schemaName
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, "");

  // Simple pluralization - add 's' if doesn't end with 's'
  return snakeCase;
}

// Helper function to build GraphQL query for listing data
function buildListQuery(
  tableName: string,
  fields: any[],
  relationships: any[] = []
): string {
  const fieldSelections = fields
    .filter((field) => !field.ui_config?.hidden || field.name === "id")
    .map((field) => {
      if (field.name.includes(".")) {
        const [parent, child] = field.name.split(".");
        return `${parent} {\n      ${child}\n    }`;
      }
      return field.name;
    })
    .join("\n    ");

  const relationshipSelections = relationships
    .filter((rel) => rel.ui_config?.display_in_list)
    .map((rel) => {
      if (rel.type === "one-to-many") {
        return;
      }
      if (rel.ui_config?.display_field.includes(".")) {
        const [parent, child] = rel.ui_config?.display_field.split(".");
        return `${parent} {\n      ${child}\n    }`;
      }
      return `
    ${rel.graphql_field} {
      ${rel.ui_config?.display_field || "id"}
    }`;
    })
    .join("\n    ");

  return `
    query List${tableName}($limit: Int, $offset: Int, $where: ${tableName}_bool_exp, $order_by: [${tableName}_order_by!]) {
      ${tableName}(limit: $limit, offset: $offset, where: $where, order_by: $order_by) {
        ${fieldSelections}
        ${relationshipSelections}
      }
      ${tableName}_aggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schemaName: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search");
    const resolvedParams = await params;
    const schemaName = resolvedParams.schemaName;

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

    // Build query variables
    const limit = pageSize;
    const offset = (page - 1) * pageSize;
    let where: any = {};

    // Add search functionality
    if (search) {
      const searchableFields = fields.filter(
        (field) =>
          field.type === "text" &&
          (schema.ui_schema?.list_view?.searchable_columns?.includes(
            field.name
          ) ||
            ["name", "title", "description"].includes(field.name))
      );

      if (searchableFields.length > 0) {
        where._or = searchableFields.map((field) => ({
          [field.name]: { _ilike: `%${search}%` },
        }));
      }
    }

    // Default ordering
    let order_by: { [key: string]: string }[] = [{ created_at: "desc" }];
    if (schema.ui_schema?.list_view?.default_sort) {
      order_by = [
        {
          [schema.ui_schema.list_view.default_sort.field]:
            schema.ui_schema.list_view.default_sort.direction,
        },
      ];
    }

    try {
      //console.log("fields in get api", fields);
      // Build and execute the query
      const query = buildListQuery(tableName, fields, relationships);

      const response = await hasuraClient.query({
        query: gql(query),
        variables: { limit, offset, where, order_by },
      });

      const data = response[tableName] || [];
      const total = response[`${tableName}_aggregate`]?.aggregate?.count || 0;

      return NextResponse.json({
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (queryError: any) {
      console.error("GraphQL query error:", queryError);

      // If the table doesn't exist, return empty data
      if (
        queryError.message.includes("table") ||
        queryError.message.includes("relation")
      ) {
        return NextResponse.json({
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        });
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schemaName: string }> }
) {
  try {
    const { data } = await request.json();
    const resolvedParams = await params;
    const schemaName = resolvedParams.schemaName;

    const hasuraClient = getHasuraAdminClient();
    const schemaManager = new SchemaManager(hasuraClient, cacheManager);

    // Get schema definition
    const schema = await schemaManager.getSchema(schemaName);
    if (!schema) {
      return NextResponse.json({ error: "Schema not found" }, { status: 404 });
    }

    const tableName = getTableName(schemaName);

    // Build insert mutation
    const mutation = gql`
      mutation Insert${tableName}($object: ${tableName}_insert_input!) {
        insert_${tableName}_one(object: $object) {
          id
        }
      }
    `;

    if (!data.id) {
      const id = await IdGeneratorService.generateId();
      data.id = id;
    }

    try {
      const response = await hasuraClient.mutate({
        mutation,
        variables: { object: data },
      });

      return NextResponse.json(response[`insert_${tableName}_one`], {
        status: 201,
      });
    } catch (mutationError: any) {
      console.error("GraphQL mutation error:", mutationError);

      if (
        mutationError.message.includes("table") ||
        mutationError.message.includes("relation")
      ) {
        return NextResponse.json(
          {
            error: "Table not found. Please ensure the database table exists.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create record", details: mutationError.message },
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
