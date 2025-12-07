# Getting Started with Nexus Plugin Development

This guide will help you create your first Nexus plugin in under 10 minutes.

## Prerequisites

- Node.js 20+ (for TypeScript plugins)
- Python 3.11+ (for Python plugins)
- Go 1.21+ (for Go plugins)
- Docker (for local testing)
- Git

## Choose Your Template

| Template | Use Case | Language |
|----------|----------|----------|
| **basic** | Simple tools, getting started | TypeScript |
| **mcp-server** | Nexus service integration | TypeScript |
| **external-api** | External API integration | TypeScript |
| **python** | Python developers | Python |
| **go** | High-performance plugins | Go |

## Quick Start

### Option 1: Clone from GitHub

```bash
# Clone the template repository
git clone https://github.com/adverant/nexus-plugin-template.git my-plugin
cd my-plugin

# Copy the template you want
cp -r templates/basic/* .
# OR: cp -r templates/mcp-server/* .
# OR: cp -r templates/external-api/* .
# OR: cp -r templates/python/* .
# OR: cp -r templates/go/* .

# Clean up
rm -rf templates/
```

### Option 2: Use the Nexus CLI

```bash
# Install the CLI
npm install -g @adverant-nexus/cli

# Scaffold a new plugin
nexus plugin create my-plugin --template basic
cd my-plugin
```

## TypeScript Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Explore the Structure

```
my-plugin/
├── src/
│   ├── index.ts          # Plugin definition
│   ├── schemas.ts        # Input/output schemas
│   └── handlers.ts       # Tool implementations
├── tests/
│   └── plugin.test.ts    # Test suite
├── nexus.manifest.json   # Plugin manifest
├── Dockerfile            # Container definition
└── package.json
```

### 3. Define Your Plugin

```typescript
// src/index.ts
import { PluginBuilder, z } from '@adverant-nexus/plugin-sdk';

export const myPlugin = PluginBuilder.create({
  id: 'nexus-plugin-my-plugin',
  name: 'my-plugin',
  displayName: 'My Awesome Plugin',
  version: '1.0.0',
  description: 'A plugin that does something awesome',
})
  .setSemantic({
    capabilities: ['data_processing'],
    domain: 'utilities',
    intent: 'action',
    whenToUse: ['User wants to process data'],
    whenNotToUse: ['Real-time streaming data'],
  })
  .addTool({
    name: 'process_data',
    displayName: 'Process Data',
    description: 'Process and transform input data',
    inputSchema: z.object({
      data: z.string().describe('Data to process'),
      options: z.object({
        uppercase: z.boolean().default(false),
        trim: z.boolean().default(true),
      }).optional(),
    }),
    outputSchema: z.object({
      result: z.string(),
      processed: z.boolean(),
    }),
    examples: [
      {
        name: 'Basic processing',
        input: { data: '  hello world  ' },
        output: { result: 'hello world', processed: true },
      },
      {
        name: 'With uppercase',
        input: { data: 'hello', options: { uppercase: true } },
        output: { result: 'HELLO', processed: true },
      },
    ],
    handler: async (input, context) => {
      let result = input.data;
      
      if (input.options?.trim !== false) {
        result = result.trim();
      }
      
      if (input.options?.uppercase) {
        result = result.toUpperCase();
      }
      
      context.logger.info('Data processed', { resultLength: result.length });
      
      return { result, processed: true };
    },
  });

// Start MCP server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = myPlugin.buildServer();
  server.start();
}

export default myPlugin;
```

### 4. Run Tests

```bash
npm test
```

### 5. Build and Run Locally

```bash
# Build
npm run build

# Run MCP server locally
npm start
```

### 6. Test with Docker

```bash
# Build Docker image
docker build -t my-plugin:test .

# Run container
docker run --rm my-plugin:test
```

## Python Quick Start

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 2. Define Your Plugin

