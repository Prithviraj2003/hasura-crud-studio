"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelationshipConfig } from "@/lib/schema/FormGenerator";
import { RelationshipSelect } from "@/components/forms/widgets/RelationshipSelect";
import { OneToManyManager } from "@/components/forms/widgets/OneToManyManager";

interface RelationshipRendererProps {
  relationship: RelationshipConfig;
  relatedSchema?: any;
  parentId?: string;
  mode?: "create" | "edit";
}

export const RelationshipRenderer: React.FC<RelationshipRendererProps> = ({
  relationship,
  relatedSchema,
  parentId,
  mode,
}) => {
  const { control } = useFormContext();

  // Use OneToManyManager for one-to-many relationships
  if (relationship.type === "one-to-many") {
    return (
      <OneToManyManager
        relationship={relationship}
        fieldName={relationship.name}
        relatedSchema={relatedSchema}
        className="mb-6"
        parentId={parentId}
      />
    );
  }

  // Determine if this relationship should be disabled in edit mode
  // For many-to-one and one-to-one relationships, they represent foreign keys that shouldn't be changed
  const shouldDisableInEdit =
    mode === "edit" &&
    (relationship.type === "many-to-one" || relationship.type === "one-to-one");

  // Use RelationshipSelect for other relationship types
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          {relationship.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RelationshipSelect
          name={relationship.name}
          control={control}
          relationshipType={relationship.type}
          targetComponent={relationship.targetComponent || ""}
          displayField={relationship.displayField || "name"}
          placeholder={`Select ${relationship.title}`}
          disabled={shouldDisableInEdit}
        />
      </CardContent>
    </Card>
  );
};
