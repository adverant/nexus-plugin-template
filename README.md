# Nexus Plugin Template

[![CI](https://github.com/adverant/nexus-plugin-template/actions/workflows/ci.yml/badge.svg)](https://github.com/adverant/nexus-plugin-template/actions/workflows/ci.yml)
[![Security](https://github.com/adverant/nexus-plugin-template/actions/workflows/security.yml/badge.svg)](https://github.com/adverant/nexus-plugin-template/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/@adverant-nexus/plugin-sdk)](https://www.npmjs.com/package/@adverant-nexus/plugin-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-purple.svg)](https://modelcontextprotocol.io/)

**Production-ready SDK and templates for building Nexus plugins with LLM-optimized metadata generation.**

---

## The Problem This Solves

Building plugins for AI platforms requires solving two distinct challenges:

1. **Implementation**: Writing the actual tool logic, handlers, schemas, and server infrastructure
2. **Discoverability**: Enabling LLMs to understand *when* and *how* to use your tool

Traditional plugin systems focus only on (1). This template addresses both through **Plugin Intelligence Documents (PIDs)**—structured metadata that LLMs consume to make accurate tool selection decisions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LLM-Driven Development Workflow                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐ │
│   │  Your App    │    │  This        │    │  Generated Plugin            │ │
│   │  Requirements│ +  │  Template    │ =  │  + PID Metadata              │ │
│   │  (Natural    │    │  + SDK       │    │  + MCP Server                │ │
│   │   Language)  │    │              │    │  + Type-Safe Schemas         │ │
│   └──────────────┘    └──────────────┘    └──────────────────────────────┘ │
│         │                    │                         │                    │
│         │                    │                         ▼                    │
│         │                    │            ┌──────────────────────────────┐ │
│         │                    │            │  LLM Reads PID and:          │ │
│         │                    │            │  • Knows WHEN to use tool    │ │
│         └────────────────────┴───────────►│  • Knows HOW to call it      │ │
│                                           │  • Knows WHAT to expect      │ │
│           Feed to Claude/GPT              │  • Knows error recovery      │ │
│           with template context           └──────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Nexus Plugin Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         AI IDE / Claude Code                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │   Cursor    │  │  Windsurf   │  │ Claude Code │  ... MCP Clients │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │   │
│  └─────────┼────────────────┼────────────────┼──────────────────────────┘   │
│            │                │                │                              │
│            └────────────────┼────────────────┘                              │
│                             │ MCP Protocol (stdio/SSE)                      │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Your Plugin (MCP Server)                        │   │
│  │                                                                      │   │
│  │   ┌───────────────────────────────────────────────────────────┐     │   │
│  │   │                    PluginBuilder API                       │     │   │
│  │   │                                                            │     │   │
│  │   │  .create()          Plugin identity and metadata           │     │   │
│  │   │  .setSemantic()     LLM decision-making context            │     │   │
│  │   │  .setExecution()    Resource limits and isolation          │     │   │
│  │   │  .addTool()         Tool definitions with Zod schemas      │     │   │
│  │   │  .generatePID()     Export Plugin Intelligence Document    │     │   │
│  │   │  .buildServer()     Create MCP-compliant server            │     │   │
│  │   │                                                            │     │   │
│  │   └───────────────────────────────────────────────────────────┘     │   │
│  │                             │                                        │   │
│  │                             ▼                                        │   │
│  │   ┌───────────────────────────────────────────────────────────┐     │   │
│  │   │                  Tool Handlers                             │     │   │
│  │   │                                                            │     │   │
│  │   │   async (input, context) => {                              │     │   │
│  │   │     // Access Nexus services via context                   │     │   │
│  │   │     const results = await context.services.graphrag.search │     │   │
│  │   │     return { data: results };                              │     │   │
│  │   │   }                                                        │     │   │
│  │   │                                                            │     │   │
│  │   └───────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                             │                                               │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Nexus Platform Services                          │   │
│  │                                                                      │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │   │ GraphRAG │  │ MageAgent│  │   Auth   │  │ Plugin Registry  │   │   │
│  │   │ (Vector  │  │ (Multi-  │  │ (OAuth,  │  │ (Verification,   │   │   │
│  │   │  Search) │  │  Agent)  │  │  JWT)    │  │  Marketplace)    │   │   │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- TypeScript 5.0+
- An LLM assistant (Claude, GPT, Cursor, etc.)

### Option 1: LLM-Assisted Development (Recommended)

The most effective way to use this template is with an LLM. Feed your requirements along with the template context:

```markdown
I need to build a Nexus plugin that [YOUR REQUIREMENTS].

Use the nexus-plugin-template from https://github.com/adverant/nexus-plugin-template

Reference the CLAUDE_PROMPT.md for full SDK documentation.
Reference the basic template at templates/basic/ for structure.

Generate a complete plugin with:
1. Proper PluginBuilder configuration
2. Zod schemas for all inputs/outputs
3. Semantic context for LLM tool selection
4. At least 2 examples per tool
5. Error documentation with recovery strategies
```

### Option 2: Manual Setup

```bash
# Clone the template
git clone https://github.com/adverant/nexus-plugin-template.git my-plugin
cd my-plugin

# Use the TypeScript template
cp -r templates/basic/* .
npm install
npm run build

# Start the MCP server
npm start
```

---

## Plugin Intelligence Documents (PIDs)

A PID is a comprehensive, machine-readable metadata document that enables LLMs to make accurate tool selection decisions. It answers:

- **WHEN** should an LLM use this tool?
- **HOW** should the tool be called?
- **WHAT** output can be expected?
- **WHY** might it fail, and how to recover?

### PID Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Plugin Intelligence Document (PID)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Identity Layer                                                      │   │
│  │  ├── id: "nexus-plugin-calculator"                                   │   │
│  │  ├── version: "1.0.0"                                                │   │
│  │  ├── displayName: "Calculator Plugin"                               │   │
│  │  └── description: "Arithmetic operations and unit conversions"      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Semantic Layer (LLM Decision Context)                               │   │
│  │  ├── capabilities: ["arithmetic", "unit_conversion"]                 │   │
│  │  ├── domain: "mathematics"                                           │   │
│  │  ├── intent: "action"                                                │   │
│  │  ├── whenToUse: [                                                    │   │
│  │  │     "User needs arithmetic calculations",                         │   │
│  │  │     "User wants unit conversions"                                 │   │
│  │  │   ]                                                               │   │
│  │  ├── whenNotToUse: [                                                 │   │
│  │  │     "Complex trigonometry - use math plugin",                     │   │
│  │  │     "Currency conversion - use currency plugin"                   │   │
│  │  │   ]                                                               │   │
│  │  └── relatedPlugins: ["statistics", "currency-converter"]           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Tool Definitions                                                    │   │
│  │  ├── tools[0]:                                                       │   │
│  │  │   ├── name: "calculate"                                           │   │
│  │  │   ├── inputSchema: { operation, a, b, precision }                │   │
│  │  │   ├── outputSchema: { result, expression }                       │   │
│  │  │   ├── examples: [                                                 │   │
│  │  │   │     { input: {op:"add",a:10,b:5}, output: {result:15} }      │   │
│  │  │   │   ]                                                           │   │
│  │  │   └── errors: [                                                   │   │
│  │  │         { code: "DIVISION_BY_ZERO", recovery: [...] }            │   │
│  │  │       ]                                                           │   │
│  │  └── tools[1]: ...                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Execution Profile                                                   │   │
│  │  ├── mode: "mcp_container"                                           │   │
│  │  ├── resources: { cpu: 100m, memory: 128MB }                        │   │
│  │  ├── performance: { p50: 5ms, p95: 15ms }                           │   │
│  │  └── cost: { perCall: 0, tier: "free" }                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Generating a PID

```typescript
import { PluginBuilder, z } from '@adverant-nexus/plugin-sdk';

const myPlugin = PluginBuilder.create({
  id: 'my-plugin',
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Does something useful',
})
  .setSemantic({
    capabilities: ['capability_a', 'capability_b'],
    domain: 'general',
    intent: 'action',
    whenToUse: ['User wants to do X'],
    whenNotToUse: ['User wants to do Y'],
  })
  .addTool({
    name: 'my_tool',
    inputSchema: z.object({ input: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    examples: [
      { name: 'Example 1', input: { input: 'hello' }, output: { result: 'world' } },
      { name: 'Example 2', input: { input: 'foo' }, output: { result: 'bar' } },
    ],
    handler: async (input) => ({ result: `processed: ${input.input}` }),
  });

// Generate PID for LLM consumption
const pid = myPlugin.generatePID();

// Export in different formats
const json = myPlugin.export('json');      // JSON (default)
const mcp = myPlugin.export('mcp');        // MCP-compatible
const markdown = myPlugin.export('markdown'); // Human-readable
const openapi = myPlugin.export('openapi');   // REST integration
```

---

## SDK Reference

### PluginBuilder API

```typescript
PluginBuilder.create(config: PluginConfig)
  .setSemantic(semantic: SemanticConfig)      // LLM decision context
  .setExecution(execution: ExecutionConfig)   // Resources and isolation
  .setContextRequirements(ctx: ContextConfig) // Permissions and services
  .setTrust(trust: TrustConfig)               // Security certifications
  .addTool(tool: ToolDefinition)              // Add tool (chainable)
  .generatePID(): PluginIntelligenceDocument  // Generate PID
  .validate(): ValidationResult               // Validate completeness
  .export(format: ExportFormat): string       // Export in format
  .buildServer(): MCPServer                   // Create MCP server
```

### Tool Definition

```typescript
interface ToolDefinition<TInput, TOutput> {
  name: string;                    // snake_case identifier
  displayName: string;             // Human-readable name
  description: string;             // Tool purpose

  inputSchema: ZodSchema<TInput>;  // Zod schema (auto-converts to JSON Schema)
  outputSchema: ZodSchema<TOutput>;

  examples: ToolExample[];         // Minimum 2 required
  errors: ErrorDocumentation[];    // Error codes and recovery

  handler: (input: TInput, context: MCPToolContext) => Promise<TOutput>;

  streaming?: { supported: boolean };
  caching?: { cacheable: boolean; ttlSeconds: number };
}
```

### MCPToolContext

Every handler receives a context object with access to Nexus services:

```typescript
interface MCPToolContext {
  logger: {
    debug(msg: string, meta?: object): void;
    info(msg: string, meta?: object): void;
    warn(msg: string, meta?: object): void;
    error(msg: string, meta?: object): void;
  };

  services: {
    graphrag: {
      storeMemory(content: string, tags?: string[]): Promise<{ id: string }>;
      recallMemory(query: string, limit?: number): Promise<MemoryResult[]>;
      storeDocument(title: string, content: string): Promise<{ id: string }>;
      searchDocuments(query: string, opts?: SearchOpts): Promise<DocResult[]>;
    };

    mageagent: {
      analyze(topic: string): Promise<{ analysis: string }>;
      orchestrate(task: string, opts?: OrchOpts): Promise<OrchResult>;
      collaborate(objective: string, agents?: AgentConfig[]): Promise<CollabResult>;
    };
  };
}
```

---

## Template Variants

| Template | Language | Use Case | Key Features |
|----------|----------|----------|--------------|
| `basic` | TypeScript | Learning, simple tools | Calculator example, full PID |
| `mcp-server` | TypeScript | Nexus service integration | GraphRAG/MageAgent access |
| `external-api` | TypeScript | External API wrappers | Caching, rate limiting |
| `python` | Python | Python developers | FastMCP, Pydantic schemas |
| `go` | Go | Performance-critical | mcp-go, low latency |

### Template Structure

```
templates/basic/
├── src/
│   ├── index.ts        # Plugin definition with PluginBuilder
│   ├── handlers.ts     # Tool handler implementations
│   └── schemas.ts      # Zod schemas for inputs/outputs
├── nexus.manifest.json # Deployment manifest
├── package.json
└── tsconfig.json
```

---

## Execution Modes

Plugins run in isolated environments with configurable security levels:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Plugin Execution Modes                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Level 1: EXTERNAL_HTTPS          Level 2: MCP_CONTAINER (Recommended)     │
│  ┌─────────────────────┐          ┌─────────────────────────────────────┐  │
│  │ External Service    │          │ Docker Container                    │  │
│  │                     │          │ ┌─────────────────────────────────┐ │  │
│  │ • Runs on your      │          │ │ • seccomp security profile      │ │  │
│  │   infrastructure    │          │ │ • Non-root user                 │ │  │
│  │ • HTTPS endpoint    │          │ │ • Resource limits enforced      │ │  │
│  │ • No isolation      │          │ │ • Nexus network access only     │ │  │
│  └─────────────────────┘          │ └─────────────────────────────────┘ │  │
│                                   └─────────────────────────────────────┘  │
│                                                                             │
│  Level 3: HARDENED_DOCKER         Level 4: FIRECRACKER                     │
│  ┌─────────────────────────┐      ┌─────────────────────────────────────┐  │
│  │ Hardened Container      │      │ MicroVM Isolation                   │  │
│  │ ┌─────────────────────┐ │      │ ┌─────────────────────────────────┐ │  │
│  │ │ • Read-only rootfs  │ │      │ │ • Full VM isolation             │ │  │
│  │ │ • Strict seccomp    │ │      │ │ • Separate kernel               │ │  │
│  │ │ • No outbound net   │ │      │ │ • ~125ms boot time              │ │  │
│  │ │ • Encrypted storage │ │      │ │ • Military/Healthcare grade     │ │  │
│  │ └─────────────────────┘ │      │ └─────────────────────────────────┘ │  │
│  └─────────────────────────┘      └─────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Resource Tiers

| Tier | Req/min | Req/day | CPU | Memory | Storage |
|------|---------|---------|-----|--------|--------|
| Free | 10 | 1,000 | 100m | 128MB | 1GB |
| Starter | 60 | 10,000 | 500m | 512MB | 10GB |
| Professional | 300 | 100,000 | 2000m | 2GB | 50GB |
| Enterprise | Unlimited | Unlimited | 8000m | 8GB | 500GB |

---

## The LLM Development Workflow

This template enables a paradigm where LLMs generate production-ready plugins from natural language requirements:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LLM Plugin Development Flow                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Define Requirements                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  "I need a plugin that queries a PostgreSQL database and returns    │   │
│  │   results as formatted tables. It should handle connection          │   │
│  │   pooling, parameterized queries, and provide query explain plans." │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  Step 2: LLM + Template Context                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LLM receives:                                                       │   │
│  │  • Your requirements                                                 │   │
│  │  • docs/CLAUDE_PROMPT.md (SDK reference)                            │   │
│  │  • templates/basic/ (structure reference)                           │   │
│  │  • This README (patterns and best practices)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  Step 3: Generated Plugin                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Complete, production-ready plugin:                                  │   │
│  │  ├── src/index.ts (PluginBuilder with semantic context)            │   │
│  │  ├── src/handlers.ts (query_database, explain_query tools)         │   │
│  │  ├── src/schemas.ts (Zod schemas with validation)                  │   │
│  │  ├── nexus.manifest.json (deployment config)                       │   │
│  │  └── PID with:                                                       │   │
│  │      ├── whenToUse: ["User needs database query results"]          │   │
│  │      ├── whenNotToUse: ["Schema modifications - use admin tool"]   │   │
│  │      ├── examples: [{ input: {...}, output: {...} }, ...]          │   │
│  │      └── errors: [{ code: "CONNECTION_FAILED", recovery: [...] }]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  Step 4: Deploy & Use                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Plugin runs as MCP server                                         │   │
│  │  • Claude/Cursor/Windsurf can discover and use tools                │   │
│  │  • PID enables accurate tool selection                               │   │
│  │  • Examples guide correct usage                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Example Prompt for LLM

```markdown
## Context
I'm building a Nexus plugin using the @adverant-nexus/plugin-sdk.

## Template Reference
Use the nexus-plugin-template structure:
- PluginBuilder.create() for plugin definition
- .setSemantic() for LLM decision context
- .addTool() with Zod schemas, examples, and error docs
- .generatePID() for intelligence document

## Requirements
[YOUR DETAILED REQUIREMENTS HERE]

## Constraints
- Minimum 2 examples per tool
- All errors must have recovery strategies
- Semantic context must include whenToUse and whenNotToUse
- Use strict TypeScript
- Follow the templates/basic/ structure

## Generate
A complete plugin with all files, ready to npm install && npm start
```

---

## Verification Checklist

Before deployment, ensure your plugin meets these requirements:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Plugin Verification Checklist                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Identity                                                                   │
│  ☐ id follows kebab-case convention (nexus-plugin-<name>)                  │
│  ☐ version follows semver (MAJOR.MINOR.PATCH)                              │
│  ☐ description is concise but informative                                  │
│                                                                             │
│  Semantic Context                                                           │
│  ☐ capabilities array is non-empty                                         │
│  ☐ whenToUse has at least 2 entries                                        │
│  ☐ whenNotToUse clarifies boundaries                                       │
│  ☐ relatedPlugins suggests alternatives                                    │
│                                                                             │
│  Tool Definitions                                                           │
│  ☐ All tools have Zod input AND output schemas                            │
│  ☐ Each tool has minimum 2 examples                                        │
│  ☐ Examples cover happy path and edge cases                                │
│  ☐ All error codes documented with recovery strategies                     │
│  ☐ Handlers use context.logger for observability                          │
│                                                                             │
│  Execution Profile                                                          │
│  ☐ Resource limits are appropriate for workload                            │
│  ☐ Timeout is set and reasonable                                           │
│  ☐ Isolation level matches security requirements                           │
│                                                                             │
│  Security                                                                   │
│  ☐ No hardcoded secrets                                                    │
│  ☐ All inputs validated via schemas                                        │
│  ☐ Permissions are minimal (no wildcards)                                  │
│  ☐ No eval() or dynamic code execution                                     │
│                                                                             │
│  Testing                                                                    │
│  ☐ Tests pass with >80% coverage                                           │
│  ☐ npm run build succeeds                                                  │
│  ☐ npm start launches MCP server                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Testing

The SDK provides testing utilities for mocking Nexus services:

```typescript
import { createTestContext, MockGraphRAGService } from '@adverant-nexus/plugin-sdk/testing';

describe('MyPlugin', () => {
  it('should search knowledge', async () => {
    // Setup mock
    const mockGraphRAG = new MockGraphRAGService();
    mockGraphRAG.addMemory('mem-1', 'TypeScript patterns', ['coding']);

    const context = createTestContext({
      graphrag: mockGraphRAG,
    });

    // Execute handler
    const result = await myPlugin.tools.my_tool.handler(
      { query: 'TypeScript' },
      context
    );

    // Assert
    expect(result.results).toHaveLength(1);
    expect(result.results[0].score).toBeGreaterThan(0.8);
  });
});
```

---

## Deployment

### MCP Configuration (Claude Code)

```json
{
  "mcpServers": {
    "my-plugin": {
      "command": "node",
      "args": ["/path/to/my-plugin/dist/index.js"],
      "env": {
        "NEXUS_API_URL": "https://api.nexus.adverant.ai"
      }
    }
  }
}
```

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
USER node
CMD ["node", "dist/index.js"]
```

### Nexus Marketplace

```bash
# Install CLI
npm install -g @adverant-nexus/cli

# Authenticate
nexus-cli login

# Register plugin
nexus-cli register

# Deploy
nexus-cli deploy --environment production
```

---

## Documentation

| Document | Purpose |
|----------|--------|
| [Getting Started](./docs/getting-started.md) | Quick start for all languages |
| [API Reference](./docs/api-reference.md) | Full SDK API documentation |
| [MCP Integration](./docs/mcp-integration.md) | Claude Code and AI IDE setup |
| [Security Guidelines](./docs/security-guidelines.md) | Security best practices |
| [Deployment Guide](./docs/deployment.md) | VPS and marketplace deployment |
| [CLAUDE_PROMPT.md](./docs/CLAUDE_PROMPT.md) | LLM context for plugin generation |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

```bash
git clone https://github.com/adverant/nexus-plugin-template.git
cd nexus-plugin-template
npm install
npm test
npm run lint
npm run build
```

---

## Security

Security vulnerabilities can be reported to security@adverant.ai or via [GitHub Security Advisory](https://github.com/adverant/nexus-plugin-template/security/advisories).

---

## License

MIT License - see [LICENSE](./LICENSE)

---

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Zod](https://zod.dev/) for schema validation
- [FastMCP](https://github.com/jlowin/fastmcp) for Python MCP support
- [mcp-go](https://github.com/mark3labs/mcp-go) for Go MCP support
