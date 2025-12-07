/**
 * Plugin Intelligence Document Exporter
 *
 * Export PID to multiple formats for different consumers:
 * - JSON: Default format for APIs
 * - MCP: Claude Code / MCP-compatible format
 * - Markdown: Human-readable documentation
 * - OpenAPI: REST API integration
 */

import type {
  PluginIntelligenceDocument,
  ToolIntelligence,
  ToolExample,
  ToolError,
} from './schema.js';

// ============================================================================
// Export Format Types
// ============================================================================

export type ExportFormat = 'json' | 'mcp' | 'markdown' | 'openapi';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeExamples?: boolean;
  includeErrors?: boolean;
  prettyPrint?: boolean;
}

// ============================================================================
// MCP Format Types
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    latency?: 'fast' | 'medium' | 'slow';
    cost?: 'free' | 'low' | 'medium' | 'high';
    reliability?: 'experimental' | 'stable' | 'production';
    [key: string]: unknown;
  };
}

export interface MCPToolFormat {
  tools: MCPTool[];
  resources?: Array<{
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
  }>;
}

export interface OpenAPISpec {
  openapi: '3.0.0';
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, OpenAPIPath>;
  components?: {
    schemas?: Record<string, unknown>;
  };
}

interface OpenAPIPath {
  post?: {
    summary: string;
    description: string;
    operationId: string;
    tags: string[];
    requestBody?: {
      required: boolean;
      content: {
        'application/json': {
          schema: unknown;
          examples?: Record<string, { value: unknown }>;
        };
      };
    };
    responses: Record<string, {
      description: string;
      content?: {
        'application/json': {
          schema: unknown;
        };
      };
    }>;
  };
}

// ============================================================================
// Main Exporter Class
// ============================================================================

export class PIDExporter {
  private pid: PluginIntelligenceDocument;

  constructor(pid: PluginIntelligenceDocument) {
    this.pid = pid;
  }

