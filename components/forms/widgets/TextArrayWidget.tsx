"use client";

import React, { useState } from "react";
import { Control, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Edit2, Check, XCircle } from "lucide-react";

interface TextArrayWidgetProps {
  name: string;
  control: Control<any>;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  validation?: any;
  maxItems?: number;
  label?: string;
}

export const TextArrayWidget: React.FC<TextArrayWidgetProps> = ({
  name,
  control,
  placeholder = "Enter text",
  disabled = false,
  error,
  validation,
  maxItems = 50,
  label,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  return (
    <Controller
      name={name}
      control={control}
      rules={validation}
      render={({ field }) => {
        const items: string[] = Array.isArray(field.value) ? field.value : [];

        const addItem = () => {
          if (inputValue.trim() && !items.includes(inputValue.trim())) {
            if (items.length < maxItems) {
              field.onChange([...items, inputValue.trim()]);
              setInputValue("");
            }
          }
        };

        const removeItem = (index: number) => {
          const newItems = items.filter((_, i) => i !== index);
          field.onChange(newItems);
        };

        const startEdit = (index: number) => {
          setEditingIndex(index);
          setEditValue(items[index]);
        };

        const saveEdit = () => {
          if (editValue.trim() && editingIndex !== null) {
            const newItems = [...items];
            newItems[editingIndex] = editValue.trim();
            field.onChange(newItems);
            setEditingIndex(null);
            setEditValue("");
          }
        };

        const cancelEdit = () => {
          setEditingIndex(null);
          setEditValue("");
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addItem();
          }
        };

        const handleEditKeyPress = (e: React.KeyboardEvent) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            saveEdit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
          }
        };

        return (
          <div className="border-2 border-dashed border-border rounded-lg p-4 bg-background/50">
            {/* Field header with label */}
            {label && (
              <div className="mb-3 pb-2 border-b border-border/50">
                <h4 className="text-sm font-medium text-foreground/80">{label}</h4>
              </div>
            )}
            
            {/* Input row */}
            <div className="flex gap-2 mb-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className={error ? "border-destructive" : ""}
              />
              <Button
                type="button"
                onClick={addItem}
                disabled={
                  disabled || !inputValue.trim() || items.length >= maxItems
                }
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Items display */}
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-md p-3 bg-card shadow-sm"
                  >
                    {editingIndex === index ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          className="min-h-[60px] resize-none"
                          placeholder="Edit text..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={saveEdit}
                            size="sm"
                            variant="default"
                            className="h-7"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            type="button"
                            onClick={cancelEdit}
                            size="sm"
                            variant="outline"
                            className="h-7"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-muted-foreground block mb-1">
                            Item #{index + 1}
                          </span>
                          <p className="text-sm leading-relaxed break-words">
                            {item}
                          </p>
                        </div>
                        {!disabled && (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => startEdit(index)}
                              title="Edit item"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => removeItem(index)}
                              title="Remove item"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Item count indicator */}
            <div className="mt-3 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {items.length} item{items.length !== 1 ? "s" : ""}
                {maxItems && ` (max ${maxItems})`}
              </p>
            </div>
          </div>
        );
      }}
    />
  );
};
