"use client";

import React from "react";
import { FieldRenderer } from "@/components/forms/FieldRenderer";
import { RelationshipRenderer } from "@/components/forms/RelationshipRenderer";
import { FormSection } from "@/components/forms/FormSection";
import { FormConfig } from "@/lib/schema/FormGenerator";

interface SchemaRendererProps {
  config: FormConfig;
  sections?: string[];
  relationships?: string[];
  parentId?: string;
}

export const SchemaRenderer: React.FC<SchemaRendererProps> = ({
  config,
  sections,
  relationships,
  parentId,
}) => {
  const { schema, fields, layout } = config;
  if (sections || relationships) {
    // Tab-based rendering
    return (
      <div className="space-y-6">
        {sections &&
          sections.map((sectionName) => {
            const section = layout.sections?.find(
              (s: any) => s.title === sectionName
            );

            return section ? (
              <FormSection
                key={sectionName}
                section={section}
                fields={fields}
              />
            ) : null;
          })}

        {relationships &&
          relationships.map((relName) => {
            const rel = config.relationships.find((r) => r.name === relName);
            const relatedSchema =
              config.relatedSchemas?.[rel?.targetComponent || ""];
            return rel ? (
              <div key={relName} className="mt-6">
                <RelationshipRenderer
                  relationship={rel}
                  relatedSchema={relatedSchema}
                  parentId={parentId}
                />
              </div>
            ) : null;
          })}
      </div>
    );
  }

  // Section-based rendering
  if (layout?.sections) {
    return (
      <div className="space-y-6">
        {layout.sections.map((section: any, index: number) => (
          <div key={section.title} className={index > 0 ? "mt-6" : ""}>
            <FormSection section={section} fields={fields} />
          </div>
        ))}

        {config.relationships.length > 0 && (
          <div className="mt-8 space-y-6">
            {config.relationships.map((rel) => {
              const relatedSchema =
                config.relatedSchemas?.[rel.targetComponent];
              return (
                <div key={rel.name}>
                  <RelationshipRenderer
                    relationship={rel}
                    relatedSchema={relatedSchema}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Default rendering (no layout)
  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {fields
          .filter((field) => !field.hidden)
          .map((field) => (
            <div key={field.name} className="col-span-12">
              <FieldRenderer field={field} />
            </div>
          ))}
      </div>

      {config.relationships.length > 0 && (
        <div className="mt-8 space-y-6">
          {config.relationships.map((rel) => {
            const relatedSchema = config.relatedSchemas?.[rel.targetComponent];
            return (
              <div key={rel.name}>
                <RelationshipRenderer
                  relationship={rel}
                  relatedSchema={relatedSchema}
                  parentId={parentId}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
