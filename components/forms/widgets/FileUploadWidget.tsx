"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, File, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MediaItem } from "@/lib/services/MediaService";
import { FormIdManager } from "@/lib/services/FormIdManager";
import { IdGeneratorService } from "@/lib/services/IdGeneratorService";

interface FileUploadWidgetProps {
  value?: string | string[] | null; // Changed to accept s3_url values
  onChange?: (value: string | string[] | null) => void; // Changed to return s3_url values
  multiple?: boolean;
  allowedTypes?: string[];
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  required?: boolean;
  disabled?: boolean;
  label?: string;
}

export function FileUploadWidget({
  value,
  onChange,
  multiple = false,
  allowedTypes = ["image/*", "application/pdf"],
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  required = false,
  disabled = false,
  label = "Upload files",
}: FileUploadWidgetProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Separate state for display data (full media items)
  const [displayData, setDisplayData] = useState<MediaItem[]>([]);

  // Convert s3_url values to display data on mount and when value changes
  useEffect(() => {
    const loadDisplayData = async () => {
      if (!value) {
        setDisplayData([]);
        return;
      }

      const urls = Array.isArray(value) ? value : [value];
      const mediaItems: MediaItem[] = [];

      for (const url of urls) {
        const id = await IdGeneratorService.generateId();

        try {
          // Try to find media item by s3_url
          const response = await fetch(
            `/api/media/by-url?url=${encodeURIComponent(url)}`
          );
          if (response.ok) {
            const mediaItem = await response.json();
            mediaItems.push(mediaItem);
          } else {
            // If not found, create a minimal media item for display
            mediaItems.push({
              id: id,
              filename: url.split("/").pop() || "Unknown file",
              original_filename: url.split("/").pop() || "Unknown file",
              mime_type: "application/octet-stream",
              file_extension: url.split(".").pop() || "",
              size: 0,
              s3_url: url,
              created_by: "system",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Error loading media item for URL:", url, error);
          // Create a minimal media item for display
          mediaItems.push({
            id: id,
            filename: url.split("/").pop() || "Unknown file",
            original_filename: url.split("/").pop() || "Unknown file",
            mime_type: "application/octet-stream",
            file_extension: url.split(".").pop() || "",
            size: 0,
            s3_url: url,
            created_by: "system",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      setDisplayData(mediaItems);
    };

    loadDisplayData();
  }, [value]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0 || disabled) return;

      // Validate file count
      if (multiple && displayData.length + acceptedFiles.length > maxFiles) {
        alert(`You can only upload up to ${maxFiles} files`);
        return;
      }

      // Validate file size
      const oversizedFiles = acceptedFiles.filter(
        (file) => file.size > maxFileSize
      );
      if (oversizedFiles.length > 0) {
        alert(
          `Some files are too large. Maximum size is ${formatFileSize(
            maxFileSize
          )}`
        );
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        const uploadedFiles: MediaItem[] = [];
        const uploadedUrls: string[] = [];

        for (const file of acceptedFiles) {
          // Step 1: Get signed URL
          const signedUrlResponse = await fetch("/api/media/signed-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              size: file.size,
              folderId: undefined, // No folder for form uploads
            }),
          });

          if (!signedUrlResponse.ok) {
            throw new Error("Failed to get signed URL");
          }

          const { uploadUrl, s3Key, fields } = await signedUrlResponse.json();

          // Step 2: Upload to S3 using signed URL (PUT method)
          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type,
            },
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload to S3");
          }

          // Step 3: Save media metadata to database
          const saveResponse = await fetch("/api/media/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              s3Key,
              filename: file.name,
              contentType: file.type,
              size: file.size,
              folderId: undefined,
            }),
          });

          if (!saveResponse.ok) {
            throw new Error("Failed to save media metadata");
          }

          const mediaItem = await saveResponse.json();
          uploadedFiles.push(mediaItem);
          uploadedUrls.push(mediaItem.s3_url);

          // Update progress
          setUploadProgress((prev) => prev + 100 / acceptedFiles.length);
        }

        // Wait a bit to show completion
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);

          if (onChange) {
            if (multiple) {
              // Combine existing URLs with new URLs
              const existingUrls = Array.isArray(value)
                ? value
                : value
                ? [value]
                : [];
              const newUrls = [...existingUrls, ...uploadedUrls];
              onChange(newUrls);
            } else {
              // For single file, just use the first uploaded URL
              onChange(uploadedUrls[0]);
            }
          }
        }, 500);
      } catch (error) {
        console.error("Upload error:", error);
        setUploading(false);
        setUploadProgress(0);
        alert("Upload failed. Please try again.");
      }
    },
    [multiple, displayData, maxFiles, maxFileSize, disabled, onChange, value]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedTypes.reduce((acc, type) => {
      if (type === "image/*") {
        acc["image/*"] = [".jpeg", ".jpg", ".png", ".gif", ".webp"];
      } else if (type === "video/*") {
        acc["video/*"] = [".mp4", ".avi", ".mov", ".wmv"];
      } else if (type === "audio/*") {
        acc["audio/*"] = [".mp3", ".wav", ".ogg"];
      } else if (type === "application/pdf") {
        acc["application/pdf"] = [".pdf"];
      } else if (type === "application/msword") {
        acc["application/msword"] = [".doc"];
      } else if (
        type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        acc[
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ] = [".docx"];
      }
      return acc;
    }, {} as Record<string, string[]>),
    multiple,
    disabled: disabled || uploading,
  });

  const removeFile = (fileId: string) => {
    if (!onChange) return;

    // Find the media item to get its s3_url
    const mediaItem = displayData.find((item) => item.id === fileId);
    if (!mediaItem) return;

    if (multiple) {
      const currentUrls = Array.isArray(value) ? value : value ? [value] : [];
      const newUrls = currentUrls.filter((url) => url !== mediaItem.s3_url);
      onChange(newUrls.length > 0 ? newUrls : null);
    } else {
      onChange(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {multiple && (
          <span className="text-xs text-gray-500">
            {displayData.length}/{maxFiles} files
          </span>
        )}
      </div>

      {/* Upload Area */}
      {(!multiple || displayData.length < maxFiles) && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-purple-400 bg-purple-50"
              : "border-gray-300 hover:border-gray-400"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />

          {uploading ? (
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-purple-600 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">Uploading...</p>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                  <div
                    className="bg-purple-600 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isDragActive
                    ? "Drop files here"
                    : "Click to add an asset or drag and drop one in this area"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Max size: {formatFileSize(maxFileSize)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Uploaded Files */}
      {displayData.length > 0 && (
        <div className="space-y-2">
          {displayData.map((file) => (
            <Card key={file.id} className="border border-gray-200">
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {file.mime_type.startsWith("image/") ? (
                      <img
                        src={file.s3_url}
                        alt={file.filename}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        {getFileIcon(file.mime_type)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
