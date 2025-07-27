import { Schema, Field, Relationship } from "@/lib/schema/types";

export class GraphQLGenerator {
  generateForSchema(schema: Schema): any {
    const { type, schema_definition, relationships } = schema;

    if (type === "component") {
      return this.generateComponentOperations(schema);
    } else if (type === "page") {
      return this.generatePageOperations(schema);
    }
  }

  private generateComponentOperations(schema: Schema) {
    const { name, schema_definition, relationships = [] } = schema;
    const typeName = this.pascalCase(name);
    const fields = schema_definition.fields;

    const operations = {
      types: this.generateTypes(typeName, fields, relationships),
      queries: this.generateQueries(typeName, fields, relationships),
      mutations: this.generateMutations(typeName, fields, relationships),
      subscriptions: this.generateSubscriptions(typeName, fields),
    };

    return operations;
  }

  private generatePageOperations(schema: Schema) {
    // Pages have the same operation generation as components
    // but with additional relationship-aware mutations
    const componentOps = this.generateComponentOperations(schema);

    // Add relationship-specific operations
    const relationshipOps = this.generateRelationshipOperations(schema);

    return {
      ...componentOps,
      mutations: {
        ...componentOps.mutations,
        ...relationshipOps.mutations,
      },
    };
  }

  private generateTypes(
    typeName: string,
    fields: Field[],
    relationships: Relationship[] = []
  ) {
    const objectType = this.generateObjectType(typeName, fields, relationships);
    const inputType = this.generateInputType(typeName, fields);
    const filterType = this.generateFilterType(typeName, fields);
    const orderByType = this.generateOrderByType(typeName, fields);

    const types: any = {
      [typeName]: objectType,
      [`${typeName}Input`]: inputType,
      [`${typeName}Filter`]: filterType,
      [`${typeName}OrderBy`]: orderByType,
    };

    // Add relationship input types
    if (relationships.length > 0) {
      types[`${typeName}CreateWithRelationsInput`] =
        this.generateCreateWithRelationsInput(typeName, fields, relationships);
      types[`${typeName}UpdateWithRelationsInput`] =
        this.generateUpdateWithRelationsInput(typeName, fields, relationships);
      types[`${typeName}WithRelations`] = this.generateWithRelationsType(
        typeName,
        fields,
        relationships
      );
    }

    return types;
  }

  private generateObjectType(
    typeName: string,
    fields: Field[],
    relationships: Relationship[]
  ) {
    let typeDefinition = `type ${typeName} {\n`;

    // Add fields
    for (const field of fields) {
      if (!field.ui_config?.hidden) {
        typeDefinition += `  ${field.name}: ${field.graphql_type}\n`;
      }
    }

    // Add relationship fields
    for (const rel of relationships) {
      typeDefinition += `  ${rel.graphql_field}: ${rel.graphql_type}\n`;
    }

    typeDefinition += "}";
    return typeDefinition;
  }

  private generateInputType(typeName: string, fields: Field[]) {
    let inputDefinition = `input ${typeName}Input {\n`;

    for (const field of fields) {
      if (!field.auto_generate && !field.ui_config?.hidden) {
        const isRequired = field.required && !field.default;
        const nullableType = field.graphql_type.replace("!", "");
        inputDefinition += `  ${field.name}: ${nullableType}${
          isRequired ? "!" : ""
        }\n`;
      }
    }

    inputDefinition += "}";
    return inputDefinition;
  }

  private generateFilterType(typeName: string, fields: Field[]) {
    let filterDefinition = `input ${typeName}Filter {\n`;

    for (const field of fields) {
      const baseType = field.graphql_type.replace("!", "");
      filterDefinition += `  ${field.name}: ${baseType}FilterOperators\n`;
    }

    filterDefinition += "  _and: [${typeName}Filter!]\n";
    filterDefinition += "  _or: [${typeName}Filter!]\n";
    filterDefinition += "  _not: ${typeName}Filter\n";
    filterDefinition += "}";

    return filterDefinition;
  }

  private generateOrderByType(typeName: string, fields: Field[]) {
    return `enum ${typeName}OrderBy {
${fields.map((field) => `  ${field.name}_asc\n  ${field.name}_desc`).join("\n")}
}`;
  }

