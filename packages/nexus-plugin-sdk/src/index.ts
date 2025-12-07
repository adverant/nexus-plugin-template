/**
 * Nexus Plugin SDK v3.0
 *
 * Official SDK for building Nexus plugins with Plugin Intelligence Document (PID) support.
 *
 * @example
 * ```typescript
 * import {
 *   MCPServerBuilder,
 *   defineTool,
 *   validatePID,
 *   exportPID
 * } from '@adverant-nexus/plugin-sdk';
 *
 * // Define a tool with Zod schemas
 * const myTool = defineTool({
 *   name: 'my_tool',
 *   displayName: 'My Tool',
 *   description: 'Does something useful',
 *   inputSchema: z.object({ query: z.string() }),
 *   outputSchema: z.object({ result: z.string() }),
 *   examples: [
 *     { name: 'Basic', description: 'Basic usage', input: { query: 'test' }, output: { result: 'ok' } }
 *   ]
 * });
 *
 * // Build an MCP server
 * const server = MCPServerBuilder.create({ name: 'my-plugin', version: '1.0.0' })
 *   .tool('my_tool')
 *     .description('Does something useful')
 *     .input(z.object({ query: z.string() }))
 *     .output(z.object({ result: z.string() }))
 *     .handler(async (input) => ({ result: input.query.toUpperCase() }))
 *     .done()
 *   .build();
 *
 * server.start();
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Intelligence Module Exports
// ============================================================================

export {
  // Schemas
  PluginIntelligenceDocumentSchema,
  ToolIntelligenceSchema,
  SemanticContextSchema,
  ExecutionProfileSchema,
  ToolExampleSchema,
  ToolErrorSchema,
  JSONSchemaSchema,
  ExecutionModeSchema,
  TrustLevelSchema,
  IntentTypeSchema,
  BillingModelSchema,
  PerformanceMetricsSchema,
  ResourceRequirementsSchema,
  CostConfigSchema,
  ReliabilityMetricsSchema,
  ContextRequirementsSchema,
  CompatibilitySchema,
  TrustProfileSchema,
  GeneratedMetadataSchema,
  StreamingConfigSchema,
  CachingConfigSchema,
  SuggestedChainSchema,
  ServiceDependencySchema,
  EnvironmentVariableSchema,
  CredentialRequirementSchema,
  DependencySchema,
  SecurityScanSchema,
  CodeReviewSchema,
  PID_SCHEMA_VERSION,

  // Types
  type PluginIntelligenceDocument,
  type ToolIntelligence,
  type SemanticContext,
  type ExecutionProfile,
  type ToolExample,
  type ToolError,
  type JSONSchema,
  type ExecutionMode,
  type TrustLevel,
  type IntentType,
  type BillingModel,
  type PerformanceMetrics,
  type ResourceRequirements,
  type CostConfig,
  type ReliabilityMetrics,
  type ContextRequirements,
  type Compatibility,
  type TrustProfile,
  type GeneratedMetadata,
  type StreamingConfig,
  type CachingConfig,
} from './intelligence/schema.js';

export {
  // Extractor
  zodToJSONSchema,
  defineTool,
  validateInput,
  formatZodErrors,
  SchemaRegistry,
  globalRegistry,
  PaginationInputSchema,
  PaginationOutputSchema,
  ErrorResponseSchema,
  createSuccessSchema,

  // Types
  type ZodToolDefinition,
  type InferInput,
  type InferOutput,
} from './intelligence/extractor.js';

export {
  // Example Parser
  ExampleCollector,
  parseTestExamples,
  parseJSDocExamples,
  parseMarkdownExamples,

  // Types
  type ParsedExample,
} from './intelligence/example-parser.js';

export {
  // Validator
  PIDValidator,
  isValidPID,
  validatePID,
  parsePID,

  // Types
  type ValidationSeverity,
  type ValidationIssue,
  type ValidationResult,
} from './intelligence/validator.js';

export {
  // Exporter
  PIDExporter,
  exportPID,
  exportCombinedPIDs,
  exportToMCPToolFormat,

  // Types
  type ExportFormat,
  type ExportOptions,
  type MCPToolFormat,
  type OpenAPISpec,
} from './intelligence/exporter.js';

// ============================================================================
// MCP Module Exports
// ============================================================================

export {
  MCPServerBuilder,
  MCPToolBuilder,
  MCPServer,
  createMCPServer,

  // Types
  type MCPServerConfig,
  type MCPToolDefinition,
  type MCPResource,
  type MCPPrompt,
  type MCPToolContext,
  type MCPLogger,
  type MCPServices,
} from './mcp/server-builder.js';

// ============================================================================
// Testing Module Exports
// ============================================================================

export {
  MockLogger,
  MockGraphRAGService,
  MockMageAgentService,
  createTestContext,
  PluginTestRunner,
  assertDefined,
  assertEqual,
  assertContains,
  assertThrows,
  assertThrowsAsync,

  // Types
  type LogEntry,
  type MockMemoryEntry,
  type MockDocumentEntry,
  type CreateTestContextOptions,
  type ToolTestCase,
  type ToolTestResult,
} from './testing/index.js';

// ============================================================================
// Re-export Zod for convenience
// ============================================================================

export { z } from 'zod';

// ============================================================================
// SDK Version
// ============================================================================

export const SDK_VERSION = '3.0.0';

// ============================================================================
// Plugin Builder (High-Level API)
// ============================================================================

import { z } from 'zod';
import { MCPServerBuilder, type MCPServerConfig } from './mcp/server-builder.js';
import { PIDValidator, type ValidationResult } from './intelligence/validator.js';
import { PIDExporter, type ExportFormat } from './intelligence/exporter.js';
import {
  type PluginIntelligenceDocument,
  type ToolIntelligence,
  type SemanticContext,
  type ExecutionProfile,
  type ContextRequirements,
  type Compatibility,
  type TrustProfile,
  PID_SCHEMA_VERSION,
} from './intelligence/schema.js';
import { zodToJSONSchema, type ZodToolDefinition } from './intelligence/extractor.js';
import { createHash } from 'crypto';

/**
 * Plugin configuration options
 */
