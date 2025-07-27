"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddAssetModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
  selectedFolder?: string | null;
}

export function AddAssetModal({
  onClose,
  onUploadComplete,
  selectedFolder,
}: AddAssetModalProps) {
  const [activeTab, setActiveTab] = useState("computer");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [urlInput, setUrlInput] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setUploadProgress(0);

      try {
        const uploadedFiles = [];

        for (const file of acceptedFiles) {
          console.log("Uploading file:", file.name, file.type, file.size);

          // Step 1: Get signed URL
          const signedUrlResponse = await fetch("/api/media/signed-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              folderId: selectedFolder,
              size: file.size,
            }),
          });

          if (!signedUrlResponse.ok) {
            const errorText = await signedUrlResponse.text();
            console.error("Signed URL error:", errorText);
            throw new Error(`Failed to get signed URL: ${errorText}`);
          }

          const { uploadUrl, s3Key, fields } = await signedUrlResponse.json();

          // Step 2: Upload to S3 using signed URL (PUT method)
          console.log("Uploading to S3:", uploadUrl);

          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type,
            },
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("S3 upload error:", errorText);
            throw new Error(`Failed to upload to S3: ${errorText}`);
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
              folderId: selectedFolder,
            }),
          });

          if (!saveResponse.ok) {
            throw new Error("Failed to save media metadata");
          }

          const mediaItem = await saveResponse.json();
          uploadedFiles.push(mediaItem);

          // Update progress
          setUploadProgress((prev) => prev + 100 / acceptedFiles.length);
        }

        // Wait a bit to show completion
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          onUploadComplete();
        }, 500);
      } catch (error) {
        console.error("Upload error:", error);
        setUploading(false);
        setUploadProgress(0);
        alert("Upload failed. Please try again.");
      }
    },
    [selectedFolder, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
      "video/*": [".mp4", ".avi", ".mov", ".wmv"],
      "audio/*": [".mp3", ".wav", ".ogg"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    multiple: true,
  });

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) return;

    setUploading(true);
    try {
      // TODO: Implement URL upload logic
      console.log("Uploading from URL:", urlInput);

      // Simulate upload
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setUploading(false);
      onUploadComplete();
    } catch (error) {
      console.error("URL upload error:", error);
      setUploading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Add new assets
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-600">
            <TabsTrigger
              value="computer"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              FROM COMPUTER
            </TabsTrigger>
            <TabsTrigger
              value="url"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              FROM URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="computer" className="mt-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-purple-400 bg-purple-900/20"
                  : "border-gray-600 hover:border-gray-500"
              }`}
            >
              <input {...getInputProps()} />

              {uploading ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-purple-600 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">Uploading...</p>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      {uploadProgress}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gray-700 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      {isDragActive ? "Drop files here" : "Drag & Drop here or"}
                    </p>
                    <Button
                      className="mt-4 bg-purple-600 hover:bg-purple-700"
                      disabled={uploading}
                    >
                      Browse files
                    </Button>
                  </div>
                  <p className="text-sm text-gray-400">
                    Supported formats: JPG, PNG, GIF, PDF, DOC, MP4, MP3
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-600">
              <p className="text-sm text-gray-400">No file chosen</p>
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  File URL
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com/file.pdf"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              <Button
                onClick={handleUrlUpload}
                disabled={!urlInput.trim() || uploading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {uploading ? "Uploading..." : "Upload from URL"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
