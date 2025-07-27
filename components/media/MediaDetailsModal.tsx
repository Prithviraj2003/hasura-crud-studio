"use client";

import React, { useState } from "react";
import { X, Trash2, Download, Link as LinkIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaItem } from "@/lib/services/MediaService";

interface MediaDetailsModalProps {
  media: MediaItem;
  onClose: () => void;
  onUpdate: () => void;
}

export function MediaDetailsModal({
  media,
  onClose,
  onUpdate,
}: MediaDetailsModalProps) {
  const [formData, setFormData] = useState({
    filename: media.filename,
    alternative_text: media.alternative_text || "",
    caption: media.caption || "",
    location: "Media Library",
  });
  const [saving, setSaving] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/"))
      return <FileText className="w-8 h-8 text-orange-400" />;
    if (mimeType.startsWith("video/"))
      return <FileText className="w-8 h-8 text-blue-400" />;
    if (mimeType.startsWith("audio/"))
      return <FileText className="w-8 h-8 text-green-400" />;
    return <FileText className="w-8 h-8 text-gray-400" />;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/media/${media.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: formData.filename,
          alternative_text: formData.alternative_text,
          caption: formData.caption,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update media");
      }

      onUpdate();
    } catch (error) {
      console.error("Error updating media:", error);
      // TODO: Show error toast
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      const response = await fetch(`/api/media/${media.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete media");
      }

      onUpdate();
    } catch (error) {
      console.error("Error deleting media:", error);
      // TODO: Show error toast
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = media.s3_url || "";
    link.download = media.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(media.s3_url || "");
    // TODO: Show success toast
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Details</DialogTitle>
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

        <div className="grid grid-cols-2 gap-6">
          {/* Left Panel - Preview & Actions */}
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-gray-400 hover:text-white"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyUrl}
                className="text-gray-400 hover:text-white"
              >
                <LinkIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* File Preview */}
            <div className="bg-white rounded-lg p-8 flex items-center justify-center min-h-[300px]">
              {media.mime_type.startsWith("image/") ? (
                <img
                  src={media.s3_url}
                  alt={media.filename}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  {getFileIcon(media.mime_type)}
                  <p className="text-gray-600 mt-2 text-sm">{media.filename}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Metadata */}
          <div className="space-y-6">
            {/* Static Metadata */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-300">
                  SIZE
                </Label>
                <p className="text-white">{formatFileSize(media.size)}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-300">
                  DIMENSIONS
                </Label>
                <p className="text-white">
                  {media.width && media.height
                    ? `${media.width} × ${media.height}`
                    : "—"}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-300">
                  DATE
                </Label>
                <p className="text-white">{formatDate(media.created_at)}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-300">
                  EXTENSION
                </Label>
                <p className="text-white">{media.file_extension}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-300">
                  ASSET ID
                </Label>
                <p className="text-white">{media.id}</p>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="filename"
                  className="text-sm font-medium text-gray-300"
                >
                  File name
                </Label>
                <Input
                  id="filename"
                  value={formData.filename}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      filename: e.target.value,
                    }))
                  }
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label
                  htmlFor="alt-text"
                  className="text-sm font-medium text-gray-300"
                >
                  Alternative text
                </Label>
                <Input
                  id="alt-text"
                  value={formData.alternative_text}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      alternative_text: e.target.value,
                    }))
                  }
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                  placeholder="This text will be displayed if the asset can't be shown."
                />
              </div>

              <div>
                <Label
                  htmlFor="caption"
                  className="text-sm font-medium text-gray-300"
                >
                  Caption
                </Label>
                <Input
                  id="caption"
                  value={formData.caption}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      caption: e.target.value,
                    }))
                  }
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label
                  htmlFor="location"
                  className="text-sm font-medium text-gray-300"
                >
                  Location
                </Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, location: value }))
                  }
                >
                  <SelectTrigger className="mt-1 bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="Media Library">Media Library</SelectItem>
                    <SelectItem value="Documents">Documents</SelectItem>
                    <SelectItem value="Images">Images</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
          >
            Replace Media
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? "Saving..." : "Finish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
