# Nexus Plugin SDK - API Reference

Complete API documentation for the Nexus Plugin SDK.

## Table of Contents

- [PluginBuilder](#pluginbuilder)
- [MCPServerBuilder](#mcpserverbuilder)
- [Schema Utilities](#schema-utilities)
- [Testing Utilities](#testing-utilities)
- [Types](#types)

---

## PluginBuilder

Main entry point for creating plugins.

### `PluginBuilder.create(config)`

Creates a new PluginBuilder instance.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `config.id` | `string` | Yes | Unique plugin identifier (kebab-case) |
| `config.name` | `string` | Yes | Short plugin name |
| `config.displayName` | `string` | Yes | Human-readable name |
| `config.version` | `string` | Yes | Semver version |
| `config.description` | `string` | Yes | Plugin description |

**Returns:** `PluginBuilder`

**Example:**

```typescript
const plugin = PluginBuilder.create({
  id: 'nexus-plugin-example',
  name: 'example',
  displayName: 'Example Plugin',
  version: '1.0.0',
  description: 'An example plugin',
});
```

---

### `.setSemantic(semantic)`

Sets semantic context for LLM decision making.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `semantic.capabilities` | `string[]` | Yes | Capability tags |
| `semantic.domain` | `string` | Yes | Domain category |
| `semantic.intent` | `'query' \| 'action' \| 'transform' \| 'generate'` | Yes | Tool intent |
| `semantic.whenToUse` | `string[]` | Yes | When to use this plugin |
| `semantic.whenNotToUse` | `string[]` | Yes | When NOT to use |
| `semantic.commonMistakes` | `string[]` | No | Common mistakes |
| `semantic.bestPractices` | `string[]` | No | Best practices |
| `semantic.relatedPlugins` | `string[]` | No | Related plugin IDs |
| `semantic.suggestedChains` | `SuggestedChain[]` | No | Tool chain suggestions |

**Returns:** `this` (chainable)

---

### `.setExecution(execution)`

Sets execution profile and resources.

**Parameters:**

| Name | Type | Required | Default |
|------|------|----------|--------|
| `execution.mode` | `ExecutionMode` | Yes | - |
| `execution.isolationLevel` | `1 \| 2 \| 3 \| 4` | No | Based on mode |
| `execution.resources.cpuMillicores` | `number` | No | 500 |
| `execution.resources.memoryMB` | `number` | No | 512 |
| `execution.resources.timeoutMs` | `number` | No | 30000 |

**Execution Modes:**

| Mode | Isolation | Use Case |
|------|-----------|----------|
| `external_https` | 1 | External API integration |
| `mcp_container` | 2 | Standard plugins |
| `hardened_docker` | 3 | Sensitive data |
| `firecracker` | 4 | Untrusted code |

---

### `.setContextRequirements(requirements)`

Sets permissions and service dependencies.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `requirements.permissions` | `string[]` | Required Nexus permissions |
| `requirements.requiredServices` | `ServiceRequirement[]` | Required services |
| `requirements.environmentVariables` | `EnvVarRequirement[]` | Environment variables |
| `requirements.credentials` | `CredentialRequirement[]` | External credentials |

**Common Permissions:**

| Permission | Description |
|------------|-------------|
| `nexus:graphrag:read` | Read from GraphRAG |
| `nexus:graphrag:write` | Write to GraphRAG |
| `nexus:mageagent:orchestrate` | Use MageAgent |
| `network:outbound:*` | Outbound network access |

---

### `.setTrust(trust)`

Sets trust profile.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `trust.level` | `TrustLevel` | Trust level |
| `trust.certifications` | `string[]` | Certifications (SOC2, GDPR, etc.) |

**Trust Levels:**

| Level | Description |
|-------|-------------|
| `unverified` | Not verified |
| `community` | Auto-scanned |
| `enterprise` | Manual review |
| `verified_publisher` | Trusted publisher |
| `nexus_official` | Official Nexus plugin |

---

### `.addTool(definition)`

Adds a tool to the plugin.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `definition.name` | `string` | Yes | Tool name (snake_case) |
| `definition.displayName` | `string` | Yes | Human-readable name |
| `definition.description` | `string` | Yes | Tool description |
| `definition.inputSchema` | `ZodSchema` | Yes | Zod input schema |
| `definition.outputSchema` | `ZodSchema` | Yes | Zod output schema |
| `definition.examples` | `Example[]` | Yes | At least 2 examples |
| `definition.errors` | `ErrorDoc[]` | No | Error documentation |
| `definition.handler` | `Handler` | Yes | Implementation function |

**Returns:** `this` (chainable)

---

### `.generatePID()`

Generates a Plugin Intelligence Document.

**Returns:** `PluginIntelligenceDocument`

---

### `.validate()`

Validates the plugin configuration.

**Returns:** `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  path?: string;
}
```

---

### `.export(format)`

Exports the plugin in various formats.

**Parameters:**

| Format | Description |
|--------|-------------|
| `json` | JSON (default) |
| `mcp` | MCP-compatible |
| `markdown` | Human-readable |
| `openapi` | OpenAPI spec |

**Returns:** `string`

---

### `.buildServer()`

Builds an MCP server from the plugin.

**Returns:** `MCPServer`

---

## MCPServerBuilder

Lower-level API for building MCP servers directly.

### `MCPServerBuilder.create(config)`

**Parameters:**

| Name | Type | Required |
|------|------|----------|
| `config.name` | `string` | Yes |
| `config.version` | `string` | Yes |
| `config.description` | `string` | No |

---

### `.addTool(tool)`

Adds a tool to the MCP server.

---

### `.addResource(resource)`

Adds a resource to the MCP server.

---

### `.addPrompt(prompt)`

Adds a prompt template to the MCP server.

---

### `.build()`

Builds and returns the MCP server.

**Returns:** `MCPServer`

---

## MCPServer

### `.start()`

Starts the MCP server (stdio transport).

### `.stop()`

Stops the MCP server.

---

## Schema Utilities

### `zodToJSONSchema(schema)`

Converts a Zod schema to JSON Schema.

```typescript
import { z, zodToJSONSchema } from '@adverant-nexus/plugin-sdk';

const mySchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().int().default(10),
});

const jsonSchema = zodToJSONSchema(mySchema);
```

---

## Testing Utilities

### `createTestContext(options)`

Creates a mock context for testing.

```typescript
import { createTestContext, MockGraphRAGService } from '@adverant-nexus/plugin-sdk/testing';

const context = createTestContext({
  graphrag: new MockGraphRAGService(),
  mageagent: new MockMageAgentService(),
});
```

---

### `MockGraphRAGService`

Mock GraphRAG service for testing.

**Methods:**

| Method | Description |
|--------|-------------|
| `addMemory(id, content, tags)` | Add mock memory |
| `addDocument(id, title, content)` | Add mock document |
| `setSearchResults(results)` | Set mock search results |
| `clear()` | Clear all mock data |

---

### `MockMageAgentService`

Mock MageAgent service for testing.

**Methods:**

| Method | Description |
|--------|-------------|
| `setAnalysisResult(result)` | Set mock analysis result |
| `setOrchestrationResult(result)` | Set mock orchestration result |

---

### `PluginTestRunner`

Runs validation tests against a plugin.

```typescript
import { PluginTestRunner } from '@adverant-nexus/plugin-sdk/testing';

const runner = new PluginTestRunner(plugin.generatePID());
const results = await runner.runAllTests();

console.log(results.passed, results.failed);
```

---

## Types

### `MCPToolContext`

```typescript
interface MCPToolContext {
  logger: MCPLogger;
  services: {
    graphrag: GraphRAGService;
    mageagent: MageAgentService;
  };
}
```

### `MCPLogger`

```typescript
interface MCPLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
```

### `GraphRAGService`

```typescript
interface GraphRAGService {
  storeMemory(content: string, tags?: string[]): Promise<{ id: string }>;
  recallMemory(query: string, limit?: number): Promise<MemoryResult[]>;
  storeDocument(title: string, content: string): Promise<{ id: string }>;
  searchDocuments(query: string, options?: SearchOptions): Promise<DocumentResult[]>;
}
```

### `MageAgentService`

```typescript
interface MageAgentService {
  analyze(topic: string): Promise<{ analysis: string }>;
  orchestrate(task: string, options?: OrchestrationOptions): Promise<OrchestrationResult>;
  collaborate(objective: string, agents?: AgentConfig[]): Promise<CollaborationResult>;
}
```

### `PluginIntelligenceDocument`

```typescript
interface PluginIntelligenceDocument {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  semantic: SemanticContext;
  tools: ToolIntelligence[];
  execution: ExecutionProfile;
  contextRequirements: ContextRequirements;
  compatibility: Compatibility;
  trust: TrustProfile;
  _metadata: PIDocMetadata;
}
```
