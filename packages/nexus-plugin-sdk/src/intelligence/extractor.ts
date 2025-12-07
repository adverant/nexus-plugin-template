/**
 * Schema Extractor
 *
 * Extracts JSON Schema from Zod schemas and TypeScript types
 * for Plugin Intelligence Document generation.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { JSONSchema, ToolIntelligence, ToolExample, ToolError } from './schema.js';

// ============================================================================
// Zod Schema Extraction
// ============================================================================

/**
 * Convert a Zod schema to JSON Schema format
 */
export function zodToJSONSchema<T extends z.ZodType>(
  schema: T,
  options?: {
    name?: string;
    definitions?: boolean;
  }
): JSONSchema {
  const jsonSchema = zodToJsonSchema(schema, {
    name: options?.name,
    target: 'jsonSchema7',
    $refStrategy: options?.definitions ? 'relative' : 'none',
  });

  // Clean up the schema for better LLM consumption
  return cleanJsonSchema(jsonSchema as JSONSchema);
}

/**
 * Clean JSON Schema for better LLM consumption
 */
function cleanJsonSchema(schema: JSONSchema): JSONSchema {
  const cleaned: JSONSchema = {};

  for (const [key, value] of Object.entries(schema)) {
    // Skip internal Zod properties
    if (key.startsWith('$') && key !== '$ref') {
      if (key === '$schema') continue;
      cleaned[key] = value;
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      cleaned[key] = cleanJsonSchema(value as JSONSchema);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

// ============================================================================
// Tool Definition Helpers
// ============================================================================

export interface ZodToolDefinition<
  TInput extends z.ZodType,
  TOutput extends z.ZodType
> {
  name: string;
  displayName: string;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  examples?: ToolExample[];
  errors?: ToolError[];
  streaming?: {
    supported: boolean;
    contentType?: string;
    progressUpdates?: boolean;
  };
  caching?: {
    cacheable: boolean;
    ttlSeconds?: number;
    cacheKey?: string;
  };
}

/**
 * Create a tool definition with Zod schemas
 */
export function defineTool<
  TInput extends z.ZodType,
  TOutput extends z.ZodType
>(definition: ZodToolDefinition<TInput, TOutput>): ToolIntelligence {
  return {
    name: definition.name,
    displayName: definition.displayName,
    description: definition.description,
    inputSchema: zodToJSONSchema(definition.inputSchema, { name: `${definition.name}_input` }),
    outputSchema: zodToJSONSchema(definition.outputSchema, { name: `${definition.name}_output` }),
    examples: definition.examples || [],
    errors: definition.errors || [
      {
        code: 'INTERNAL_ERROR',
        httpStatus: 500,
        message: 'An internal error occurred',
        cause: 'Unexpected server error',
        recovery: ['Retry the request', 'Contact support if error persists'],
        retryable: true,
      },
    ],
    streaming: definition.streaming,
    caching: definition.caching,
  };
}

// ============================================================================
// Type Inference Helpers
// ============================================================================

/**
 * Infer the input type from a Zod schema
 */
export type InferInput<T> = T extends ZodToolDefinition<infer I, z.ZodType>
  ? z.infer<I>
  : never;

/**
 * Infer the output type from a Zod schema
 */
export type InferOutput<T> = T extends ZodToolDefinition<z.ZodType, infer O>
  ? z.infer<O>
  : never;

// ============================================================================
// Schema Registry
// ============================================================================

export class SchemaRegistry {
  private schemas = new Map<string, ToolIntelligence>();

  /**
   * Register a tool definition
   */
  register(tool: ToolIntelligence): void {
    this.schemas.set(tool.name, tool);
  }

  /**
   * Get a registered tool
   */
  get(name: string): ToolIntelligence | undefined {
    return this.schemas.get(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): ToolIntelligence[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.schemas.has(name);
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.schemas.clear();
  }
}

// ============================================================================
// Common Schema Patterns
// ============================================================================

/**
 * Common pagination input schema
 */
export const PaginationInputSchema = z.object({
  page: z.number().int().positive().default(1).describe('Page number'),
  limit: z.number().int().min(1).max(100).default(20).describe('Items per page'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

/**
 * Common pagination output schema
 */
export const PaginationOutputSchema = z.object({
  page: z.number().int().describe('Current page'),
  limit: z.number().int().describe('Items per page'),
  total: z.number().int().describe('Total items'),
  totalPages: z.number().int().describe('Total pages'),
  hasNext: z.boolean().describe('Has next page'),
  hasPrev: z.boolean().describe('Has previous page'),
  nextCursor: z.string().optional().describe('Next page cursor'),
});

/**
 * Common error response schema
 */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().describe('Error code'),
    message: z.string().describe('Error message'),
    details: z.record(z.any()).optional().describe('Additional error details'),
  }),
  requestId: z.string().optional().describe('Request ID for debugging'),
});

/**
 * Common success response wrapper
 */
export function createSuccessSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    requestId: z.string().optional(),
  });
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate input against a Zod schema with detailed errors
 */
export function validateInput<T extends z.ZodType>(
  schema: T,
  input: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Format Zod errors for LLM-friendly output
 */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
}

// ============================================================================
// Default Export
// ============================================================================

export const globalRegistry = new SchemaRegistry();
