"use client";

import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldConfig } from "@/lib/schema/FormGenerator";
import { RelationshipSelect } from "@/components/forms/widgets/RelationshipSelect";
import { JsonEditor } from "@/components/forms/widgets/JsonEditor";
import { FileUploadWidget } from "@/components/forms/widgets/FileUploadWidget";
import { RichTextEditor } from "@/components/forms/widgets/RichTextEditor";
import { TextArrayWidget } from "@/components/forms/widgets/TextArrayWidget";

interface FieldRendererProps {
  field: FieldConfig;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({ field }) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext();

  const {
    name,
    type,
    widget,
    label,
    placeholder,
    helpText,
    required,
    readonly,
    options,
    conditionalDisplay,
    validation,
    min,
    max,
  } = field;

  // Check conditional display
  if (conditionalDisplay) {
    const watchedValue = watch(conditionalDisplay.field);
    if (watchedValue !== conditionalDisplay.value) {
      return null;
    }
  }

  const error = errors[name]?.message as string | undefined;

  const renderWidget = () => {
    switch (widget) {
      case "text_input":
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <Input
                {...field}
                placeholder={placeholder}
                disabled={readonly}
                className={error ? "border-destructive" : ""}
              />
            )}
          />
        );

      case "textarea":
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder={placeholder}
                disabled={readonly}
                className={error ? "border-destructive" : ""}
              />
            )}
          />
        );

      case "number_input":
        return (
          <Controller
            name={name}
            control={control}
            rules={{
              ...validation,
              valueAsNumber: true,
            }}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                placeholder={placeholder}
                disabled={readonly}
                min={min}
                max={max}
                className={error ? "border-destructive" : ""}
              />
            )}
          />
        );

      case "checkbox":
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={readonly}
                />
                <Label className="text-sm font-normal">{label}</Label>
              </div>
            )}
          />
        );

      case "toggle":
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={readonly}
                />
                <Label className="text-sm font-normal">{label}</Label>
              </div>
            )}
          />
        );

      case "select":
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={readonly}
              >
                <SelectTrigger className={error ? "border-destructive" : ""}>
                  <SelectValue placeholder={placeholder || `Select ${label}`} />
                </SelectTrigger>
                <SelectContent>
                  {options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        );

      case "datetime_input":
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <Input
                {...field}
                type="datetime-local"
                placeholder={placeholder}
                disabled={readonly}
                className={error ? "border-destructive" : ""}
              />
            )}
          />
        );

      case "date_input":
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <Input
                {...field}
                type="date"
                placeholder={placeholder}
                disabled={readonly}
                className={error ? "border-destructive" : ""}
              />
            )}
          />
        );

      case "time_input":
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <Input
                {...field}
                type="time"
                placeholder={placeholder}
                disabled={readonly}
                className={error ? "border-destructive" : ""}
              />
            )}
          />
        );

      case "relationship_select":
        return (
          <RelationshipSelect
            name={name}
            control={control}
            placeholder={placeholder}
            disabled={readonly}
            error={error}
            validation={validation}
            relationshipType={field.type}
            targetComponent={field.targetComponent}
            displayField={field.displayField}
            foreignKey={field.foreignKey}
          />
        );

      case "json_editor":
        return (
          <JsonEditor
            name={name}
            control={control}
            placeholder={placeholder}
            disabled={readonly}
            error={error}
            validation={validation}
          />
        );

      case "file_upload":
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <FileUploadWidget
                value={field.value}
                onChange={field.onChange}
                multiple={type === "multi_file"}
                allowedTypes={["image/*", "application/pdf"]}
                maxFiles={5}
                maxFileSize={10 * 1024 * 1024} // 10MB
                required={required}
                disabled={readonly}
                label={label}
              />
            )}
          />
        );

      case "rich_text":
        return (
          <div key={field.name} className="col-span-2">
            <RichTextEditor
              name={name}
              control={control}
              placeholder={placeholder}
              disabled={readonly}
              error={error}
              validation={validation}
            />
          </div>
        );

      case "text_array":
        return (
          <TextArrayWidget
            name={name}
            control={control}
            placeholder={placeholder}
            disabled={readonly}
            error={error}
            validation={validation}
            maxItems={field.maxItems || 50}
            label={label}
          />
        );

      case "hidden":
        return (
          <Controller
            name={name}
            control={control}
            render={({ field }) => <input type="hidden" {...field} />}
          />
        );

      default:
        return (
          <Controller
            name={name}
            control={control}
            rules={validation}
            render={({ field }) => (
              <Input
                {...field}
                placeholder={placeholder}
                disabled={readonly}
                className={error ? "border-destructive" : ""}
              />
            )}
          />
        );
    }
  };

  if (widget === "hidden") {
    return renderWidget();
  }

  if (widget === "checkbox" || widget === "toggle") {
    return renderWidget();
  }

  if (widget === "text_array") {
    return (
      <div className="space-y-2">
        {renderWidget()}
        {helpText && (
          <p className="text-sm text-muted-foreground">{helpText}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label
        htmlFor={name}
        className={
          required
            ? "after:content-['*'] after:ml-0.5 after:text-destructive"
            : ""
        }
      >
        {label}
      </Label>
      {renderWidget()}
      {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
