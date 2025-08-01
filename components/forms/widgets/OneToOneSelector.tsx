"use client";

import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ForeignKey } from "@/lib/schema/types";
import { requestCache } from "@/lib/cache/RequestCache";

interface OneToOneSelectorProps {
  fieldName: string;
  fieldKey: string;
  label: string;
  foreignKey: ForeignKey;
  value: string | null;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  onChange: (value: string | null) => void;
  displayField?: string;
}

export const OneToOneSelector: React.FC<OneToOneSelectorProps> = ({
  fieldName,
  fieldKey,
  label,
  foreignKey,
  value,
  required = false,
  placeholder,
  helpText,
  onChange,
  displayField = "name",
}) => {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (foreignKey?.table) {
      loadOptions();
    }
  }, [foreignKey?.table]);

  const loadOptions = async () => {
    if (!foreignKey?.table) return;

    try {
      setLoading(true);
      setError(null);

      // Generate cache key
      const cacheKey = requestCache.getOptionsKey(
        foreignKey.table,
        100,
        displayField,
        "asc"
      );

      // Use cache to prevent duplicate requests and consistent GET method
      const result = await requestCache.get(cacheKey, async () => {
        console.log(
          "foreignKey.table in one to one selector",
          foreignKey.table
        );
        const url = `/api/graphql/options/${foreignKey.table}?limit=100&orderBy=${displayField}&direction=asc`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch options: ${response.statusText}`);
        }

        return await response.json();
      });

      const data = result.data || [];
      setOptions(data);
    } catch (err: any) {
      console.error("Failed to load relationship options:", err);
      setError(`Failed to load options from ${foreignKey.table}`);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayValue = (option: any) => {
    // Try to get a meaningful display value
    if (option[displayField] && option[displayField] !== option.id) {
      return option[displayField];
    }

    // Fallback to common fields
    const fallbackFields = ["name", "title", "label"];
    for (const field of fallbackFields) {
      if (option[field]) {
        return option[field];
      }
    }

    // Final fallback to ID
    return option.id;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldKey}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <Select
        value={value || ""}
        onValueChange={(selectedValue) => {
          onChange(selectedValue === "" ? null : selectedValue);
        }}
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              loading
                ? "Loading..."
                : placeholder || `Select ${label.toLowerCase()}`
            }
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {getDisplayValue(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      {!error && !helpText && (
        <p className="text-xs text-muted-foreground">
          Related to: {foreignKey.table}
        </p>
      )}
    </div>
  );
};
