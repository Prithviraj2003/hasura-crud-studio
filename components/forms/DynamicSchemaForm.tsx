"use client";

import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormConfig } from "@/lib/schema/FormGenerator";
import { SchemaRenderer } from "./SchemaRenderer";
import { FormActions } from "./FormActions";
import { FormIdManager } from "@/lib/services/FormIdManager";
import { ChangeDetector } from "@/lib/services/ChangeDetector";

interface DynamicSchemaFormProps {
  schemaName: string;
  entityId?: string;
  parentId?: string;
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

export const DynamicSchemaForm: React.FC<DynamicSchemaFormProps> = ({
  schemaName,
  entityId,
  parentId,
  onSave,
  onCancel,
}) => {
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("0");
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const methods = useForm({
    mode: "onBlur",
    defaultValues: {},
  });

  const {
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, isDirty },
  } = methods;

  // Get the current parent ID from form data
  const getCurrentParentId = (): string | undefined => {
    const formData = watch() as any;
    const primaryKeyField = formConfig?.schema?.schema_definition?.fields?.find(
      (field: any) => field.primary_key
    );

    if (primaryKeyField && formData[primaryKeyField.name]) {
      return formData[primaryKeyField.name];
    }

    return entityId;
  };

  // Track changes in form data
  useEffect(() => {
    if (!formConfig) return;

    const subscription = watch((value, { name, type }) => {
      if (type === "change" && name && !isProcessing) {
        setHasChanges(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, formConfig, isProcessing]);

  useEffect(() => {
    loadFormConfig();
  }, [schemaName, entityId, parentId]);

  const loadFormConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // This would be called from API route in production
      const params = new URLSearchParams();
      if (entityId) params.append("entityId", entityId);
      if (parentId) params.append("parentId", parentId);
      const queryString = params.toString();

      const response = await fetch(
        `/api/forms/${schemaName}${queryString ? `?${queryString}` : ""}`
      );

      if (!response.ok) {
        throw new Error("Failed to load form configuration");
      }

      const config = await response.json();
      setFormConfig(config);
      reset(config.initialData);
      setOriginalData(JSON.parse(JSON.stringify(config.initialData))); // Deep copy
      setHasChanges(false); // Reset changes when form loads
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (formData: any) => {
    // Prevent duplicate submissions
    if (isProcessing) {
      console.log(
        "Form submission already in progress, ignoring duplicate submit"
      );
      return;
    }

    try {
      setIsProcessing(true);
      console.log("Form submitted with data:", formData);

      if (formConfig?.mode === "edit" && originalData) {
        // Use intelligent change detection for edit mode
        const changes = ChangeDetector.detectChanges(
          originalData,
          formData,
          formConfig.relationships
        );

        console.log("Original data:", originalData);
        console.log("Current form data:", formData);
        console.log("Detected changes:", changes);
        console.log("Has main entity changes:", changes.hasMainEntityChanges);
        console.log(
          "Has relationship changes:",
          changes.hasRelationshipChanges
        );

        // Check if there are any actual changes to process
        if (!changes.hasMainEntityChanges && !changes.hasRelationshipChanges) {
          console.log("No changes detected, skipping submission");
          setIsProcessing(false);
          return;
        }

        if (changes.hasMainEntityChanges) {
          // Update main entity
          const processedMainData = await FormIdManager.processFormData(
            changes.mainEntityData,
            formConfig.schema
          );

          const response = await fetch(`/api/forms/${schemaName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: processedMainData,
              entityId,
              updateType: "main",
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              `Failed to update main entity: ${
                errorData.error || "Unknown error"
              }`
            );
          }

          const result = await response.json();
          console.log("Main entity update result:", result);
        }

        // Update relationships separately
        let relationshipUpdatePromises: Promise<any>[] = [];

        console.log(
          "Processing relationship changes:",
          changes.changedRelationships
        );

        for (const [relationshipName, relationshipChanges] of Object.entries(
          changes.changedRelationships
        )) {
          const relationship = formConfig.relationships.find(
            (r) => r.name === relationshipName
          );
          const relatedSchema =
            formConfig.relatedSchemas?.[relationship?.targetComponent || ""];
          console.log("relatedSchema", relationship);
          console.log(`Processing ${relationshipName}:`, {
            updated: relationshipChanges.updated.length,
            added: relationshipChanges.added.length,
            deleted: relationshipChanges.deleted.length,
          });

          // Skip if no actual changes
          if (
            relationshipChanges.updated.length === 0 &&
            relationshipChanges.added.length === 0 &&
            relationshipChanges.deleted.length === 0
          ) {
            console.log(`Skipping ${relationshipName} - no actual changes`);
            continue;
          }

          if (relationshipChanges.updated.length > 0) {
            console.log(
              `Updating ${relationshipChanges.updated.length} items in ${relationshipName}`
            );
            // Update existing relationship items
            for (const item of relationshipChanges.updated) {
              const processedItem = await FormIdManager.processFormData(
                item,
                relatedSchema
              );

              const response = await fetch(
                `/api/data/${relationship?.targetComponent}/${item.id}`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ data: processedItem }),
                }
              );

              if (!response.ok) {
                const errorData = await response.json();
                console.error(
                  `Failed to update ${relationship?.targetComponent}:`,
                  errorData
                );
                throw new Error(
                  `Failed to update ${relationship?.targetComponent}: ${
                    errorData.error || "Unknown error"
                  }`
                );
              }

              const result = await response.json();
              console.log(`Updated ${relationship?.targetComponent}:`, result);
            }
          }

          if (relationshipChanges.added.length > 0) {
            console.log(
              `Adding ${relationshipChanges.added.length} items to ${relationshipName}`
            );
            // Add new relationship items
            const parentId = formData.id || entityId;
            const foreignKeyField = FormIdManager.getForeignKeyField(
              relatedSchema,
              relationshipName
            );

            const processedItems = await FormIdManager.processRelationshipData(
              relationshipChanges.added,
              relatedSchema,
              parentId,
              foreignKeyField
            );

            for (const item of processedItems) {
              const response = await fetch(
                `/api/data/${relationship?.targetComponent}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ data: item }),
                }
              );

              if (!response.ok) {
                const errorData = await response.json();
                console.error(
                  `Failed to create ${relationship?.targetComponent}:`,
                  errorData
                );
                throw new Error(
                  `Failed to create ${relationship?.targetComponent}: ${
                    errorData.error || "Unknown error"
                  }`
                );
              }
            }
          }

          if (relationshipChanges.deleted.length > 0) {
            console.log(
              `Deleting ${relationshipChanges.deleted.length} items from ${relationshipName}`
            );
            // Delete relationship items
            for (const item of relationshipChanges.deleted) {
              const response = await fetch(
                `/api/data/${relationship?.targetComponent}/${item.id}`,
                {
                  method: "DELETE",
                }
              );

              if (!response.ok) {
                const errorData = await response.json();
                console.error(
                  `Failed to delete ${relationship?.targetComponent}:`,
                  errorData
                );
                throw new Error(
                  `Failed to delete ${relationship?.targetComponent}: ${
                    errorData.error || "Unknown error"
                  }`
                );
              }
            }
          }
        }

        console.log("All changes saved successfully");

        // Reset form state after successful save
        await resetFormState();

        // Force a small delay to ensure state updates are processed
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Final verification that the form state is clean
        console.log("Final form state check:");
        console.log("- hasChanges:", hasChanges);
        console.log("- isDirty:", isDirty);
        console.log("- isSubmitting:", isSubmitting);
        console.log("- isProcessing:", isProcessing);
      } else {
        // Create mode - use original flow
        const processedData = await processFormData(formData, formConfig!);

        const response = await fetch(`/api/forms/${schemaName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: processedData,
            entityId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Create mode API error:", errorData);
          throw new Error(
            `Failed to save data: ${
              errorData.error || errorData.message || "Unknown error"
            }`
          );
        }

        const result = await response.json();
        console.log("Save successful:", result);

        // Reset form state after successful save
        await resetFormState();

        // Force a small delay to ensure state updates are processed
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Final verification that the form state is clean
        console.log("Final form state check (create mode):");
        console.log("- hasChanges:", hasChanges);
        console.log("- isDirty:", isDirty);
        console.log("- isSubmitting:", isSubmitting);
        console.log("- isProcessing:", isProcessing);
      }

      // Clear any previous errors on successful save
      setError(null);

      if (onSave) {
        onSave({ success: true });
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Resets the form state after successful save
   */
  const resetFormState = async () => {
    if (formConfig?.mode === "edit" && entityId) {
      // For edit mode, reload the data from the server to get the actual saved state
      try {
        console.log("Reloading data from server after save...");
        const params = new URLSearchParams();
        params.append("entityId", entityId);
        if (parentId) params.append("parentId", parentId);

        const response = await fetch(
          `/api/forms/${schemaName}?${params.toString()}`
        );

        if (response.ok) {
          const config = await response.json();
          const serverData = config.initialData;

          console.log("Server data after save:", serverData);

          // Update the original data with the server response
          setOriginalData(JSON.parse(JSON.stringify(serverData)));

          // Reset the form with the server data
          reset(serverData, {
            keepDirty: false,
            keepTouched: false,
            keepErrors: false,
          });

          // Reset the hasChanges flag
          setHasChanges(false);

          console.log("Form state reset successfully - reloaded from server");
        } else {
          console.error("Failed to reload data from server");
          // Fallback to current form data
          const currentFormData = watch() as any;
          setOriginalData(JSON.parse(JSON.stringify(currentFormData)));
          reset(currentFormData, {
            keepDirty: false,
            keepTouched: false,
            keepErrors: false,
          });
          setHasChanges(false);
        }
      } catch (error) {
        console.error("Error reloading data:", error);
        // Fallback to current form data
        const currentFormData = watch() as any;
        setOriginalData(JSON.parse(JSON.stringify(currentFormData)));
        reset(currentFormData, {
          keepDirty: false,
          keepTouched: false,
          keepErrors: false,
        });
        setHasChanges(false);
      }
    } else {
      // For create mode, just reset the form to default values
      const defaultValues = formConfig?.initialData || {};
      reset(defaultValues, {
        keepDirty: false,
        keepTouched: false,
        keepErrors: false,
      });
      setOriginalData(JSON.parse(JSON.stringify(defaultValues)));
      setHasChanges(false);
      console.log("Form state reset successfully - reset to defaults");
    }
  };

  const processFormData = async (data: any, config: FormConfig) => {
    let processedData = { ...data };
    console.log("processedData", processedData);

    // Generate IDs for auto_generate fields in the main form
    processedData = await FormIdManager.processFormData(
      processedData,
      config.schema
    );

    // Process relationships
    for (const relationship of config.relationships) {
      console.log("data", data);
      if (data[relationship.name] && Array.isArray(data[relationship.name])) {
        const relatedSchema =
          config.relatedSchemas?.[relationship.targetComponent];
        const foreignKeyField = FormIdManager.getForeignKeyField(
          relatedSchema,
          relationship.name
        );

        const relationshipData = await FormIdManager.processRelationshipData(
          data[relationship.name],
          relatedSchema,
          processedData.id || entityId || "",
          foreignKeyField
        );
        console.log("relationshipData", relationshipData);
        processedData[relationship.name] = relationshipData;
      }
    }

    return processedData;
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Loading form configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!formConfig) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>No form configuration found.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hasTabs = formConfig.layout?.tabs && formConfig.layout.tabs.length > 1;

  console.log("activeTab", activeTab);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-4">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <CardTitle className="text-xl font-semibold">
            {formConfig.mode === "create" ? "Create" : "Edit"}{" "}
            {formConfig.schema.name}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {hasTabs ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  {formConfig.layout.tabs.map((tab: any, index: number) => (
                    <TabsTrigger key={tab.name} value={index.toString()}>
                      {tab.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {formConfig.layout.tabs.map((tab: any, index: number) => (
                  <TabsContent key={tab.name} value={index.toString()}>
                    <div className="flex items-center space-x-4"></div>
                    <SchemaRenderer
                      config={formConfig}
                      sections={tab.sections}
                      relationships={tab.relationships}
                      parentId={getCurrentParentId()}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <SchemaRenderer
                config={formConfig}
                parentId={getCurrentParentId()}
              />
            )}

            <FormActions
              isSubmitting={isSubmitting}
              isDirty={isDirty}
              mode={formConfig.mode}
              onCancel={onCancel}
              hasChanges={hasChanges}
              isProcessing={isProcessing}
            />
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};
