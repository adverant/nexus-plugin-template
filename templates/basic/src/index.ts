/**
 * Calculator Plugin - Main Entry Point
 *
 * Demonstrates the PluginBuilder API for creating Nexus plugins.
 * This is a complete, production-ready plugin example.
 */

import { PluginBuilder, z } from '@adverant-nexus/plugin-sdk';
import {
  CalculateInputSchema,
  CalculateOutputSchema,
  ConvertUnitsInputSchema,
  ConvertUnitsOutputSchema,
  CalculatorErrorCodes,
} from './schemas.js';
import { handleCalculate, handleConvertUnits, CalculatorError } from './handlers.js';

// ============================================================================
// Plugin Definition
// ============================================================================

export const calculatorPlugin = PluginBuilder.create({
  id: 'nexus-plugin-calculator',
  name: 'calculator',
  displayName: 'Calculator Plugin',
  version: '1.0.0',
  description:
    'A comprehensive calculator plugin demonstrating core Nexus plugin development patterns. Supports arithmetic operations and unit conversions.',
})
  // ---------------------------------------------------------------------------
  // Semantic Context (LLM Tool Selection Guidance)
  // ---------------------------------------------------------------------------
  .setSemantic({
    capabilities: ['arithmetic_calculation', 'unit_conversion', 'mathematical_operations'],
    domain: 'mathematics',
    intent: 'action',

    whenToUse: [
      'User needs to perform arithmetic calculations (add, subtract, multiply, divide)',
      'User wants to calculate powers or square roots',
      'User needs to convert between measurement units (length, weight, temperature, volume)',
      'User asks "what is X plus/minus/times/divided by Y"',
      'User asks to convert meters to feet, Celsius to Fahrenheit, etc.',
    ],

    whenNotToUse: [
      'Complex mathematical functions (trigonometry, calculus) - use a specialized math plugin',
      'Currency conversions - use a currency plugin with live exchange rates',
      'Date/time calculations - use a datetime plugin',
      'Statistical analysis - use a statistics plugin',
    ],

    commonMistakes: [
      'Forgetting to specify the second operand for binary operations',
      'Using incompatible units (e.g., converting length to weight)',
      'Not specifying the unit category for conversions',
    ],

    bestPractices: [
      'Always specify precision for financial calculations',
      'Use the unit category parameter for unambiguous conversions',
      'Check error codes for proper error handling',
    ],

    relatedPlugins: ['statistics', 'currency-converter', 'datetime'],

    suggestedChains: [
      {
        name: 'Calculate and Convert',
        description: 'Perform calculation then convert result to different units',
        steps: ['calculate', 'convert_units'],
      },
    ],
  })

  // ---------------------------------------------------------------------------
  // Execution Profile
  // ---------------------------------------------------------------------------
  .setExecution({
    mode: 'mcp_container',
    isolationLevel: 1, // Low isolation needed (pure computation)

    performance: {
      latency: { p50: 5, p95: 15, p99: 50 },
      throughput: { requestsPerSecond: 1000, concurrentLimit: 100 },
    },

    resources: {
      cpuMillicores: 100,
      memoryMB: 128,
      diskGB: 0,
      timeoutMs: 5000,
    },

    cost: {
      perCall: 0, // Free - pure computation
      pricingTier: 'free',
      billingModel: 'per_call',
    },

    reliability: {
      successRate: 99.99,
      averageErrorRate: 0.01,
      circuitBreakerThreshold: 10,
    },
  })

  // ---------------------------------------------------------------------------
  // Context Requirements
  // ---------------------------------------------------------------------------
  .setContextRequirements({
    requiredServices: [], // No external services needed
    environmentVariables: [],
    credentials: [],
    permissions: [], // No special permissions needed
  })

  // ---------------------------------------------------------------------------
  // Trust Profile
  // ---------------------------------------------------------------------------
  .setTrust({
    level: 'nexus_official',
    certifications: [],
    securityScan: { passed: true, lastScan: new Date().toISOString(), vulnerabilities: 0 },
    codeReview: { status: 'approved', reviewer: 'Nexus Team', date: new Date().toISOString() },
  })

  // ---------------------------------------------------------------------------
  // Tool: Calculate
  // ---------------------------------------------------------------------------
  .addTool({
    name: 'calculate',
    displayName: 'Calculate',
    description:
      'Perform arithmetic calculations including addition, subtraction, multiplication, division, power, square root, and modulo.',
    inputSchema: CalculateInputSchema,
    outputSchema: CalculateOutputSchema,

    examples: [
      {
        name: 'Simple addition',
        description: 'Add two numbers together',
        input: { operation: 'add', a: 10, b: 5 },
        output: { result: 15, expression: '10 + 5 = 15', precision: 2 },
      },
      {
        name: 'Division with precision',
        description: 'Divide with specific decimal precision',
        input: { operation: 'divide', a: 22, b: 7, precision: 4 },
        output: { result: 3.1429, expression: '22 ÷ 7 = 3.1429', precision: 4 },
      },
      {
        name: 'Square root',
        description: 'Calculate square root (unary operation)',
        input: { operation: 'sqrt', a: 16 },
        output: { result: 4, expression: '√16 = 4', precision: 2 },
      },
      {
        name: 'Power calculation',
        description: 'Calculate 2 to the power of 10',
        input: { operation: 'power', a: 2, b: 10 },
        output: { result: 1024, expression: '2^10 = 1024', precision: 2 },
      },
    ],

    errors: [
      {
        code: CalculatorErrorCodes.DIVISION_BY_ZERO,
        httpStatus: 400,
        message: 'Cannot divide by zero',
        cause: 'The divisor (b) was zero',
        recovery: ['Use a non-zero divisor', 'Check input validation before calling'],
        retryable: false,
      },
      {
        code: CalculatorErrorCodes.NEGATIVE_SQRT,
        httpStatus: 400,
        message: 'Cannot calculate square root of negative number',
        cause: 'The operand (a) was negative for sqrt operation',
        recovery: ['Use Math.abs() if absolute value is intended', 'Use a complex number library'],
        retryable: false,
      },
      {
        code: CalculatorErrorCodes.INVALID_OPERATION,
        httpStatus: 400,
        message: 'Invalid or unsupported operation',
        cause: 'Unknown operation or missing required operand',
        recovery: ['Use a valid operation: add, subtract, multiply, divide, power, sqrt, modulo'],
        retryable: false,
      },
    ],

    streaming: { supported: false },
    caching: { cacheable: true, ttlSeconds: 3600 },

    handler: async (input) => {
      return handleCalculate(input);
    },
  })

  // ---------------------------------------------------------------------------
  // Tool: Convert Units
  // ---------------------------------------------------------------------------
  .addTool({
    name: 'convert_units',
    displayName: 'Convert Units',
    description:
      'Convert between measurement units across categories: length (m, km, ft, mi), weight (kg, lb, oz), temperature (C, F, K), and volume (L, gal, cup).',
    inputSchema: ConvertUnitsInputSchema,
    outputSchema: ConvertUnitsOutputSchema,

    examples: [
      {
        name: 'Meters to feet',
        description: 'Convert length from meters to feet',
        input: { value: 100, fromUnit: 'm', toUnit: 'ft', category: 'length' },
        output: {
          originalValue: 100,
          originalUnit: 'm',
          convertedValue: 328.084,
          targetUnit: 'ft',
          formula: '100 m × 1 ÷ 0.3048 = 328.0840 ft',
        },
      },
      {
        name: 'Celsius to Fahrenheit',
        description: 'Convert temperature from Celsius to Fahrenheit',
        input: { value: 25, fromUnit: 'C', toUnit: 'F', category: 'temperature' },
        output: {
          originalValue: 25,
          originalUnit: 'C',
          convertedValue: 77,
          targetUnit: 'F',
          formula: '25C → 25.00°C → 77.00F',
        },
      },
      {
        name: 'Pounds to kilograms',
        description: 'Convert weight from pounds to kilograms',
        input: { value: 150, fromUnit: 'lb', toUnit: 'kg', category: 'weight' },
        output: {
          originalValue: 150,
          originalUnit: 'lb',
          convertedValue: 68.0389,
          targetUnit: 'kg',
          formula: '150 lb × 0.453592 ÷ 1 = 68.0388 kg',
        },
      },
    ],

    errors: [
      {
        code: CalculatorErrorCodes.UNSUPPORTED_UNIT,
        httpStatus: 400,
        message: 'Unsupported unit or category',
        cause: 'The specified unit is not supported in the given category',
        recovery: [
          'Check supported units: length (m, km, cm, mm, mi, ft, in, yd)',
          'weight (kg, g, mg, lb, oz, t), temperature (C, F, K)',
          'volume (L, mL, gal, qt, pt, cup, fl_oz)',
        ],
        retryable: false,
      },
      {
        code: CalculatorErrorCodes.UNIT_MISMATCH,
        httpStatus: 400,
        message: 'Unit category mismatch',
        cause: 'Attempting to convert between incompatible unit categories',
        recovery: ['Ensure fromUnit and toUnit are in the same category'],
        retryable: false,
      },
    ],

    streaming: { supported: false },
    caching: { cacheable: true, ttlSeconds: 86400 }, // Units don't change

    handler: async (input) => {
      return handleConvertUnits(input);
    },
  });

// ============================================================================
// Export & Server Startup
// ============================================================================

// Generate Plugin Intelligence Document
export const pid = calculatorPlugin.generatePID();

// Validate plugin completeness
export const validation = calculatorPlugin.validate();

// Build and start MCP server
export const server = calculatorPlugin.buildServer();

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting Calculator Plugin MCP Server...');

  if (!validation.valid) {
    console.warn('Plugin validation warnings:', validation.issues);
  }

  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
