import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";
import { MediaService } from "@/lib/services/MediaService";

const mediaService = new MediaService();

export async function GET(request: NextRequest) {
  try {
    const hasuraClient = getHasuraAdminClient();
    const folders = await mediaService.listFolders(hasuraClient);
    return NextResponse.json(folders);
  } catch (error: any) {
    console.error("Folders API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, parentFolderId } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    const hasuraClient = getHasuraAdminClient();
    const folder = await mediaService.createFolder(
      hasuraClient,
      name,
      parentFolderId
    );
    return NextResponse.json(folder, { status: 201 });
  } catch (error: any) {
    console.error("Folder creation error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
