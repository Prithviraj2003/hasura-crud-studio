import { IdGeneratorService } from "./IdGeneratorService";

export class FormIdManager {
  /**
   * Generates IDs for all auto_generate=true fields in the form data
   */
  static async processFormData(data: any, schema: any): Promise<any> {
    const processedData = { ...data };

    if (schema?.schema_definition?.fields) {
      for (const field of schema.schema_definition.fields) {
        if (field.auto_generate && field.primary_key) {
          // Only generate ID if it's not already set or is a temporary ID
          if (
            !processedData[field.name] ||
            processedData[field.name].startsWith("temp_")
          ) {
            try {
              processedData[field.name] = await IdGeneratorService.generateId();
            } catch (error) {
              console.error(
                "Failed to generate ID for field:",
                field.name,
                error
              );
              // Keep the temporary ID or generate a fallback
              if (!processedData[field.name]) {
                processedData[field.name] = `temp_${Date.now()}_${Math.random()
                  .toString(36)
                  .substr(2, 9)}`;
              }
            }
          }
        }
      }
    }

    return processedData;
  }

  /**
   * Processes relationship data to ensure proper reference IDs and generated IDs
   */
  static async processRelationshipData(
    relationshipData: any[],
    relatedSchema: any,
    parentId: string,
    foreignKeyField: string
  ): Promise<any[]> {
    if (!Array.isArray(relationshipData)) {
      return [];
    }

    const processedItems = [];

    for (const item of relationshipData) {
      console.log("item", item);
      const processedItem = { ...item };
      console.log("relatedSchema", relatedSchema);

      // Set the foreign key (reference_id) - use the tracked field if available
      const parentIdField = processedItem._parentIdField || foreignKeyField;
      console.log("parentIdField", parentIdField);
      // Check if the field has auto_populate from parent_context
      if (relatedSchema?.schema_definition?.fields) {
        const fields = relatedSchema?.schema_definition?.fields;
        for (const field of fields) {
          if (
            field.name === parentIdField &&
            field.ui_config?.auto_populate?.source === "parent_context"
          ) {
            // Auto-populate the field from parent context
            processedItem[field.name] = parentId;
          }
        }
      }

      // Clean up tracking field
      delete processedItem._parentIdField;

      // Generate IDs for auto_generate fields in the relationship
      if (relatedSchema?.schema_definition?.fields) {
        for (const field of relatedSchema.schema_definition.fields) {
          if (field.auto_generate && field.primary_key) {
            if (
              !processedItem[field.name] ||
              processedItem[field.name].startsWith("temp_")
            ) {
              try {
                processedItem[field.name] =
                  await IdGeneratorService.generateId();
              } catch (error) {
                console.error(
                  "Failed to generate ID for relationship field:",
                  field.name,
                  error
                );
                if (!processedItem[field.name]) {
                  processedItem[
                    field.name
                  ] = `temp_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 9)}`;
                }
              }
            }
          }
        }
      }

      processedItems.push(processedItem);
    }

    return processedItems;
  }

  /**
   * Gets the foreign key field name for a relationship
   */
  static getForeignKeyField(
    relatedSchema: any,
    relationshipName: string
  ): string {
    console.log("relatedSchema in getForeignKeyField", relationshipName);
    if (!relatedSchema?.schema_definition?.fields) {
      console.log(
        "relatedSchema?.schema_definition?.fields",
        relatedSchema?.schema_definition?.fields
      );
      return `${relationshipName.split("_")[0]}_id`;
    }

    // Look for a field that has foreign_key configuration
    const foreignKeyField = relatedSchema.schema_definition.fields.find(
      (field: any) => field.foreign_key && field.name.includes("_id")
    );
    console.log("foreignKeyField in getForeignKeyField", foreignKeyField);

    if (foreignKeyField) {
      return foreignKeyField.name;
    }

    // Fallback to common naming patterns
    const possibleKeys = [
      `${relationshipName.split("_")[0]}_id`,
      "parent_id",
      "reference_id",
    ];

    for (const key of possibleKeys) {
      console.log("key in getForeignKeyField", key);
      const field = relatedSchema.schema_definition.fields.find(
        (f: any) => f.name === key
      );
      if (field) {
        return key;
      }
    }

    // Default fallback
    return `${relationshipName.split("_")[0]}_id`;
  }
}
