# MCP Integration Guide

This guide explains how to integrate Nexus plugins with AI IDEs using the Model Context Protocol (MCP).

## What is MCP?

The Model Context Protocol (MCP) is an open standard that enables AI assistants to interact with external tools and services. Nexus plugins that implement MCP can be used directly in:

- **Claude Code** (Anthropic's CLI)
- **Cursor** (AI-powered IDE)
- **Windsurf** (Codeium's IDE)
- **Continue** (VS Code extension)
- **Other MCP-compatible clients**

## How It Works

```
┌──────────────────┐     stdio      ┌──────────────────┐
│    AI Client     │◄──────────────►│  Nexus Plugin    │
│  (Claude Code)   │    JSON-RPC    │   (MCP Server)   │
└──────────────────┘                └──────────────────┘
                                            │
                                            ▼
                                    ┌──────────────────┐
                                    │  Nexus Services  │
                                    │ (GraphRAG, etc.) │
                                    └──────────────────┘
```

## Enabling MCP in Your Plugin

### 1. Configure the Manifest

```json
{
  "mcp": {
    "enabled": true,
    "transport": "stdio",
    "tools": [
      {
        "name": "search_knowledge",
        "description": "Search the knowledge base for relevant information"
      }
    ]
  }
}
```

### 2. Build the MCP Server

```typescript
import { PluginBuilder } from '@adverant-nexus/plugin-sdk';

const plugin = PluginBuilder.create({ ... })
  .addTool({ ... });

// Build and start MCP server
const server = plugin.buildServer();
server.start();
```

### 3. Test Locally

```bash
# Build your plugin
npm run build

# Test with the MCP inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Configuring AI Clients

### Claude Code

Add to your Claude Code configuration:

```json
// ~/.claude/config.json
{
  "mcpServers": {
    "my-plugin": {
      "command": "node",
      "args": ["/path/to/my-plugin/dist/index.js"],
      "env": {
        "NEXUS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor

Add to your Cursor settings:

```json
// .cursor/settings.json
{
  "mcp": {
    "servers": {
      "my-plugin": {
        "command": "node",
        "args": ["./node_modules/my-plugin/dist/index.js"]
      }
    }
  }
}
```

### VS Code with Continue

Add to Continue configuration:

```json
// .continue/config.json
{
  "mcpServers": [
    {
      "name": "my-plugin",
      "command": "npx",
      "args": ["my-plugin"]
    }
  ]
}
```

## MCP Protocol Details

### Transport

Nexus plugins use **stdio** transport:
- Input: JSON-RPC messages on stdin
- Output: JSON-RPC responses on stdout
- Logs: Sent to stderr (not visible to client)

### Message Types

#### Initialize

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "Claude", "version": "1.0.0" }
  }
}
```

#### List Tools

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

#### Call Tool

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search_knowledge",
    "arguments": {
      "query": "TypeScript patterns",
      "limit": 5
    }
  }
}
```

## Best Practices

### 1. Descriptive Tool Names

```typescript
// ❌ Bad
name: 'search'

// ✅ Good
name: 'search_knowledge_base'
```

### 2. Detailed Descriptions

```typescript
// ❌ Bad
description: 'Search'

// ✅ Good
description: 'Search the knowledge base for documents matching the query. ' +
             'Returns ranked results with relevance scores. ' +
             'Use for finding previously stored information.'
```

### 3. Schema Descriptions

```typescript
// ❌ Bad
z.object({
  query: z.string(),
  limit: z.number(),
})

// ✅ Good
z.object({
  query: z.string()
    .min(1)
    .max(1000)
    .describe('Search query - supports natural language'),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Maximum results to return (default: 10)'),
})
```

### 4. Semantic Context

```typescript
.setSemantic({
  capabilities: ['semantic_search', 'knowledge_retrieval'],
  whenToUse: [
    'User asks to find or search for information',
    'Building context from past conversations',
    'Looking up documentation or notes',
  ],
  whenNotToUse: [
    'Real-time external data (use external API instead)',
    'Simple calculations',
    'Current events or news',
  ],
})
```

### 5. Error Handling

```typescript
handler: async (input, context) => {
  try {
    const results = await context.services.graphrag.search(input.query);
    return { results, total: results.length };
  } catch (error) {
    // Log for debugging
    context.logger.error('Search failed', { error, query: input.query });
    
    // Return structured error for LLM
    throw new PluginError({
      code: 'SEARCH_FAILED',
      message: 'Unable to search knowledge base',
      retryable: true,
      suggestion: 'Try a simpler query or check service status',
    });
  }
}
```

## Testing MCP Integration

### 1. Use the MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### 2. Manual Testing

```bash
# Start your plugin
node dist/index.js

# In another terminal, send test messages
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

### 3. Integration Test

```typescript
import { MCPClient } from '@adverant-nexus/plugin-sdk/testing';

describe('MCP Integration', () => {
  let client: MCPClient;
  
  beforeAll(async () => {
    client = await MCPClient.spawn('node', ['dist/index.js']);
    await client.initialize();
  });
  
  afterAll(async () => {
    await client.close();
  });
  
  it('should list tools', async () => {
    const tools = await client.listTools();
    expect(tools).toContainEqual(
      expect.objectContaining({ name: 'search_knowledge' })
    );
  });
  
  it('should call tool', async () => {
    const result = await client.callTool('search_knowledge', {
      query: 'test',
      limit: 5,
    });
    expect(result).toHaveProperty('results');
  });
});
```

## Deploying MCP Plugins

### 1. Containerized Deployment

MCP plugins run as containers on customer VPS stacks:

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-plugin
spec:
  template:
    spec:
      containers:
        - name: mcp-server
          image: my-plugin:1.0.0
          stdin: true
          tty: false
          resources:
            limits:
              cpu: "500m"
              memory: "512Mi"
```

### 2. Plugin Gateway Integration

The Nexus Plugin Gateway handles:
- Routing MCP messages to the correct plugin
- Authentication and authorization
- Rate limiting and quotas
- Health monitoring

### 3. Client Configuration

Users configure their AI clients to connect through the gateway:

```json
{
  "mcpServers": {
    "nexus-plugins": {
      "command": "nexus-mcp-proxy",
      "args": ["--endpoint", "wss://plugins.nexus.example.com"]
    }
  }
}
```

## Troubleshooting

### Plugin Not Appearing in Client

1. Check that `mcp.enabled` is `true` in manifest
2. Verify the plugin builds and runs without errors
3. Test with the MCP inspector
4. Check client configuration path and syntax

### Tool Calls Failing

1. Check input validation - ensure schemas match
2. Review error logs on stderr
3. Verify service connections (GraphRAG, etc.)
4. Test handler in isolation

### Slow Response Times

1. Add caching for repeated queries
2. Reduce payload sizes
3. Optimize database queries
4. Consider async processing for long operations
