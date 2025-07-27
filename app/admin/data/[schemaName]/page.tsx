"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { DataTable } from "@/components/data/DataTable";

interface Schema {
  id: string;
  name: string;
  schema_type: string;
  version: string;
  description?: string;
  schema_definition: any;
  ui_schema?: any;
  relationships?: any[];
}

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
    } catch (err: any) {
      console.error("Error loading schema:", err);
      setError(err.message);
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

  const handleDeleteRecord = (recordId: string) => {
    // Delete logic is handled in DataTable component
    console.log("Delete record:", recordId);
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
                <Badge variant={schema.schema_type === "page" ? "default" : "secondary"}>
                  {schema.schema_type}
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
            <Button onClick={handleAddRecord} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Record</span>
            </Button>
          </div>
        </div>

        {/* Schema Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Schema Type</p>
                  <p className="font-semibold">{schema.schema_type}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-primary rounded" />
                <div>
                  <p className="text-sm text-muted-foreground">Fields</p>
                  <p className="font-semibold">{getFieldCount()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-secondary rounded" />
                <div>
                  <p className="text-sm text-muted-foreground">Relationships</p>
                  <p className="font-semibold">{getRelationshipCount()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-accent rounded" />
                <div>
                  <p className="text-sm text-muted-foreground">Version</p>
                  <p className="font-semibold">{schema.version}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <DataTable
          schemaName={schemaName}
          schema={schema}
          onEdit={handleEditRecord}
          onDelete={handleDeleteRecord}
        />
      </div>
    </div>
  );
}