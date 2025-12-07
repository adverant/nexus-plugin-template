# Nexus Plugin Development - LLM Context

> This document provides comprehensive context for AI assistants (Claude, GPT, etc.)
> to help developers build Nexus plugins. It should be ingested at the start of
> any plugin development conversation.

## System Overview

### What is Nexus?

Nexus is a multi-tenant AI orchestration platform that provides:

- **GraphRAG Service**: Vector storage with semantic search (Qdrant + Neo4j)
- **MageAgent Service**: Multi-model AI orchestration with agent collaboration
- **Plugin System**: Extensible architecture for custom tools and integrations
- **MCP Support**: Model Context Protocol for AI IDE integration

### Plugin Architecture

Plugins extend Nexus functionality and run in isolated containers on customer VPS stacks.

```
┌─────────────────────────────────────────────────────────────┐
│                     Customer VPS Stack                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │ GraphRAG│  │MageAgent│  │   Auth  │  │  Plugin Gateway │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘ │
│       │            │            │                 │          │
│  ┌────┴────────────┴────────────┴─────────────────┴────┐    │
│  │                    Nexus Network                     │    │
│  └──────────────────────────┬───────────────────────────┘    │
│                             │                                 │
│  ┌──────────────────────────┼───────────────────────────┐    │
│  │           Plugin Namespace (Isolated)                │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              │    │
│  │  │Plugin A │  │Plugin B │  │Plugin C │              │    │
│  │  │(MCP)    │  │(Docker) │  │(HTTPS)  │              │    │
│  │  └─────────┘  └─────────┘  └─────────┘              │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Execution Modes

### 1. EXTERNAL_HTTPS (Isolation Level: 1)
**Use Case**: External API integrations, SaaS connectors
**Security**: Minimal - external service handles security
**Network**: Open outbound to specified domains
**Resources**: N/A (runs externally)

```typescript
// Example: Weather API plugin
PluginBuilder.create({ ... })
  .setExecution({
    mode: 'external_https',
    isolationLevel: 1,
    externalEndpoint: 'https://api.openweathermap.org',
  })
```

### 2. MCP_CONTAINER (Isolation Level: 2) - **Recommended**
**Use Case**: Standard plugins with Nexus service integration
**Security**: Docker container with seccomp, non-root user
**Network**: Restricted to Nexus internal services
**Resources**: 1 CPU, 1GB RAM default

```typescript
// Example: Knowledge search plugin
PluginBuilder.create({ ... })
  .setExecution({
    mode: 'mcp_container',
    isolationLevel: 2,
    resources: { cpuMillicores: 500, memoryMB: 512 },
  })
```

### 3. HARDENED_DOCKER (Isolation Level: 3)
**Use Case**: Plugins handling sensitive data
**Security**: Stricter seccomp, read-only filesystem, air-gapped
**Network**: No outbound except Nexus services
**Resources**: 2 CPU, 2GB RAM default

### 4. FIRECRACKER (Isolation Level: 4)
**Use Case**: Untrusted or community plugins
**Security**: Full microVM isolation
**Network**: Completely isolated network namespace
**Resources**: 4 CPU, 4GB RAM default

## Plugin SDK APIs

### PluginBuilder (Main Entry Point)

```typescript
import { PluginBuilder, z } from '@adverant-nexus/plugin-sdk';

const myPlugin = PluginBuilder.create({
  id: 'nexus-plugin-example',       // Unique identifier (kebab-case)
  name: 'example',                   // Short name
  displayName: 'Example Plugin',     // Human-readable name
  version: '1.0.0',                  // Semver version
  description: 'What this plugin does',
})
  .setSemantic({ ... })              // LLM decision context
  .setExecution({ ... })             // Resource and isolation config
  .setContextRequirements({ ... })   // Permissions and services
  .addTool({ ... })                  // Add tool definitions
  .addTool({ ... });                 // Chain multiple tools
