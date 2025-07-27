"use client";

import React, { useState, useEffect } from "react";
import { Database, Plus, Code, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevent SSR issues
  }

  return (
    <div className="min-h-screen bg-muted p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Backend-Driven CMS</h1>
          <p className="text-muted-foreground text-lg">
            Dynamic form generation from database-stored schemas
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="mb-4">
                <Database className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Schema Management</h3>
              <p className="text-muted-foreground">
                Define and manage schemas directly in your database. Support for
                components and pages with complex relationships.
              </p>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-6">
              <div className="mb-4">
                <Code className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Dynamic Forms</h3>
              <p className="text-muted-foreground">
                Automatically generate forms from schemas with validation,
                relationships, and custom widgets.
              </p>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-6">
              <div className="mb-4">
                <Eye className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">GraphQL Operations</h3>
              <p className="text-muted-foreground">
                Auto-generate GraphQL queries and mutations from your schema
                definitions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="text-center">
          <div className="inline-flex gap-4">
            <Link href="/admin/schemas">
              <Button size="lg" className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>Manage Schemas</span>
              </Button>
            </Link>
            <Link href="/demo/form">
              <Button
                size="lg"
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Demo Form</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">
                  1. Configure Hasura Connection
                </h4>
                <p className="text-muted-foreground">
                  Set up your environment variables with Hasura endpoint and
                  admin secret.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">2. Create a Schema</h4>
                <p className="text-muted-foreground">
                  Define your data structure as a component or page schema with
                  fields and relationships.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">3. Generate Forms</h4>
                <p className="text-muted-foreground">
                  Forms are automatically generated from your schemas with full
                  CRUD functionality.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
