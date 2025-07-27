# Backend-Driven CMS with Next.js, Hasura, and PostgreSQL

A sophisticated backend-driven CMS that generates GraphQL operations and dynamic forms from database-stored schemas. Unlike traditional frontend-driven solutions, this system stores meta-schemas in the database and generates complete CRUD interfaces with complex relationships at runtime.

## Key Features

- **Backend-Driven Architecture**: Schema definitions stored in PostgreSQL database
- **Dynamic Form Generation**: Automatic form creation from schemas with validation
- **Complex Relationships**: Support for one-to-one, one-to-many, many-to-one, and many-to-many relationships
- **GraphQL Operations**: Auto-generated queries and mutations from schema definitions
- **Strapi Design System**: Professional UI components with authentic admin panel aesthetics
- **Real-time Updates**: Forms and operations generated dynamically at runtime
- **Type Safety**: Full TypeScript support throughout the application

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   PostgreSQL    │────▶│     Hasura      │────▶│    Next.js      │
│  (page_schemas) │     │   (GraphQL)     │     │   (Frontend)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         │                                               │
         └───────────── Schema Definitions ──────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Hasura GraphQL Engine
- Redis (optional, for caching)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd backend-driven-cms
```

2. Install dependencies:

```bash
npm install --legacy-peer-deps
```

3. Set up environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```env
HASURA_GRAPHQL_ENDPOINT=http://localhost:8080/v1/graphql
NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=your-hasura-admin-secret
REDIS_URL=redis://localhost:6379  # Optional
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Schema Types

### Component Schema

Represents a single database table with its fields and basic operations:

```json
{
  "name": "features",
  "type": "component",
  "schema_definition": {
    "table": {
      "name": "features",
      "primary_key": "id"
    },
    "fields": [
      {
        "name": "id",
        "type": "uuid",
        "required": true,
        "primary_key": true,
        "auto_generate": true,
        "graphql_type": "ID!"
      },
      {
        "name": "name",
        "type": "text",
        "required": true,
        "graphql_type": "String!",
        "validation": {
          "min_length": 1,
          "max_length": 100
        },
        "ui_config": {
          "widget": "text_input",
          "label": "Feature Name"
        }
      }
    ]
  }
}
```

### Page Schema

Combines multiple components with relationships for complex data structures:

```json
{
  "name": "variant",
  "type": "page",
  "schema_definition": {
    "primary_component": {
      "name": "variant",
      "table": "variants"
    },
    "fields": [...]
  },
  "relationships": [
    {
      "name": "features",
      "type": "one-to-many",
      "source_field": "id",
      "target_component": "variant_feature",
      "target_field": "variant_id",
      "graphql_field": "features"
    }
  ]
}
```

## Core Components

### Schema Management

- **SchemaManager**: Handles CRUD operations for schemas
- **GraphQLGenerator**: Generates GraphQL operations from schemas
- **FormGenerator**: Creates form configurations from schemas
- **CacheManager**: Redis-based caching for performance

### Form Components

- **DynamicSchemaForm**: Main form component that handles schema-based rendering
- **FieldRenderer**: Renders different field types (text, number, boolean, etc.)
- **RelationshipRenderer**: Handles relationship fields
- **Widget Components**: Specialized inputs (CurrencyInput, JsonEditor, etc.)

### API Routes

- `/api/schemas`: Schema CRUD operations
- `/api/forms/[schemaName]`: Form generation and submission

## Field Types Supported

- `uuid`: Unique identifiers
- `text`: Text inputs with validation
- `integer`: Whole numbers
- `decimal`: Decimal numbers with precision
- `boolean`: Checkboxes/toggles
- `timestamp`: Date and time pickers
- `enum`: Select dropdowns
- `json`/`jsonb`: JSON editor

## Relationship Types

1. **One-to-One**: Direct relationship between two entities
2. **One-to-Many**: Parent entity has multiple children (e.g., variant → features)
3. **Many-to-One**: Multiple entities reference one parent
4. **Many-to-Many**: Junction table relationships (e.g., variants ↔ categories)

## UI Widgets

- `text_input`: Standard text input
- `textarea`: Multi-line text
- `rich_text`: Rich text editor
- `number_input`: Numeric input
- `currency_input`: Currency-formatted input
- `checkbox`: Boolean checkbox
- `toggle`: Toggle switch
- `select`: Dropdown selection
- `datetime_input`: Date and time picker
- `relationship_select`: Related entity selector
- `json_editor`: JSON data editor

## Validation Rules

```javascript
{
  "validation": {
    "min_length": 1,
    "max_length": 100,
    "pattern": "^[a-zA-Z0-9]+$",
    "min": 0,
    "max": 1000,
    "email": true,
    "url": true,
    "custom_message": "Custom validation message"
  }
}
```

## Performance Optimization

- **Schema Caching**: Redis-based caching with 5-minute TTL
- **Query Optimization**: Indexed JSONB queries
- **Component Memoization**: React.memo for field components
- **Lazy Loading**: Relationship data loaded on demand

## Security Best Practices

- **RBAC Integration**: Role-based access control via Hasura
- **Input Validation**: Client and server-side validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Sanitized user inputs

## Project Structure

```
backend-driven-cms/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   └── demo/              # Demo pages
├── components/            # React components
│   └── forms/            # Form components
│       └── widgets/      # Custom form widgets
├── lib/                   # Core libraries
│   ├── hasura/           # Hasura client
│   └── schema/           # Schema management
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript definitions
```

## Development Workflow

1. **Create Schema**: Define your data structure in the database
2. **Generate Operations**: GraphQL operations are auto-generated
3. **Build Forms**: Forms are dynamically created from schemas
4. **Handle Relationships**: Complex data structures managed automatically

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Strapi Design System for the professional UI components
- Hasura for the powerful GraphQL engine
- Next.js team for the excellent framework
