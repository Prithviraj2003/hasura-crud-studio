import { Schema, Field, Relationship, ForeignKey } from "./types";
import { SchemaManager } from "./SchemaManager";
import { gql } from "@apollo/client";

export interface FormConfig {
  schema: Schema;
  mode: "create" | "edit";
  entityId?: string;
  fields: FieldConfig[];
  relationships: RelationshipConfig[];
  validation: any;
  layout: any;
  initialData: any;
  relatedSchemas?: Record<string, Schema>;
}

export interface FieldConfig {
  name: string;
  type: string;
  widget: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  hidden: boolean;
  readonly: boolean;
  validation?: any;
  options?: any[];
  conditionalDisplay?: any;
  min?: number;
  max?: number;
  grid_cols?: number;
  // File upload specific properties
  allowedTypes?: string[];
  maxFiles?: number;
  maxFileSize?: number;
  maxItems?: number;
  targetComponent?: string;
  displayField?: string;
  foreignKey?: ForeignKey;
}

export interface RelationshipConfig {
  name: string;
  type: string;
  targetComponent: string;
  title: string;
  required: boolean;
  allowCreate: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
  sortable?: boolean;
  maxItems?: number;
  sourceField?: string;
  displayField?: string;
}

export class FormGenerator {
  private schemaManager: SchemaManager;

  constructor(schemaManager: SchemaManager) {
    this.schemaManager = schemaManager;
  }

  async generateFormConfig(
    schemaName: string,
    entityId?: string,
    contextData?: any
  ): Promise<FormConfig> {
    const schemaWithRelated = await this.schemaManager.getSchemaWithRelated(
      schemaName
    );
    const schema = schemaWithRelated?.schema;
    if (!schema) {
      // Return a default form configuration when schema is not found
      console.warn(
        `Schema not found: ${schemaName} - using default configuration`
      );

      const defaultSchema: Schema = {
        id: "default",
        name: schemaName,
        type: "page",
        version: "1.0",
        schema_definition: {
          fields: [
            {
              name: "id",
              type: "text" as any,
              graphql_type: "String",
              required: true,
              primary_key: true,
              auto_generate: false,
              readonly: false,
              validation: { min_length: 1, max_length: 16 },
              ui_config: {
                label: "Id",
                placeholder: "Enter variant ID",
                widget: "text_input",
                help_text: "generated id for this variant",
              },
            },
            {
              name: "name",
              type: "text" as any,
              graphql_type: "String",
              required: true,
              primary_key: false,
              auto_generate: false,
              readonly: false,
              validation: { min_length: 2, max_length: 200 },
              ui_config: {
                label: "Variant Name",
                placeholder: "Enter variant name",
                widget: "text_input",
                help_text: "A descriptive name for this variant",
              },
            },
            {
              name: "sku",
              type: "text" as any,
              graphql_type: "String",
              required: true,
              primary_key: false,
              auto_generate: false,
              readonly: false,
              validation: { max_length: 50 },
              ui_config: {
                label: "SKU",
                placeholder: "e.g., PROD-001-VAR",
                widget: "text_input",
              },
            },
            {
              name: "price",
              type: "decimal" as any,
              graphql_type: "Float",
              required: true,
              primary_key: false,
              auto_generate: false,
              readonly: false,
              validation: { min: 0, max: 999999.99 },
              ui_config: {
                label: "Price",
                widget: "currency_input",
              },
            },
          ],
        },
        relationships: [],
        ui_schema: {
          form_layout: {
            sections: [
              {
                title: "Basic Information",
                fields: ["id", "name", "sku"],
                columns: 2,
              },
              {
                title: "Pricing",
                fields: ["price"],
                columns: 1,
              },
            ],
          },
        },
        description: "Default variant schema for demonstration",
        updated_at: new Date().toISOString(),
      };

      const formConfig: FormConfig = {
        schema: defaultSchema,
        mode: entityId ? "edit" : "create",
        entityId: entityId,
        fields: this.generateFieldConfigs(
          defaultSchema.schema_definition.fields,
          defaultSchema.relationships,
          entityId ? "edit" : "create"
        ),
        relationships: [],
        validation: this.generateValidationRules(
          defaultSchema.schema_definition.fields
        ),
        layout:
          defaultSchema.ui_schema?.form_layout ||
          this.generateDefaultLayout(defaultSchema),
        initialData: this.getDefaultValues(
          defaultSchema.schema_definition.fields,
          contextData
        ),
        relatedSchemas: {},
      };

      return formConfig;
    }

    const formConfig: FormConfig = {
      schema: schema,
      mode: entityId ? "edit" : "create",
      entityId: entityId,
      fields: this.generateFieldConfigs(
        schema.schema_definition.fields,
        schema.relationships,
        entityId ? "edit" : "create"
      ),
      relationships: this.generateRelationshipConfigs(
        schema.relationships || [],
        schemaWithRelated?.relatedSchemas || {}
      ),
      validation: this.generateValidationRules(schema.schema_definition.fields),
      layout:
        schema.ui_schema?.form_layout || this.generateDefaultLayout(schema),
      initialData: entityId
        ? await this.fetchInitialDataWithRelationships(
            schema,
            entityId,
            schemaWithRelated?.relatedSchemas || {}
          )
        : this.getDefaultValues(schema.schema_definition.fields, contextData),
      relatedSchemas: schemaWithRelated?.relatedSchemas || {},
    };

    return formConfig;
  }

