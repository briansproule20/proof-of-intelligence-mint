import { type ZodObject, type ZodRawShape, type ZodSchema } from "zod";
import type { HTTPRequestStructure } from "x402/types";
import { zodToJsonSchema as convertZodToJsonSchema } from "zod-to-json-schema";

export function inputSchemaToX402(inputSchema: ZodObject<ZodRawShape>, method: "GET" | "POST" = "GET"): HTTPRequestStructure {
  const jsonSchema = convertZodToJsonSchema(inputSchema) as any;

  // Convert JSON Schema properties to Record<string, string> for x402
  // x402 expects simple string descriptions, not full JSON schema objects
  const queryParams: Record<string, string> = {};

  if (jsonSchema.properties && typeof jsonSchema.properties === 'object') {
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
    method: method as const,
    queryParams,
  };
}

export function zodToJsonSchema(schema: ZodSchema) {
  return convertZodToJsonSchema(schema);
}
