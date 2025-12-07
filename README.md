# Nexus Plugin Template

[![CI](https://github.com/adverant/nexus-plugin-template/actions/workflows/ci.yml/badge.svg)](https://github.com/adverant/nexus-plugin-template/actions/workflows/ci.yml)
[![Security](https://github.com/adverant/nexus-plugin-template/actions/workflows/security.yml/badge.svg)](https://github.com/adverant/nexus-plugin-template/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40adverant-nexus%2Fplugin-sdk.svg)](https://www.npmjs.com/package/@adverant-nexus/plugin-sdk)

Official SDK and templates for building Nexus plugins with Plugin Intelligence Document (PID) support.

## Features

- **Multi-Language Support** - TypeScript, Python, and Go templates
- **PluginBuilder API** - High-level fluent API for plugin creation
- **MCPServerBuilder** - Build MCP-compliant servers for AI IDE integration
- **Zod Schema Integration** - Type-safe schemas with automatic JSON Schema conversion
- **Plugin Intelligence Documents** - LLM-optimized metadata for tool selection
- **Testing Utilities** - Mocks and helpers for comprehensive testing
- **Multi-format Export** - JSON, MCP, Markdown, OpenAPI export
- **Security First** - Built-in validation, sandboxing support, and security scanning

## Quick Start

### TypeScript (Recommended)

```bash
# Clone the template
git clone https://github.com/adverant/nexus-plugin-template.git my-plugin
cd my-plugin

# Use the basic template
cp -r templates/basic/* .
npm install
npm run build
npm start
```

### Python

```bash
cp -r templates/python/* .
pip install -e .
python -m my_plugin
```

### Go

```bash
cp -r templates/go/* .
go mod tidy
go run .
```

## Templates

| Template | Language | Description | Best For |
|----------|----------|-------------|----------|
| `basic` | TypeScript | Simple calculator example | Learning, simple tools |
| `mcp-server` | TypeScript | GraphRAG integration | Nexus service integration |
| `external-api` | TypeScript | Weather API with caching | External API wrappers |
| `python` | Python | FastMCP-based plugin | Python developers |
| `go` | Go | mcp-go based plugin | Performance-critical tools |

## Documentation

- [Getting Started](./docs/getting-started.md) - Quick start guide for all languages
- [API Reference](./docs/api-reference.md) - Full SDK API documentation
- [MCP Integration](./docs/mcp-integration.md) - Claude Code and AI IDE integration
- [Security Guidelines](./docs/security-guidelines.md) - Security best practices
- [Deployment Guide](./docs/deployment.md) - VPS deployment guide
- [LLM Development Context](./docs/CLAUDE_PROMPT.md) - Comprehensive guide for AI assistants

## SDK Installation

```bash
npm install @adverant-nexus/plugin-sdk zod
```

## Example Plugin

```typescript
import { PluginBuilder, z } from '@adverant-nexus/plugin-sdk';

const myPlugin = PluginBuilder.create({
  id: 'my-plugin',
  name: 'my-plugin',
  displayName: 'My Plugin',
  version: '1.0.0',
  description: 'A simple example plugin',
})
  .setSemantic({
    capabilities: ['example_capability'],
    domain: 'general',
    intent: 'action',
    whenToUse: ['User wants to do X'],
    whenNotToUse: ['User wants to do Y'],
  })
  .addTool({
    name: 'my_tool',
    displayName: 'My Tool',
    description: 'Does something useful',
    inputSchema: z.object({
      input: z.string().describe('The input value'),
    }),
    outputSchema: z.object({
      result: z.string().describe('The result'),
    }),
    examples: [
      {
        name: 'Basic example',
        description: 'Shows basic usage',
        input: { input: 'hello' },
        output: { result: 'processed: hello' },
      },
    ],
    handler: async (input) => {
      return { result: `processed: ${input.input}` };
    },
  });

// Generate Plugin Intelligence Document
const pid = myPlugin.generatePID();
console.log(JSON.stringify(pid, null, 2));

// Start MCP server
const server = myPlugin.buildServer();
server.start();
```

## Plugin Intelligence Document (PID)

Every plugin generates a PID - a comprehensive, LLM-optimized metadata document that includes:

- **Semantic Context**: When to use, when not to use, best practices
- **Tool Definitions**: Schemas, examples, error documentation
- **Execution Profile**: Performance, resources, cost
- **Context Requirements**: Permissions, services, credentials

This enables AI assistants to accurately select and chain plugins based on user intent.

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development

```bash
# Clone the repository
git clone https://github.com/adverant/nexus-plugin-template.git
cd nexus-plugin-template

# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build
npm run build
```

## Security

Security is a top priority. Please see our [Security Guidelines](./docs/security-guidelines.md) for best practices.

To report a security vulnerability, please email security@adverant.ai or open a private security advisory on GitHub.

## Support

- **Documentation**: [docs.nexus.adverant.ai/plugins](https://docs.nexus.adverant.ai/plugins)
- **Issues**: [GitHub Issues](https://github.com/adverant/nexus-plugin-template/issues)
- **Discussions**: [GitHub Discussions](https://github.com/adverant/nexus-plugin-template/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Zod](https://zod.dev/) for schema validation
- [FastMCP](https://github.com/jlowin/fastmcp) for Python MCP support
- [mcp-go](https://github.com/mark3labs/mcp-go) for Go MCP support