  generateFieldConfigs(
    fields: Field[],
    relationships?: Relationship[],
    mode?: "create" | "edit"
  ): FieldConfig[] {
    return fields?.map((field) => {
      // Find the relationship that uses this field as source_field
      const relatedRelationship = relationships?.find(
        (rel) => rel.source_field === field.name
      );

      // Determine if field should be readonly in edit mode
      const isIdField = field.primary_key || field.auto_generate;
      const isForeignKeyField = relatedRelationship !== undefined;
      const shouldBeReadonlyInEdit =
        mode === "edit" && (isIdField || isForeignKeyField);

      return {
        name: field.name,
        type: field.type,
        widget: field.ui_config?.widget || this.getDefaultWidget(field.type),
        label: field.ui_config?.label || this.humanize(field.name),
        placeholder: field.ui_config?.placeholder,
        helpText: field.ui_config?.help_text,
        required: field.required,
        hidden: field.ui_config?.hidden || field.auto_generate || false,
        readonly: field.readonly || shouldBeReadonlyInEdit,
        validation: field.validation,
        options: field.ui_config?.options,
        conditionalDisplay: field.ui_config?.conditional_display,
        min: field.validation?.min,
        max: field.validation?.max,
        // Set targetComponent for relationship fields
        targetComponent: relatedRelationship
          ? relatedRelationship.target_component
          : undefined,
        displayField: field.ui_config?.display_field || "name",
        grid_cols: field.ui_config?.grid_cols,
        maxItems: field.validation?.max_items,
        foreignKey: field.foreign_key,
      };
    });
  }

  generateRelationshipConfigs(
    relationships: Relationship[],
    relatedSchemas: Record<string, Schema> = {}
  ): RelationshipConfig[] {
    return relationships.map((rel) => ({
      name: rel.name,
      type: rel.type,
      targetComponent: rel.target_component,
      title: this.humanize(rel.name),
      required: rel.required || false,
      allowCreate: rel.config?.allow_create !== false,
      allowEdit: rel.config?.allow_edit !== false,
      allowDelete: rel.config?.allow_delete !== false,
      sortable: rel.config?.sortable,
      maxItems: rel.config?.max_items,
      sourceField: rel.source_field,
      displayField: rel.config?.display_field,
    }));
  }

