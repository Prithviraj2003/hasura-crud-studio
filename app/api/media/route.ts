import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";
import { MediaService } from "@/lib/services/MediaService";

const mediaService = new MediaService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const folderId = searchParams.get("folderId");
    const search = searchParams.get("search");
    const mimeType = searchParams.get("mimeType");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const hasuraClient = getHasuraAdminClient();
    const result = await mediaService.listMedia(hasuraClient, {
      page,
      limit,
      folderId: folderId || undefined,
      search: search || undefined,
      mimeType: mimeType || undefined,
      sortBy: sortBy || undefined,
      sortOrder: (sortOrder as "asc" | "desc") || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Media API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const folderId = formData.get("folderId") as string;
    const metadata = JSON.parse((formData.get("metadata") as string) || "{}");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const hasuraClient = getHasuraAdminClient();
    const result = await mediaService.uploadFiles(hasuraClient, files, {
      folderId,
      metadata,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Media upload error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
