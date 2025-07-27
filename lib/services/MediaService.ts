import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { HasuraAdminClient } from "@/lib/hasura/client";

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET || "";

export interface MediaItem {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_extension: string;
  size: number;
  s3_url: string;
  width?: number;
  height?: number;
  duration?: number;
  alternative_text?: string;
  caption?: string;
  folder_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  parent_folder_id?: string;
  path: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  asset_count?: number;
}

export interface MediaListParams {
  page: number;
  limit: number;
  folderId?: string;
  search?: string;
  mimeType?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface UploadOptions {
  folderId?: string;
  metadata?: Record<string, any>;
}

export interface SignedUrlResponse {
  uploadUrl: string;
  s3Key: string; // Still needed for upload process
  fields: Record<string, string>;
}

export class MediaService {
  private generateS3Key(filename: string, folderId?: string): string {
    // Clean the filename to avoid special characters
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

    let key = `oa-site/cms-uploads/media/${cleanFilename}`;

    return key;
  }

  private async extractFileMetadata(file: File): Promise<{
    width?: number;
    height?: number;
    duration?: number;
  }> {
    // For server-side processing, we'll return empty metadata
    // In a production environment, you might want to use a service like Sharp for images
    // or FFmpeg for videos to extract metadata after upload
    return {};
  }

  async generateSignedUrl(
    filename: string,
    contentType: string,
    folderId?: string,
    size?: number
  ): Promise<SignedUrlResponse> {
    // Validate inputs
    if (!filename || !contentType) {
      throw new Error("Filename and contentType are required");
    }

    if (!bucketName) {
      throw new Error("S3_BUCKET environment variable is not configured");
    }

    // Sanitize inputs
    const sanitizedFilename = filename.trim();
    const sanitizedContentType = contentType.trim();

    const s3Key = this.generateS3Key(sanitizedFilename, folderId);

    const params = {
      Bucket: bucketName,
      Key: s3Key,
      ContentType: sanitizedContentType,
      Expires: 3600, // 1 hour,
    };

    try {
      const presignedUrl = await s3.getSignedUrlPromise("putObject", params);

      return {
        uploadUrl: presignedUrl,
        s3Key: s3Key,
        fields: {}, // No fields needed for PUT
      };
    } catch (error) {
      console.error("Error generating signed URL:", error);
      throw new Error("Failed to generate signed URL for upload");
    }
  }

  async saveMediaFromSignedUrl(
    hasuraClient: HasuraAdminClient,
    s3Key: string, // Still needed to generate the URL
    filename: string,
    contentType: string,
    size: number,
    folderId?: string,
    metadata?: Record<string, any>
  ): Promise<MediaItem> {
    // Extract metadata from file info
    const fileMetadata = await this.extractFileMetadataFromInfo(
      filename,
      contentType,
      size
    );

    // Save to database
    const mediaItem: Omit<MediaItem, "id" | "created_at" | "updated_at"> = {
      filename: filename,
      original_filename: filename,
      mime_type: contentType,
      file_extension: filename.split(".").pop() || "",
      size: size,
      s3_url: this.getMediaUrl(s3Key),
      width: fileMetadata.width,
      height: fileMetadata.height,
      duration: fileMetadata.duration,
      alternative_text: "",
      caption: "",
      folder_id: folderId,
      created_by: "system", // TODO: Get from auth context
    };

    return await this.saveMediaToDatabase(hasuraClient, mediaItem);
  }

  private async extractFileMetadataFromInfo(
    filename: string,
    contentType: string,
    size: number
  ): Promise<{
    width?: number;
    height?: number;
    duration?: number;
  }> {
    // For now, return empty metadata since we can't extract dimensions without the actual file
    // In a real implementation, you might want to process the file after upload
    return {};
  }

  async uploadFiles(
    hasuraClient: HasuraAdminClient,
    files: File[],
    options: UploadOptions = {}
  ): Promise<MediaItem[]> {
    const uploadedFiles: MediaItem[] = [];

    for (const file of files) {
      try {
        // Generate unique S3 key
        const s3Key = await this.generateS3Key(file.name, options.folderId);

        // Upload to S3
        const uploadParams = {
          Bucket: bucketName,
          Key: s3Key,
          Body: file,
          ContentType: file.type,
          ACL: "public-read",
          Metadata: {
            originalName: file.name,
            uploadedBy: "system", // TODO: Get from auth context
            ...options.metadata,
          },
        };

        const s3Result = await s3.upload(uploadParams).promise();

        // Extract metadata
        const fileMetadata = await this.extractFileMetadata(file);

        // Save to database
        const mediaItem: Omit<MediaItem, "id" | "created_at" | "updated_at"> = {
          filename: file.name,
          original_filename: file.name,
          mime_type: file.type,
          file_extension: file.name.split(".").pop() || "",
          size: file.size,
          s3_url: this.getMediaUrl(s3Key),
          width: fileMetadata.width,
          height: fileMetadata.height,
          duration: fileMetadata.duration,
          alternative_text: "",
          caption: "",
          folder_id: options.folderId,
          created_by: "system", // TODO: Get from auth context
        };

        const savedItem = await this.saveMediaToDatabase(
          hasuraClient,
          mediaItem
        );
        uploadedFiles.push(savedItem);
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        throw error;
      }
    }

    return uploadedFiles;
  }

