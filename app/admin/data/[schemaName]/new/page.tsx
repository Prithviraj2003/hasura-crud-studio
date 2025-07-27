"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { DynamicSchemaForm } from "@/components/forms/DynamicSchemaForm";

export default function NewRecordPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const schemaName = params.schemaName as string;
  const parentId = searchParams.get('parentId');

  const handleSave = (data: any) => {
    console.log("Record created:", data);
    // Navigate back to the data listing page
    router.push(`/admin/data/${schemaName}`);
  };

  const handleCancel = () => {
    router.push(`/admin/data/${schemaName}`);
  };

  return (
    <div className="min-h-screen bg-muted p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          {/* <Link href={`/admin/data/${schemaName}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {schemaName} Records
            </Button>
          </Link> */}
          <div>
            <h1 className="text-2xl font-bold">Create New Record</h1>
            <p className="text-muted-foreground">
              Add a new record for {schemaName}
            </p>
          </div>
        </div>

        {/* Form */}
        <DynamicSchemaForm
          schemaName={schemaName}
          parentId={parentId || undefined}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
