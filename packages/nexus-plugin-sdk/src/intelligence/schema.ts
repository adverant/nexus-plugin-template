/**
 * Plugin Intelligence Document (PID) Schema
 *
 * Comprehensive, LLM-optimized metadata schema for Nexus plugins.
 * Auto-generated from code (Zod schemas, TypeScript types, tests)
 * and enriched with runtime metrics after deployment.
 */

import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

export const ExecutionModeSchema = z.enum([
  'external_https',
  'mcp_container',
  'hardened_docker',
  'firecracker',
]);
export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;

export const TrustLevelSchema = z.enum([
  'unverified',
  'community',
  'enterprise',
  'verified_publisher',
  'nexus_official',
]);
export type TrustLevel = z.infer<typeof TrustLevelSchema>;

export const IntentTypeSchema = z.enum([
  'query',
  'action',
  'transform',
  'generate',
]);
export type IntentType = z.infer<typeof IntentTypeSchema>;

export const BillingModelSchema = z.enum([
  'per_call',
  'per_minute',
  'flat_rate',
]);
export type BillingModel = z.infer<typeof BillingModelSchema>;

// ============================================================================
// JSON Schema Reference Type
// ============================================================================

export const JSONSchemaSchema = z.object({
  type: z.string().optional(),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
  items: z.any().optional(),
  enum: z.array(z.any()).optional(),
  default: z.any().optional(),
  description: z.string().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  format: z.string().optional(),
  $ref: z.string().optional(),
  definitions: z.record(z.any()).optional(),
  additionalProperties: z.union([z.boolean(), z.any()]).optional(),
}).passthrough();

export type JSONSchema = z.infer<typeof JSONSchemaSchema>;

// ============================================================================
// Semantic Context (LLM Decision-Making)
// ============================================================================

export const SuggestedChainSchema = z.object({
  name: z.string().describe('Name of the chain workflow'),
  description: z.string().describe('What this chain accomplishes'),
  steps: z.array(z.string()).describe('Tool names in order'),
});

export const SemanticContextSchema = z.object({
  capabilities: z.array(z.string())
    .min(1)
    .max(10)
    .describe('Capability tags like "weather_retrieval", "data_formatting"'),

  domain: z.string()
    .describe('Single domain category: weather, analytics, document_processing'),

  intent: IntentTypeSchema
    .describe('Primary intent: query, action, transform, or generate'),

  whenToUse: z.array(z.string())
    .min(2)
    .max(10)
    .describe('Scenarios when this plugin should be used'),

  whenNotToUse: z.array(z.string())
    .min(1)
    .max(5)
    .describe('Anti-patterns - when NOT to use this plugin'),

  commonMistakes: z.array(z.string())
    .max(5)
    .optional()
    .describe('Common mistakes users make'),

  bestPractices: z.array(z.string())
    .max(5)
    .optional()
    .describe('Best practices for optimal results'),

  relatedPlugins: z.array(z.string())
    .optional()
    .describe('Plugin IDs that work well with this one'),

  suggestedChains: z.array(SuggestedChainSchema)
    .optional()
    .describe('Pre-defined workflows combining multiple tools'),
});

export type SemanticContext = z.infer<typeof SemanticContextSchema>;

// ============================================================================
// Tool Error Documentation
// ============================================================================

export const ToolErrorSchema = z.object({
  code: z.string().describe('Error code like "CITY_NOT_FOUND"'),
  httpStatus: z.number().int().min(100).max(599).describe('HTTP status code'),
  message: z.string().describe('Human-readable error message'),
  cause: z.string().describe('Why this error occurs'),
  recovery: z.array(z.string()).describe('Recovery strategies for LLM'),
  retryable: z.boolean().describe('Whether this error can be retried'),
});

export type ToolError = z.infer<typeof ToolErrorSchema>;

// ============================================================================
// Tool Examples
// ============================================================================

export const ToolExampleSchema = z.object({
  name: z.string().describe('Example name'),
  description: z.string().describe('What this example demonstrates'),
  input: z.record(z.any()).describe('Input parameters'),
  output: z.record(z.any()).describe('Expected output'),
  notes: z.string().optional().describe('Additional notes'),
});

export type ToolExample = z.infer<typeof ToolExampleSchema>;

// ============================================================================
// Tool Streaming Configuration
// ============================================================================

