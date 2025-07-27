import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";
import { MediaService } from "@/lib/services/MediaService";

const mediaService = new MediaService();

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType, folderId, size } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Filename and contentType are required" },
        { status: 400 }
      );
    }

    const signedUrl = await mediaService.generateSignedUrl(
      filename,
      contentType,
      folderId,
      size
    );

    return NextResponse.json(signedUrl);
  } catch (error: any) {
    console.error("Signed URL generation error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
