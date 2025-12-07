/**
 * MCP Server Builder
 *
 * Provides a fluent API for building MCP (Model Context Protocol) compliant servers
 * that integrate with Claude Code and other AI IDE extensions.
 *
 * @example
 * ```typescript
 * const server = MCPServerBuilder.create({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   description: 'My awesome plugin'
 * })
 *   .tool('my_tool')
 *     .description('Does something useful')
 *     .input(z.object({ query: z.string() }))
 *     .output(z.object({ result: z.string() }))
 *     .handler(async (input, context) => {
 *       context.logger.info('Processing query', { query: input.query });
 *       return { result: input.query.toUpperCase() };
 *     })
 *     .done()
 *   .build();
 *
 * server.start();
 * ```
 */

import { z } from 'zod';
import { zodToJSONSchema } from '../intelligence/extractor.js';

// ============================================================================
// Types
// ============================================================================

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  name: string;
  version: string;
  description?: string;
  transport?: 'stdio' | 'http';
  httpPort?: number;
}

/**
 * Logger interface for MCP tool handlers
 */
export interface MCPLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * GraphRAG service interface for memory operations
 */
export interface GraphRAGService {
  storeMemory(content: string, tags?: string[]): Promise<{ id: string }>;
  recallMemory(query: string, limit?: number): Promise<Array<{ id: string; content: string; score: number }>>;
  storeDocument(content: string, title?: string): Promise<{ id: string; chunks: number }>;
  searchDocuments(query: string, limit?: number): Promise<Array<{ id: string; content: string; score: number }>>;
}

/**
 * MageAgent service interface for multi-agent orchestration
 */
export interface MageAgentService {
  orchestrate(task: string, options?: { maxAgents?: number }): Promise<{ result: string; agentsUsed: number }>;
  analyze(topic: string, depth?: 'quick' | 'standard' | 'deep'): Promise<{ analysis: string }>;
  synthesize(sources: string[], format?: 'summary' | 'report'): Promise<{ output: string }>;
}

/**
 * Services available to MCP tool handlers
 */
export interface MCPServices {
  graphrag: GraphRAGService;
  mageagent: MageAgentService;
}

/**
 * Context passed to MCP tool handlers
 */
export interface MCPToolContext {
  logger: MCPLogger;
  services: MCPServices;
}

/**
 * MCP tool definition
 */
export interface MCPToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  displayName?: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  handler: (input: TInput, context: MCPToolContext) => Promise<TOutput>;
}

/**
 * MCP resource definition
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: (uri: string) => Promise<string>;
}

/**
 * MCP prompt definition
 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  handler: (args: Record<string, string>) => Promise<string>;
}

// ============================================================================
// Default Logger Implementation
// ============================================================================

class ConsoleLogger implements MCPLogger {
  private prefix: string;

  constructor(prefix: string = 'MCP') {
    this.prefix = prefix;
  }

  private formatMessage(level: string, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${this.prefix}] [${level}] ${message}${contextStr}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(this.formatMessage('DEBUG', message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatMessage('WARN', message, context));
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(this.formatMessage('ERROR', message, context));
  }
}

// ============================================================================
// MCP Tool Builder
// ============================================================================

/**
 * Fluent builder for individual MCP tools
 */
export class MCPToolBuilder<TInput = unknown, TOutput = unknown> {
  private _name: string;
  private _displayName?: string;
  private _description?: string;
  private _inputSchema?: z.ZodType<TInput>;
  private _outputSchema?: z.ZodType<TOutput>;
  private _handler?: (input: TInput, context: MCPToolContext) => Promise<TOutput>;
  private parent: MCPServerBuilder;

  constructor(name: string, parent: MCPServerBuilder) {
    this._name = name;
    this.parent = parent;
  }

  /**
   * Set the display name for the tool
   */
  displayName(name: string): this {
    this._displayName = name;
    return this;
  }

  /**
   * Set the tool description
   */
  description(desc: string): this {
    this._description = desc;
    return this;
  }

  /**
   * Set the input schema using Zod
   */
  input<T extends z.ZodType>(schema: T): MCPToolBuilder<z.infer<T>, TOutput> {
    this._inputSchema = schema as unknown as z.ZodType<z.infer<T>>;
    return this as unknown as MCPToolBuilder<z.infer<T>, TOutput>;
  }

  /**
   * Set the output schema using Zod
   */
  output<T extends z.ZodType>(schema: T): MCPToolBuilder<TInput, z.infer<T>> {
    this._outputSchema = schema as unknown as z.ZodType<z.infer<T>>;
    return this as unknown as MCPToolBuilder<TInput, z.infer<T>>;
  }

  /**
   * Set the tool handler function
   */
  handler(
    fn: (input: TInput, context: MCPToolContext) => Promise<TOutput>
  ): MCPToolBuilder<TInput, TOutput> {
    this._handler = fn;
    return this;
  }

