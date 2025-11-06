import { z, type ZodObject, type ZodRawShape, type ZodSchema } from "zod";
import type { HTTPRequestStructure } from "x402/types";

export function inputSchemaToX402(inputSchema: ZodObject<ZodRawShape>): HTTPRequestStructure {
  const jsonSchema = z.toJSONSchema(inputSchema);

  // Convert JSON Schema properties to Record<string, string> for x402
  // x402 expects simple string descriptions, not full JSON schema objects
  const queryParams: Record<string, string> = {};

  if (jsonSchema.properties) {
    for (const [key, value] of Object.entries(jsonSchema.properties)) {
      // Convert each property to a string description
      if (typeof value === 'object' && value !== null) {
        const prop = value as any;
        // Create a simple string description from the schema
        const type = prop.type || 'string';
        const description = prop.description || '';
        queryParams[key] = description || `${type} parameter`;
      }
    }
  }

  return {
    type: "http" as const,
    method: "GET" as const,
    queryParams,
  };
}

export function zodToJsonSchema(schema: ZodSchema) {
  return z.toJSONSchema(schema);
}
