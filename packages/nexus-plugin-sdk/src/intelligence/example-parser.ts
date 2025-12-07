/**
 * Example Parser
 *
 * Extracts examples from test files, JSDoc comments, and documentation.
 */

import type { ToolExample } from './schema.js';

// ============================================================================
// Types
// ============================================================================

export interface ParsedExample {
  name: string;
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  source: 'test' | 'jsdoc' | 'markdown';
  notes?: string;
}

// ============================================================================
// Example Collector
// ============================================================================

export class ExampleCollector {
  private examples: Map<string, ParsedExample[]> = new Map();

  /**
   * Add an example for a tool
   */
  add(toolName: string, example: ParsedExample): void {
    const existing = this.examples.get(toolName) || [];
    existing.push(example);
    this.examples.set(toolName, existing);
  }

  /**
   * Get examples for a tool
   */
  get(toolName: string): ParsedExample[] {
    return this.examples.get(toolName) || [];
  }

  /**
   * Get all examples
   */
  getAll(): Map<string, ParsedExample[]> {
    return new Map(this.examples);
  }

  /**
   * Convert to ToolExample format
   */
  toToolExamples(toolName: string): ToolExample[] {
    return this.get(toolName).map((ex) => ({
      name: ex.name,
      description: ex.description,
      input: ex.input,
      output: ex.output,
      notes: ex.notes,
    }));
  }

  /**
   * Clear all examples
   */
  clear(): void {
    this.examples.clear();
  }
}

// ============================================================================
// Test File Parser
// ============================================================================

/**
 * Parse examples from test file content
 *
 * Looks for patterns like:
 * - it('should do X', ...)
 * - test('description', ...)
 * - Input/output patterns in test bodies
 */
export function parseTestExamples(content: string): ParsedExample[] {
  const examples: ParsedExample[] = [];

  // Match test blocks
  const testPattern = /(?:it|test)\s*\(\s*['"`]([^'"\`]+)['"`]\s*,\s*(?:async\s*)?\(\)\s*=>\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;

  let match;
  while ((match = testPattern.exec(content)) !== null) {
    const [, description, body] = match;

    // Try to extract input/output from the test body
    const inputMatch = body.match(/\{\s*([\s\S]*?)\s*\}/m);
    const expectMatch = body.match(/expect\s*\([^)]+\)\s*\.\s*(?:toBe|toEqual|toMatchObject)\s*\(\s*\{?([^)}]+)\}?\)/m);

    if (inputMatch) {
      try {
        // Simple key-value extraction
        const inputStr = inputMatch[1];
        const input = parseSimpleObject(inputStr);

        const output = expectMatch
          ? parseSimpleObject(expectMatch[1])
          : {};

        examples.push({
          name: description,
          description: `Test: ${description}`,
          input,
          output,
          source: 'test',
        });
      } catch {
        // Skip malformed examples
      }
    }
  }

  return examples;
}

// ============================================================================
// JSDoc Parser
// ============================================================================

/**
 * Parse examples from JSDoc @example comments
 *
 * Format:
 * @example
 * // Description
 * const result = await tool({ input: 'value' });
 * // Returns: { output: 'result' }
 */
export function parseJSDocExamples(content: string): ParsedExample[] {
  const examples: ParsedExample[] = [];

  // Match @example blocks
  const examplePattern = /@example\s*\n([\s\S]*?)(?=@\w|\*\/|$)/g;

  let match;
  while ((match = examplePattern.exec(content)) !== null) {
    const [, block] = match;

    // Clean up the block
    const lines = block
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter(Boolean);

    if (lines.length > 0) {
      // First line or comment is description
      let description = 'Example';
      let startIndex = 0;

      if (lines[0].startsWith('//')) {
        description = lines[0].replace(/^\/\/\s*/, '');
        startIndex = 1;
      }

      // Look for function call with input
      const codeLines = lines.slice(startIndex).join('\n');
      const inputMatch = codeLines.match(/\(\s*\{([^}]+)\}\s*\)/m);
      const outputMatch = codeLines.match(/(?:Returns?:|->|=>)\s*\{([^}]+)\}/mi);

      if (inputMatch) {
        try {
          const input = parseSimpleObject(inputMatch[1]);
          const output = outputMatch ? parseSimpleObject(outputMatch[1]) : {};

          examples.push({
            name: description,
            description,
            input,
            output,
            source: 'jsdoc',
          });
        } catch {
          // Skip malformed
        }
      }
    }
  }

  return examples;
}

// ============================================================================
// Markdown Parser
// ============================================================================

/**
 * Parse examples from Markdown code blocks
 *
 * Format:
 * ```json
 * { "input": "value" }
 * ```
 * Output:
 * ```json
 * { "result": "value" }
 * ```
 */
export function parseMarkdownExamples(content: string): ParsedExample[] {
  const examples: ParsedExample[] = [];

  // Match code blocks with optional input/output labels
  const blockPattern = /(?:#+\s*)?(?:Example[:\s]*)?([^\n]*)\n```(?:json|typescript|javascript)?\n([\s\S]*?)```(?:\s*(?:Output:|Returns:|->)\s*```(?:json)?\n([\s\S]*?)```)?/gi;

  let match;
  let index = 0;
  while ((match = blockPattern.exec(content)) !== null) {
    const [, name, inputBlock, outputBlock] = match;
    index++;

    try {
      const input = JSON.parse(inputBlock.trim());
      const output = outputBlock ? JSON.parse(outputBlock.trim()) : {};

      examples.push({
        name: name.trim() || `Example ${index}`,
        description: name.trim() || `Markdown example ${index}`,
        input: typeof input === 'object' ? input : { value: input },
        output: typeof output === 'object' ? output : { result: output },
        source: 'markdown',
      });
    } catch {
      // Skip malformed JSON
    }
  }

  return examples;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a simple object from a string like "key: 'value', num: 42"
 */
function parseSimpleObject(str: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Match key: value pairs
  const pairPattern = /(\w+)\s*:\s*(?:(['"`])([^'"\`]*?)\2|(\d+(?:\.\d+)?)|true|false|null|undefined|\[([^\]]*)])/g;

  let match;
  while ((match = pairPattern.exec(str)) !== null) {
    const [fullMatch, key, , stringVal, numVal, arrayVal] = match;

    if (stringVal !== undefined) {
      result[key] = stringVal;
    } else if (numVal !== undefined) {
      result[key] = parseFloat(numVal);
    } else if (fullMatch.includes('true')) {
      result[key] = true;
    } else if (fullMatch.includes('false')) {
      result[key] = false;
    } else if (fullMatch.includes('null')) {
      result[key] = null;
    } else if (arrayVal !== undefined) {
      // Simple array parsing
      result[key] = arrayVal
        .split(',')
        .map((v) => v.trim().replace(/^['"`]|['"`]$/g, ''));
    }
  }

  return result;
}
