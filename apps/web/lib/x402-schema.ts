import { type ZodObject, type ZodRawShape, type ZodSchema } from "zod";
import type { HTTPRequestStructure } from "x402/types";
import { zodToJsonSchema as convertZodToJsonSchema } from "zod-to-json-schema";

export function inputSchemaToX402(inputSchema: ZodObject<ZodRawShape>, method: "GET" | "POST" = "GET"): HTTPRequestStructure {
  const jsonSchema = convertZodToJsonSchema(inputSchema) as any;

  return {
    type: "http" as const,
    method: "POST" as const,
    bodyType: "json" as const,
    bodyFields: jsonSchema.properties,
  };
}

export function zodToJsonSchema(schema: ZodSchema) {
  return convertZodToJsonSchema(schema);
}
