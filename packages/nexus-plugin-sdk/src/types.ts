/**
 * Core type definitions for the Nexus Plugin SDK
 */

import type { z } from 'zod';

// ============================================================================
// Plugin Configuration
// ============================================================================

export interface PluginConfig {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  repository?: string;
  homepage?: string;
}

// ============================================================================
// Semantic Context
// ============================================================================

export interface SemanticContext {
  capabilities: string[];
  domain: string;
  intent: 'query' | 'action' | 'transform' | 'generate';
  whenToUse: string[];
  whenNotToUse: string[];
  commonMistakes: string[];
  bestPractices: string[];
  relatedPlugins: string[];
  suggestedChains: SuggestedChain[];
}

export interface SuggestedChain {
  name: string;
  description: string;
  steps: string[];
}

// ============================================================================
// Execution Profile
// ============================================================================

export type ExecutionMode =
  | 'external_https'
  | 'mcp_container'
  | 'hardened_docker'
  | 'firecracker';

export interface ExecutionProfile {
  mode: ExecutionMode;
  isolationLevel: 1 | 2 | 3 | 4;
  performance: PerformanceProfile;
  resources: ResourceLimits;
  cost: CostProfile;
  reliability: ReliabilityProfile;
}

export interface PerformanceProfile {
  latency: { p50: number; p95: number; p99: number };
  throughput: { requestsPerSecond: number; concurrentLimit: number };
}

export interface ResourceLimits {
  cpuMillicores: number;
  memoryMB: number;
  diskGB: number;
  timeoutMs: number;
}

export interface CostProfile {
  perCall: number;
  pricingTier: string;
  billingModel: 'per_call' | 'per_minute' | 'flat_rate';
}

export interface ReliabilityProfile {
  successRate: number;
  averageErrorRate: number;
  circuitBreakerThreshold: number;
}

// ============================================================================
// Context Requirements
// ============================================================================

export interface ContextRequirements {
  requiredServices: ServiceRequirement[];
  environmentVariables: EnvVarRequirement[];
  credentials: CredentialRequirement[];
  permissions: string[];
}

export interface ServiceRequirement {
  name: string;
  version: string;
  critical: boolean;
}

export interface EnvVarRequirement {
  name: string;
  required: boolean;
  description: string;
  example?: string;
}

export interface CredentialRequirement {
  type: string;
  scopes: string[];
  required: boolean;
}

// ============================================================================
// Compatibility
// ============================================================================

export interface Compatibility {
  nexusMinVersion: string;
  supportedPlatforms: string[];
  dependencies: DependencyInfo[];
}

export interface DependencyInfo {
  name: string;
  version: string;
}

// ============================================================================
// Trust Profile
// ============================================================================

export type TrustLevel =
  | 'unverified'
  | 'community'
  | 'enterprise'
  | 'verified_publisher'
  | 'nexus_official';

export interface TrustProfile {
  level: TrustLevel;
  certifications: string[];
  securityScan: {
    passed: boolean;
    lastScan: string;
    vulnerabilities: number;
  };
  codeReview: {
    status: string;
    reviewer?: string;
    date?: string;
  };
}

// ============================================================================
// Tool Definitions
// ============================================================================

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  displayName: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  examples: ToolExample<TInput, TOutput>[];
  errors: ToolError[];
  streaming?: StreamingConfig;
  caching?: CachingConfig;
  handler: ToolHandler<TInput, TOutput>;
}

export interface ToolExample<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  input: TInput;
  output: TOutput;
  notes?: string;
}

export interface ToolError {
  code: string;
  httpStatus: number;
  message: string;
  cause: string;
  recovery: string[];
  retryable: boolean;
}

export interface StreamingConfig {
  supported: boolean;
  contentType?: string;
  progressUpdates?: boolean;
}

export interface CachingConfig {
  cacheable: boolean;
  ttlSeconds?: number;
  cacheKey?: string;
}

export type ToolHandler<TInput, TOutput> = (
  input: TInput,
  context: MCPToolContext
) => Promise<TOutput>;

// ============================================================================
// MCP Context
// ============================================================================

export interface MCPToolContext {
  logger: MCPLogger;
  services: {
    graphrag: GraphRAGService;
    mageagent: MageAgentService;
  };
}

export interface MCPLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export interface GraphRAGService {
  storeMemory(content: string, metadata?: Record<string, unknown>): Promise<{ id: string }>;
  searchMemories(query: string, options?: { limit?: number }): Promise<Array<{ id: string; content: string; score: number }>>;
  storeDocument(content: string, metadata?: Record<string, unknown>): Promise<{ id: string }>;
  queryKnowledge(query: string): Promise<{ answer: string; sources: string[] }>;
}

export interface MageAgentService {
  orchestrate(task: string, options?: Record<string, unknown>): Promise<{ result: string }>;
  analyze(topic: string, depth?: string): Promise<{ analysis: string }>;
}

// ============================================================================
// Plugin Intelligence Document
// ============================================================================

export interface PluginIntelligenceDocument {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  semantic: SemanticContext;
  tools: ToolIntelligence[];
  execution: ExecutionProfile;
  contextRequirements: ContextRequirements;
  compatibility: Compatibility;
  trust: TrustProfile;
  _metadata: PIDMetadata;
}

export interface ToolIntelligence {
  name: string;
  displayName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  examples: ToolExample[];
  errors: ToolError[];
  streaming?: StreamingConfig;
  caching?: CachingConfig;
}

export interface PIDMetadata {
  generatedAt: string;
  generatedFrom: 'zod' | 'typescript' | 'openapi' | 'manual';
  schemaVersion: string;
  hash: string;
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  score: number;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

// ============================================================================
// Export Formats
// ============================================================================

export type ExportFormat = 'json' | 'mcp' | 'markdown' | 'openapi';