  generateValidationRules(fields: Field[]): any {
    const rules: any = {};

    fields.forEach((field) => {
      const fieldRules: any = {};

      if (field.required && !field.default) {
        fieldRules.required = `${this.humanize(field.name)} is required`;
      }

      if (field.validation) {
        if (field.validation.min_length) {
          fieldRules.minLength = {
            value: field.validation.min_length,
            message: `Minimum length is ${field.validation.min_length} characters`,
          };
        }

        if (field.validation.max_length) {
          fieldRules.maxLength = {
            value: field.validation.max_length,
            message: `Maximum length is ${field.validation.max_length} characters`,
          };
        }

        if (field.validation.pattern) {
          fieldRules.pattern = {
            value: new RegExp(field.validation.pattern),
            message: field.validation.custom_message || "Invalid format",
          };
        }

        if (field.validation.min !== undefined) {
          fieldRules.min = {
            value: field.validation.min,
            message: `Minimum value is ${field.validation.min}`,
          };
        }

        if (field.validation.max !== undefined) {
          fieldRules.max = {
            value: field.validation.max,
            message: `Maximum value is ${field.validation.max}`,
          };
        }

        if (field.validation.email) {
          fieldRules.pattern = {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: "Invalid email address",
          };
        }

        if (field.validation.url) {
          fieldRules.pattern = {
            value:
              /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
            message: "Invalid URL",
          };
        }
      }

      if (Object.keys(fieldRules).length > 0) {
        rules[field.name] = fieldRules;
      }
    });

    return rules;
  }

  getDefaultWidget(fieldType: string): string {
    const widgetMap: Record<string, string> = {
      text: "text_input",
      "text[]": "text_array",
      uuid: "hidden",
      integer: "number_input",
      decimal: "number_input",
      boolean: "checkbox",
      timestamp: "datetime_input",
      date: "date_input",
      time: "time_input",
      enum: "select",
      json: "json_editor",
      jsonb: "json_editor",
    };
    return widgetMap[fieldType] || "text_input";
  }

  getDefaultRelationshipWidget(relType: string): string {
    const widgetMap: Record<string, string> = {
      "many-to-one": "relationship_select",
      "one-to-one": "relationship_select",
      "one-to-many": "inline_editor",
      "many-to-many": "multi_select",
    };
    return widgetMap[relType] || "relationship_select";
  }

  generateDefaultLayout(schema: Schema): any {
    const fields = schema.schema_definition.fields.filter(
      (f) => !f.auto_generate && !f.ui_config?.hidden
    );
    const relationships = schema.relationships || [];

    if (relationships.length === 0) {
      // Simple layout without tabs
      return {
        sections: [
          {
            title: "General Information",
            fields: fields.map((f) => f.name),
            columns: 1,
          },
        ],
      };
    } else {
      // Tab-based layout for complex schemas
      return {
        tabs: [
          {
            name: "basic",
            title: "Basic Information",
            sections: [
              {
                title: "General Information",
                fields: fields.map((f) => f.name),
                columns: 1,
              },
            ],
          },
          ...relationships.map((rel, index) => ({
            name: rel.name,
            title: this.humanize(rel.name),
            relationships: [rel.name],
          })),
        ],
      };
    }
  }

