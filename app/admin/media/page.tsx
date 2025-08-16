"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  Image,
  File,
  Plus,
  Search,
  Grid3X3,
  List,
  Settings,
  ChevronLeft,
  MoreHorizontal,
  Download,
  Trash2,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddAssetModal } from "@/components/media/AddAssetModal";
import { AddFolderModal } from "@/components/media/AddFolderModal";
import { MediaDetailsModal } from "@/components/media/MediaDetailsModal";
import { MediaItem, MediaFolder } from "@/lib/services/MediaService";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function MediaLibraryPage() {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadFolders();
    loadMedia();
  }, [selectedFolder, currentPage, searchQuery]);

  const loadFolders = async () => {
    try {
      const response = await fetch("/api/media/folders");
      if (!response.ok) throw new Error("Failed to load folders");
      const data = await response.json();
      setFolders(data);
    } catch (err) {
      console.error("Error loading folders:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    }
  };

  const loadMedia = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        sortBy: "created_at",
        sortOrder: "desc",
      });

      if (selectedFolder) {
        params.append("folderId", selectedFolder);
      }

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(`/api/media?${params}`);
      if (!response.ok) throw new Error("Failed to load media");

      const data = await response.json();
      setMediaItems(data.items);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Error loading media:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderId: string | null) => {
    setSelectedFolder(folderId);
    setCurrentPage(1);
    setSelectedItems([]);
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === mediaItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(mediaItems.map((item) => item.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (
      !confirm(`Are you sure you want to delete ${selectedItems.length} items?`)
    ) {
      return;
    }

    try {
      await Promise.all(
        selectedItems.map((id) =>
          fetch(`/api/media/${id}`, { method: "DELETE" })
        )
      );
      setSelectedItems([]);
      loadMedia();
    } catch (err) {
      console.error("Error deleting items:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
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
    if (mimeType.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (mimeType.startsWith("video/")) return <File className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const getCurrentFolderName = () => {
    if (!selectedFolder) return "All Assets";
    const folder = folders.find((f) => f.id === selectedFolder);
    return folder?.name || "Unknown Folder";
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">Media Library</h1>
              {selectedFolder && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFolderClick(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back to All
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add new assets
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddFolderModal(true)}
                className="text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add new folder
              </Button>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`${
                    viewMode === "list" ? "text-blue-400" : "text-gray-400"
                  } hover:text-white`}
                >
                  <List className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`${
                    viewMode === "grid" ? "text-blue-400" : "text-gray-400"
                  } hover:text-white`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-gray-800 border-r border-gray-700 min-h-screen">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">
                Folders ({folders.length})
              </h2>
              <div className="space-y-2">
                <div
                  className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                    !selectedFolder
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-700"
                  }`}
                  onClick={() => handleFolderClick(null)}
                >
                  <Folder className="w-4 h-4" />
                  <span>All Assets</span>
                </div>
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                      selectedFolder === folder.id
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-700"
                    }`}
                    onClick={() => handleFolderClick(folder.id)}
                  >
                    <Folder className="w-4 h-4" />
                    <span className="flex-1">{folder.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {/* TODO: Get actual asset count */}0
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-gray-900">
            <div className="p-6">
              {/* Search and Filters */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Input
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  />
                  <select className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2">
                    <option>Most recent uploads</option>
                    <option>Name A-Z</option>
                    <option>Name Z-A</option>
                    <option>Size</option>
                  </select>
                  <Button
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                  >
                    Filters
                  </Button>
                </div>

                {selectedItems.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">
                      {selectedItems.length} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteSelected}
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-6">
                {/* Folders Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Folders ({folders.length})
                    </h3>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === folders.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-600 bg-gray-800"
                      />
                      <span className="text-sm text-gray-400">Select all</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {folders.slice(0, 8).map((folder) => (
                      <Card
                        key={folder.id}
                        className="bg-gray-800 border-gray-700 hover:border-gray-600 cursor-pointer"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(folder.id)}
                              onChange={() => handleItemSelect(folder.id)}
                              className="rounded border-gray-600 bg-gray-800"
                            />
                            <Folder className="w-8 h-8 text-blue-400" />
                            <div className="flex-1">
                              <h4 className="font-medium">{folder.name}</h4>
                              <p className="text-sm text-gray-400">
                                0 folder, 0 assets
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Assets Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Assets ({mediaItems.length})
                    </h3>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === mediaItems.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-600 bg-gray-800"
                      />
                      <span className="text-sm text-gray-400">Select all</span>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    </div>
                  ) : (
                    <div
                      className={`grid gap-4 ${
                        viewMode === "grid"
                          ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6"
                          : "grid-cols-1"
                      }`}
                    >
                      {mediaItems.map((item) => (
                        <Card
                          key={item.id}
                          className="bg-gray-800 border-gray-700 hover:border-gray-600 cursor-pointer group"
                          onClick={() => setSelectedMedia(item)}
                        >
                          <CardContent className="p-4">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleItemSelect(item.id);
                                }}
                                className="absolute top-2 left-2 z-10 rounded border-gray-600 bg-gray-800"
                              />

                              {item.mime_type.startsWith("image/") ? (
                                <img
                                  src={item.s3_url}
                                  alt={item.filename}
                                  className="w-full h-32 object-cover rounded"
                                />
                              ) : (
                                <div className="w-full h-32 bg-gray-700 rounded flex items-center justify-center">
                                  {getFileIcon(item.mime_type)}
                                </div>
                              )}

                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 bg-gray-800"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-gray-800 border-gray-600">
                                    <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                      <LinkIcon className="w-4 h-4 mr-2" />
                                      Copy URL
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-400 hover:bg-red-900">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            <div className="mt-3">
                              <h4 className="font-medium text-sm truncate">
                                {item.filename}
                              </h4>
                              <p className="text-xs text-gray-400">
                                {formatFileSize(item.size)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddAssetModal
          onClose={() => setShowAddModal(false)}
          onUploadComplete={() => {
            setShowAddModal(false);
            loadMedia();
          }}
          selectedFolder={selectedFolder}
        />
      )}

      {showAddFolderModal && (
        <AddFolderModal
          onClose={() => setShowAddFolderModal(false)}
          onFolderCreated={() => {
            setShowAddFolderModal(false);
            loadFolders();
          }}
          folders={folders}
        />
      )}

      {selectedMedia && (
        <MediaDetailsModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onUpdate={() => {
            setSelectedMedia(null);
            loadMedia();
          }}
        />
      )}
    </AdminLayout>
  );
}