```

### Tool Definition

```typescript
.addTool({
  name: 'search_knowledge',           // Tool identifier (snake_case)
  displayName: 'Search Knowledge',    // Human-readable name
  description: 'Search the knowledge base for relevant information',
  
  // Input schema using Zod (auto-converted to JSON Schema)
  inputSchema: z.object({
    query: z.string().min(1).max(1000).describe('Search query'),
    limit: z.number().int().min(1).max(100).default(10),
    filters: z.object({
      tags: z.array(z.string()).optional(),
      dateRange: z.object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
      }).optional(),
    }).optional(),
  }),
  
  // Output schema
  outputSchema: z.object({
    results: z.array(z.object({
      id: z.string(),
      content: z.string(),
      score: z.number().min(0).max(1),
      metadata: z.record(z.unknown()),
    })),
    total: z.number(),
    searchTime: z.number().describe('Search time in milliseconds'),
  }),
  
  // Required examples (at least 2)
  examples: [
    {
      name: 'Basic search',
      description: 'Search for TypeScript documentation',
      input: { query: 'TypeScript async patterns', limit: 5 },
      output: {
        results: [{ id: 'doc-1', content: '...', score: 0.95, metadata: {} }],
        total: 1,
        searchTime: 45,
      },
    },
    // ... more examples
  ],
  
  // Error documentation
  errors: [
    {
      code: 'SEARCH_FAILED',
      httpStatus: 500,
      message: 'Search operation failed',
      cause: 'Vector database unavailable',
      recovery: ['Retry after 5 seconds', 'Check service status'],
      retryable: true,
    },
  ],
  
  // Handler implementation
  handler: async (input, context) => {
    context.logger.info('Searching knowledge', { query: input.query });
    
    const results = await context.services.graphrag.search(input.query, {
      limit: input.limit,
      filters: input.filters,
    });
    
    return {
      results,
      total: results.length,
      searchTime: Date.now() - startTime,
    };
  },
})
```

### Semantic Context (LLM Decision Making)

```typescript
.setSemantic({
  // Capability tags for tool selection
  capabilities: ['semantic_search', 'knowledge_retrieval', 'memory_access'],
  
  // Domain categorization
  domain: 'knowledge_management',
  
  // Tool intent type
  intent: 'query',  // 'query' | 'action' | 'transform' | 'generate'
  
  // When LLM should use this plugin
  whenToUse: [
    'User asks to search for information',
    'User needs to find previously stored content',
    'Building context from past conversations',
  ],
  
  // When LLM should NOT use this plugin
  whenNotToUse: [
    'User is asking a general knowledge question',
    'User wants real-time external data',
    'Simple calculations or transformations',
  ],
  
  // Common mistakes to avoid
  commonMistakes: [
    'Using exact match instead of semantic search',
    'Not filtering by relevant tags when available',
    'Ignoring score threshold for quality results',
  ],
  
  // Best practices
  bestPractices: [
    'Always specify a reasonable limit (10-50)',
    'Use tag filters to narrow results',
    'Check score values to assess relevance',
  ],
  
  // Related plugins for chaining
  relatedPlugins: ['document-processor', 'summarizer'],
  
  // Suggested tool chains
  suggestedChains: [
    {
      name: 'Search and Summarize',
      description: 'Search knowledge then summarize results',
      steps: ['search_knowledge', 'summarize_results'],
    },
  ],
})
```

### Context Requirements

```typescript
.setContextRequirements({
  // Required Nexus permissions
  permissions: [
    'nexus:graphrag:read',      // Read from GraphRAG
    'nexus:graphrag:write',     // Write to GraphRAG (if needed)
    'nexus:mageagent:orchestrate', // Use MageAgent
  ],
  
  // Required services
  requiredServices: [
    { name: 'graphrag', version: '1.0.0', critical: true },
    { name: 'mageagent', version: '1.0.0', critical: false },
  ],
  
  // Environment variables
  environmentVariables: [
    { name: 'API_KEY', required: true, description: 'External API key' },
    { name: 'DEBUG', required: false, description: 'Enable debug logging' },
  ],
  
  // External credentials (if needed)
  credentials: [
    { type: 'api_key', scopes: ['read'], required: true },
  ],
})
```

## MCPToolContext (Handler Context)

Every tool handler receives a context object:

```typescript
interface MCPToolContext {
  // Structured logger
  logger: {
    debug(msg: string, meta?: object): void;
    info(msg: string, meta?: object): void;
    warn(msg: string, meta?: object): void;
    error(msg: string, meta?: object): void;
  };
  