export interface PluginConfig {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
}

/**
 * High-level plugin builder combining MCP server and PID generation
 */
export class PluginBuilder {
  private config: PluginConfig;
  private tools: ToolIntelligence[] = [];
  private semantic: Partial<SemanticContext> = {};
  private execution: Partial<ExecutionProfile> = {};
  private contextRequirements: Partial<ContextRequirements> = {};
  private compatibility: Partial<Compatibility> = {};
  private trust: Partial<TrustProfile> = {};
  private mcpBuilder: MCPServerBuilder;

  constructor(config: PluginConfig) {
    this.config = config;
    this.mcpBuilder = MCPServerBuilder.create({
      name: config.name,
      version: config.version,
      description: config.description,
    });
  }

  /**
   * Create a new plugin builder
   */
  static create(config: PluginConfig): PluginBuilder {
    return new PluginBuilder(config);
  }

  /**
   * Add a tool to the plugin
   */
  addTool<TInput extends z.ZodType, TOutput extends z.ZodType>(
    definition: ZodToolDefinition<TInput, TOutput> & {
      handler: (input: z.infer<TInput>, context: unknown) => Promise<z.infer<TOutput>>;
    }
  ): this {
    // Add to PID tools list
    const toolIntelligence: ToolIntelligence = {
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
    this.tools.push(toolIntelligence);

    // Add to MCP server
    this.mcpBuilder.addTool({
      name: definition.name,
      displayName: definition.displayName,
      description: definition.description,
      inputSchema: definition.inputSchema,
      outputSchema: definition.outputSchema,
      handler: definition.handler,
    });

    return this;
  }

  /**
   * Set semantic context for LLM decision-making
   */
  setSemantic(semantic: Partial<SemanticContext>): this {
    this.semantic = { ...this.semantic, ...semantic };
    return this;
  }

  /**
   * Set execution profile
   */
  setExecution(execution: Partial<ExecutionProfile>): this {
    this.execution = { ...this.execution, ...execution };
    return this;
  }

  /**
   * Set context requirements
   */
  setContextRequirements(requirements: Partial<ContextRequirements>): this {
    this.contextRequirements = { ...this.contextRequirements, ...requirements };
    return this;
  }

  /**
   * Set compatibility information
   */
  setCompatibility(compatibility: Partial<Compatibility>): this {
    this.compatibility = { ...this.compatibility, ...compatibility };
    return this;
  }

  /**
   * Set trust profile
   */
  setTrust(trust: Partial<TrustProfile>): this {
    this.trust = { ...this.trust, ...trust };
    return this;
  }

  /**
   * Generate the Plugin Intelligence Document
   */
  generatePID(): PluginIntelligenceDocument {
    const now = new Date().toISOString();

    const pid: PluginIntelligenceDocument = {
      id: this.config.id,
      name: this.config.name,
      displayName: this.config.displayName,
      version: this.config.version,
      description: this.config.description,

      semantic: {
        capabilities: this.semantic.capabilities || [],
        domain: this.semantic.domain || 'general',
        intent: this.semantic.intent || 'action',
        whenToUse: this.semantic.whenToUse || [],
        whenNotToUse: this.semantic.whenNotToUse || [],
        commonMistakes: this.semantic.commonMistakes,
        bestPractices: this.semantic.bestPractices,
        relatedPlugins: this.semantic.relatedPlugins,
        suggestedChains: this.semantic.suggestedChains,
      },

      tools: this.tools,

      execution: {
        mode: this.execution.mode || 'mcp_container',
        isolationLevel: this.execution.isolationLevel || 2,
        performance: this.execution.performance,
        resources: this.execution.resources || {
          cpuMillicores: 500,
          memoryMB: 512,
          timeoutMs: 30000,
        },
        cost: this.execution.cost,
        reliability: this.execution.reliability,
      },

      contextRequirements: {
        permissions: this.contextRequirements.permissions || [],
        requiredServices: this.contextRequirements.requiredServices,
        environmentVariables: this.contextRequirements.environmentVariables,
        credentials: this.contextRequirements.credentials,
      },

      compatibility: {
        nexusMinVersion: this.compatibility.nexusMinVersion || '2.0.0',
        supportedPlatforms: this.compatibility.supportedPlatforms || ['linux', 'darwin'],
        dependencies: this.compatibility.dependencies,
      },

      trust: {
        level: this.trust.level || 'unverified',
        certifications: this.trust.certifications,
        securityScan: this.trust.securityScan,
        codeReview: this.trust.codeReview,
      },

      _metadata: {
        generatedAt: now,
        generatedFrom: 'zod',
        schemaVersion: PID_SCHEMA_VERSION,
        hash: this.generateHash(),
      },
    };

    return pid;
  }

  /**
   * Validate the generated PID
   */
  validate(): ValidationResult {
    const pid = this.generatePID();
    const validator = new PIDValidator();
    return validator.validate(pid);
  }

  /**
   * Export the PID in various formats
   */
  export(format: ExportFormat = 'json'): string {
    const pid = this.generatePID();
    const exporter = new PIDExporter(pid);
    return exporter.export({ format });
  }

  /**
   * Build the MCP server
   */
  buildServer(): ReturnType<MCPServerBuilder['build']> {
    return this.mcpBuilder.build();
  }

  /**
   * Generate content hash for cache invalidation
   */
  private generateHash(): string {
    const content = JSON.stringify({
      config: this.config,
      tools: this.tools,
      semantic: this.semantic,
    });
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}

/**
 * Quick helper to create a plugin
 */
export function createPlugin(config: PluginConfig): PluginBuilder {
  return PluginBuilder.create(config);
}
