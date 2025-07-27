import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";
import { SchemaManager } from "@/lib/schema/SchemaManager";
import { CacheManager } from "@/lib/schema/CacheManager";

const cacheManager = new CacheManager(process.env.REDIS_URL);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const type = searchParams.get("type") as "component" | "page" | null;
    const version = searchParams.get("version");

    const hasuraClient = getHasuraAdminClient();
    const schemaManager = new SchemaManager(hasuraClient, cacheManager);

    if (name) {
      // Get specific schema
      const schema = await schemaManager.getSchema(name, version || "latest");
      if (!schema) {
        return NextResponse.json(
          { error: "Schema not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(schema);
    } else {
      // List schemas
      const schemas = await schemaManager.listSchemas(type || undefined);
      return NextResponse.json(schemas);
    }
  } catch (error: any) {
    console.error("Schema API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const schemaData = await request.json();

    // Validate required fields
    if (!schemaData.name || !schemaData.type || !schemaData.schema_definition) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, schema_definition" },
        { status: 400 }
      );
    }

    const hasuraClient = getHasuraAdminClient();
    const schemaManager = new SchemaManager(hasuraClient, cacheManager);

    const result = await schemaManager.saveSchema(schemaData);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Schema API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "Schema name is required" },
        { status: 400 }
      );
    }

    const schemaData = await request.json();
    schemaData.name = name;

    const hasuraClient = getHasuraAdminClient();
    const schemaManager = new SchemaManager(hasuraClient, cacheManager);

    const result = await schemaManager.saveSchema(schemaData);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Schema API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const version = searchParams.get("version");

    if (!name) {
      return NextResponse.json(
        { error: "Schema name is required" },
        { status: 400 }
      );
    }

    const hasuraClient = getHasuraAdminClient();
    const schemaManager = new SchemaManager(hasuraClient, cacheManager);

    await schemaManager.deleteSchema(name, version || undefined);
    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error: any) {
    console.error("Schema API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