  /**
   * Export to specified format
   */
  export(options: ExportOptions): string {
    const { format, prettyPrint = true } = options;

    switch (format) {
      case 'json':
        return this.toJSON(options, prettyPrint);
      case 'mcp':
        return this.toMCP(options, prettyPrint);
      case 'markdown':
        return this.toMarkdown(options);
      case 'openapi':
        return this.toOpenAPI(options, prettyPrint);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // ============================================================================
  // JSON Export
  // ============================================================================

  private toJSON(options: ExportOptions, prettyPrint: boolean): string {
    const output: Record<string, unknown> = {
      id: this.pid.id,
      name: this.pid.name,
      displayName: this.pid.displayName,
      version: this.pid.version,
      description: this.pid.description,
      semantic: this.pid.semantic,
      tools: this.pid.tools.map((tool) => this.formatTool(tool, options)),
      execution: this.pid.execution,
      contextRequirements: this.pid.contextRequirements,
      compatibility: this.pid.compatibility,
      trust: this.pid.trust,
    };

    if (options.includeMetadata !== false) {
      output._metadata = this.pid._metadata;
    }

    return JSON.stringify(output, null, prettyPrint ? 2 : undefined);
  }

  // ============================================================================
  // MCP Export
  // ============================================================================

  private toMCP(options: ExportOptions, prettyPrint: boolean): string {
    const mcpExport: MCPToolFormat = {
      tools: this.pid.tools.map((tool) => this.toMCPTool(tool)),
    };

    return JSON.stringify(mcpExport, null, prettyPrint ? 2 : undefined);
  }

  private toMCPTool(tool: ToolIntelligence): MCPTool {
    // Build enhanced description for LLM
    const descriptionParts: string[] = [
      `[${this.pid.displayName}] ${tool.description}`,
    ];

    // Add "when to use" hints
    if (this.pid.semantic.whenToUse.length > 0) {
      descriptionParts.push(`Use when: ${this.pid.semantic.whenToUse.slice(0, 2).join('; ')}`);
    }

    // Add annotations
    const annotations: MCPTool['annotations'] = {};

    // Latency annotation
    const latency = this.pid.execution.performance?.latency.p95;
    if (latency) {
      if (latency < 500) annotations.latency = 'fast';
      else if (latency < 2000) annotations.latency = 'medium';
      else annotations.latency = 'slow';
    }

    // Cost annotation
    const cost = this.pid.execution.cost?.perCall;
    if (cost !== undefined) {
      if (cost === 0) annotations.cost = 'free';
      else if (cost < 1) annotations.cost = 'low';
      else if (cost < 10) annotations.cost = 'medium';
      else annotations.cost = 'high';
    }

    // Reliability annotation
    const reliability = this.pid.execution.reliability?.successRate;
    if (reliability) {
      if (reliability >= 99.9) annotations.reliability = 'production';
      else if (reliability >= 95) annotations.reliability = 'stable';
      else annotations.reliability = 'experimental';
    }

    return {
      name: `${this.pid.name}_${tool.name}`,
      description: descriptionParts.join(' '),
      inputSchema: tool.inputSchema,
      annotations: Object.keys(annotations).length > 0 ? annotations : undefined,
    };
  }

  // ============================================================================
  // Markdown Export
  // ============================================================================

  private toMarkdown(options: ExportOptions): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${this.pid.displayName}`);
    lines.push('');
    lines.push(this.pid.description);
    lines.push('');

    // Metadata
    lines.push('## Overview');
    lines.push('');
    lines.push(`- **Version**: ${this.pid.version}`);
    lines.push(`- **ID**: ${this.pid.id}`);
    lines.push(`- **Execution Mode**: ${this.pid.execution.mode}`);
    lines.push(`- **Trust Level**: ${this.pid.trust.level}`);
    lines.push('');

    // Capabilities
    lines.push('## Capabilities');
    lines.push('');
    for (const cap of this.pid.semantic.capabilities) {
      lines.push(`- ${cap}`);
    }
    lines.push('');

    // When to Use
    lines.push('## When to Use');
    lines.push('');
    for (const scenario of this.pid.semantic.whenToUse) {
      lines.push(`- ${scenario}`);
    }
    lines.push('');

    // When Not to Use
    lines.push('## When NOT to Use');
    lines.push('');
    for (const scenario of this.pid.semantic.whenNotToUse) {
      lines.push(`- ${scenario}`);
    }
    lines.push('');

    // Tools
    lines.push('## Tools');
    lines.push('');

    for (const tool of this.pid.tools) {
      lines.push(`### ${tool.displayName}`);
      lines.push('');
      lines.push(tool.description);
      lines.push('');

      // Input Schema
      lines.push('**Input:**');
      lines.push('');
      lines.push(this.schemaToMarkdownTable(tool.inputSchema));
      lines.push('');

      // Examples
      if (options.includeExamples !== false && tool.examples.length > 0) {
        lines.push('**Examples:**');
        lines.push('');
        for (const example of tool.examples) {
          lines.push(`*${example.name}*`);
          lines.push('```json');
          lines.push(JSON.stringify(example.input, null, 2));
          lines.push('```');
          if (Object.keys(example.output).length > 0) {
            lines.push('Output:');
            lines.push('```json');
            lines.push(JSON.stringify(example.output, null, 2));
            lines.push('```');
          }
          lines.push('');
        }
      }

      // Errors
      if (options.includeErrors !== false && tool.errors.length > 0) {
        lines.push('**Errors:**');
        lines.push('');
        lines.push('| Code | Status | Message | Retryable |');
        lines.push('|------|--------|---------|-----------|');
        for (const error of tool.errors) {
          lines.push(`| ${error.code} | ${error.httpStatus} | ${error.message} | ${error.retryable ? 'Yes' : 'No'} |`);
        }
        lines.push('');
      }
    }

    // Performance
    if (this.pid.execution.performance) {
      lines.push('## Performance');
      lines.push('');
      const perf = this.pid.execution.performance;
      lines.push(`- **P50 Latency**: ${perf.latency.p50}ms`);
      lines.push(`- **P95 Latency**: ${perf.latency.p95}ms`);
      lines.push(`- **P99 Latency**: ${perf.latency.p99}ms`);
      lines.push(`- **Throughput**: ${perf.throughput.requestsPerSecond} req/s`);
      lines.push('');
    }

    // Resources
    lines.push('## Resources');
    lines.push('');
    const res = this.pid.execution.resources;
    lines.push(`- **CPU**: ${res.cpuMillicores}m`);
    lines.push(`- **Memory**: ${res.memoryMB}MB`);
    lines.push(`- **Timeout**: ${res.timeoutMs}ms`);
    lines.push('');

    return lines.join('\n');
  }

  private schemaToMarkdownTable(schema: Record<string, unknown>): string {
    const properties = (schema.properties || {}) as Record<string, Record<string, unknown>>;
    const required = (schema.required || []) as string[];

    const lines: string[] = [];
    lines.push('| Parameter | Type | Required | Description |');
    lines.push('|-----------|------|----------|-------------|');

    for (const [name, prop] of Object.entries(properties)) {
      const type = prop.type || 'any';
      const isRequired = required.includes(name) ? 'Yes' : 'No';
      const desc = (prop.description || '-') as string;
      lines.push(`| ${name} | ${type} | ${isRequired} | ${desc} |`);
    }

    return lines.join('\n');
  }