  // Nexus services
  services: {
    graphrag: {
      storeMemory(content: string, tags?: string[]): Promise<{ id: string }>;
      recallMemory(query: string, limit?: number): Promise<Array<{ id: string; content: string; score: number }>>;
      storeDocument(title: string, content: string): Promise<{ id: string }>;
      searchDocuments(query: string, options?: SearchOptions): Promise<Array<DocumentResult>>;
    };
    
    mageagent: {
      analyze(topic: string): Promise<{ analysis: string }>;
      orchestrate(task: string, options?: OrchestrationOptions): Promise<OrchestrationResult>;
      collaborate(objective: string, agents?: AgentConfig[]): Promise<CollaborationResult>;
    };
  };
}
```

## Plugin Intelligence Document (PID)

Every plugin generates a PID - comprehensive metadata for LLM tool selection:

```typescript
const pid = myPlugin.generatePID();

// Outputs:
{
  id: 'nexus-plugin-example',
  name: 'example',
  version: '1.0.0',
  semantic: { capabilities, whenToUse, ... },
  tools: [{
    name: 'search_knowledge',
    inputSchema: { /* JSON Schema */ },
    outputSchema: { /* JSON Schema */ },
    examples: [ ... ],
    errors: [ ... ],
  }],
  execution: { mode, resources, ... },
  contextRequirements: { permissions, ... },
  trust: { level, certifications, ... },
}
```

### Export Formats

```typescript
// JSON (default)
const json = myPlugin.export('json');

// MCP-compatible (for Claude Code)
const mcp = myPlugin.export('mcp');

// Markdown (human-readable docs)
const markdown = myPlugin.export('markdown');

// OpenAPI (REST integration)
const openapi = myPlugin.export('openapi');
```

## Manifest File (nexus.manifest.json)

```json
{
  "$schema": "https://schema.nexus.adverant.ai/plugin-manifest/v2.json",
  "name": "my-plugin",
  "displayName": "My Plugin",
  "version": "1.0.0",
  "description": "Plugin description",
  
  "nexus": {
    "minVersion": "2.0.0",
    "executionMode": "mcp_container",
    "capabilities": ["commands", "mcp_tools"],
    "permissions": ["nexus:graphrag:read"],
    "entrypoint": "dist/index.js",
    "healthCheck": "/health"
  },
  
  "mcp": {
    "enabled": true,
    "transport": "stdio",
    "tools": [
      {
        "name": "search_knowledge",
        "description": "Search the knowledge base"
      }
    ]
  },
  
  "resources": {
    "cpuMillicores": 500,
    "memoryMB": 512,
    "timeoutMs": 30000
  },
  
  "tests": {
    "command": "npm test",
    "coverage": { "minimum": 80 }
  }
}
```

## Language-Specific Patterns

### TypeScript (Recommended)

```typescript
import { PluginBuilder, z, MCPToolContext } from '@adverant-nexus/plugin-sdk';

export const myPlugin = PluginBuilder.create({ ... })
  .addTool({
    name: 'my_tool',
    inputSchema: z.object({ ... }),
    outputSchema: z.object({ ... }),
    handler: async (input, context: MCPToolContext) => {
      // Implementation
    },
  });

// Start MCP server
const server = myPlugin.buildServer();
server.start();
```

### Python

```python
from nexus_plugin_sdk import PluginBuilder, MCPServer
from pydantic import BaseModel, Field

