export type Schema = {
  id?: string; // Unique identifier for the schema record in the database
  name: string; // Schema name used as identifier (e.g., "product", "user")
  type: "component" | "page"; // Distinguishes between reusable components and standalone pages
  version?: string; // Version number for schema evolution and compatibility
  description?: string; // Human-readable description of the schema's purpose
  schema_definition: SchemaDefinition; // Core field definitions and table configuration
  relationships?: Relationship[]; // Defines how this schema relates to other schemas
  related_schemas?: Record<string, Schema>; // (only in api response not in DB) Related schemas of related components
  ui_schema?: UISchema; // UI-specific configuration for forms and list views
  created_at?: string; // ISO timestamp when schema was created
  updated_at?: string; // ISO timestamp when schema was last modified
  is_active?: boolean; // Disable flag to hide the schemas without removing them
};

export type SchemaDefinition = {
  table?: TableDefinition; // Database table configuration and metadata
  fields: Field[]; // Array of field definitions that define the data structure
  operations?: Operations; // Defines which CRUD operations are allowed (create, read, update, delete)
  permissions?: Permissions; // Role-based access control for different operations
};

export type TableDefinition = {
  name: string; // Database table name (e.g., "products", "users")
  primary_key: string; // Name of the primary key field (usually "id")
  display_field?: string; // Field to use when displaying records in relationships (e.g., "name", "title")
  hasura_table_name?: string; // Override table name for Hasura GraphQL if different from name
};

export type Field = {
  name: string; // Field name in database and forms (e.g., "email", "price", "created_at")
  type: FieldType; // Data type that determines storage format and validation
  required: boolean; // Whether field must have a value (NOT NULL constraint)
  primary_key?: boolean; // Marks this field as the primary key (only one per schema)
  auto_generate?: boolean; // Field value is automatically generated (e.g., UUIDs, timestamps)
  unique?: boolean; // Enforces uniqueness constraint in database
  default?: any; // Default value when creating new records
  graphql_type: string; // GraphQL type for API generation (e.g., "String", "Int", "Float")
  precision?: number; // Decimal precision for numeric types
  foreign_key?: ForeignKey; // Configuration for referencing other tables
  validation?: ValidationRules; // Client-side and server-side validation rules
  ui_config?: FieldUIConfig; // UI-specific configuration for forms and display
  auto_populate?: {
    // Automatic field population from context or system values
    source: "parent_context" | "current_user" | "timestamp";
    field: string;
  };
  readonly?: boolean; // Field cannot be modified after creation (e.g., IDs, audit fields)
};

export type FieldType =
  | "uuid" // Universally unique identifier, typically for primary keys
  | "text" // Variable-length text strings
  | "text[]" // Array of text strings
  | "integer" // Whole numbers without decimal places
  | "decimal" // Numbers with decimal places (for currency, measurements)
  | "boolean" // True/false values
  | "timestamp" // Date and time with timezone
  | "date" // Date only (YYYY-MM-DD)
  | "time" // Time only (HH:MM:SS)
  | "json" // JSON data stored as text
  | "jsonb" // Binary JSON for efficient querying
  | "enum"; // Predefined set of allowed values

export type ForeignKey = {
  hasura_table: string; // Target table name that this field references
  column: string; // Target column name (usually the primary key)
  on_delete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION"; // Behavior when referenced record is deleted
};

export type ValidationRules = {
  min_length?: number; // Minimum character length for text fields
  max_length?: number; // Maximum character length for text fields
  pattern?: string; // Regular expression pattern for validation
  custom_message?: string; // Custom error message when validation fails
  min?: number; // Minimum value for numeric fields
  max?: number; // Maximum value for numeric fields
  max_items?: number; // Maximum number of items in arrays
  email?: boolean; // Validates email format
  url?: boolean; // Validates URL format
};

export type FieldUIConfig = {
  widget?: string; // UI widget type (e.g., "text_input", "select", "checkbox")
  label?: string; // Human-readable label for the field
  placeholder?: string; // Placeholder text shown in input fields
  help_text?: string; // Additional help or description text
  hidden?: boolean; // Hide field from forms (useful for auto-generated fields)
  readonly?: boolean; // Make field read-only in forms
  options?: Array<Option>; // Options for select/enum fields
  conditional_display?: {
    // Show field only when another field has specific value
    field: string;
    value: any;
  };
  display_field?: string; // Field to display in relationships and lists
  grid_cols?: number; // Number of grid columns to span in form layout
};

export type Option = {
  label: string;
  value: string;
};

export type Relationship = {
  name: string; // Logical name for the relationship (e.g., "author", "comments")
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many"; // Cardinality of the relationship
  source_field: string; // Field in current schema that holds the foreign key
  target_component: string; // Name of the target schema/component
  target_field: string; // Field in target schema (usually primary key)
  required?: boolean; // Whether the relationship must exist
  cascade_delete?: boolean; // Delete related records when parent is deleted
  read_only?: boolean; // Relationship cannot be modified through forms
  graphql_field: string; // Field name in GraphQL queries
  graphql_type: string; // GraphQL type for the relationship
  config?: RelationshipConfig; // Additional configuration for UI and behavior
};

export type RelationshipConfig = {
  allow_create?: boolean; // Allow creating new related records inline
  allow_edit?: boolean; // Allow editing related records inline
  allow_delete?: boolean; // Allow deleting related records
  sortable?: boolean; // Enable sorting of related records
  sort_field?: string; // Field to sort related records by
  max_items?: number; // Maximum number of related items allowed,
  display_field?: string; // Field to display in the relationship
};

export type Operations = {
  create?: boolean; // Allow creating new records for this schema
  read?: boolean; // Allow reading individual records
  update?: boolean; // Allow updating existing records
  delete?: boolean; // Allow deleting records
  list?: boolean; // Allow listing/browsing multiple records
};

export type Permissions = {
  create?: string[]; // User roles allowed to create records (e.g., ["admin", "editor"])
  read?: string[]; // User roles allowed to read records
  update?: string[]; // User roles allowed to update records
  delete?: string[]; // User roles allowed to delete records
  list?: string[]; // User roles allowed to list/browse records
};

export type UISchema = {
  list_view?: ListView; // Configuration for data table views and listing pages
  form_layout?: FormLayout; // Configuration for create/edit form layouts
};

export type ListView = {
  columns?: string[]; // Fields to display as columns in data tables
  sortable_columns?: string[]; // Columns that can be sorted by clicking headers
  filterable_columns?: string[]; // Columns that can be filtered with dropdowns
  searchable_columns?: string[]; // Columns included in text search functionality
  default_sort?: { field: string; direction: "asc" | "desc" }; // Default sorting when table loads
  actions?: string[]; // Available actions (e.g., "edit", "delete", "view")
};

export type FormLayout = {
  sections?: FormSection[]; // Form sections for organizing fields into groups
  tabs?: FormTab[]; // Tab-based layout for complex forms with many fields
};

export type FormSection = {
  title: string; // Section heading displayed in forms (e.g., "Basic Information")
  fields: string[]; // Array of field names to include in this section
  columns?: number; // Number of columns to arrange fields in (1, 2, 3, etc.)
};

export type FormTab = {
  name: string; // Unique identifier for the tab (e.g., "basic", "advanced")
  title: string; // Display title for the tab (e.g., "Basic Information")
  sections?: string[]; // Form sections to include in this tab
  relationships?: string[]; // Relationships to include in this tab
};