  // ============================================================================
  // OpenAPI Export
  // ============================================================================

  private toOpenAPI(options: ExportOptions, prettyPrint: boolean): string {
    const openapi: OpenAPISpec = {
      openapi: '3.0.0',
      info: {
        title: this.pid.displayName,
        version: this.pid.version,
        description: this.pid.description,
      },
      paths: {},
      components: {
        schemas: {},
      },
    };

    // Add paths for each tool
    for (const tool of this.pid.tools) {
      const path = `/${this.pid.name}/${tool.name}`;

      openapi.paths[path] = {
        post: {
          summary: tool.displayName,
          description: tool.description,
          operationId: `${this.pid.name}_${tool.name}`,
          tags: [this.pid.name],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: tool.inputSchema,
                examples: options.includeExamples !== false
                  ? this.toolExamplesToOpenAPI(tool.examples)
                  : undefined,
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: tool.outputSchema,
                },
              },
            },
            ...this.toolErrorsToOpenAPI(tool.errors),
          },
        },
      };

      // Add schemas to components
      openapi.components!.schemas![`${tool.name}_input`] = tool.inputSchema;
      openapi.components!.schemas![`${tool.name}_output`] = tool.outputSchema;
    }

    return JSON.stringify(openapi, null, prettyPrint ? 2 : undefined);
  }

  private toolExamplesToOpenAPI(
    examples: ToolExample[]
  ): Record<string, { value: unknown }> | undefined {
    if (examples.length === 0) return undefined;

    const result: Record<string, { value: unknown }> = {};
    for (const example of examples) {
      const key = example.name.toLowerCase().replace(/\s+/g, '_');
      result[key] = { value: example.input };
    }
    return result;
  }

  private toolErrorsToOpenAPI(
    errors: ToolError[]
  ): Record<string, { description: string; content?: { 'application/json': { schema: unknown } } }> {
    const result: Record<string, { description: string; content?: { 'application/json': { schema: unknown } } }> = {};

    // Group errors by status code
    const byStatus = new Map<number, ToolError[]>();
    for (const error of errors) {
      const existing = byStatus.get(error.httpStatus) || [];
      existing.push(error);
      byStatus.set(error.httpStatus, existing);
    }

    for (const [status, errs] of byStatus) {
      result[String(status)] = {
        description: errs.map((e) => e.message).join(' | '),
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'string',
                      enum: errs.map((e) => e.code),
                    },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      };
    }

    return result;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private formatTool(
    tool: ToolIntelligence,
    options: ExportOptions
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {
      name: tool.name,
      displayName: tool.displayName,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
    };

    if (options.includeExamples !== false) {
      result.examples = tool.examples;
    }

    if (options.includeErrors !== false) {
      result.errors = tool.errors;
    }

    if (tool.streaming) {
      result.streaming = tool.streaming;
    }

    if (tool.caching) {
      result.caching = tool.caching;
    }

    return result;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Export PID to specified format
 */
export function exportPID(
  pid: PluginIntelligenceDocument,
  options: ExportOptions
): string {
  return new PIDExporter(pid).export(options);
}

/**
 * Export PID to MCP tool format
 */
export function exportToMCPToolFormat(
  pid: PluginIntelligenceDocument
): MCPToolFormat {
  const exporter = new PIDExporter(pid);
  return JSON.parse(exporter.export({ format: 'mcp' }));
}

/**
 * Export multiple PIDs combined
 */
export function exportCombinedPIDs(
  pids: PluginIntelligenceDocument[],
  format: ExportFormat,
  prettyPrint = true
): string {
  if (format === 'mcp') {
    // Combine all tools into single MCP export
    const allTools: MCPTool[] = [];
    for (const pid of pids) {
      const mcpStr = new PIDExporter(pid).export({ format: 'mcp' });
      const mcp = JSON.parse(mcpStr) as MCPToolFormat;
      allTools.push(...mcp.tools);
    }

    return JSON.stringify({ tools: allTools }, null, prettyPrint ? 2 : undefined);
  }

  if (format === 'markdown') {
    return pids.map((pid) => new PIDExporter(pid).export({ format: 'markdown' })).join('\n\n---\n\n');
  }

  if (format === 'json') {
    const combined = {
      plugins: pids,
      combined: {
        allCapabilities: [...new Set(pids.flatMap((p) => p.semantic.capabilities))],
        totalTools: pids.reduce((acc, p) => acc + p.tools.length, 0),
      },
    };
    return JSON.stringify(combined, null, prettyPrint ? 2 : undefined);
  }

  throw new Error(`Combined export not supported for format: ${format}`);
}
