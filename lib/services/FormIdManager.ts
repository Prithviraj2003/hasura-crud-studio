import { Field, Schema } from "../schema/types";
export class FormIdManager {
  /**
   * Generates IDs for all auto_generate=true fields in the form data
   */
  static async processFormData(data: any, schema: Schema): Promise<any> {
    const processedData = { ...data };

    if (schema?.schema_definition?.fields) {
      for (const field of schema.schema_definition.fields) {
        // if (field.auto_generate && field.primary_key) {
        //   // Only generate ID if it's not already set or is a temporary ID
        //   if (
        //     !processedData[field.name] ||
        //     processedData[field.name].startsWith("temp_")
        //   ) {
        //     try {
        //       processedData[field.name] = await IdGeneratorService.generateId();
        //     } catch (error) {
        //       console.error("Failed to generate ID for field:", field.name, error);
        //       // Keep the temporary ID or generate a fallback
        //       if (!processedData[field.name]) {
        //         processedData[field.name] = `temp_${Date.now()}_${Math.random()
        //           .toString(36)
        //           .substr(2, 9)}`;
        //       }
        //     }
        //   }
        // }
      }
    }

    return processedData;
  }

  /**
   * Processes relationship data to ensure proper reference IDs and generated IDs
   */
  static async processRelationshipData(
    relationshipData: any[],
    relatedSchema: Schema,
    parentId: string,
    foreignKeyField: string
  ): Promise<any[]> {
    if (!Array.isArray(relationshipData)) {
      return [];
    }

    const processedItems = [];

    for (const item of relationshipData) {
      const processedItem = { ...item };

      // Set the foreign key (reference_id) - use the tracked field if available
      const parentIdField = processedItem._parentIdField || foreignKeyField;
      // Check if the field has auto_populate from parent_context
      if (relatedSchema?.schema_definition?.fields) {
        const fields = relatedSchema?.schema_definition?.fields;
        for (const field of fields) {
          if (
            field.name === parentIdField &&
            field?.auto_populate?.source === "parent_context"
          ) {
            // Auto-populate the field from parent context
            processedItem[field.name] = parentId;
          }
        }
      }

      // Clean up tracking field
      delete processedItem._parentIdField;

      processedItems.push(processedItem);
    }

    return processedItems;
  }

  /**
   * Gets the foreign key field name for a relationship
   */
  static getForeignKeyField(
    relatedSchema: Schema,
    relationshipName: string
  ): string {
    if (!relatedSchema?.schema_definition?.fields) {
      return `${relationshipName.split("_")[0]}_id`;
    }

    // Look for a field that has foreign_key configuration
    const foreignKeyField = relatedSchema.schema_definition.fields.find(
      (field: Field) => field.foreign_key && field.name.includes("_id")
    );

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
      const field = relatedSchema.schema_definition.fields.find(
        (f: Field) => f.name === key
      );
      if (field) {
        return key;
      }
    }

    // Default fallback
    return `${relationshipName.split("_")[0]}_id`;
  }
}