  private generateQueries(
    typeName: string,
    fields: Field[],
    relationships: Relationship[]
  ) {
    const queries: any = {};
    const primaryKey = fields.find((f) => f.primary_key);

    if (!primaryKey) {
      throw new Error(`No primary key found for ${typeName}`);
    }

    // Single item query
    queries[`get${typeName}`] = {
      type: typeName,
      args: `${primaryKey.name}: ${primaryKey.graphql_type}`,
      resolver: this.generateGetResolver(typeName, primaryKey, relationships),
    };

    // List query
    queries[`list${typeName}s`] = {
      type: `[${typeName}!]!`,
      args: `filter: ${typeName}Filter, orderBy: ${typeName}OrderBy, limit: Int, offset: Int`,
      resolver: this.generateListResolver(typeName, relationships),
    };

    // Relationship-specific queries
    if (relationships.length > 0) {
      queries[`get${typeName}WithRelations`] = {
        type: `${typeName}WithRelations`,
        args: `${primaryKey.name}: ${primaryKey.graphql_type}`,
        resolver: this.generateGetWithRelationsResolver(
          typeName,
          primaryKey,
          relationships
        ),
      };
    }

    return queries;
  }

  private generateMutations(
    typeName: string,
    fields: Field[],
    relationships: Relationship[]
  ) {
    const mutations: any = {};
    const primaryKey = fields.find((f) => f.primary_key);

    if (!primaryKey) {
      throw new Error(`No primary key found for ${typeName}`);
    }

    // Standard CRUD mutations
    mutations[`create${typeName}`] = {
      type: `${typeName}!`,
      args: `input: ${typeName}Input!`,
      resolver: this.generateCreateResolver(typeName, fields),
    };

    mutations[`update${typeName}`] = {
      type: `${typeName}!`,
      args: `${primaryKey.name}: ${primaryKey.graphql_type}, input: ${typeName}Input!`,
      resolver: this.generateUpdateResolver(typeName, primaryKey, fields),
    };

    mutations[`delete${typeName}`] = {
      type: "Boolean!",
      args: `${primaryKey.name}: ${primaryKey.graphql_type}`,
      resolver: this.generateDeleteResolver(typeName, primaryKey),
    };

    // Relationship mutations
    if (relationships.length > 0) {
      mutations[`create${typeName}WithRelations`] = {
        type: `${typeName}WithRelations!`,
        args: `input: ${typeName}CreateWithRelationsInput!`,
        resolver: this.generateCreateWithRelationsResolver(
          typeName,
          fields,
          relationships
        ),
      };

      mutations[`update${typeName}WithRelations`] = {
        type: `${typeName}WithRelations!`,
        args: `${primaryKey.name}: ${primaryKey.graphql_type}, input: ${typeName}UpdateWithRelationsInput!`,
        resolver: this.generateUpdateWithRelationsResolver(
          typeName,
          primaryKey,
          fields,
          relationships
        ),
      };
    }

    return mutations;
  }

  private generateSubscriptions(typeName: string, fields: Field[]) {
    // Generate subscription operations for real-time updates
    return {
      [`${typeName}Created`]: `${typeName}Created: ${typeName}!`,
      [`${typeName}Updated`]: `${typeName}Updated: ${typeName}!`,
      [`${typeName}Deleted`]: `${typeName}Deleted: ID!`,
    };
  }

  private generateRelationshipOperations(schema: Schema) {
    // Generate additional operations for complex relationship handling
    return {
      mutations: {},
      queries: {},
    };
  }

  private generateCreateWithRelationsInput(
    typeName: string,
    fields: Field[],
    relationships: Relationship[]
  ) {
    let inputDef = `input ${typeName}CreateWithRelationsInput {\n`;

    // Add main fields
    for (const field of fields) {
      if (!field.auto_generate && !field.ui_config?.hidden) {
        const isRequired = field.required && !field.default;
        const nullableType = field.graphql_type.replace("!", "");
        inputDef += `  ${field.name}: ${nullableType}${
          isRequired ? "!" : ""
        }\n`;
      }
    }

    // Add relationship fields
    for (const rel of relationships) {
      if (rel.type === "one-to-many") {
        inputDef += `  ${rel.name}: [${this.pascalCase(
          rel.target_component
        )}Input!]\n`;
      } else if (rel.type === "many-to-many") {
        inputDef += `  ${rel.name}: [ID!]\n`;
      }
    }

    inputDef += "}";
    return inputDef;
  }

