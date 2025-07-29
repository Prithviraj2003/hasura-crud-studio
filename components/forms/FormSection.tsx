"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldRenderer } from "@/components/forms/FieldRenderer";
import { FieldConfig } from "@/lib/schema/FormGenerator";

interface FormSectionProps {
  section: {
    title: string;
    fields: string[];
    columns?: number;
  };
  fields: FieldConfig[];
}

export const FormSection: React.FC<FormSectionProps> = ({
  section,
  fields,
}) => {
  const sectionFields = fields.filter((field) =>
    section.fields.includes(field.name)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">{section.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`grid gap-4 ${
            section.columns ? `grid-cols-${section.columns}` : "grid-cols-1"
          }`}
        >
          {sectionFields
            .filter((field) => !field.hidden)
            .map((field) => (
              <div
                key={field.name}
                className={`col-span-${field.grid_cols || 1}`}
              >
                <FieldRenderer field={field} />
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};
