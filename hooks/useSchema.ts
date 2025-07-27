import { useState, useEffect } from "react";
import { Schema } from "@/lib/schema/types";

interface UseSchemaOptions {
  name?: string;
  type?: "component" | "page";
  version?: string;
}

interface UseSchemaResult {
  schema: Schema | null;
  schemas: Schema[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSchema(options: UseSchemaOptions = {}): UseSchemaResult {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = async () => {
    try {
      setLoading(true);
      setError(null);

      if (options.name) {
        // Fetch specific schema
        const params = new URLSearchParams({
          name: options.name,
          ...(options.version && { version: options.version }),
        });

        const response = await fetch(`/api/schemas?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch schema");
        }

        const data = await response.json();
        setSchema(data);
      } else {
        // Fetch list of schemas
        const params = new URLSearchParams({
          ...(options.type && { type: options.type }),
        });

        const response = await fetch(`/api/schemas?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch schemas");
        }

        const data = await response.json();
        setSchemas(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, [options.name, options.type, options.version]);

  return {
    schema,
    schemas,
    loading,
    error,
    refresh: fetchSchema,
  };
}

export function useSchemaList(type?: "component" | "page") {
  return useSchema({ type });
}

export function useSchemaByName(name: string, version?: string) {
  return useSchema({ name, version });
}
