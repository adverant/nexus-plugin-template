/**
 * MCP Module
 *
 * Provides utilities for building MCP (Model Context Protocol) compliant servers.
 */

export {
  MCPServerBuilder,
  MCPToolBuilder,
  MCPServer,
  createMCPServer,
  type MCPServerConfig,
  type MCPToolDefinition,
  type MCPResource,
  type MCPPrompt,
  type MCPToolContext,
  type MCPLogger,
  type MCPServices,
  type GraphRAGService,
  type MageAgentService,
} from './server-builder.js';
