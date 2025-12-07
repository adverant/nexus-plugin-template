/**
 * Testing Utilities for Nexus Plugins
 *
 * Provides mocks, test runners, and assertion helpers for comprehensive plugin testing.
 *
 * @example
 * ```typescript
 * import {
 *   createTestContext,
 *   MockLogger,
 *   PluginTestRunner,
 *   assertDefined
 * } from '@adverant-nexus/plugin-sdk';
 *
 * // Create a test context with mock services
 * const context = createTestContext();
 *
 * // Test a tool handler
 * const result = await myToolHandler({ query: 'test' }, context);
 * assertDefined(result.data);
 *
 * // Run automated tests against PID examples
 * const runner = new PluginTestRunner(myPID);
 * const results = await runner.runAllTests();
 * ```
 */

import type { MCPToolContext, MCPLogger, MCPServices, GraphRAGService, MageAgentService } from '../mcp/server-builder.js';
import type { PluginIntelligenceDocument, ToolExample } from '../intelligence/schema.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Log entry for MockLogger
 */
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Memory entry for MockGraphRAGService
 */
export interface MockMemoryEntry {
  id: string;
  content: string;
  tags: string[];
  embedding?: number[];
  createdAt: Date;
}

/**
 * Document entry for MockGraphRAGService
 */
export interface MockDocumentEntry {
  id: string;
  content: string;
  title?: string;
  chunks: string[];
  embeddings?: number[][];
  createdAt: Date;
}

/**
 * Options for createTestContext
 */
export interface CreateTestContextOptions {
  logger?: MCPLogger;
  graphrag?: GraphRAGService;
  mageagent?: MageAgentService;
}

/**
 * Test case definition
 */
export interface ToolTestCase {
  name: string;
  description?: string;
  toolName: string;
  input: Record<string, unknown>;
  expectedOutput?: Record<string, unknown>;
  expectError?: boolean;
  errorCode?: string;
  timeout?: number;
}

/**
 * Test result
 */
export interface ToolTestResult {
  name: string;
  toolName: string;
  passed: boolean;
  duration: number;
  error?: Error;
  actualOutput?: unknown;
  expectedOutput?: unknown;
}

// ============================================================================
// Mock Logger
// ============================================================================

/**
 * Mock logger that captures all log entries for testing
 */
export class MockLogger implements MCPLogger {
  private entries: LogEntry[] = [];
  private silent: boolean;

  constructor(options?: { silent?: boolean }) {
    this.silent = options?.silent ?? true;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  private log(level: LogEntry['level'], message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
    };
    this.entries.push(entry);

    if (!this.silent) {
      console[level](`[${level.toUpperCase()}] ${message}`, context || '');
    }
  }

  /**
   * Get all captured log entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries filtered by level
   */
  getEntriesByLevel(level: LogEntry['level']): LogEntry[] {
    return this.entries.filter((e) => e.level === level);
  }

  /**
   * Check if a message was logged
   */
  hasMessage(message: string, level?: LogEntry['level']): boolean {
    return this.entries.some(
      (e) => e.message.includes(message) && (!level || e.level === level)
    );
  }

  /**
   * Get the last N entries
   */
  getLastEntries(count: number): LogEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get entry count
   */
  get count(): number {
    return this.entries.length;
  }
}

// ============================================================================
// Mock GraphRAG Service
// ============================================================================

/**
 * Mock GraphRAG service for testing memory and document operations
 */
export class MockGraphRAGService implements GraphRAGService {
  private memories: Map<string, MockMemoryEntry> = new Map();
  private documents: Map<string, MockDocumentEntry> = new Map();
  private idCounter = 0;

  /**
   * Store a memory
   */
  async storeMemory(content: string, tags?: string[]): Promise<{ id: string }> {
    const id = `mem_${++this.idCounter}`;
    this.memories.set(id, {
      id,
      content,
      tags: tags || [],
      createdAt: new Date(),
    });
    return { id };
  }

  /**
   * Recall memories by query (simple substring match for testing)
   */
  async recallMemory(
    query: string,
    limit?: number
  ): Promise<Array<{ id: string; content: string; score: number }>> {
    const results: Array<{ id: string; content: string; score: number }> = [];
    const queryLower = query.toLowerCase();

    for (const memory of this.memories.values()) {
      const contentLower = memory.content.toLowerCase();
      if (contentLower.includes(queryLower)) {
        // Simple relevance score based on match position
        const score = 1 - contentLower.indexOf(queryLower) / contentLower.length;
        results.push({
          id: memory.id,
          content: memory.content,
          score,
        });
      }
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit || 10);
  }

  /**
   * Store a document
   */
  async storeDocument(content: string, title?: string): Promise<{ id: string; chunks: number }> {
    const id = `doc_${++this.idCounter}`;

    // Simple chunking by paragraphs
    const chunks = content
      .split(/\n\n+/)
      .filter((c) => c.trim().length > 0);

    this.documents.set(id, {
      id,
      content,
      title,
      chunks,
      createdAt: new Date(),
    });

    return { id, chunks: chunks.length };
  }