class SearchInput(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    limit: int = Field(default=10, ge=1, le=100)

class SearchOutput(BaseModel):
    results: list[dict]
    total: int

async def handle_search(input: SearchInput, context) -> SearchOutput:
    results = await context.services.graphrag.search(input.query)
    return SearchOutput(results=results, total=len(results))

plugin = (
    PluginBuilder.create(
        id="nexus-plugin-search",
        name="search",
        version="1.0.0",
    )
    .add_tool(
        name="search_knowledge",
        input_schema=SearchInput,
        output_schema=SearchOutput,
        handler=handle_search,
    )
)

if __name__ == "__main__":
    server = MCPServer(plugin)
    server.run()
```

### Go

```go
package main

import (
    "context"
    "github.com/adverant/nexus-plugin-sdk-go/pkg/mcp"
    "github.com/adverant/nexus-plugin-sdk-go/pkg/schemas"
)

func main() {
    server := mcp.NewServer(mcp.ServerConfig{
        Name:    "my-plugin",
        Version: "1.0.0",
    })
    
    server.RegisterTool(mcp.Tool{
        Name:        "search_knowledge",
        Description: "Search the knowledge base",
        InputSchema: schemas.SearchInputSchema,
        Handler: func(ctx context.Context, params json.RawMessage) (interface{}, error) {
            var input schemas.SearchInput
            if err := json.Unmarshal(params, &input); err != nil {
                return nil, err
            }
            // Implementation
            return results, nil
        },
    })
    
    server.Run(context.Background())
}
```

## Security Guidelines

### DO:
- Use parameterized queries for any database operations
- Validate all inputs with schema before processing
- Use environment variables for secrets
- Implement proper error handling with recovery strategies
- Log security-relevant events
- Set resource limits appropriately

### DON'T:
- Hardcode secrets or API keys
- Use `eval()` or dynamic code execution
- Store sensitive data in logs
- Trust user input without validation
- Request more permissions than needed
- Ignore error cases

## Testing Patterns

```typescript
import { createTestContext, MockGraphRAGService } from '@adverant-nexus/plugin-sdk/testing';

describe('MyPlugin', () => {
  it('should search knowledge', async () => {
    const mockGraphRAG = new MockGraphRAGService();
    mockGraphRAG.addMemory('mem-1', 'TypeScript patterns', ['coding']);
    
    const context = createTestContext({
      graphrag: mockGraphRAG,
    });
    
    const result = await myPlugin.tools.search_knowledge.handler(
      { query: 'TypeScript', limit: 5 },
      context
    );
    
    expect(result.results).toHaveLength(1);
    expect(result.results[0].score).toBeGreaterThan(0.8);
  });
});
```

## Common Mistakes and Fixes

### 1. Missing Error Handling
```typescript
// ❌ Bad
handler: async (input, context) => {
  const data = await context.services.graphrag.search(input.query);
  return { results: data };
}

// ✅ Good
handler: async (input, context) => {
  try {
    const data = await context.services.graphrag.search(input.query);
    return { results: data, total: data.length };
  } catch (error) {
    context.logger.error('Search failed', { error, query: input.query });
    throw new PluginError('SEARCH_FAILED', 'Search operation failed', true);
  }
}
```

### 2. Missing Examples
```typescript
// ❌ Bad - No examples
.addTool({
  name: 'my_tool',
  inputSchema: z.object({ ... }),
  handler: async (input) => { ... },
})

// ✅ Good - At least 2 examples
.addTool({
  name: 'my_tool',
  inputSchema: z.object({ ... }),
  examples: [
    { name: 'Basic usage', input: {...}, output: {...} },
    { name: 'With options', input: {...}, output: {...} },
  ],
  handler: async (input) => { ... },
})
```

### 3. Overly Broad Permissions
```typescript
// ❌ Bad - Too broad
.setContextRequirements({
  permissions: ['nexus:*'],  // Never use wildcards!
})

// ✅ Good - Specific permissions
.setContextRequirements({
  permissions: ['nexus:graphrag:read', 'nexus:graphrag:write'],
})
```

## Verification Checklist

Before submitting a plugin:

- [ ] `nexus.manifest.json` is valid and complete
- [ ] All tools have at least 2 examples
- [ ] All tools have error documentation
- [ ] Input/output schemas are defined with Zod
- [ ] Semantic context is complete (whenToUse, whenNotToUse)
- [ ] Tests pass with >80% coverage
- [ ] No hardcoded secrets
- [ ] Docker image builds successfully
- [ ] Health check endpoint works
- [ ] Permissions are minimal and justified

## Resources

- [Plugin SDK Documentation](https://docs.nexus.adverant.ai/plugins)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Nexus API Reference](https://api.nexus.adverant.ai/docs)
- [Example Plugins Repository](https://github.com/adverant/nexus-plugin-examples)
