"use client";

import React from "react";
import { Controller, Control } from "react-hook-form";
import { VirtualizedSelect } from "./VirtualizedSelect";
import { ForeignKey } from "@/lib/schema/types";

interface RelationshipSelectProps {
  name: string;
  control?: Control<any>;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  validation?: any;
  relationshipType?: string;
  targetComponent?: string;
  displayField?: string;
  required?: boolean;
  foreignKey?: ForeignKey;
}

export const RelationshipSelect: React.FC<RelationshipSelectProps> = ({
  name,
  control,
  placeholder,
  disabled = false,
  error,
  validation,
  targetComponent,
  displayField = "name",
  required,
  foreignKey,
}) => {
  if (control) {
    return (
      <Controller
        name={name}
        control={control}
        rules={validation}
        render={({ field, fieldState }) => {
          return (
            <VirtualizedSelect
              name={name}
              value={
                field.value && typeof field.value === "object"
                  ? field.value.id
                  : field.value || null
              }
              onChange={(value) => {
                field.onChange(value);
              }}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              error={fieldState.error?.message || error}
              targetComponent={targetComponent || ""}
              displayField={displayField}
              label={placeholder}
              foreignKey={foreignKey}
            />
          );
        }}
      />
    );
  }

  // Fallback for non-controlled usage
  return (
    <VirtualizedSelect
      name={name}
      value={null}
      onChange={() => {}}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={error}
      targetComponent={targetComponent || ""}
      displayField={displayField}
      label={placeholder}
      foreignKey={foreignKey}
    />
  );
};
