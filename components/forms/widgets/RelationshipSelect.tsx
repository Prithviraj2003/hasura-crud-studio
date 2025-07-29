"use client";

import React, { useState, useEffect } from "react";
import { Controller, Control } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Helper function to get display value from nested objects
function getDisplayValue(option: any, displayField: string): string {
  if (!displayField.includes(".")) {
    return option[displayField];
  }

  const [parent, child] = displayField.split(".");
  return option[parent]?.[child];
}

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
}) => {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetComponent) {
      loadOptions();
    } else {
      setLoading(false);
    }
  }, [targetComponent, displayField]);

  const loadOptions = async () => {
    if (!targetComponent) return;

    try {
      setLoading(true);

      const url = `/api/graphql/options/${targetComponent}?limit=100&orderBy=${displayField}&direction=asc`;

      // Use the dedicated options API endpoint
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch options: ${response.statusText}`);
      }

      const result = await response.json();

      const data = result.data || [];
      setOptions(data);
    } catch (err) {
      console.error("Failed to load options:", err);
      setOptions([]); // Ensure options is set to empty array on error
    } finally {
      setLoading(false);
    }
  };
  if (control) {
    return (
      <Controller
        name={name}
        control={control}
        rules={validation}
        render={({ field, fieldState }) => {
          return (
            <div className="space-y-2">
              {placeholder && (
                <Label
                  htmlFor={name}
                  className={
                    required
                      ? "after:content-['*'] after:ml-0.5 after:text-destructive"
                      : ""
                  }
                >
                  {placeholder}
                </Label>
              )}
              <Select
                value={
                  field.value && typeof field.value === "object"
                    ? field.value.id
                    : field.value || "none"
                }
                onValueChange={(value: string) => {
                  field.onChange(value === "none" ? null : value);
                }}
                disabled={disabled || loading}
              >
                <SelectTrigger
                  className={
                    fieldState.error?.message || error
                      ? "border-destructive"
                      : ""
                  }
                >
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {loading && (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  )}
                  {!loading && options.length === 0 && (
                    <SelectItem value="no-options" disabled>
                      No options available
                    </SelectItem>
                  )}
                  {options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {getDisplayValue(option, displayField) || option.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(fieldState.error?.message || error) && (
                <p className="text-sm text-destructive">
                  {fieldState.error?.message || error}
                </p>
              )}
            </div>
          );
        }}
      />
    );
  }

  // Fallback for non-controlled usage
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
        {placeholder}
      </Label>
      <Select disabled={disabled || loading}>
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {loading && (
            <SelectItem value="loading" disabled>
              Loading...
            </SelectItem>
          )}
          {!loading && options.length === 0 && (
            <SelectItem value="no-options" disabled>
              No options available
            </SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {getDisplayValue(option, displayField) || option.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
