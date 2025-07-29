"use client";

import React, { useState, useEffect } from "react";
import { Database, Eye, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table as TableComponent,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

interface Schema {
  id: string;
  name: string;
  schema_type: string;
  version: string;
  description?: string;
  updated_at: string;
}

export default function SchemasPage() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadSchemas();
  }, []);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/schemas");
      if (!response.ok) {
        throw new Error("Failed to load schemas");
      }

      const data = await response.json();
      setSchemas(data);
    } catch (err: any) {
      console.error("Error loading schemas:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewData = (schemaName: string) => {
    router.push(`/admin/data/${schemaName}`);
  };

  // const handleEditSchema = (schemaName: string) => {
  //   router.push(`/admin/schemas/${schemaName}/edit`);
  // };

  // const handleDeleteSchema = async (schemaName: string, version: string) => {
  //   if (!confirm(`Are you sure you want to delete schema "${schemaName}"?`)) {
  //     return;
  //   }

  //   try {
  //     const response = await fetch(
  //       `/api/schemas?name=${schemaName}&version=${version}`,
  //       {
  //         method: "DELETE",
  //       }
  //     );

  //     if (!response.ok) {
  //       throw new Error("Failed to delete schema");
  //     }

  //     // Reload schemas
  //     loadSchemas();
  //   } catch (err: any) {
  //     console.error("Error deleting schema:", err);
  //     setError(err.message);
  //   }
  // };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Loading schemas...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Schema Management</h1>
            <p className="text-muted-foreground">
              Manage your database schemas and view their data
            </p>
          </div>
          {/* <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Schema</span>
          </Button> */}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Schemas Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Available Schemas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schemas.length === 0 ? (
              <div className="text-center py-8">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No schemas found</h3>
                {/* <p className="text-muted-foreground mb-4">
                  Create your first schema to get started
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Schema
                </Button> */}
              </div>
            ) : (
              <TableComponent>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemas.map((schema) => (
                    <TableRow key={`${schema.name}-${schema.version}`}>
                      <TableCell className="font-medium">
                        {schema.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            schema.schema_type === "page"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {schema.schema_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{schema.version}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {schema.description || "No description"}
                      </TableCell>
                      <TableCell>{formatDate(schema.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewData(schema.name)}
                            className="flex items-center space-x-1"
                          >
                            <Table className="w-3 h-3" />
                            <span>Data</span>
                          </Button>
                          {/* <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditSchema(schema.name)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button> */}
                          {/* <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDeleteSchema(schema.name, schema.version)
                            }
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button> */}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableComponent>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
