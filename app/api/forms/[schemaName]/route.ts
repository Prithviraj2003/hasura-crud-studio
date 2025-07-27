import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient, getDynamicClient } from "@/lib/hasura/client";
import { SchemaManager } from "@/lib/schema/SchemaManager";
import { FormGenerator } from "@/lib/schema/FormGenerator";
import { CacheManager } from "@/lib/schema/CacheManager";
import { IdGeneratorService } from "@/lib/services/IdGeneratorService";

const cacheManager = new CacheManager(process.env.REDIS_URL);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schemaName: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get("entityId");
    const parentId = searchParams.get("parentId");

    const hasuraClient = getHasuraAdminClient();
    const schemaManager = new SchemaManager(hasuraClient, cacheManager);
    const generator = new FormGenerator(schemaManager);

    const resolvedParams = await params;

    // Prepare context data for auto-population
    const contextData = parentId ? { parentId } : undefined;

    const formConfig = await generator.generateFormConfig(
      resolvedParams.schemaName,
      entityId || undefined,
      contextData
    );

    return NextResponse.json(formConfig);
  } catch (error: any) {
    console.error("Form API error:", error);
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
    const { data, entityId } = await request.json();

    const hasuraClient = getHasuraAdminClient();
    const schemaManager = new SchemaManager(hasuraClient, cacheManager);
    const dynamicClient = getDynamicClient();

    const resolvedParams = await params;
    const schema = await schemaManager.getSchema(resolvedParams.schemaName);
    if (!schema) {
      return NextResponse.json({ error: "Schema not found" }, { status: 404 });
    }

    let result;

    if (schema.relationships && schema.relationships.length > 0) {
      // Use relationship-aware mutation
      const operationName = entityId
        ? `update${pascalCase(schema.name)}WithRelations`
        : `create${pascalCase(schema.name)}WithRelations`;

      result = await executeComplexMutation(
        hasuraClient,
        schema,
        data,
        entityId
      );
    } else {
      // Use standard mutation
      const tableName = getTableName(schema);

      if (entityId) {
        // Update
        const primaryKey = schema.schema_definition.fields.find(
          (f) => f.primary_key
        );
        if (!primaryKey) throw new Error("No primary key found");

        // Filter data to only include schema-defined fields
        const filteredData = filterDataForSchema(data, schema);

        const mutation = `
          mutation UpdateEntity($id: String!, $data: ${tableName}_set_input!) {
            update_${tableName}_by_pk(
              pk_columns: {${primaryKey.name}: $id},
              _set: $data
            ) {
              ${primaryKey.name}
            }
          }
        `;

        const response = await hasuraClient.request(mutation, {
          id: entityId,
          data: filteredData,
        });

        result = response[`update_${tableName}_by_pk`];
      } else {
        // Create
        // Filter data to only include schema-defined fields
        console.log("data", data);
        const filteredData = filterDataForSchema(data, schema);
        console.log("filteredData", filteredData);

        const mutation = `
          mutation CreateEntity($data: ${tableName}_insert_input!) {
            insert_${tableName}_one(object: $data) {
              id
            }
          }
        `;

        const response = await hasuraClient.request(mutation, {
          data: filteredData,
        });

        console.log("mutation response", filteredData, mutation);

        result = response[`insert_${tableName}_one`];
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Form submission error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

async function executeComplexMutation(
  hasuraClient: any,
  schema: any,
  data: any,
  entityId?: string
) {
  // This is a simplified version - in production, you would need to
  // handle the complex relationships properly
  const tableName = getTableName(schema);

  // Debug: Log the incoming data structure
  console.log(
    "executeComplexMutation received data:",
    JSON.stringify(data, null, 2)
  );
  console.log(
    "schema fields:",
    schema.schema_definition.fields.map((f: any) => f.name)
  );
  console.log(
    "schema relationships:",
    schema.relationships?.map((r: any) => r.name) || []
  );

  // Extract main entity data and relationship data
  const mainData: any = {};
  const relationshipData: any = {};

  // First, identify all relationship names to exclude them from main data
  const relationshipNames = new Set(
    (schema.relationships || []).map((rel: any) => rel.name)
  );

  // Extract main entity data (only fields that are NOT relationships)
  for (const field of schema.schema_definition.fields) {
    if (data[field.name] !== undefined && !relationshipNames.has(field.name)) {
      // Only include if it's not a relationship field
      mainData[field.name] = data[field.name];
    }
  }

  // Extract relationship data
  for (const rel of schema.relationships || []) {
    console.log("rel", rel);
    if (data[rel.name] !== undefined) {
      relationshipData[rel.source_field] = data[rel.name];
    }
    if (rel.type === "many-to-one") {
      mainData[rel.source_field] = data[rel.name] || data[rel.source_field];
    }
  }

  console.log(
    "Separated relationshipData:",
    JSON.stringify(relationshipData, null, 2)
  );

  // Start transaction-like operation
  const results: any = {};

  if (entityId) {
    // Update main entity
    const primaryKey = schema.schema_definition.fields.find(
      (f: any) => f.primary_key
    );
    const updateMutation = `
      mutation UpdateEntity($id: String!, $data: ${tableName}_set_input!) {
        update_${tableName}_by_pk(
          pk_columns: {${primaryKey.name}: $id},
          _set: $data
        ) {
          ${primaryKey.name}
        }
      }
    `;

    const response = await hasuraClient.request(updateMutation, {
      id: entityId,
      data: mainData,
    });

    results.main = response[`update_${tableName}_by_pk`];

    // Handle relationship updates
    // This is simplified - real implementation would handle each relationship type
  } else {
    // Create main entity
    const createMutation = `
      mutation CreateEntity($data: ${tableName}_insert_input!) {
        insert_${tableName}_one(object: $data) {
          id
        }
      }
    `;

    mainData.id = await IdGeneratorService.generateId();

    const response = await hasuraClient.request(createMutation, {
      data: mainData,
    });

    results.main = response[`insert_${tableName}_one`];
    const parentId = results.main.id;

    // Handle relationship creation
    for (const relName in relationshipData) {
      const rel = schema.relationships.find((r: any) => r.name === relName);
      if (
        rel &&
        rel.type === "one-to-many" &&
        Array.isArray(relationshipData[relName])
      ) {
        await createRelationshipItems(
          hasuraClient,
          rel,
          relationshipData[relName],
          parentId
        );
      }
    }
  }

  return results.main;
}

async function createRelationshipItems(
  hasuraClient: any,
  relationship: any,
  items: any[],
  parentId: string
) {
  if (!items || items.length === 0) return;

  const targetTableName = getTableName(relationship.target_component);

  // Prepare items with parent reference
  const itemsToInsert = items.map((item: any) => {
    const processedItem = { ...item };

    // Set the foreign key based on relationship configuration
    // For one-to-many relationships, we need to set the target_field in the child
    if (relationship.target_field) {
      processedItem[relationship.target_field] = parentId;
    } else {
      // Try common patterns based on the parent component name
      const possibleKeys = [
        `${relationship.name.split("_")[0]}_id`,
        "parent_id",
        "reference_id",
      ];

      // Use the first key that matches the _parentIdField
      for (const key of possibleKeys) {
        if (processedItem._parentIdField === key) {
          processedItem[key] = parentId;
          break;
        }
      }
    }

    // Remove tracking fields after processing
    delete processedItem._parentIdField;

    console.log("Processed item for mutation:", processedItem);
    console.log("=== End processing item ===");

    return processedItem;
  });

  // Create mutation for bulk insert
  const insertMutation = `
    mutation InsertRelationshipItems($items: [${targetTableName}_insert_input!]!) {
      insert_${targetTableName}(objects: $items) {
        affected_rows
        returning {
          id
        }
      }
    }
  `;

  try {
    console.log(`Creating ${relationship.name} items:`, {
      targetTableName,
      itemsToInsert,
      mutation: insertMutation,
    });

    const response = await hasuraClient.request(insertMutation, {
      items: itemsToInsert,
    });

    console.log(
      `Created ${response[`insert_${targetTableName}`].affected_rows} ${
        relationship.name
      } items`
    );
    return response[`insert_${targetTableName}`];
  } catch (error: any) {
    console.error(`Error creating ${relationship.name} items:`, {
      error: error.message,
      graphQLErrors: error.graphQLErrors,
      networkError: error.networkError,
      targetTableName,
      itemsToInsert,
      mutation: insertMutation,
    });
    throw new Error(
      `Failed to create ${relationship.name} items: ${error.message}`
    );
  }
}

function getTableName(schema: any): string {
  if (typeof schema === "string") {
    return schema;
  }
  return (
    schema.schema_definition.table?.name ||
    schema.schema_definition.primary_component?.table ||
    `${schema.name}s`
  );
}

function pascalCase(str: string): string {
  return str.replace(/(^\w|_\w)/g, (match) =>
    match.replace("_", "").toUpperCase()
  );
}

/**
 * Filters data to only include fields defined in the schema
 */
function filterDataForSchema(data: any, schema: any): any {
  const filteredData: any = {};
  const schemaFieldNames = new Set(
    schema.schema_definition.fields.map((field: any) => field.name)
  );
  console.log("schemaFieldNames", schemaFieldNames);

  // Only include fields that are defined in the schema and are not auto-generated/primary key/auto-update
  for (const [fieldName, fieldValue] of Object.entries(data)) {
    console.log("fieldName", fieldName);
    console.log("fieldValue", fieldValue);
    if (schemaFieldNames.has(fieldName)) {
      console.log("schemaFieldNames", schemaFieldNames);
      const field = schema.schema_definition.fields.find(
        (f: any) => f.name === fieldName
      );
      console.log("field", field);
      if (
        field &&
        !field.auto_generate &&
        !field.primary_key &&
        !field.auto_update
      ) {
        console.log("filteredData", filteredData);
        filteredData[fieldName] = fieldValue;
      }
    }
  }

  console.log(
    `Filtered form data for ${schema.name}:`,
    Object.keys(filteredData)
  );
  return filteredData;
}