export const StreamingConfigSchema = z.object({
  supported: z.boolean().describe('Whether streaming is supported'),
  contentType: z.string().optional().describe('e.g., "application/x-ndjson"'),
  progressUpdates: z.boolean().optional().describe('Whether progress updates are sent'),
});

export type StreamingConfig = z.infer<typeof StreamingConfigSchema>;

// ============================================================================
// Tool Caching Configuration
// ============================================================================

export const CachingConfigSchema = z.object({
  cacheable: z.boolean().describe('Whether responses can be cached'),
  ttlSeconds: z.number().int().positive().optional().describe('Cache TTL in seconds'),
  cacheKey: z.string().optional().describe('How to construct the cache key'),
});

export type CachingConfig = z.infer<typeof CachingConfigSchema>;

// ============================================================================
// Tool Intelligence (Per-Tool Metadata)
// ============================================================================

export const ToolIntelligenceSchema = z.object({
  name: z.string().describe('Tool name (snake_case)'),
  displayName: z.string().describe('Human-readable tool name'),
  description: z.string().min(20).describe('Detailed tool description'),

  // Schemas
  inputSchema: JSONSchemaSchema.describe('Input JSON Schema'),
  outputSchema: JSONSchemaSchema.describe('Output JSON Schema'),

  // Examples (REQUIRED)
  examples: z.array(ToolExampleSchema)
    .min(2)
    .describe('At least 2 examples per tool'),

  // Error documentation
  errors: z.array(ToolErrorSchema)
    .min(1)
    .describe('At least 1 error case documented'),

  // Streaming
  streaming: StreamingConfigSchema.optional(),

  // Caching
  caching: CachingConfigSchema.optional(),
});

export type ToolIntelligence = z.infer<typeof ToolIntelligenceSchema>;

// ============================================================================
// Performance Metrics
// ============================================================================