  /**
   * Search documents by query
   */
  async searchDocuments(
    query: string,
    limit?: number
  ): Promise<Array<{ id: string; content: string; score: number }>> {
    const results: Array<{ id: string; content: string; score: number }> = [];
    const queryLower = query.toLowerCase();

    for (const doc of this.documents.values()) {
      for (const chunk of doc.chunks) {
        const chunkLower = chunk.toLowerCase();
        if (chunkLower.includes(queryLower)) {
          const score = 1 - chunkLower.indexOf(queryLower) / chunkLower.length;
          results.push({
            id: doc.id,
            content: chunk,
            score,
          });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit || 10);
  }

  /**
   * Get all stored memories
   */
  getAllMemories(): MockMemoryEntry[] {
    return Array.from(this.memories.values());
  }

  /**
   * Get all stored documents
   */
  getAllDocuments(): MockDocumentEntry[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get a specific memory by ID
   */
  getMemory(id: string): MockMemoryEntry | undefined {
    return this.memories.get(id);
  }

  /**
   * Get a specific document by ID
   */
  getDocument(id: string): MockDocumentEntry | undefined {
    return this.documents.get(id);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.memories.clear();
    this.documents.clear();
    this.idCounter = 0;
  }
}

// ============================================================================
// Mock MageAgent Service
// ============================================================================

/**
 * Mock MageAgent service for testing orchestration
 */
export class MockMageAgentService implements MageAgentService {
  private orchestrateResult: { result: string; agentsUsed: number } = {
    result: 'Mock orchestration result',
    agentsUsed: 1,
  };
  private analyzeResult: { analysis: string } = {
    analysis: 'Mock analysis result',
  };
  private synthesizeResult: { output: string } = {
    output: 'Mock synthesis result',
  };

  /**
   * Mock orchestrate call
   */
  async orchestrate(
    task: string,
    options?: { maxAgents?: number }
  ): Promise<{ result: string; agentsUsed: number }> {
    return {
      ...this.orchestrateResult,
      agentsUsed: Math.min(options?.maxAgents || 3, this.orchestrateResult.agentsUsed),
    };
  }

  /**
   * Mock analyze call
   */
  async analyze(
    topic: string,
    depth?: 'quick' | 'standard' | 'deep'
  ): Promise<{ analysis: string }> {
    return {
      analysis: `[${depth || 'standard'}] ${this.analyzeResult.analysis} for: ${topic}`,
    };
  }

  /**
   * Mock synthesize call
   */
  async synthesize(
    sources: string[],
    format?: 'summary' | 'report'
  ): Promise<{ output: string }> {
    return {
      output: `[${format || 'summary'}] ${this.synthesizeResult.output} from ${sources.length} sources`,
    };
  }

  /**
   * Set the mock orchestrate result
   */
  setOrchestrateResult(result: { result: string; agentsUsed: number }): void {
    this.orchestrateResult = result;
  }

  /**
   * Set the mock analyze result
   */
  setAnalyzeResult(result: { analysis: string }): void {
    this.analyzeResult = result;
  }

  /**
   * Set the mock synthesize result
   */
  setSynthesizeResult(result: { output: string }): void {
    this.synthesizeResult = result;
  }
}

// ============================================================================
// Test Context Factory
// ============================================================================

/**
 * Create a test context with mock services
 */
export function createTestContext(options?: CreateTestContextOptions): MCPToolContext {
  return {
    logger: options?.logger || new MockLogger(),
    services: {
      graphrag: options?.graphrag || new MockGraphRAGService(),
      mageagent: options?.mageagent || new MockMageAgentService(),
    },
  };
}

// ============================================================================
// Plugin Test Runner
// ============================================================================

/**
 * Automated test runner for plugin tools using PID examples
 */
export class PluginTestRunner {
  private pid: PluginIntelligenceDocument;
  private handlers: Map<string, (input: unknown, context: MCPToolContext) => Promise<unknown>> =
    new Map();
  private context: MCPToolContext;

  constructor(pid: PluginIntelligenceDocument, context?: MCPToolContext) {
    this.pid = pid;
    this.context = context || createTestContext();
  }

  /**
   * Register a tool handler for testing
   */
  registerHandler(
    toolName: string,
    handler: (input: unknown, context: MCPToolContext) => Promise<unknown>
  ): void {
    this.handlers.set(toolName, handler);
  }

  /**
   * Register multiple handlers at once
   */
  registerHandlers(
    handlers: Record<string, (input: unknown, context: MCPToolContext) => Promise<unknown>>
  ): void {
    for (const [name, handler] of Object.entries(handlers)) {
      this.handlers.set(name, handler);
    }
  }

  /**
   * Run all tests from PID examples
   */
  async runAllTests(): Promise<ToolTestResult[]> {
    const results: ToolTestResult[] = [];

    for (const tool of this.pid.tools) {
      for (const example of tool.examples) {
        const result = await this.runExample(tool.name, example);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Run tests for a specific tool
   */
  async runToolTests(toolName: string): Promise<ToolTestResult[]> {
    const tool = this.pid.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const results: ToolTestResult[] = [];
    for (const example of tool.examples) {
      const result = await this.runExample(toolName, example);
      results.push(result);
    }

    return results;
  }

  /**
   * Run a single example test
   */
  async runExample(toolName: string, example: ToolExample): Promise<ToolTestResult> {
    const handler = this.handlers.get(toolName);
    if (!handler) {
      return {
        name: example.name,
        toolName,
        passed: false,
        duration: 0,
        error: new Error(`No handler registered for tool: ${toolName}`),
      };
    }

    const startTime = Date.now();

    try {
      const actualOutput = await handler(example.input, this.context);
      const duration = Date.now() - startTime;

      // Compare output if expected output is provided
      let passed = true;
      if (example.output) {
        passed = this.deepEqual(actualOutput, example.output);
      }

      return {
        name: example.name,
        toolName,
        passed,
        duration,
        actualOutput,
        expectedOutput: example.output,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        name: example.name,
        toolName,
        passed: false,
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
        expectedOutput: example.output,
      };
    }
  }

  /**
   * Run a custom test case
   */
  async runTestCase(testCase: ToolTestCase): Promise<ToolTestResult> {
    const handler = this.handlers.get(testCase.toolName);
    if (!handler) {
      return {
        name: testCase.name,
        toolName: testCase.toolName,
        passed: false,
        duration: 0,
        error: new Error(`No handler registered for tool: ${testCase.toolName}`),
      };
    }

    const startTime = Date.now();
    const timeout = testCase.timeout || 5000;

    try {
      const promise = handler(testCase.input, this.context);
      const actualOutput = await Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Test timed out')), timeout)
        ),
      ]);

      const duration = Date.now() - startTime;

      if (testCase.expectError) {
        return {
          name: testCase.name,
          toolName: testCase.toolName,
          passed: false,
          duration,
          error: new Error('Expected an error but none was thrown'),
          actualOutput,
        };
      }

      let passed = true;
      if (testCase.expectedOutput) {
        passed = this.deepEqual(actualOutput, testCase.expectedOutput);
      }

      return {
        name: testCase.name,
        toolName: testCase.toolName,
        passed,
        duration,
        actualOutput,
        expectedOutput: testCase.expectedOutput,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (testCase.expectError) {
        const err = error instanceof Error ? error : new Error(String(error));
        const passed = !testCase.errorCode || err.message.includes(testCase.errorCode);
        return {
          name: testCase.name,
          toolName: testCase.toolName,
          passed,
          duration,
          error: err,
        };
      }

      return {
        name: testCase.name,
        toolName: testCase.toolName,
        passed: false,
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
        expectedOutput: testCase.expectedOutput,
      };
    }
  }

  /**
   * Get a summary of test results
   */
  getSummary(results: ToolTestResult[]): {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    totalDuration: number;
    byTool: Record<string, { passed: number; failed: number }>;
  } {
    const byTool: Record<string, { passed: number; failed: number }> = {};

    for (const result of results) {
      if (!byTool[result.toolName]) {
        byTool[result.toolName] = { passed: 0, failed: 0 };
      }
      if (result.passed) {
        byTool[result.toolName].passed++;
      } else {
        byTool[result.toolName].failed++;
      }
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    return {
      total: results.length,
      passed,
      failed,
      passRate: results.length > 0 ? (passed / results.length) * 100 : 0,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      byTool,
    };
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index]));
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      const aKeys = Object.keys(aObj);
      const bKeys = Object.keys(bObj);

      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((key) => this.deepEqual(aObj[key], bObj[key]));
    }

    return false;
  }
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to be defined');
  }
}