  private async saveMediaToDatabase(
    hasuraClient: HasuraAdminClient,
    mediaItem: Omit<MediaItem, "id" | "created_at" | "updated_at">
  ): Promise<MediaItem> {
    const mutation = `
      mutation InsertMedia($object: cms_config_media_insert_input!) {
        insert_cms_config_media_one(object: $object) {
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

    const variables = {
      object: {
        ...mediaItem,
        id: uuidv4().replace(/-/g, "").substring(0, 16),
      },
    };

    const result = await hasuraClient.request(mutation, variables);
    return result.insert_cms_config_media_one;
  }

  async listMedia(
    hasuraClient: HasuraAdminClient,
    params: MediaListParams
  ): Promise<{
    items: MediaItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit, folderId, search, mimeType, sortBy, sortOrder } =
      params;
    const offset = (page - 1) * limit;

    let whereClause = "deleted_at: {_is_null: true}";
    if (folderId) {
      whereClause += `, folder_id: {_eq: "${folderId}"}`;
    }
    if (search) {
      whereClause += `, _or: [{filename: {_ilike: "%${search}%"}}, {original_filename: {_ilike: "%${search}%"}}]`;
    }
    if (mimeType) {
      whereClause += `, mime_type: {_ilike: "${mimeType}%"}`;
    }

    const query = `
      query GetMedia($limit: Int!, $offset: Int!, $orderBy: [cms_config_media_order_by!]) {
        cms_config_media(where: {${whereClause}}, limit: $limit, offset: $offset, order_by: $orderBy) {
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
        cms_config_media_aggregate(where: {${whereClause}}) {
          aggregate {
            count
          }
        }
      }
    `;

    const variables = {
      limit,
      offset,
      orderBy: [{ [sortBy as string]: sortOrder }],
    };

    const result = await hasuraClient.request(query, variables);
    const total = result.cms_config_media_aggregate.aggregate.count;
    const totalPages = Math.ceil(total / limit);

    return {
      items: result.cms_config_media,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getMediaById(
    hasuraClient: HasuraAdminClient,
    id: string
  ): Promise<MediaItem | null> {
    const query = `
      query GetMediaById($id: String!) {
        cms_config_media_by_pk(id: $id) {
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

    const result = await hasuraClient.request(query, { id });
    if (!result.cms_config_media_by_pk) return null;

    return result.cms_config_media_by_pk;
  }

  async updateMedia(
    hasuraClient: HasuraAdminClient,
    id: string,
    updates: Partial<MediaItem>
  ): Promise<MediaItem> {
    const mutation = `
      mutation UpdateMedia($id: String!, $updates: cms_config_media_set_input!) {
        update_cms_config_media_by_pk(pk_columns: {id: $id}, _set: $updates) {
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

    const variables = {
      id,
      updates: {
        filename: updates.filename,
        alternative_text: updates.alternative_text,
        caption: updates.caption,
        folder_id: updates.folder_id,
      },
    };

    const result = await hasuraClient.request(mutation, variables);
    return result.update_cms_config_media_by_pk;
  }

  async deleteMedia(
    hasuraClient: HasuraAdminClient,
    id: string
  ): Promise<boolean> {
    // Soft delete - update deleted_at timestamp
    const mutation = `
      mutation DeleteMedia($id: String!) {
        update_cms_config_media_by_pk(pk_columns: {id: $id}, _set: {deleted_at: "now()"}) {
          id
        }
      }
    `;

    await hasuraClient.request(mutation, { id });
    return true;
  }

  async listFolders(hasuraClient: HasuraAdminClient): Promise<MediaFolder[]> {
    const query = `
      query GetFolders {
        cms_config_media_folders(order_by: {path: asc}) {
          id
          name
          parent_folder_id
          path
          created_by
          created_at
          updated_at
        }
      }
    `;

    const result = await hasuraClient.request(query);
    return result.cms_config_media_folders;
  }

  async createFolder(
    hasuraClient: HasuraAdminClient,
    name: string,
    parentFolderId?: string
  ): Promise<MediaFolder> {
    const mutation = `
      mutation CreateFolder($object: cms_config_media_folders_insert_input!) {
        insert_cms_config_media_folders_one(object: $object) {
          id
          name
          parent_folder_id
          path
          created_by
          created_at
          updated_at
        }
      }
    `;

    const path = parentFolderId ? `/${parentFolderId}/${name}` : `/${name}`;

    const variables = {
      object: {
        id: uuidv4().replace(/-/g, "").substring(0, 16),
        name,
        parent_folder_id: parentFolderId || null,
        path,
      },
    };

    console.log("variables", variables);

    const result = await hasuraClient.request(mutation, variables);
    return result.insert_cms_config_media_folders_one;
  }

  private getMediaUrl(s3Key: string): string {
    const cdnUrl = process.env.S3_CDN_URL;
    const cdnRootPath = process.env.S3_CDN_ROOT_PATH || "";

    if (cdnUrl) {
      return `${cdnUrl}${cdnRootPath}/${s3Key}`;
    }

    return `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
  }
}