```python
# src/plugin.py
from nexus_plugin_sdk import PluginBuilder, MCPServer
from pydantic import BaseModel, Field
from typing import Optional

class ProcessInput(BaseModel):
    data: str = Field(..., description="Data to process")
    uppercase: bool = Field(default=False)

class ProcessOutput(BaseModel):
    result: str
    processed: bool = True

async def handle_process(input: ProcessInput, context) -> ProcessOutput:
    result = input.data.strip()
    if input.uppercase:
        result = result.upper()
    
    context.logger.info(f"Processed data: {len(result)} chars")
    return ProcessOutput(result=result)

plugin = (
    PluginBuilder.create(
        id="nexus-plugin-my-python-plugin",
        name="my-python-plugin",
        version="1.0.0",
    )
    .set_semantic(
        capabilities=["data_processing"],
        domain="utilities",
        when_to_use=["Processing text data"],
    )
    .add_tool(
        name="process_data",
        description="Process and transform data",
        input_schema=ProcessInput,
        output_schema=ProcessOutput,
        handler=handle_process,
        examples=[
            {
                "name": "Basic",
                "input": {"data": "hello"},
                "output": {"result": "hello", "processed": True},
            },
        ],
    )
)

if __name__ == "__main__":
    server = MCPServer(plugin)
    server.run()
```

### 3. Run Tests

```bash
pytest tests/ -v
```

### 4. Run Locally

```bash
python src/main.py
```

## Go Quick Start

### 1. Initialize Module

```bash
go mod download
```

### 2. Define Your Plugin

```go
// cmd/plugin/main.go
package main

import (
    "context"
    "encoding/json"
    "log"
    "os"
    "os/signal"
    "syscall"
    
    "my-plugin/internal/handlers"
    "my-plugin/internal/mcp"
    "my-plugin/internal/schemas"
)

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()
    
    // Handle shutdown
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    go func() {
        <-sigChan
        cancel()
    }()
    
    // Create server
    server := mcp.NewServer(mcp.ServerConfig{
        Name:    "my-plugin",
        Version: "1.0.0",
    })
    
    // Register tools
    h := handlers.New()
    
    server.RegisterTool(mcp.Tool{
        Name:        "process_data",
        Description: "Process and transform data",
        InputSchema: schemas.ProcessDataInputSchema,
        Handler: func(ctx context.Context, params json.RawMessage) (interface{}, error) {
            var input schemas.ProcessDataInput
            if err := json.Unmarshal(params, &input); err != nil {
                return nil, err
            }
            return h.ProcessData(ctx, input)
        },
    })
    
    if err := server.Run(ctx); err != nil {
        log.Fatal(err)
    }
}
```

### 3. Build and Run

```bash
# Build
go build -o plugin ./cmd/plugin

# Run
./plugin
```

### 4. Run Tests

```bash
go test -v ./...
```

## Update the Manifest

Edit `nexus.manifest.json` to configure your plugin:

```json
{
  "$schema": "https://schema.nexus.adverant.ai/plugin-manifest/v2.json",
  "name": "my-plugin",
  "displayName": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "A plugin that does something awesome",
  
  "nexus": {
    "minVersion": "2.0.0",
    "executionMode": "mcp_container",
    "capabilities": ["mcp_tools"],
    "permissions": [],
    "entrypoint": "dist/index.js",
    "healthCheck": "/health"
  },
  
  "mcp": {
    "enabled": true,
    "transport": "stdio",
    "tools": [
      {
        "name": "process_data",
        "description": "Process and transform data"
      }
    ]
  },
  
  "resources": {
    "cpuMillicores": 250,
    "memoryMB": 256,
    "timeoutMs": 30000
  }
}
```

## Validate Your Plugin

```bash
# Generate Plugin Intelligence Document
npx nexus-plugin generate-pid

# Validate manifest and schemas
npx nexus-plugin validate

# Preview PID in different formats
npx nexus-plugin preview --format=markdown
```

## Submit for Verification

### Option 1: GitHub Integration (Recommended)

1. Push your plugin to a GitHub repository
2. Go to the Nexus Developer Portal
3. Connect your GitHub account
4. Select your repository
5. Submit for verification

### Option 2: CLI Submission

```bash
nexus plugin submit --repo https://github.com/yourusername/my-plugin
```

## Next Steps

- Read the [API Reference](./api-reference.md) for complete SDK documentation
- Learn about [MCP Integration](./mcp-integration.md) for AI IDE support
- Review [Security Guidelines](./security-guidelines.md) before publishing
- Check the [Deployment Guide](./deployment.md) for VPS deployment

## Getting Help

- [Documentation](https://docs.nexus.adverant.ai/plugins)
- [GitHub Issues](https://github.com/adverant/nexus-plugin-template/issues)
- [Discord Community](https://discord.gg/adverant)
