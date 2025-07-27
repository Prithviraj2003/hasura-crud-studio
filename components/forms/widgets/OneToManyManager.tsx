"use client";

import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { RelationshipConfig } from "@/lib/schema/FormGenerator";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";
import { IdGeneratorService } from "@/lib/services/IdGeneratorService";

interface OneToManyManagerProps {
  relationship: RelationshipConfig;
  fieldName: string;
  relatedSchema?: any;
  className?: string;
  parentId?: string; // The ID of the parent record for reference_id
}

export const OneToManyManager: React.FC<OneToManyManagerProps> = ({
  relationship,
  fieldName,
  relatedSchema,
  className = "",
  parentId,
}) => {
  const { watch, setValue } = useFormContext();
  const items = watch(fieldName) || [];
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const addItem = async () => {
    const newItem = await createEmptyItem(relatedSchema, parentId);
    setValue(fieldName, [...items, newItem], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    // Expand the newly added item
    setExpandedItems((prev) => new Set(prev).add(items.length));
  };

  const removeItem = (index: number) => {
    setValue(
      fieldName,
      items.filter((_: any, i: number) => i !== index),
      { shouldDirty: true, shouldTouch: true, shouldValidate: true }
    );
    // Remove from expanded items
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      // Adjust indices for items after the removed one
      const adjustedSet = new Set<number>();
      newSet.forEach((expandedIndex) => {
        if (expandedIndex < index) {
          adjustedSet.add(expandedIndex);
        } else if (expandedIndex > index) {
          adjustedSet.add(expandedIndex - 1);
        }
      });
      return adjustedSet;
    });
  };

  const updateItem = (index: number, updatedItem: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], ...updatedItem };
    setValue(fieldName, updatedItems, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const toggleItemExpansion = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const createEmptyItem = async (schema: any, parentId?: string) => {
    const emptyItem: any = {};

    if (schema?.schema_definition?.fields) {
      for (const field of schema.schema_definition.fields) {
        if (field.auto_generate && field.primary_key) {
          // Generate ID from the API for auto_generate=true fields
          try {
            emptyItem[field.name] = await IdGeneratorService.generateId();
          } catch (error) {
            console.error("Failed to generate ID, using fallback:", error);
            emptyItem[field.name] = `temp_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`;
          }
        } else if (field.default !== undefined) {
          emptyItem[field.name] = field.default;
        } else if (field.type === "boolean") {
          emptyItem[field.name] = false;
        } else if (field.type === "integer" || field.type === "decimal") {
          emptyItem[field.name] = field.validation?.min || 0;
        } else if (field.type === "text") {
          emptyItem[field.name] = "";
        }

        // Handle auto-population based on schema configuration
        if (field.ui_config?.auto_populate && parentId) {
          const autoPopulate = field.ui_config.auto_populate;

          if (autoPopulate.source === "parent_context") {
            emptyItem[field.name] = parentId;
          }
        }
      }
    }

    // Set the reference_id (foreign key) to link back to parent
    // Find the foreign key field that references the parent table, but skip fields already set by auto-population
    const foreignKeyField = schema?.schema_definition?.fields?.find(
      (field: any) =>
        field.foreign_key &&
        field.name.includes("_id") &&
        emptyItem[field.name] === undefined && // Don't overwrite auto-populated fields
        field.foreign_key.table === "health_product_variants" // Make sure it's the right parent table
    );

    if (foreignKeyField) {
      // Set to parentId if available, otherwise mark as pending
      emptyItem[foreignKeyField.name] = parentId || null;
      emptyItem._parentIdField = foreignKeyField.name; // Track which field needs the parent ID
    } else {
      // Fallback: try common naming patterns, but don't overwrite existing values
      const possibleKeys = [
        `${relationship.name.split("_")[0]}_id`,
        "parent_id",
        "reference_id",
      ];

      for (const key of possibleKeys) {
        const field = schema?.schema_definition?.fields?.find(
          (f: any) => f.name === key
        );
        if (field && emptyItem[key] === undefined) {
          // Don't overwrite existing values
          emptyItem[key] = parentId || null;
          emptyItem._parentIdField = key; // Track which field needs the parent ID
          break;
        }
      }
    }

    return emptyItem;
  };

  const getDisplayValue = (item: any) => {
    // Try to find a suitable display field
    const displayField = relationship.displayField || "name";
    if (displayField.includes(".")) {
      const key_list = displayField.split(".");
      let value = item;
      for (const key of key_list) {
        if (!value) {
          return "";
        }
        value = value[key];
      }
      return value;
    }

    if (item[displayField]) {
      return item[displayField];
    }

    // Fallback to first text field
    if (relatedSchema?.schema_definition?.fields) {
      const textField = relatedSchema.schema_definition.fields.find(
        (f: any) => f.type === "text" && f.name !== "id"
      );
      if (textField && item[textField.name]) {
        return item[textField.name];
      }
    }

    return item.id || `Item ${items.indexOf(item) + 1}`;
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const updatedItems = [...items];
    const [movedItem] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, movedItem);
    setValue(fieldName, updatedItems, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    // Update expanded items indices
    setExpandedItems((prev) => {
      const newSet = new Set<number>();
      prev.forEach((expandedIndex) => {
        let newIndex = expandedIndex;
        if (expandedIndex === fromIndex) {
          newIndex = toIndex;
        } else if (expandedIndex < fromIndex && expandedIndex >= toIndex) {
          newIndex = expandedIndex + 1;
        } else if (expandedIndex > fromIndex && expandedIndex <= toIndex) {
          newIndex = expandedIndex - 1;
        }
        newSet.add(newIndex);
      });
      return newSet;
    });
  };

  return (
    <Card className={`border-l-4 border-l-blue-500 ${className}`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 h-auto"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <h3 className="font-semibold text-sm">{relationship.title}</h3>
            <Badge variant="secondary" className="text-xs">
              {items.length}
            </Badge>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="flex items-center space-x-1 text-xs h-7"
          >
            <Plus className="h-3 w-3" />
            <span>Add an entry</span>
          </Button>
        </div>

        {/* Content */}
        {!isCollapsed && (
          <div className="p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  No {relationship.title.toLowerCase()} added yet
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add first entry
                </Button>
              </div>
            ) : (
              items.map((item: any, index: number) => {
                const isExpanded = expandedItems.has(index);
                const displayValue = getDisplayValue(item);

                return (
                  <Card
                    key={index}
                    className="border border-slate-200 dark:border-slate-700"
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between p-3 bg-slate-25 dark:bg-slate-900">
                      <div className="flex items-center space-x-2 flex-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleItemExpansion(index)}
                          className="p-1 h-auto"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>

                        <div className="flex items-center space-x-2 flex-1">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {String.fromCharCode(65 + index)}
                            </span>
                          </div>
                          <span className="text-sm font-medium truncate">
                            {displayValue}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="p-1 h-auto text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto"
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => toggleItemExpansion(index)}
                            >
                              {isExpanded ? "Collapse" : "Expand"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                moveItem(index, Math.max(0, index - 1))
                              }
                              disabled={index === 0}
                            >
                              Move Up
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                moveItem(
                                  index,
                                  Math.min(items.length - 1, index + 1)
                                )
                              }
                              disabled={index === items.length - 1}
                            >
                              Move Down
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => removeItem(index)}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="cursor-grab hover:cursor-grabbing">
                          <GripVertical className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* Item Content */}
                    {isExpanded && relatedSchema && (
                      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <DynamicFieldRenderer
                          schema={relatedSchema}
                          item={item}
                          itemIndex={index}
                          fieldName={fieldName}
                          onUpdate={(updatedItem) =>
                            updateItem(index, updatedItem)
                          }
                        />
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