  private generateUpdateWithRelationsInput(
    typeName: string,
    fields: Field[],
    relationships: Relationship[]
  ) {
    // Similar to create but all fields optional
    let inputDef = `input ${typeName}UpdateWithRelationsInput {\n`;

    // Add main fields (all optional for updates)
    for (const field of fields) {
      if (!field.auto_generate && !field.ui_config?.hidden) {
        const nullableType = field.graphql_type.replace("!", "");
        inputDef += `  ${field.name}: ${nullableType}\n`;
      }
    }

    // Add relationship fields
    for (const rel of relationships) {
      if (rel.type === "one-to-many") {
        inputDef += `  ${rel.name}: [${this.pascalCase(
          rel.target_component
        )}Input!]\n`;
      } else if (rel.type === "many-to-many") {
        inputDef += `  ${rel.name}: [ID!]\n`;
      }
    }

    inputDef += "}";
    return inputDef;
  }

  private generateWithRelationsType(
    typeName: string,
    fields: Field[],
    relationships: Relationship[]
  ) {
    // Extended type that includes all relationships
    let typeDef = `type ${typeName}WithRelations {\n`;

    // Add all fields
    for (const field of fields) {
      typeDef += `  ${field.name}: ${field.graphql_type}\n`;
    }

    // Add expanded relationship fields
    for (const rel of relationships) {
      typeDef += `  ${rel.graphql_field}: ${rel.graphql_type}\n`;
    }

    typeDef += "}";
    return typeDef;
  }

  // Resolver generation methods
  private generateGetResolver(
    typeName: string,
    primaryKey: Field,
    relationships: Relationship[]
  ) {
    return `async (parent, args, context) => {
      const { ${primaryKey.name} } = args;
      // Implementation depends on your data source
      return context.dataSources.${this.camelCase(typeName)}.getById(${
      primaryKey.name
    });
    }`;
  }

  private generateListResolver(
    typeName: string,
    relationships: Relationship[]
  ) {
    return `async (parent, args, context) => {
      const { filter, orderBy, limit, offset } = args;
      // Implementation depends on your data source
      return context.dataSources.${this.camelCase(
        typeName
      )}.list({ filter, orderBy, limit, offset });
    }`;
  }

  private generateGetWithRelationsResolver(
    typeName: string,
    primaryKey: Field,
    relationships: Relationship[]
  ) {
    return `async (parent, args, context) => {
      const { ${primaryKey.name} } = args;
      // Fetch with relationships
      return context.dataSources.${this.camelCase(
        typeName
      )}.getByIdWithRelations(${primaryKey.name});
    }`;
  }

  private generateCreateResolver(typeName: string, fields: Field[]) {
    return `async (parent, args, context) => {
      const { input } = args;
      return context.dataSources.${this.camelCase(typeName)}.create(input);
    }`;
  }

  private generateUpdateResolver(
    typeName: string,
    primaryKey: Field,
    fields: Field[]
  ) {
    return `async (parent, args, context) => {
      const { ${primaryKey.name}, input } = args;
      return context.dataSources.${this.camelCase(typeName)}.update(${
      primaryKey.name
    }, input);
    }`;
  }

  private generateDeleteResolver(typeName: string, primaryKey: Field) {
    return `async (parent, args, context) => {
      const { ${primaryKey.name} } = args;
      return context.dataSources.${this.camelCase(typeName)}.delete(${
      primaryKey.name
    });
    }`;
  }

  private generateCreateWithRelationsResolver(
    typeName: string,
    fields: Field[],
    relationships: Relationship[]
  ) {
    return `async (parent, args, context) => {
      const { input } = args;
      return context.dataSources.${this.camelCase(
        typeName
      )}.createWithRelations(input);
    }`;
  }

  private generateUpdateWithRelationsResolver(
    typeName: string,
    primaryKey: Field,
    fields: Field[],
    relationships: Relationship[]
  ) {
    return `async (parent, args, context) => {
      const { ${primaryKey.name}, input } = args;
      return context.dataSources.${this.camelCase(
        typeName
      )}.updateWithRelations(${primaryKey.name}, input);
    }`;
  }

  // Utility methods
  private pascalCase(str: string): string {
    return str.replace(/(^\w|_\w)/g, (match) =>
      match.replace("_", "").toUpperCase()
    );
  }

  private camelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private camelToSnake(str: string): string {
    return str
      .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
      .substring(1);
  }

  private getTableName(componentName: string): string {
    return this.camelToSnake(componentName) + "s";
  }
}