export const PerformanceMetricsSchema = z.object({
  latency: z.object({
    p50: z.number().int().positive().describe('50th percentile latency (ms)'),
    p95: z.number().int().positive().describe('95th percentile latency (ms)'),
    p99: z.number().int().positive().describe('99th percentile latency (ms)'),
  }),
  throughput: z.object({
    requestsPerSecond: z.number().positive().describe('Requests per second'),
    concurrentLimit: z.number().int().positive().describe('Max concurrent requests'),
  }),
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

// ============================================================================
// Resource Requirements
// ============================================================================

export const ResourceRequirementsSchema = z.object({
  cpuMillicores: z.number().int().positive().describe('CPU in millicores'),
  memoryMB: z.number().int().positive().describe('Memory in MB'),
  diskGB: z.number().positive().optional().describe('Disk in GB'),
  timeoutMs: z.number().int().positive().describe('Request timeout in ms'),
});

export type ResourceRequirements = z.infer<typeof ResourceRequirementsSchema>;

// ============================================================================
// Cost Configuration
// ============================================================================

export const CostConfigSchema = z.object({
  perCall: z.number().min(0).describe('Cost per call in cents'),
  pricingTier: z.string().describe('Pricing tier name'),
  billingModel: BillingModelSchema.describe('How billing is calculated'),
});

export type CostConfig = z.infer<typeof CostConfigSchema>;

// ============================================================================
// Reliability Metrics
// ============================================================================

export const ReliabilityMetricsSchema = z.object({
  successRate: z.number().min(0).max(100).describe('Success rate percentage'),
  averageErrorRate: z.number().min(0).max(100).describe('Error rate percentage'),
  circuitBreakerThreshold: z.number().int().positive().describe('Failure threshold'),
});

export type ReliabilityMetrics = z.infer<typeof ReliabilityMetricsSchema>;

// ============================================================================
// Execution Profile
// ============================================================================

export const ExecutionProfileSchema = z.object({
  mode: ExecutionModeSchema.describe('Plugin execution mode'),
  isolationLevel: z.number().int().min(1).max(4).describe('Security isolation 1-4'),

  performance: PerformanceMetricsSchema.optional()
    .describe('Runtime performance metrics (added post-deployment)'),

  resources: ResourceRequirementsSchema.describe('Resource requirements'),

  cost: CostConfigSchema.optional().describe('Cost configuration'),

  reliability: ReliabilityMetricsSchema.optional()
    .describe('Reliability metrics (added post-deployment)'),
});

export type ExecutionProfile = z.infer<typeof ExecutionProfileSchema>;

// ============================================================================
// Context Requirements
// ============================================================================

export const ServiceDependencySchema = z.object({
  name: z.string().describe('Service name'),
  version: z.string().describe('Minimum version'),
  critical: z.boolean().describe('Whether plugin fails without it'),
});

export const EnvironmentVariableSchema = z.object({
  name: z.string().describe('Variable name'),
  required: z.boolean().describe('Whether it must be set'),
  description: z.string().describe('What this variable configures'),
});

export const CredentialRequirementSchema = z.object({
  type: z.string().describe('Credential type (api_key, oauth, etc.)'),
  scopes: z.array(z.string()).describe('Required scopes'),
  required: z.boolean().describe('Whether credentials are required'),
});

export const ContextRequirementsSchema = z.object({
  requiredServices: z.array(ServiceDependencySchema).optional(),
  environmentVariables: z.array(EnvironmentVariableSchema).optional(),
  credentials: z.array(CredentialRequirementSchema).optional(),
  permissions: z.array(z.string()).describe('Required Nexus permissions'),
});

export type ContextRequirements = z.infer<typeof ContextRequirementsSchema>;

// ============================================================================
// Compatibility
// ============================================================================

export const DependencySchema = z.object({
  name: z.string().describe('Package name'),
  version: z.string().describe('Version requirement'),
});

export const CompatibilitySchema = z.object({
  nexusMinVersion: z.string().describe('Minimum Nexus version'),
  supportedPlatforms: z.array(z.string()).describe('Supported platforms'),
  dependencies: z.array(DependencySchema).optional(),
});

export type Compatibility = z.infer<typeof CompatibilitySchema>;

// ============================================================================
// Trust & Certification
// ============================================================================

export const SecurityScanSchema = z.object({
  passed: z.boolean().describe('Whether security scan passed'),
  lastScan: z.string().datetime().describe('Last scan timestamp'),
  vulnerabilities: z.number().int().min(0).describe('Number of vulnerabilities'),
});

export const CodeReviewSchema = z.object({
  status: z.string().describe('Review status'),
  reviewer: z.string().optional().describe('Reviewer name'),
  date: z.string().datetime().optional().describe('Review date'),
});

export const TrustProfileSchema = z.object({
  level: TrustLevelSchema.describe('Trust level'),
  certifications: z.array(z.string()).optional()
    .describe('Certifications like SOC2, GDPR, HIPAA'),
  securityScan: SecurityScanSchema.optional(),
  codeReview: CodeReviewSchema.optional(),
});

export type TrustProfile = z.infer<typeof TrustProfileSchema>;

// ============================================================================
// Auto-Generated Metadata
// ============================================================================

export const GeneratedMetadataSchema = z.object({
  generatedAt: z.string().datetime().describe('Generation timestamp'),
  generatedFrom: z.enum(['zod', 'typescript', 'openapi', 'manual'])
    .describe('Schema source'),
  schemaVersion: z.string().describe('PID schema version'),
  hash: z.string().describe('Content hash for cache invalidation'),
});

export type GeneratedMetadata = z.infer<typeof GeneratedMetadataSchema>;

// ============================================================================
// Plugin Intelligence Document (Full Schema)
// ============================================================================

export const PluginIntelligenceDocumentSchema = z.object({
  // Identity
  id: z.string().describe('Unique plugin ID'),
  name: z.string().describe('Plugin name (slug)'),
  displayName: z.string().describe('Human-readable name'),
  version: z.string().describe('Semantic version'),
  description: z.string().min(50).describe('Detailed description'),

  // Semantic Context
  semantic: SemanticContextSchema.describe('LLM decision-making context'),

  // Tools
  tools: z.array(ToolIntelligenceSchema)
    .min(1)
    .describe('Tool metadata'),

  // Execution Profile
  execution: ExecutionProfileSchema.describe('Execution configuration'),

  // Context Requirements
  contextRequirements: ContextRequirementsSchema.describe('Runtime requirements'),

  // Compatibility
  compatibility: CompatibilitySchema.describe('Platform compatibility'),

  // Trust & Certification
  trust: TrustProfileSchema.describe('Trust and verification status'),

  // Auto-generated Metadata
  _metadata: GeneratedMetadataSchema.describe('Generation metadata'),
});

export type PluginIntelligenceDocument = z.infer<typeof PluginIntelligenceDocumentSchema>;

// ============================================================================
// Schema Version
// ============================================================================

export const PID_SCHEMA_VERSION = '1.0.0';