  /**
   * Complete tool definition and return to server builder
   */
  done(): MCPServerBuilder {
    if (!this._description) {
      throw new Error(`Tool '${this._name}' requires a description`);
    }
    if (!this._inputSchema) {
      throw new Error(`Tool '${this._name}' requires an input schema`);
    }
    if (!this._outputSchema) {
      throw new Error(`Tool '${this._name}' requires an output schema`);
    }
    if (!this._handler) {
      throw new Error(`Tool '${this._name}' requires a handler`);
    }

    const tool: MCPToolDefinition<TInput, TOutput> = {
      name: this._name,
      displayName: this._displayName,
      description: this._description,
      inputSchema: this._inputSchema,
      outputSchema: this._outputSchema,
      handler: this._handler,
    };

    this.parent['_tools'].push(tool as MCPToolDefinition);
    return this.parent;
  }
}

// ============================================================================
// MCP Server Builder
// ============================================================================

/**
 * Fluent builder for MCP servers
 */
export class MCPServerBuilder {
  private config: MCPServerConfig;
  private _tools: MCPToolDefinition[] = [];
  private _resources: MCPResource[] = [];
  private _prompts: MCPPrompt[] = [];

  private constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * Create a new MCP server builder
   */
  static create(config: MCPServerConfig): MCPServerBuilder {
    return new MCPServerBuilder(config);
  }

  /**
   * Start building a new tool
   */
  tool(name: string): MCPToolBuilder {
    return new MCPToolBuilder(name, this);
  }

  /**
   * Add a pre-defined tool
   */
  addTool<TInput, TOutput>(definition: MCPToolDefinition<TInput, TOutput>): this {
    this._tools.push(definition as MCPToolDefinition);
    return this;
  }

  /**
   * Add a resource
   */
  addResource(resource: MCPResource): this {
    this._resources.push(resource);
    return this;
  }

  /**
   * Add a prompt template
   */
  addPrompt(prompt: MCPPrompt): this {
    this._prompts.push(prompt);
    return this;
  }

  /**
   * Build the MCP server
   */
  build(): MCPServer {
    return new MCPServer(this.config, this._tools, this._resources, this._prompts);
  }
}

// ============================================================================
// MCP Server Implementation
// ============================================================================

/**
 * MCP Server runtime
 */
export class MCPServer {
  private config: MCPServerConfig;
  private tools: Map<string, MCPToolDefinition> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private prompts: Map<string, MCPPrompt> = new Map();
  private logger: MCPLogger;
  private context: MCPToolContext;
  private running = false;

  constructor(
    config: MCPServerConfig,
    tools: MCPToolDefinition[],
    resources: MCPResource[],
    prompts: MCPPrompt[]
  ) {
    this.config = config;
    this.logger = new ConsoleLogger(config.name);

    // Create default context with stub services
    this.context = {
      logger: this.logger,
      services: {
        graphrag: this.createStubGraphRAG(),
        mageagent: this.createStubMageAgent(),
      },
    };

    // Register tools, resources, and prompts
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
    for (const resource of resources) {
      this.resources.set(resource.uri, resource);
    }
    for (const prompt of prompts) {
      this.prompts.set(prompt.name, prompt);
    }
  }

  /**
   * Set custom services for the context
   */
  setServices(services: Partial<MCPServices>): void {
    this.context.services = {
      ...this.context.services,
      ...services,
    };
  }

  /**
   * Set custom logger
   */
  setLogger(logger: MCPLogger): void {
    this.logger = logger;
    this.context.logger = logger;
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('Server is already running');
      return;
    }

    this.running = true;
    this.logger.info(`Starting MCP server: ${this.config.name} v${this.config.version}`);

    const transport = this.config.transport || 'stdio';

    if (transport === 'stdio') {
      await this.startStdioTransport();
    } else if (transport === 'http') {
      await this.startHttpTransport();
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    this.running = false;
    this.logger.info('MCP server stopped');
  }

