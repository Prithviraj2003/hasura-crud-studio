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
  const [options, setOptions] = useState<
    {
      value: string;
      label: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (foreignKey?.hasura_table) {
      loadOptions();
    }
  }, [foreignKey?.hasura_table]);

  const loadOptions = async () => {
    if (!foreignKey?.hasura_table) return;

    try {
      setLoading(true);
      setError(null);

      // Generate cache key
      const cacheKey = requestCache.getOptionsKey(
        foreignKey.hasura_table,
        100,
        displayField,
        "asc"
      );

      // Use cache to prevent duplicate requests and consistent GET method
      const result = await requestCache.get(cacheKey, async () => {
        const url = `/api/graphql/options/${foreignKey.hasura_table}?orderBy=${displayField}&direction=asc&labelField=${displayField}&valueField=${foreignKey.column}`;

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
      setError(`Failed to load options from ${foreignKey.hasura_table}`);
    } finally {
      setLoading(false);
    }
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
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      {!error && !helpText && (
        <p className="text-xs text-muted-foreground">
          Related to: {foreignKey.hasura_table}
        </p>
      )}
    </div>
  );
};