  humanize(str: string): string {
    return str
      ?.replace(/_/g, " ")
      ?.replace(/([a-z])([A-Z])/g, "$1 $2")
      ?.replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  getDefaultValues(fields: Field[], contextData?: any): any {
    const defaults: any = {};

    fields.forEach((field) => {
      if (field.default !== undefined) {
        defaults[field.name] = field.default;
      } else if (field.type === "boolean") {
        defaults[field.name] = false;
      } else if (field.type === "integer" || field.type === "decimal") {
        defaults[field.name] = field.validation?.min || 0;
      } else if (field.type === "text[]") {
        defaults[field.name] = [];
      }

      // Handle auto-population based on schema configuration
      if (field.auto_populate && contextData) {
        const autoPopulate = field.auto_populate;

        if (autoPopulate.source === "parent_context" && contextData.parentId) {
          defaults[field.name] = contextData.parentId;
        }
        // Can extend this for other auto-population sources in the future
        // e.g., current_user, timestamp, etc.
      }
    });

    return defaults;
  }

  async fetchInitialData(schema: Schema, entityId: string): Promise<any> {
    const primaryKey = schema.schema_definition.fields.find(
      (f) => f.primary_key
    );
    if (!primaryKey) throw new Error("No primary key found");

    const tableName =
      schema.schema_definition.table?.hasura_table_name ||
      schema.schema_definition.table?.name;

    if (!tableName) throw new Error("No table name found in schema");

    // Build query to fetch entity with relationships
    let query = `
      query GetEntity($id: String!) {
        ${tableName}(where: {${primaryKey.name}: {_eq: $id}}) {
    `;

    // Add all fields
    schema.schema_definition.fields.forEach((field) => {
      if (!field.ui_config?.hidden) {
        query += `      ${field.name}\n`;
      }
    });

    // Add relationships
    if (schema.relationships) {
      schema.relationships.forEach((rel) => {
        const relationshipField = schema.schema_definition.fields.find(
          (f) => f.name === rel.source_field
        );
        if (rel.type === "many-to-one" || rel.type === "one-to-one") {
          query += `      ${rel.graphql_field} {\n`;
          query += `        id\n`;
          query += `        ${relationshipField?.ui_config?.display_field}\n`;
          query += `      }\n`;
        } else if (rel.type === "one-to-many") {
          query += `      ${rel.graphql_field} {\n`;
          query += `        id\n`;
          // Add fields from target component - simplified for now
          query += `      }\n`;
        } else if (rel.type === "many-to-many") {
          query += `      ${rel.graphql_field} {\n`;
          query += `        id\n`;
          query += `        ${relationshipField?.ui_config?.display_field}\n`;
          query += `      }\n`;
        }
      });
    }

    query += `    }\n  }`;

    const response = await this.schemaManager["hasuraClient"].query({
      query: gql(query),
      variables: { id: entityId },
    });

    return response?.[tableName]?.[0] || {};
  }

  async fetchInitialDataWithRelationships(
    schema: Schema,
    entityId: string,
    relatedSchemas: Record<string, Schema>
  ): Promise<any> {
    const primaryKey = schema.schema_definition.fields.find(
      (f) => f.primary_key
    );
    if (!primaryKey) throw new Error("No primary key found");

    const tableName =
      schema.schema_definition.table?.hasura_table_name ||
      schema.schema_definition.table?.name;

    if (!tableName) throw new Error("No table name found in schema");

    // Build comprehensive query to fetch entity with all relationship data
    let query = `
      query GetEntityWithRelationships($id: String!) {
        ${tableName}(where: {${primaryKey.name}: {_eq: $id}}) {
    `;

    // Add all main fields
    schema.schema_definition.fields.forEach((field) => {
      if (!field.ui_config?.hidden) {
        query += `      ${field.name}\n`;
      }
    });

    // Add relationships with full data
    if (schema.relationships) {
      schema.relationships.forEach((rel) => {
        const relatedSchema = relatedSchemas[rel.target_component];
        const displayField = schema?.schema_definition?.fields?.find(
          (f) => f.name === rel.source_field
        )?.ui_config?.display_field;

        if (rel.type === "many-to-one") {
          query += `      ${rel.graphql_field} {\n`;
          query += `        id\n`;
          query += `        ${displayField}\n`;

          // // Add other important fields from related schema
          if (relatedSchema?.schema_definition?.fields) {
            relatedSchema.schema_definition.fields.forEach((field) => {
              if (
                field.type === "text" &&
                !field.ui_config?.hidden &&
                field.name !== "id"
              ) {
                console.log("field", field.name);
                // query += `        ${field.name}\n`;
              }
            });
          }
          query += `      }\n`;
        } else if (rel.type === "one-to-many" || rel.type === "one-to-one") {
          query += `      ${rel.graphql_field} {\n`;
          query += `        id\n`;

          // Add all fields from the related component schema
          if (relatedSchema?.schema_definition?.fields) {
            relatedSchema.schema_definition.fields.forEach((field) => {
              if (!field.ui_config?.hidden) {
                query += `        ${field.name}\n`;
              }
            });
          }

          // Add nested relationships for the related component
          if (relatedSchema?.relationships) {
            relatedSchema.relationships.forEach((nestedRel) => {
              if (
                nestedRel.type === "many-to-one" ||
                nestedRel.type === "one-to-one"
              ) {
                // console.log("nestedRel", nestedRel.graphql_field);
                // query += `        ${nestedRel.graphql_field} {\n`;
                // query += `          id\n`;
                // query += `          ${nestedRel.ui_config?.display_field}\n`;
                // query += `        }\n`;
              } else if (nestedRel.type === "one-to-many") {
                console.log("nestedRel", nestedRel.graphql_field);
                // query += `        ${nestedRel.graphql_field} {\n`;
                // query += `          id\n`;
                // Add basic fields for nested one-to-many
                const nestedSchema = relatedSchemas[nestedRel.target_component];
                if (nestedSchema?.schema_definition?.fields) {
                  nestedSchema.schema_definition.fields.forEach((field) => {
                    if (
                      !field.ui_config?.hidden &&
                      ["name", "title", "value"].includes(field.name)
                    ) {
                      console.log("field", field.name);
                      // query += `          ${field.name}\n`;
                    }
                  });
                }
                query += `        }\n`;
              }
            });
          }

          query += `      }\n`;
        } else if (rel.type === "many-to-many") {
          query += `      ${rel.graphql_field} {\n`;
          query += `        id\n`;
          query += `        ${
            relatedSchema?.schema_definition?.fields?.find(
              (f) => f.name === rel.source_field
            )?.ui_config?.display_field
          }\n`;

          // Add other important fields from related schema
          if (relatedSchema?.schema_definition?.fields) {
            relatedSchema.schema_definition.fields.forEach((field) => {
              if (
                field.type === "text" &&
                !field.ui_config?.hidden &&
                field.name !== "id"
              ) {
                query += `        ${field.name}\n`;
              }
            });
          }
          query += `      }\n`;
        }
      });
    }

    query += `    }\n  }`;

    try {
      const response = await this.schemaManager["hasuraClient"].query({
        query: gql(query),
        variables: { id: entityId },
      });

      const entityData = response?.[tableName]?.[0] || {};

      // Transform the data for form consumption
      const formData = { ...entityData };

      // Process relationships for form fields
      if (schema.relationships) {
        schema.relationships.forEach((rel) => {
          if (rel.type === "many-to-one" || rel.type === "one-to-one") {
            // Set both the foreign key field AND the relationship field for the form
            if (entityData[rel.graphql_field]) {
              // Set the foreign key field (for data storage)
              formData[rel.source_field] = entityData[rel.graphql_field].id;
              // Set the relationship field (for form display) - keep the object for the RelationshipSelect
              formData[rel.name] = entityData[rel.graphql_field];
            } else {
              // Handle null/empty relationship
              formData[rel.source_field] = null;
              formData[rel.name] = null;
            }
            // Remove the GraphQL field name from form data since we've moved it to the relationship name
            delete formData[rel.graphql_field];
          }
          // For one-to-many and many-to-many, keep the array structure
        });
      }
      console.log("formData", formData);
      return formData;
    } catch (error) {
      console.error("Error fetching initial data with relationships:", error);
      return {};
    }
  }

  buildInsertMutation(schema: Schema): string {
    const tableName =
      schema.schema_definition.table?.hasura_table_name ||
      schema.schema_definition.table?.name;

    if (!tableName) throw new Error("No table name found in schema");

    return `
      mutation CreateEntity($input: ${tableName}_insert_input!) {
        insert_${tableName}_one(object: $input) {
          id
        }
      }
    `;
  }

  buildUpdateMutation(schema: Schema): string {
    const tableName =
      schema.schema_definition.table?.hasura_table_name ||
      schema.schema_definition.table?.name;
    const primaryKey = schema.schema_definition.fields.find(
      (f) => f.primary_key
    );

    if (!tableName) throw new Error("No table name found in schema");
    if (!primaryKey) throw new Error("No primary key found");

    return `
      mutation UpdateEntity($id: String!, $input: ${tableName}_set_input!) {
        update_${tableName}_by_pk(pk_columns: {${primaryKey.name}: $id}, _set: $input) {
          id
        }
      }
    `;
  }
}
