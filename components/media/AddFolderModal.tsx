"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
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
import { MediaFolder } from "@/lib/services/MediaService";

interface AddFolderModalProps {
  onClose: () => void;
  onFolderCreated: () => void;
  folders: MediaFolder[];
}

export function AddFolderModal({
  onClose,
  onFolderCreated,
  folders,
}: AddFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [parentFolderId, setParentFolderId] = useState<string | undefined>(
    undefined
  );
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!folderName.trim()) {
      alert("Please enter a folder name");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/media/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: folderName.trim(),
          parentFolderId: parentFolderId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create folder");
      }

      setFolderName("");
      setParentFolderId(undefined);
      onFolderCreated();
      onClose();
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Add New Folder
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="folderName"
              className="text-sm font-medium text-gray-300"
            >
              Folder Name *
            </Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="mt-1 bg-gray-800 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label
              htmlFor="parentFolder"
              className="text-sm font-medium text-gray-300"
            >
              Parent Folder
            </Label>
            <Select
              value={parentFolderId || "none"}
              onValueChange={(value) =>
                setParentFolderId(value === "none" ? undefined : value)
              }
            >
              <SelectTrigger className="mt-1 bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Select parent folder (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="none">No parent folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !folderName.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {creating ? "Creating..." : "Create Folder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
