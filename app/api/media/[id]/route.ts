import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";
import { MediaService } from "@/lib/services/MediaService";

const mediaService = new MediaService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hasuraClient = getHasuraAdminClient();
    const mediaItem = await mediaService.getMediaById(hasuraClient, params.id);

    if (!mediaItem) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    return NextResponse.json(mediaItem);
  } catch (error: any) {
    console.error("Media API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const hasuraClient = getHasuraAdminClient();

    const updatedMedia = await mediaService.updateMedia(
      hasuraClient,
      params.id,
      updates
    );

    return NextResponse.json(updatedMedia);
  } catch (error: any) {
    console.error("Media update error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hasuraClient = getHasuraAdminClient();
    await mediaService.deleteMedia(hasuraClient, params.id);

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error: any) {
    console.error("Media delete error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
