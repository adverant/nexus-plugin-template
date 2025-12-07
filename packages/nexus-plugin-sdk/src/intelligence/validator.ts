/**
 * Plugin Intelligence Document Validator
 *
 * Validates PID completeness and quality for the verification pipeline.
 */

import { z } from 'zod';
import {
  PluginIntelligenceDocumentSchema,
  ToolIntelligenceSchema,
  type PluginIntelligenceDocument,
  type ToolIntelligence,
} from './schema.js';

// ============================================================================
// Validation Result Types
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  rule: string;
  message: string;
  path: string;
  severity: ValidationSeverity;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

// ============================================================================
// Validation Rules
// ============================================================================

const VALIDATION_RULES: Array<{
  rule: string;
  severity: ValidationSeverity;
  check: (pid: PluginIntelligenceDocument) => ValidationIssue[];
}> = [
  // Required Schema Rules
  {
    rule: 'schema_required',
    severity: 'error',
    check: (pid) => {
      const issues: ValidationIssue[] = [];
      for (const tool of pid.tools) {
        if (!tool.inputSchema || Object.keys(tool.inputSchema).length === 0) {
          issues.push({
            rule: 'schema_required',
            message: `Tool "${tool.name}" is missing input schema`,
            path: `tools.${tool.name}.inputSchema`,
            severity: 'error',
            suggestion: 'Define input schema using Zod or TypeScript interfaces',
          });
        }
        if (!tool.outputSchema || Object.keys(tool.outputSchema).length === 0) {
          issues.push({
            rule: 'schema_required',
            message: `Tool "${tool.name}" is missing output schema`,
            path: `tools.${tool.name}.outputSchema`,
            severity: 'error',
            suggestion: 'Define output schema using Zod or TypeScript interfaces',
          });
        }
      }
      return issues;
    },
  },

  // Examples Required
  {
    rule: 'examples_required',
    severity: 'error',
    check: (pid) => {
      const issues: ValidationIssue[] = [];
      for (const tool of pid.tools) {
        if (!tool.examples || tool.examples.length < 2) {
          issues.push({
            rule: 'examples_required',
            message: `Tool "${tool.name}" needs at least 2 examples (has ${tool.examples?.length || 0})`,
            path: `tools.${tool.name}.examples`,
            severity: 'error',
            suggestion: 'Add examples to test files or use @example JSDoc comments',
          });
        }
      }
      return issues;
    },
  },

  // Examples Match Schema
  {
    rule: 'examples_match_schema',
    severity: 'error',
    check: (pid) => {
      const issues: ValidationIssue[] = [];
      for (const tool of pid.tools) {
        if (!tool.examples || !tool.inputSchema) continue;

        for (let i = 0; i < tool.examples.length; i++) {
          const example = tool.examples[i];
          const schemaKeys = getSchemaKeys(tool.inputSchema);
          const inputKeys = Object.keys(example.input);

          // Check for missing required keys
          const required = tool.inputSchema.required || [];
          for (const req of required) {
            if (!inputKeys.includes(req)) {
              issues.push({
                rule: 'examples_match_schema',
                message: `Example "${example.name}" missing required field "${req}"`,
                path: `tools.${tool.name}.examples[${i}].input`,
                severity: 'error',
                suggestion: `Add "${req}" to the example input`,
              });
            }
          }

          // Check for extra keys not in schema
          for (const key of inputKeys) {
            if (!schemaKeys.includes(key)) {
              issues.push({
                rule: 'examples_match_schema',
                message: `Example "${example.name}" has unknown field "${key}"`,
                path: `tools.${tool.name}.examples[${i}].input.${key}`,
                severity: 'warning',
                suggestion: `Remove "${key}" or add it to the input schema`,
              });
            }
          }
        }
      }
      return issues;
    },
  },

  // Errors Documented
  {
    rule: 'errors_documented',
    severity: 'warning',
    check: (pid) => {
      const issues: ValidationIssue[] = [];
      for (const tool of pid.tools) {
        if (!tool.errors || tool.errors.length < 2) {
          issues.push({
            rule: 'errors_documented',
            message: `Tool "${tool.name}" should document at least 2 error cases (has ${tool.errors?.length || 0})`,
            path: `tools.${tool.name}.errors`,
            severity: 'warning',
            suggestion: 'Document common error scenarios with recovery strategies',
          });
        }
      }
      return issues;
    },
  },

  // Semantic Complete
  {
    rule: 'semantic_complete',
    severity: 'warning',
    check: (pid) => {
      const issues: ValidationIssue[] = [];
      const semantic = pid.semantic;

      if (!semantic.capabilities || semantic.capabilities.length === 0) {
        issues.push({
          rule: 'semantic_complete',
          message: 'Plugin missing capability tags',
          path: 'semantic.capabilities',
          severity: 'warning',
          suggestion: 'Add 3-5 capability tags for LLM tool selection',
        });
      }

      if (!semantic.whenToUse || semantic.whenToUse.length < 2) {
        issues.push({
          rule: 'semantic_complete',
          message: 'Plugin needs more "when to use" scenarios',
          path: 'semantic.whenToUse',
          severity: 'warning',
          suggestion: 'Add scenarios describing when to use this plugin',
        });
      }

      if (!semantic.whenNotToUse || semantic.whenNotToUse.length === 0) {
        issues.push({
          rule: 'semantic_complete',
          message: 'Plugin missing "when not to use" scenarios',
          path: 'semantic.whenNotToUse',
          severity: 'warning',
          suggestion: 'Add anti-patterns to prevent misuse',
        });
      }

      return issues;
    },
  },

  // Description Quality
  {
    rule: 'description_quality',
    severity: 'warning',
    check: (pid) => {
      const issues: ValidationIssue[] = [];

      if (pid.description.length < 50) {
        issues.push({
          rule: 'description_quality',
          message: `Plugin description too short (${pid.description.length} chars, need 50+)`,
          path: 'description',
          severity: 'warning',
          suggestion: 'Write a detailed description explaining what the plugin does',
        });
      }

      for (const tool of pid.tools) {
        if (tool.description.length < 20) {
          issues.push({
            rule: 'description_quality',
            message: `Tool "${tool.name}" description too short`,
            path: `tools.${tool.name}.description`,
            severity: 'warning',
            suggestion: 'Write a clear description of what the tool does',
          });
        }
      }

      return issues;
    },
  },

  // Performance Realistic
  {
    rule: 'performance_realistic',
    severity: 'info',
    check: (pid) => {
      const issues: ValidationIssue[] = [];
      const perf = pid.execution.performance;

      if (perf) {
        // Check for unrealistic latency claims
        if (perf.latency.p50 < 1) {
          issues.push({
            rule: 'performance_realistic',
            message: 'Claimed p50 latency seems unrealistically low',
            path: 'execution.performance.latency.p50',
            severity: 'info',
            suggestion: 'Performance will be validated in sandbox testing',
          });
        }

        if (perf.throughput.requestsPerSecond > 10000) {
          issues.push({
            rule: 'performance_realistic',
            message: 'Claimed throughput seems very high - will be validated',
            path: 'execution.performance.throughput.requestsPerSecond',
            severity: 'info',
          });
        }
      }

      return issues;
    },
  },

  // Resource Limits
  {
    rule: 'resource_limits',
    severity: 'warning',
    check: (pid) => {
      const issues: ValidationIssue[] = [];
      const resources = pid.execution.resources;

      // Check for excessive resource requests
      if (resources.cpuMillicores > 4000) {
        issues.push({
          rule: 'resource_limits',
          message: 'CPU request exceeds typical limits (>4 cores)',
          path: 'execution.resources.cpuMillicores',
          severity: 'warning',
          suggestion: 'Consider if this much CPU is really needed',
        });
      }

      if (resources.memoryMB > 8192) {
        issues.push({
          rule: 'resource_limits',
          message: 'Memory request exceeds typical limits (>8GB)',
          path: 'execution.resources.memoryMB',
          severity: 'warning',
          suggestion: 'Consider if this much memory is really needed',
        });
      }

      return issues;
    },
  },

  // Trust Level Appropriate
  {
    rule: 'trust_appropriate',
    severity: 'info',
    check: (pid) => {
      const issues: ValidationIssue[] = [];
      const trust = pid.trust;
      const execution = pid.execution;

      // Verify execution mode matches trust level
      if (trust.level === 'unverified' && execution.mode === 'external_https') {
        issues.push({
          rule: 'trust_appropriate',
          message: 'Unverified plugins cannot use external_https mode',
          path: 'trust.level',
          severity: 'error',
          suggestion: 'Achieve higher trust level or use mcp_container mode',
        });
      }

      return issues;
    },
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getSchemaKeys(schema: Record<string, unknown>): string[] {
  if (schema.properties && typeof schema.properties === 'object') {
    return Object.keys(schema.properties);
  }
  return [];
}

// ============================================================================
// Main Validator Class
// ============================================================================

export class PIDValidator {
  private customRules: typeof VALIDATION_RULES = [];

  /**
   * Add a custom validation rule
   */
  addRule(rule: (typeof VALIDATION_RULES)[0]): this {
    this.customRules.push(rule);
    return this;
  }

  /**
   * Validate a Plugin Intelligence Document
   */
  validate(pid: PluginIntelligenceDocument): ValidationResult {
    const issues: ValidationIssue[] = [];

    // First, validate against Zod schema
    const schemaResult = PluginIntelligenceDocumentSchema.safeParse(pid);
    if (!schemaResult.success) {
      for (const error of schemaResult.error.errors) {
        issues.push({
          rule: 'schema_valid_json',
          message: error.message,
          path: error.path.join('.'),
          severity: 'error',
        });
      }
    }

    // Run all validation rules
    const allRules = [...VALIDATION_RULES, ...this.customRules];
    for (const rule of allRules) {
      try {
        const ruleIssues = rule.check(pid);
        issues.push(...ruleIssues);
      } catch (err) {
        issues.push({
          rule: rule.rule,
          message: `Rule check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          path: '',
          severity: 'error',
        });
      }
    }

    // Calculate score
    const score = this.calculateScore(issues);

    // Summarize
    const summary = {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
    };

    return {
      valid: summary.errors === 0,
      score,
      issues,
      summary,
    };
  }

  /**
   * Validate a single tool
   */
  validateTool(tool: ToolIntelligence): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Validate against Zod schema
    const schemaResult = ToolIntelligenceSchema.safeParse(tool);
    if (!schemaResult.success) {
      for (const error of schemaResult.error.errors) {
        issues.push({
          rule: 'schema_valid_json',
          message: error.message,
          path: error.path.join('.'),
          severity: 'error',
        });
      }
    }

    // Check examples
    if (!tool.examples || tool.examples.length < 2) {
      issues.push({
        rule: 'examples_required',
        message: 'Tool needs at least 2 examples',
        path: 'examples',
        severity: 'error',
      });
    }

    // Check errors
    if (!tool.errors || tool.errors.length < 1) {
      issues.push({
        rule: 'errors_documented',
        message: 'Tool should document at least 1 error case',
        path: 'errors',
        severity: 'warning',
      });
    }

    // Check description
    if (tool.description.length < 20) {
      issues.push({
        rule: 'description_quality',
        message: 'Tool description too short',
        path: 'description',
        severity: 'warning',
      });
    }

    const score = this.calculateScore(issues);
    const summary = {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
    };

    return {
      valid: summary.errors === 0,
      score,
      issues,
      summary,
    };
  }

  /**
   * Calculate quality score based on issues
   */
  private calculateScore(issues: ValidationIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'error':
          score -= 20;
          break;
        case 'warning':
          score -= 5;
          break;
        case 'info':
          score -= 1;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }
}

// ============================================================================
// Quick Validation Functions
// ============================================================================

/**
 * Quick validation - just check if valid
 */
export function isValidPID(pid: unknown): pid is PluginIntelligenceDocument {
  const result = PluginIntelligenceDocumentSchema.safeParse(pid);
  return result.success;
}

/**
 * Full validation with all rules
 */
export function validatePID(pid: PluginIntelligenceDocument): ValidationResult {
  const validator = new PIDValidator();
  return validator.validate(pid);
}

/**
 * Parse and validate unknown input
 */
export function parsePID(input: unknown): {
  success: true;
  data: PluginIntelligenceDocument;
  validation: ValidationResult;
} | {
  success: false;
  error: z.ZodError;
} {
  const parseResult = PluginIntelligenceDocumentSchema.safeParse(input);

  if (!parseResult.success) {
    return { success: false, error: parseResult.error };
  }

  const validation = validatePID(parseResult.data);

  return {
    success: true,
    data: parseResult.data,
    validation,
  };
}
