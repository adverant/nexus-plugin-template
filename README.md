# Nexus Plugin Template

Official template for building Nexus plugins with Plugin Intelligence Document (PID) support.

## Features

- **PluginBuilder API** - High-level fluent API for plugin creation
- **MCPServerBuilder** - Build MCP-compliant servers for AI IDE integration
- **Zod Schema Integration** - Type-safe schemas with automatic JSON Schema conversion
- **Plugin Intelligence Documents** - LLM-optimized metadata for tool selection
- **Testing Utilities** - Mocks and helpers for comprehensive testing
- **Multi-format Export** - JSON, MCP, Markdown, OpenAPI export
- **Multi-language Support** - TypeScript, Python, and Go templates

## Quick Start

### Using the Template

```bash
# Clone this template repository
git clone https://github.com/adverant/nexus-plugin-template.git my-plugin
cd my-plugin

# Choose your language template
cp -r templates/typescript/* .
# or: cp -r templates/python/* .
# or: cp -r templates/go/* .

# Install dependencies
npm install  # TypeScript
# or: pip install -r requirements.txt  # Python
# or: go mod download  # Go
```

### TypeScript Example

```typescript
import { PluginBuilder, z } from '@adverant-nexus/plugin-sdk';

const myPlugin = PluginBuilder.create({
  id: 'nexus-plugin-calculator',
  name: 'calculator',
  displayName: 'Calculator',
  version: '1.0.0',
  description: 'A simple calculator plugin',
})
  .setSemantic({
    capabilities: ['arithmetic_calculation'],
    domain: 'mathematics',
    intent: 'action',
    whenToUse: ['User needs to perform calculations'],
    whenNotToUse: ['Complex statistical analysis'],
  })
  .addTool({
    name: 'calculate',
    displayName: 'Calculate',
    description: 'Perform arithmetic calculations',
    inputSchema: z.object({
      expression: z.string().describe('Math expression to evaluate'),
    }),
    outputSchema: z.object({
      result: z.number().describe('Calculation result'),
    }),
    examples: [
      {
        name: 'Simple addition',
        description: 'Add two numbers',
        input: { expression: '2 + 2' },
        output: { result: 4 },
      },
    ],
    handler: async (input) => {
      // Use a safe parser in production!
      const result = eval(input.expression);
      return { result };
    },
  });

// Generate Plugin Intelligence Document
const pid = myPlugin.generatePID();

// Start MCP server
const server = myPlugin.buildServer();
server.start();
```

## Templates

| Template | Language | Description |
|----------|----------|-------------|
| [typescript/basic](./templates/typescript/basic) | TypeScript | Simple plugin demonstrating core concepts |
| [typescript/mcp-server](./templates/typescript/mcp-server) | TypeScript | MCP server with Nexus service integration |
| [typescript/external-api](./templates/typescript/external-api) | TypeScript | HTTP API integration with caching |
| [python/basic](./templates/python/basic) | Python | Python plugin with type hints |
| [go/basic](./templates/go/basic) | Go | Go plugin with strong typing |

## Plugin Intelligence Documents (PID)

Every plugin generates a PID - a comprehensive, LLM-optimized metadata document:

- **Semantic Context**: When to use, when not to use, best practices
- **Tool Definitions**: Schemas, examples, error documentation
- **Execution Profile**: Performance, resources, cost
- **Context Requirements**: Permissions, services, credentials

## Documentation

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api-reference.md)
- [MCP Integration](./docs/mcp-integration.md)
- [Security Guidelines](./docs/security-guidelines.md)
- [Deployment Guide](./docs/deployment.md)
- [LLM Development Context](./docs/CLAUDE_PROMPT.md)

## Scripts

```bash
# Validate your plugin
npm run validate

# Generate PID
npm run export:pid

# Run tests
npm test

# Build for production
npm run build
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## Security

Please report security vulnerabilities to security@adverant.ai. See [SECURITY.md](./SECURITY.md) for our security policy.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

- Issues: https://github.com/adverant/nexus-plugin-template/issues
- Docs: https://docs.nexus.adverant.ai/plugins
- Discord: https://discord.gg/adverant