  /**
   * Handle a tool call
   */
  async callTool(name: string, input: unknown): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Validate input
    const parsed = tool.inputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Invalid input for tool '${name}': ${parsed.error.message}`);
    }

    // Execute handler
    this.logger.debug(`Calling tool: ${name}`, { input: parsed.data });
    const result = await tool.handler(parsed.data, this.context);

    // Validate output
    const outputParsed = tool.outputSchema.safeParse(result);
    if (!outputParsed.success) {
      throw new Error(`Invalid output from tool '${name}': ${outputParsed.error.message}`);
    }

    return outputParsed.data;
  }

  /**
   * Get MCP-compatible tool definitions
   */
  getToolDefinitions(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJSONSchema(tool.inputSchema, { name: `${tool.name}_input` }),
    }));
  }

  /**
   * Get server info
   */
  getServerInfo(): {
    name: string;
    version: string;
    tools: number;
    resources: number;
    prompts: number;
  } {
    return {
      name: this.config.name,
      version: this.config.version,
      tools: this.tools.size,
      resources: this.resources.size,
      prompts: this.prompts.size,
    };
  }

  // Private methods

  private async startStdioTransport(): Promise<void> {
    this.logger.info('Starting stdio transport');

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        const response = await this.handleRequest(request);
        console.log(JSON.stringify(response));
      } catch (error) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: error instanceof Error ? error.message : 'Parse error',
          },
        };
        console.log(JSON.stringify(errorResponse));
      }
    });

    rl.on('close', () => {
      this.stop();
    });
  }

  private async startHttpTransport(): Promise<void> {
    const port = this.config.httpPort || 3000;
    this.logger.info(`Starting HTTP transport on port ${port}`);

    const http = await import('http');

    const server = http.createServer(async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end('Method Not Allowed');
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const request = JSON.parse(body);
          const response = await this.handleRequest(request);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id: null,
              error: {
                code: -32603,
                message: error instanceof Error ? error.message : 'Internal error',
              },
            })
          );
        }
      });
    });

    server.listen(port);
  }

  private async handleRequest(request: {
    jsonrpc: string;
    id: string | number;
    method: string;
    params?: unknown;
  }): Promise<{
    jsonrpc: string;
    id: string | number;
    result?: unknown;
    error?: { code: number; message: string };
  }> {
    const { id, method, params } = request;

    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                resources: this.resources.size > 0 ? {} : undefined,
                prompts: this.prompts.size > 0 ? {} : undefined,
              },
              serverInfo: {
                name: this.config.name,
                version: this.config.version,
              },
            },
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: this.getToolDefinitions(),
            },
          };

        case 'tools/call': {
          const { name, arguments: args } = params as { name: string; arguments: unknown };
          const result = await this.callTool(name, args);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result),
                },
              ],
            },
          };
        }

        case 'resources/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              resources: Array.from(this.resources.values()).map((r) => ({
                uri: r.uri,
                name: r.name,
                description: r.description,
                mimeType: r.mimeType,
              })),
            },
          };

        case 'resources/read': {
          const { uri } = params as { uri: string };
          const resource = this.resources.get(uri);
          if (!resource) {
            throw new Error(`Unknown resource: ${uri}`);
          }
          const content = await resource.handler(uri);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: resource.mimeType || 'text/plain',
                  text: content,
                },
              ],
            },
          };
        }

        case 'prompts/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              prompts: Array.from(this.prompts.values()).map((p) => ({
                name: p.name,
                description: p.description,
                arguments: p.arguments,
              })),
            },
          };

        case 'prompts/get': {
          const { name, arguments: args } = params as {
            name: string;
            arguments?: Record<string, string>;
          };
          const prompt = this.prompts.get(name);
          if (!prompt) {
            throw new Error(`Unknown prompt: ${name}`);
          }
          const content = await prompt.handler(args || {});
          return {
            jsonrpc: '2.0',
            id,
            result: {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: content,
                  },
                },
              ],
            },
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
    }
  }

  private createStubGraphRAG(): GraphRAGService {
    return {
      async storeMemory(content: string): Promise<{ id: string }> {
        console.warn('[GraphRAG] storeMemory called but no service configured');
        return { id: `stub-${Date.now()}` };
      },
      async recallMemory(): Promise<Array<{ id: string; content: string; score: number }>> {
        console.warn('[GraphRAG] recallMemory called but no service configured');
        return [];
      },
      async storeDocument(content: string): Promise<{ id: string; chunks: number }> {
        console.warn('[GraphRAG] storeDocument called but no service configured');
        return { id: `stub-${Date.now()}`, chunks: 0 };
      },
      async searchDocuments(): Promise<Array<{ id: string; content: string; score: number }>> {
        console.warn('[GraphRAG] searchDocuments called but no service configured');
        return [];
      },
    };
  }

  private createStubMageAgent(): MageAgentService {
    return {
      async orchestrate(): Promise<{ result: string; agentsUsed: number }> {
        console.warn('[MageAgent] orchestrate called but no service configured');
        return { result: '', agentsUsed: 0 };
      },
      async analyze(): Promise<{ analysis: string }> {
        console.warn('[MageAgent] analyze called but no service configured');
        return { analysis: '' };
      },
      async synthesize(): Promise<{ output: string }> {
        console.warn('[MageAgent] synthesize called but no service configured');
        return { output: '' };
      },
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new MCP server
 */
export function createMCPServer(config: MCPServerConfig): MCPServerBuilder {
  return MCPServerBuilder.create(config);
}
