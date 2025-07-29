import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";
import { MediaService } from "@/lib/services/MediaService";

const mediaService = new MediaService();

export async function POST(request: NextRequest) {
  try {
    const { s3Key, filename, contentType, size, folderId, metadata } =
      await request.json();

    if (!s3Key || !filename || !contentType || !size) {
      return NextResponse.json(
        { error: "s3Key, filename, contentType, and size are required" },
        { status: 400 }
      );
    }

    const hasuraClient = getHasuraAdminClient();
    const mediaItem = await mediaService.saveMediaFromSignedUrl(
      hasuraClient,
      s3Key,
      filename,
      contentType,
      size,
      folderId,
      metadata
    );

    return NextResponse.json(mediaItem, { status: 201 });
  } catch (error: any) {
    console.error("Media save error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
