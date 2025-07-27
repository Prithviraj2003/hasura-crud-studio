import { NextRequest, NextResponse } from "next/server";
import { getHasuraAdminClient } from "@/lib/hasura/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    const hasuraClient = getHasuraAdminClient();

    const query = `
      query GetMediaByUrl($url: String!) {
        cms_config_media(where: {s3_url: {_eq: $url}}, limit: 1) {
          id
          filename
          original_filename
          mime_type
          file_extension
          size
          s3_url
          width
          height
          duration
          alternative_text
          caption
          folder_id
          created_by
          created_at
          updated_at
        }
      }
    `;

    const result = await hasuraClient.request(query, { url });

    if (result.cms_config_media && result.cms_config_media.length > 0) {
      return NextResponse.json(result.cms_config_media[0]);
    } else {
      return NextResponse.json(
        { error: "Media item not found" },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching media by URL:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
