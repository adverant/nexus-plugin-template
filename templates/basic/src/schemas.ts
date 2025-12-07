/**
 * Calculator Plugin - Zod Schemas
 *
 * Defines input/output schemas for calculator operations.
 * These schemas are auto-extracted into the Plugin Intelligence Document.
 */

import { z } from 'zod';

// ============================================================================
// Calculate Schemas
// ============================================================================

export const OperationSchema = z
  .enum(['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt', 'modulo'])
  .describe('Arithmetic operation to perform');

export const CalculateInputSchema = z.object({
  operation: OperationSchema,
  a: z.number().describe('First operand'),
  b: z.number().optional().describe('Second operand (required for binary operations)'),
  precision: z
    .number()
    .int()
    .min(0)
    .max(15)
    .default(2)
    .describe('Number of decimal places in result'),
});

export const CalculateOutputSchema = z.object({
  result: z.number().describe('Calculation result'),
  expression: z.string().describe('Human-readable expression'),
  precision: z.number().describe('Decimal precision used'),
});

export type CalculateInput = z.infer<typeof CalculateInputSchema>;
export type CalculateOutput = z.infer<typeof CalculateOutputSchema>;

// ============================================================================
// Unit Conversion Schemas
// ============================================================================

export const UnitCategorySchema = z
  .enum(['length', 'weight', 'temperature', 'volume'])
  .describe('Category of measurement');

export const ConvertUnitsInputSchema = z.object({
  value: z.number().describe('Value to convert'),
  fromUnit: z.string().describe('Source unit (e.g., "m", "kg", "C")'),
  toUnit: z.string().describe('Target unit'),
  category: UnitCategorySchema,
});

export const ConvertUnitsOutputSchema = z.object({
  originalValue: z.number().describe('Original input value'),
  originalUnit: z.string().describe('Original unit'),
  convertedValue: z.number().describe('Converted value'),
  targetUnit: z.string().describe('Target unit'),
  formula: z.string().describe('Conversion formula used'),
});

export type ConvertUnitsInput = z.infer<typeof ConvertUnitsInputSchema>;
export type ConvertUnitsOutput = z.infer<typeof ConvertUnitsOutputSchema>;

// ============================================================================
// Error Codes
// ============================================================================

export const CalculatorErrorCodes = {
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  NEGATIVE_SQRT: 'NEGATIVE_SQRT',
  INVALID_OPERATION: 'INVALID_OPERATION',
  UNIT_MISMATCH: 'UNIT_MISMATCH',
  UNSUPPORTED_UNIT: 'UNSUPPORTED_UNIT',
} as const;

export type CalculatorErrorCode = (typeof CalculatorErrorCodes)[keyof typeof CalculatorErrorCodes];
