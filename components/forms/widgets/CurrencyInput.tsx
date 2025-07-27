"use client";

import React from "react";
import { Controller, Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CurrencyInputProps {
  name: string;
  control: Control<any>;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  currency?: string;
  validation?: any;
  required?: boolean;
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "Fr",
  CNY: "¥",
  INR: "₹",
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  name,
  control,
  placeholder,
  disabled = false,
  error,
  currency = "USD",
  validation,
  required,
}) => {
  const symbol = currencySymbols[currency] || currency;

  return (
    <Controller
      name={name}
      control={control}
      rules={validation}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <Label
            htmlFor={name}
            className={
              required
                ? "after:content-['*'] after:ml-0.5 after:text-destructive"
                : ""
            }
          >
            {placeholder || "Amount"}
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 text-muted-foreground text-sm">
              {symbol}
            </div>
            <Input
              {...field}
              type="number"
              placeholder="0.00"
              disabled={disabled}
              step={0.01}
              min={0}
              className={`pl-10 ${
                fieldState.error?.message || error ? "border-destructive" : ""
              }`}
              value={field.value || ""}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                field.onChange(value);
              }}
            />
          </div>
          {(fieldState.error?.message || error) && (
            <p className="text-sm text-destructive">
              {fieldState.error?.message || error}
            </p>
          )}
        </div>
      )}
    />
  );
};
