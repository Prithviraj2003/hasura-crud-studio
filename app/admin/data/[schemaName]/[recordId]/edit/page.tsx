"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { DynamicSchemaForm } from "@/components/forms/DynamicSchemaForm";

export default function EditRecordPage() {
  const router = useRouter();
  const params = useParams();
  const schemaName = params.schemaName as string;
  const recordId = params.recordId as string;

  // const handleSave = (data: any) => {
  //   // Stay on the edit page after saving - no redirection
  //   // Show success message to user
  //   toast.success("Record updated successfully!", {
  //     description: "Your changes have been saved.",
  //     duration: 3000,
  //   });
  // };

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
            <h1 className="text-2xl font-bold">Edit Record</h1>
            <p className="text-muted-foreground">
              Update the record for {schemaName}
            </p>
          </div>
        </div>

        {/* Form */}
        <DynamicSchemaForm
          schemaName={schemaName}
          entityId={recordId}
          // onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
