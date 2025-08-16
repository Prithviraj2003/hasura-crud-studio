"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { DataTable } from "@/components/data/DataTable";
import { Schema } from "@/lib/schema/types";

export default function SchemaDataPage() {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const schemaName = params.schemaName as string;

  useEffect(() => {
    if (schemaName) {
      loadSchema();
    }
  }, [schemaName]);

  const loadSchema = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/schemas?name=${schemaName}`);
      if (!response.ok) {
        throw new Error("Failed to load schema");
      }

      const schemaData = await response.json();
      setSchema(schemaData);
    } catch (err) {
      console.error("Error loading schema:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = () => {
    router.push(`/admin/data/${schemaName}/new`);
  };

  const handleEditRecord = (recordId: string) => {
    router.push(`/admin/data/${schemaName}/${recordId}/edit`);
  };

  const handleRefresh = () => {
    loadSchema();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Loading schema...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Link href="/admin/schemas">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Schemas
              </Button>
            </Link>
          </div>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen bg-muted p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Link href="/admin/schemas">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Schemas
              </Button>
            </Link>
          </div>
          <Alert>
            <AlertDescription>Schema not found: {schemaName}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const getFieldCount = () => {
    return schema.schema_definition?.fields?.length || 0;
  };

  const getRelationshipCount = () => {
    return schema.relationships?.length || 0;
  };

  return (
    <div className="min-h-screen bg-muted p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin/schemas">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Schemas
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center space-x-3">
                <Database className="w-8 h-8" />
                <span>{schema.name}</span>
                <Badge
                  variant={schema.type === "page" ? "default" : "secondary"}
                >
                  {schema.type}
                </Badge>
              </h1>
              <p className="text-muted-foreground">
                {schema.description || "Manage records for this schema"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={handleAddRecord}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Record</span>
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          schemaName={schemaName}
          schema={schema}
          onEdit={handleEditRecord}
          // onDelete={handleDeleteRecord}
        />
      </div>
    </div>
  );
}