/**
 * Assert that two values are equal (deep equality)
 */
export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  if (!isEqual) {
    throw new Error(
      message ||
        `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
    );
  }
}

/**
 * Assert that a string or array contains a value
 */
export function assertContains<T>(
  container: string | T[],
  value: string | T,
  message?: string
): void {
  const contains =
    typeof container === 'string'
      ? container.includes(value as string)
      : container.includes(value as T);

  if (!contains) {
    throw new Error(message || `Expected container to include ${JSON.stringify(value)}`);
  }
}

/**
 * Assert that a function throws an error
 */
export function assertThrows(
  fn: () => void,
  expectedMessage?: string,
  message?: string
): void {
  try {
    fn();
    throw new Error(message || 'Expected function to throw');
  } catch (error) {
    if (error instanceof Error && error.message === (message || 'Expected function to throw')) {
      throw error;
    }
    if (expectedMessage && error instanceof Error && !error.message.includes(expectedMessage)) {
      throw new Error(
        `Expected error message to include "${expectedMessage}" but got "${error.message}"`
      );
    }
  }
}

/**
 * Assert that an async function throws an error
 */
export async function assertThrowsAsync(
  fn: () => Promise<void>,
  expectedMessage?: string,
  message?: string
): Promise<void> {
  try {
    await fn();
    throw new Error(message || 'Expected function to throw');
  } catch (error) {
    if (error instanceof Error && error.message === (message || 'Expected function to throw')) {
      throw error;
    }
    if (expectedMessage && error instanceof Error && !error.message.includes(expectedMessage)) {
      throw new Error(
        `Expected error message to include "${expectedMessage}" but got "${error.message}"`
      );
    }
  }
}
