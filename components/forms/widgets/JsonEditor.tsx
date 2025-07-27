"use client";

import React, { useState } from "react";
import { Controller, Control } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface JsonEditorProps {
  name: string;
  control: Control<any>;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  validation?: any;
  required?: boolean;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({
  name,
  control,
  placeholder = "{}",
  disabled = false,
  error,
  validation,
  required,
}) => {
  const [jsonError, setJsonError] = useState<string | null>(null);

  const validateJson = (value: string) => {
    if (!value || value.trim() === "") {
      setJsonError(null);
      return true;
    }

    try {
      JSON.parse(value);
      setJsonError(null);
      return true;
    } catch (e) {
      setJsonError("Invalid JSON format");
      return false;
    }
  };

  return (
    <Controller
      name={name}
      control={control}
      rules={{
        ...validation,
        validate: {
          ...validation?.validate,
          json: validateJson,
        },
      }}
      render={({ field, fieldState }) => {
        const displayError = fieldState.error?.message || jsonError || error;

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
              JSON Data
            </Label>
            <Textarea
              {...field}
              placeholder={placeholder}
              disabled={disabled}
              className={`font-mono min-h-[200px] ${
                displayError ? "border-destructive" : ""
              }`}
              value={field.value ? JSON.stringify(field.value, null, 2) : ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                const value = e.target.value;

                if (!value || value.trim() === "") {
                  field.onChange(null);
                  return;
                }

                try {
                  const parsed = JSON.parse(value);
                  field.onChange(parsed);
                  setJsonError(null);
                } catch (err) {
                  // Keep the string value for editing
                  field.onChange(value);
                  setJsonError("Invalid JSON format");
                }
              }}
            />
            <p className="text-sm text-muted-foreground">
              Enter valid JSON data
            </p>
            {displayError && (
              <p className="text-sm text-destructive">{displayError}</p>
            )}
          </div>
        );
      }}
    />
  );
};
