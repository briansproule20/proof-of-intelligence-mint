import type { HTTPRequestStructure } from 'x402/types';
import { z } from 'zod';

/**
 * Convert Zod schema to x402 HTTP request structure
 * Used for defining input schemas in x402 route configuration
 */
export function inputSchemaToX402(
  schema: z.ZodObject<any>
): HTTPRequestStructure {
  return {
    method: 'GET',
    query: zodToJsonSchema(schema),
  };
}

/**
 * Convert Zod schema to JSON Schema format
 * x402 uses JSON Schema for defining input/output structures
 */
export function zodToJsonSchema(schema: z.ZodType<any>) {
  return schema as any; // x402 handles Zod schema conversion internally
}
