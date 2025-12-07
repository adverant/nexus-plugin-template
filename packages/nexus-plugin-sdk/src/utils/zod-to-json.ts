/**
 * Zod to JSON Schema conversion utilities
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';

/**
 * Convert a Zod schema to JSON Schema format
 */
export function convertZodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return zodToJsonSchema(schema, {
    $refStrategy: 'none',
    target: 'jsonSchema7',
  }) as Record<string, unknown>;
}

/**
 * Extract descriptions from a Zod object schema
 */
export function extractSchemaDescriptions(
  schema: z.ZodType
): Map<string, string> {
  const descriptions = new Map<string, string>();
  
  // Get the schema description if it exists
  const def = schema._def;
  if (def && 'description' in def && typeof def.description === 'string') {
    descriptions.set('_root', def.description);
  }

  // For object schemas, extract field descriptions
  if (def && def.typeName === 'ZodObject') {
    const shape = (def as { shape: () => Record<string, z.ZodType> }).shape();
    for (const [key, fieldSchema] of Object.entries(shape)) {
      const fieldDef = (fieldSchema as z.ZodType)._def;
      if (fieldDef && 'description' in fieldDef && typeof fieldDef.description === 'string') {
        descriptions.set(key, fieldDef.description);
      }
    }
  }

  return descriptions;
}

/**
 * Generate a hash for a JSON schema (for cache invalidation)
 */
export function hashJsonSchema(schema: Record<string, unknown>): string {
  const str = JSON.stringify(schema);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
