# MCP Server Template - GraphRAG Helper

An advanced MCP server plugin demonstrating integration with Nexus GraphRAG services. This template showcases how to build plugins that leverage Nexus's memory storage, semantic search, and knowledge graph capabilities.

## Features

- **Memory Storage**: Store memories with semantic embeddings using VoyageAI
- **Semantic Search**: Search memories using vector similarity with Qdrant
- **Document Processing**: Chunk and store documents for RAG applications
- **Knowledge Graph**: Query relationships between concepts using Neo4j
- **Context-Aware Handlers**: Access Nexus services through `MCPToolContext`

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Start MCP server
npm start

# Development mode
npm run dev
```

## Project Structure

```
src/
├── index.ts      # Plugin definition with Nexus service integration
└── schemas.ts    # Zod schemas for all operations
```

## Using Nexus Services

This template demonstrates how to use Nexus services through the `MCPToolContext`:

```typescript
async function handleStoreMemory(
  input: StoreMemoryInput,
  context: MCPToolContext
): Promise<StoreMemoryOutput> {
  // Access GraphRAG service
  const result = await context.services.graphrag.storeMemory(
    input.content,
    input.tags
  );

  // Log operations
  context.logger.info('Memory stored', { id: result.id });

  return { id: result.id, stored: true };
}
```

## Available Tools

### store_memory

Store a memory with semantic embeddings.

```typescript
await store_memory({
  content: 'User prefers TypeScript for all projects',
  tags: ['preferences', 'coding'],
  importance: 0.8,
});
```

### search_memories

Search memories using semantic similarity.

```typescript
await search_memories({
  query: 'What are the coding preferences?',
  limit: 5,
  minScore: 0.7,
});
```

### store_document

Store and chunk a document for RAG.

```typescript
await store_document({
  title: 'Development Guide',
  content: '# Getting Started\n\n...',
  type: 'markdown',
  chunkSize: 500,
});
```

### query_knowledge

Query the knowledge graph.

```typescript
await query_knowledge({
  subject: 'TypeScript',
  depth: 2,
  includeProperties: true,
});
```

## Required Permissions

This plugin requires the following Nexus permissions:

- `nexus:graphrag:read` - Read from memory and document stores
- `nexus:graphrag:write` - Write to memory and document stores
- `nexus:mageagent:orchestrate` - Use MageAgent for analysis

## Configuration

Update `nexus.manifest.json` to configure:

- Resource limits (CPU, memory, timeout)
- Required permissions
- MCP tools, resources, and prompts
- Test configuration

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Validate plugin
npm run validate
```

## License

MIT
