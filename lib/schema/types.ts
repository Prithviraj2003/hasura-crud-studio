export interface Schema {
  id?: string;
  name: string;
  type: "component" | "page";
  version?: string;
  description?: string;
  schema_definition: SchemaDefinition;
  relationships?: Relationship[];
  ui_schema?: UISchema;
  generated_operations?: any;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface SchemaDefinition {
  table?: TableDefinition;
  primary_component?: PrimaryComponent;
  fields: Field[];
  operations?: Operations;
  permissions?: Permissions;
}

export interface TableDefinition {
  name: string;
  primary_key: string;
  display_field?: string;
  hasura_table_name?: string;
}

export interface PrimaryComponent {
  name: string;
  table: string;
  primary_key: string;
  display_field?: string;
}

export interface Field {
  name: string;
  type: FieldType;
  required: boolean;
  primary_key?: boolean;
  auto_generate?: boolean;
  auto_update?: boolean;
  unique?: boolean;
  default?: any;
  graphql_type: string;
  max_length?: number;
  min_length?: number;
  precision?: number;
  scale?: number;
  enum_values?: string[];
  foreign_key?: ForeignKey;
  validation?: ValidationRules;
  ui_config?: FieldUIConfig;
  step?: number;
  readonly?: boolean;
  hidden?: boolean;
  is_option_title?: boolean;
}

export type FieldType =
  | "uuid"
  | "text"
  | "integer"
  | "decimal"
  | "boolean"
  | "timestamp"
  | "date"
  | "time"
  | "json"
  | "jsonb"
  | "enum";

export interface ForeignKey {
  table: string;
  column: string;
  on_delete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
}

export interface ValidationRules {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  custom_message?: string;
  min?: number;
  max?: number;
  email?: boolean;
  url?: boolean;
  custom?: string;
}

export interface FieldUIConfig {
  widget?: string;
  label?: string;
  placeholder?: string;
  help_text?: string;
  hidden?: boolean;
  readonly?: boolean;
  toolbar?: string[];
  currency?: string;
  options?: Array<{ value: any; label: string }>;
  conditional_display?: {
    field: string;
    value: any;
  };
  min?: number;
  max?: number;
  step?: number;
  display_field?: string;
  auto_populate?: {
    source: "parent_context" | "current_user" | "timestamp";
    field: string;
  };
  grid_cols?: number;
}

export interface Relationship {
  name: string;
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  source_field: string;
  target_component: string;
  target_field: string;
  required?: boolean;
  cascade_delete?: boolean;
  read_only?: boolean;
  graphql_field: string;
  graphql_type: string;
  junction_table?: string;
  source_junction_field?: string;
  target_junction_field?: string;
  ui_config?: RelationshipUIConfig;
}

export interface RelationshipUIConfig {
  widget?: string;
  title?: string;
  display_in_list?: boolean;
  display_field?: string;
  expand_by_default?: boolean;
  allow_create?: boolean;
  allow_edit?: boolean;
  allow_delete?: boolean;
  sortable?: boolean;
  sort_field?: string;
  search_enabled?: boolean;
  max_files?: number;
  accepted_formats?: string[];
  max_file_size?: string;
  columns?: string[];
  max_items?: number;
}

export interface Operations {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
  list?: boolean;
  bulk_create?: boolean;
  bulk_update?: boolean;
  bulk_delete?: boolean;
  duplicate?: boolean;
}

export interface Permissions {
  roles?: string[];
  create?: string[];
  read?: string[];
  update?: string[];
  delete?: string[];
  list?: string[];
}

export interface UISchema {
  list_view?: ListView;
  form_layout?: FormLayout;
}

export interface ListView {
  columns?: string[];
  sortable_columns?: string[];
  filterable_columns?: string[];
  searchable_columns?: string[];
  default_sort?: { field: string; direction: "asc" | "desc" };
  actions?: string[];
  bulk_actions?: string[];
}

export interface FormLayout {
  sections?: FormSection[];
  tabs?: FormTab[];
}

export interface FormSection {
  title: string;
  fields: string[];
  columns?: number;
}

export interface FormTab {
  name: string;
  title: string;
  sections?: string[];
  relationships?: string[];
}
