/**
 * Calculator Plugin - Tool Handlers
 *
 * Business logic for calculator operations.
 */

import type {
  CalculateInput,
  CalculateOutput,
  ConvertUnitsInput,
  ConvertUnitsOutput,
} from './schemas.js';
import { CalculatorErrorCodes } from './schemas.js';

// ============================================================================
// Calculate Handler
// ============================================================================

/**
 * Perform an arithmetic calculation
 */
export async function handleCalculate(input: CalculateInput): Promise<CalculateOutput> {
  const { operation, a, b, precision = 2 } = input;
  let result: number;
  let expression: string;

  switch (operation) {
    case 'add':
      if (b === undefined) throw new CalculatorError(CalculatorErrorCodes.INVALID_OPERATION, 'Addition requires two operands');
      result = a + b;
      expression = `${a} + ${b}`;
      break;

    case 'subtract':
      if (b === undefined) throw new CalculatorError(CalculatorErrorCodes.INVALID_OPERATION, 'Subtraction requires two operands');
      result = a - b;
      expression = `${a} - ${b}`;
      break;

    case 'multiply':
      if (b === undefined) throw new CalculatorError(CalculatorErrorCodes.INVALID_OPERATION, 'Multiplication requires two operands');
      result = a * b;
      expression = `${a} × ${b}`;
      break;

    case 'divide':
      if (b === undefined) throw new CalculatorError(CalculatorErrorCodes.INVALID_OPERATION, 'Division requires two operands');
      if (b === 0) throw new CalculatorError(CalculatorErrorCodes.DIVISION_BY_ZERO, 'Cannot divide by zero');
      result = a / b;
      expression = `${a} ÷ ${b}`;
      break;

    case 'power':
      if (b === undefined) throw new CalculatorError(CalculatorErrorCodes.INVALID_OPERATION, 'Power requires two operands');
      result = Math.pow(a, b);
      expression = `${a}^${b}`;
      break;

    case 'sqrt':
      if (a < 0) throw new CalculatorError(CalculatorErrorCodes.NEGATIVE_SQRT, 'Cannot calculate square root of negative number');
      result = Math.sqrt(a);
      expression = `√${a}`;
      break;

    case 'modulo':
      if (b === undefined) throw new CalculatorError(CalculatorErrorCodes.INVALID_OPERATION, 'Modulo requires two operands');
      if (b === 0) throw new CalculatorError(CalculatorErrorCodes.DIVISION_BY_ZERO, 'Cannot calculate modulo with divisor zero');
      result = a % b;
      expression = `${a} mod ${b}`;
      break;

    default:
      throw new CalculatorError(CalculatorErrorCodes.INVALID_OPERATION, `Unknown operation: ${operation}`);
  }

  // Apply precision
  result = Number(result.toFixed(precision));

  return {
    result,
    expression: `${expression} = ${result}`,
    precision,
  };
}

// ============================================================================
// Unit Conversion Handler
// ============================================================================

/**
 * Conversion factors to base units
 * Length: meters, Weight: kilograms, Temperature: Celsius, Volume: liters
 */
const CONVERSION_FACTORS: Record<string, Record<string, number | ((v: number) => number)>> = {
  length: {
    m: 1,
    km: 1000,
    cm: 0.01,
    mm: 0.001,
    mi: 1609.344,
    ft: 0.3048,
    in: 0.0254,
    yd: 0.9144,
  },
  weight: {
    kg: 1,
    g: 0.001,
    mg: 0.000001,
    lb: 0.453592,
    oz: 0.0283495,
    t: 1000,
  },
  temperature: {
    C: { toBase: (v: number) => v, fromBase: (v: number) => v },
    F: { toBase: (v: number) => (v - 32) * 5 / 9, fromBase: (v: number) => v * 9 / 5 + 32 },
    K: { toBase: (v: number) => v - 273.15, fromBase: (v: number) => v + 273.15 },
  },
  volume: {
    L: 1,
    mL: 0.001,
    gal: 3.78541,
    qt: 0.946353,
    pt: 0.473176,
    cup: 0.236588,
    fl_oz: 0.0295735,
  },
};

/**
 * Convert between measurement units
 */
export async function handleConvertUnits(input: ConvertUnitsInput): Promise<ConvertUnitsOutput> {
  const { value, fromUnit, toUnit, category } = input;

  const categoryFactors = CONVERSION_FACTORS[category];
  if (!categoryFactors) {
    throw new CalculatorError(CalculatorErrorCodes.UNSUPPORTED_UNIT, `Unsupported category: ${category}`);
  }

  const fromFactor = categoryFactors[fromUnit];
  const toFactor = categoryFactors[toUnit];

  if (fromFactor === undefined) {
    throw new CalculatorError(CalculatorErrorCodes.UNSUPPORTED_UNIT, `Unsupported unit: ${fromUnit}`);
  }
  if (toFactor === undefined) {
    throw new CalculatorError(CalculatorErrorCodes.UNSUPPORTED_UNIT, `Unsupported unit: ${toUnit}`);
  }

  let convertedValue: number;
  let formula: string;

  if (category === 'temperature') {
    // Temperature uses special conversion functions
    const fromConv = fromFactor as { toBase: (v: number) => number; fromBase: (v: number) => number };
    const toConv = toFactor as { toBase: (v: number) => number; fromBase: (v: number) => number };

    const baseValue = fromConv.toBase(value);
    convertedValue = toConv.fromBase(baseValue);
    formula = `${value}${fromUnit} → ${baseValue.toFixed(2)}°C → ${convertedValue.toFixed(2)}${toUnit}`;
  } else {
    // Linear conversions
    const fromFactorNum = fromFactor as number;
    const toFactorNum = toFactor as number;

    const baseValue = value * fromFactorNum;
    convertedValue = baseValue / toFactorNum;
    formula = `${value} ${fromUnit} × ${fromFactorNum} ÷ ${toFactorNum} = ${convertedValue.toFixed(4)} ${toUnit}`;
  }

  return {
    originalValue: value,
    originalUnit: fromUnit,
    convertedValue: Number(convertedValue.toFixed(6)),
    targetUnit: toUnit,
    formula,
  };
}

// ============================================================================
// Error Classes
// ============================================================================

export class CalculatorError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly retryable: boolean;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CalculatorError';
    this.code = code;
    this.httpStatus = this.getHttpStatus(code);
    this.retryable = false; // Calculator errors are not retryable
    Error.captureStackTrace(this, this.constructor);
  }

  private getHttpStatus(code: string): number {
    switch (code) {
      case CalculatorErrorCodes.DIVISION_BY_ZERO:
      case CalculatorErrorCodes.NEGATIVE_SQRT:
      case CalculatorErrorCodes.INVALID_OPERATION:
      case CalculatorErrorCodes.UNIT_MISMATCH:
      case CalculatorErrorCodes.UNSUPPORTED_UNIT:
        return 400; // Bad Request
      default:
        return 500; // Internal Server Error
    }
  }
}
