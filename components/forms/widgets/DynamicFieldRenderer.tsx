"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { OneToOneSelector } from "@/components/forms/widgets/OneToOneSelector";

interface DynamicFieldRendererProps {
  schema: any;
  item: any;
  itemIndex: number;
  fieldName: string;
  onUpdate: (updatedItem: any) => void;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  schema,
  item,
  itemIndex,
  fieldName,
  onUpdate,
}) => {
  const { setValue } = useFormContext();

  if (!schema?.schema_definition?.fields) {
    return (
      <div className="text-sm text-muted-foreground">
        No fields defined for this schema
      </div>
    );
  }

  const handleFieldChange = (field: string, value: any) => {
    const updatedItem = { ...item, [field]: value };
    onUpdate(updatedItem);

    // Also update the form context with correct path
    setValue(`${fieldName}.${itemIndex}.${field}`, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const renderField = (field: any) => {
    const fieldKey = `${fieldName}.${itemIndex}.${field.name}`;
    const fieldValue = item[field.name] || "";

    // Skip hidden and auto-generated fields
    if (field.ui_config?.hidden || field.auto_generate) {
      return null;
    }

    const label =
      field.ui_config?.label ||
      field.name
        ?.replace(/_/g, " ")
        ?.replace(/\b\w/g, (l: string) => l.toUpperCase());
    const placeholder =
      field.ui_config?.placeholder || `Enter ${label.toLowerCase()}`;
    const isRequired = field.required && !field.default;
    switch (field.type) {
      case "text":
        if (field.ui_config?.widget === "rich_text") {
          return (
            <div key={field.name} className="space-y-2 col-span-2">
              <Label htmlFor={fieldKey}>
                {label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <div className="border rounded-md border-gray-200">
                <CKEditor
                  editor={ClassicEditor}
                  data={fieldValue || ""}
                  onChange={(event, editor) => {
                    const data = editor.getData();
                    handleFieldChange(field.name, data);
                  }}
                  config={{
                    placeholder: placeholder || "Enter your content...",
                    toolbar: [
                      "heading",
                      "|",
                      "bold",
                      "italic",
                      "underline",
                      "|",
                      "bulletedList",
                      "numberedList",
                      "|",
                      "outdent",
                      "indent",
                      "|",
                      "link",
                      "blockQuote",
                      "|",
                      "insertTable",
                      "|",
                      "undo",
                      "redo",
                    ],
                    heading: {
                      options: [
                        {
                          model: "paragraph",
                          title: "Paragraph",
                          class: "ck-heading_paragraph",
                        },
                        {
                          model: "heading1",
                          view: "h1",
                          title: "Heading 1",
                          class: "ck-heading_heading1",
                        },
                        {
                          model: "heading2",
                          view: "h2",
                          title: "Heading 2",
                          class: "ck-heading_heading2",
                        },
                        {
                          model: "heading3",
                          view: "h3",
                          title: "Heading 3",
                          class: "ck-heading_heading3",
                        },
                      ],
                    },
                    table: {
                      contentToolbar: [
                        "tableColumn",
                        "tableRow",
                        "mergeTableCells",
                      ],
                    },
                  }}
                />
              </div>
              {field.ui_config?.help_text && (
                <p className="text-xs text-muted-foreground">
                  {field.ui_config.help_text}
                </p>
              )}
            </div>
          );
        }
        if (field.foreign_key) {
          const isReferenceField =
            field.name.includes("_id") ||
            field.name === "reference_id" ||
            field.name === "parent_id";

          // If it's a reference field that should be auto-set, hide it
          if (isReferenceField && field.ui_config?.hidden) {
            return (
              <div key={field.name} className="space-y-2 hidden">
                <Input
                  id={fieldKey}
                  type="text"
                  hidden={true}
                  value="Will be set automatically"
                  onChange={(e) =>
                    handleFieldChange(field.name, e.target.value)
                  }
                  placeholder="Will be set automatically"
                  required={isRequired}
                />
              </div>
            );
          }

          // For regular foreign key fields, show the relationship selector
          return (
            <OneToOneSelector
              key={field.name}
              fieldName={field.name}
              fieldKey={fieldKey}
              label={label}
              foreignKey={field.foreign_key}
              value={fieldValue}
              required={isRequired}
              placeholder={field.ui_config?.placeholder}
              helpText={field.ui_config?.help_text}
              onChange={(value) => handleFieldChange(field.name, value)}
              displayField={field.ui_config?.component_display_key || "name"}
            />
          );
        }

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={fieldKey}
              type="text"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={placeholder}
              required={isRequired}
              maxLength={field.max_length || field.validation?.max_length}
            />
            {field.ui_config?.help_text && (
              <p className="text-xs text-muted-foreground">
                {field.ui_config.help_text}
              </p>
            )}
          </div>
        );

      case "integer":
      case "decimal":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={fieldKey}
              type="number"
              value={fieldValue}
              onChange={(e) =>
                handleFieldChange(field.name, parseFloat(e.target.value) || 0)
              }
              placeholder={placeholder}
              required={isRequired}
              min={field.validation?.min}
              max={field.validation?.max}
              step={field.type === "decimal" ? "0.01" : "1"}
            />
            {field.ui_config?.help_text && (
              <p className="text-xs text-muted-foreground">
                {field.ui_config.help_text}
              </p>
            )}
          </div>
        );

      case "boolean":
        return (
          <div key={field.name} className="flex items-center space-x-2">
            <Checkbox
              id={fieldKey}
              checked={fieldValue || false}
              onCheckedChange={(checked) =>
                handleFieldChange(field.name, checked)
              }
            />
            <Label htmlFor={fieldKey} className="text-sm font-medium">
              {label}
            </Label>
            {field.ui_config?.help_text && (
              <p className="text-xs text-muted-foreground">
                {field.ui_config.help_text}
              </p>
            )}
          </div>
        );

      case "enum":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={fieldValue}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.enum_values?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.ui_config?.help_text && (
              <p className="text-xs text-muted-foreground">
                {field.ui_config.help_text}
              </p>
            )}
          </div>
        );

      case "timestamp":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={fieldKey}
              type="datetime-local"
              value={
                fieldValue
                  ? new Date(fieldValue).toISOString().slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                handleFieldChange(
                  field.name,
                  e.target.value ? new Date(e.target.value).toISOString() : ""
                )
              }
              required={isRequired}
            />
            {field.ui_config?.help_text && (
              <p className="text-xs text-muted-foreground">
                {field.ui_config.help_text}
              </p>
            )}
          </div>
        );

      case "uuid":
        // For foreign keys, we might want to show a relationship selector
        if (field.foreign_key) {
          const isReferenceField =
            field.name.includes("_id") ||
            field.name === "reference_id" ||
            field.name === "parent_id";
          const displayValue =
            fieldValue || (isReferenceField ? "Will be set automatically" : "");

          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={fieldKey}>
                {label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={fieldKey}
                type="text"
                value={displayValue}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={
                  isReferenceField
                    ? "Will be set automatically"
                    : "Enter ID or select from relationship"
                }
                required={isRequired}
                readOnly={isReferenceField && fieldValue}
                className={isReferenceField && !fieldValue ? "bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {isReferenceField
                  ? "Reference ID will be set automatically when parent record is saved"
                  : `Related to: ${field.foreign_key.table}`}
              </p>
            </div>
          );
        }

        // For auto-generated UUIDs, show as read-only
        if (field.primary_key || field.auto_generate) {
          const displayValue =
            fieldValue ||
            (field.auto_generate ? "Will be auto-generated" : "Auto-generated");
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={fieldKey}>{label}</Label>
              <Input
                id={fieldKey}
                type="text"
                value={displayValue}
                readOnly
                className="bg-muted"
              />
              {field.auto_generate && !fieldValue && (
                <p className="text-xs text-muted-foreground">
                  ID will be generated automatically when saved
                </p>
              )}
            </div>
          );
        }

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={fieldKey}
              type="text"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={placeholder}
              required={isRequired}
            />
          </div>
        );

      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldKey}>
              {label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={fieldKey}
              type="text"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={placeholder}
              required={isRequired}
            />
            <p className="text-xs text-muted-foreground">
              Field type: {field.type}
            </p>
          </div>
        );
    }
  };

  // Determine grid layout based on number of fields
  const visibleFields = schema.schema_definition.fields.filter(
    (field: any) => !field.ui_config?.hidden && !field.auto_generate
  );

  const getGridCols = () => {
    if (visibleFields.length === 2) return "grid-cols-2";
    if (visibleFields.length <= 4) return "grid-cols-2";
    return "grid-cols-3";
  };

  return (
    <div className={`grid ${getGridCols()} gap-4`}>
      {schema.schema_definition.fields.map(renderField)}
    </div>
  );
};
