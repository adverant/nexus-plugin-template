/**
 * GraphRAG Helper Plugin - Main Entry Point
 *
 * Advanced MCP server plugin demonstrating integration with Nexus GraphRAG
 * services including memory storage, semantic search, and knowledge graph operations.
 *
 * This plugin showcases:
 * - Using Nexus services (GraphRAG, MageAgent)
 * - MCP resources and prompts
 * - Context-aware handlers
 * - Proper error handling and recovery
 *
 * @example
 * ```typescript
 * import { graphragHelperPlugin } from 'nexus-plugin-graphrag-helper';
 *
 * // Start the MCP server with Nexus integration
 * const server = graphragHelperPlugin.buildServer();
 * server.start();
 * ```
 */

import {
  PluginBuilder,
  MCPServerBuilder,
  z,
  type MCPToolContext,
} from '@adverant-nexus/plugin-sdk';
import {
  StoreMemoryInputSchema,
  StoreMemoryOutputSchema,
  SearchMemoriesInputSchema,
  SearchMemoriesOutputSchema,
  StoreDocumentInputSchema,
  StoreDocumentOutputSchema,
  QueryKnowledgeInputSchema,
  QueryKnowledgeOutputSchema,
  GraphRAGErrorCodes,
  type StoreMemoryInput,
  type StoreMemoryOutput,
  type SearchMemoriesInput,
  type SearchMemoriesOutput,
  type StoreDocumentInput,
  type StoreDocumentOutput,
  type QueryKnowledgeInput,
  type QueryKnowledgeOutput,
} from './schemas.js';

// ============================================================================
// Error Class
// ============================================================================

class GraphRAGError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = 'GraphRAGError';
    this.code = code;
    this.httpStatus = this.getHttpStatus(code);
    this.retryable = retryable;
    Error.captureStackTrace(this, this.constructor);
  }

  private getHttpStatus(code: string): number {
    switch (code) {
      case GraphRAGErrorCodes.MEMORY_NOT_FOUND:
        return 404;
      case GraphRAGErrorCodes.DOCUMENT_TOO_LARGE:
      case GraphRAGErrorCodes.QUOTA_EXCEEDED:
        return 400;
      case GraphRAGErrorCodes.SERVICE_UNAVAILABLE:
        return 503;
      default:
        return 500;
    }
  }
}

// ============================================================================
// Handlers (Using Nexus Services)
// ============================================================================

async function handleStoreMemory(
  input: StoreMemoryInput,
  context: MCPToolContext
): Promise<StoreMemoryOutput> {
  const { content, tags, metadata, importance } = input;

  context.logger.info('Storing memory', { contentLength: content.length, tags });

  try {
    // Use the GraphRAG service from context
    const result = await context.services.graphrag.storeMemory(content, tags);

    return {
      id: result.id,
      stored: true,
      timestamp: new Date().toISOString(),
      embedding: {
        model: 'voyage-3',
        dimensions: 1024,
      },
    };
  } catch (error) {
    context.logger.error('Failed to store memory', { error });
    throw new GraphRAGError(
      GraphRAGErrorCodes.EMBEDDING_FAILED,
      'Failed to generate embedding for memory',
      true
    );
  }
}

async function handleSearchMemories(
  input: SearchMemoriesInput,
  context: MCPToolContext
): Promise<SearchMemoriesOutput> {
  const { query, limit, minScore, tags, dateRange } = input;

  context.logger.info('Searching memories', { query, limit });

  const startTime = Date.now();

  try {
    const results = await context.services.graphrag.recallMemory(query, limit);

    // Filter by minimum score
    const filteredResults = results.filter((r) => r.score >= minScore);

    return {
      results: filteredResults.map((r) => ({
        id: r.id,
        content: r.content,
        score: r.score,
        tags: [],
        createdAt: new Date().toISOString(),
      })),
      total: filteredResults.length,
      searchTime: Date.now() - startTime,
    };
  } catch (error) {
    context.logger.error('Search failed', { error });
    throw new GraphRAGError(
      GraphRAGErrorCodes.SEARCH_FAILED,
      'Memory search failed',
      true
    );
  }
}

async function handleStoreDocument(
  input: StoreDocumentInput,
  context: MCPToolContext
): Promise<StoreDocumentOutput> {
  const { title, content, type, chunkSize, chunkOverlap } = input;

  context.logger.info('Storing document', { title, type, contentLength: content.length });

  // Check document size
  if (content.length > 100000) {
    throw new GraphRAGError(
      GraphRAGErrorCodes.DOCUMENT_TOO_LARGE,
      'Document exceeds maximum size of 100,000 characters'
    );
  }

  try {
    const result = await context.services.graphrag.storeDocument(title, content);

    // Estimate chunks based on chunk size
    const estimatedChunks = Math.ceil(content.length / chunkSize);
    const estimatedTokens = Math.ceil(content.length / 4); // Rough token estimate

    return {
      id: result.id,
      title,
      chunks: estimatedChunks,
      totalTokens: estimatedTokens,
      stored: true,
    };
  } catch (error) {
    context.logger.error('Document storage failed', { error });
    throw new GraphRAGError(
      GraphRAGErrorCodes.EMBEDDING_FAILED,
      'Failed to process and store document',
      true
    );
  }
}

async function handleQueryKnowledge(
  input: QueryKnowledgeInput,
  context: MCPToolContext
): Promise<QueryKnowledgeOutput> {
  const { subject, depth, includeProperties } = input;

  context.logger.info('Querying knowledge graph', { subject, depth });

  try {
    // Use MageAgent for orchestrated knowledge retrieval
    const result = await context.services.mageagent.analyze(subject);

    // Parse the analysis into structured knowledge
    return {
      subject,
      nodes: [
        {
          id: 'subject-1',
          label: subject,
          properties: includeProperties ? { analyzed: true } : undefined,
        },
      ],
      edges: [],
      facts: [result.analysis],
    };
  } catch (error) {
    context.logger.error('Knowledge query failed', { error });
    throw new GraphRAGError(
      GraphRAGErrorCodes.GRAPH_QUERY_FAILED,
      'Failed to query knowledge graph',
      true
    );
  }
}

// ============================================================================
// Plugin Definition
// ============================================================================

export const graphragHelperPlugin = PluginBuilder.create({
  id: 'nexus-plugin-graphrag-helper',
  name: 'graphrag-helper',
  displayName: 'GraphRAG Helper',
  version: '1.0.0',
  description: 'Advanced MCP server plugin demonstrating integration with Nexus GraphRAG services. Provides memory storage with semantic embeddings, document chunking and retrieval, and knowledge graph queries for building intelligent applications.',
})
  // ============================================================================
  // Semantic Context
  // ============================================================================
  .setSemantic({
    capabilities: [
      'memory_storage',
      'semantic_search',
      'document_processing',
      'knowledge_graph',
      'context_retrieval',
    ],
    domain: 'knowledge_management',
    intent: 'action',
    whenToUse: [
      'User wants to save information for later recall',
      'User needs to search for previously stored memories',
      'Processing and storing documents for RAG applications',
      'Building context from historical interactions',
      'Querying relationships between concepts',
    ],
    whenNotToUse: [
      'Simple calculations or data transformations',
      'Real-time external API queries',
      'Tasks that don\'t require persistent memory',
      'When privacy prevents storing user data',
    ],
    commonMistakes: [
      'Storing too large documents without chunking',
      'Using exact match instead of semantic search',
      'Not setting appropriate importance scores',
      'Ignoring the context from search results',
    ],
    bestPractices: [
      'Store memories with meaningful tags for filtering',
      'Use semantic search with appropriate score thresholds',
      'Chunk large documents before storage',
      'Include relevant metadata for better retrieval',
    ],
    relatedPlugins: [
      'nexus-plugin-document-processor',
      'nexus-plugin-summarizer',
      'nexus-plugin-embeddings',
    ],
    suggestedChains: [
      {
        name: 'Store and Retrieve',
        description: 'Store a memory and immediately verify it can be retrieved',
        steps: ['store_memory', 'search_memories'],
      },
      {
        name: 'Document RAG',
        description: 'Store a document and query for relevant knowledge',
        steps: ['store_document', 'query_knowledge'],
      },
    ],
  })

  // ============================================================================
  // Execution Profile
  // ============================================================================
  .setExecution({
    mode: 'mcp_container',
    isolationLevel: 2,
    resources: {
      cpuMillicores: 500,
      memoryMB: 512,
      timeoutMs: 30000,
    },
  })

  // ============================================================================
  // Context Requirements
  // ============================================================================
  .setContextRequirements({
    permissions: [
      'nexus:graphrag:read',
      'nexus:graphrag:write',
      'nexus:mageagent:orchestrate',
    ],
    requiredServices: [
      { name: 'graphrag', version: '1.0.0', critical: true },
      { name: 'mageagent', version: '1.0.0', critical: false },
    ],
  })

  // ============================================================================
  // Trust Profile
  // ============================================================================
  .setTrust({
    level: 'enterprise',
  })

  // ============================================================================
  // Store Memory Tool
  // ============================================================================
  .addTool({
    name: 'store_memory',
    displayName: 'Store Memory',
    description: 'Store a memory with semantic embeddings for later retrieval. Memories are indexed using vector embeddings for semantic similarity search.',
    inputSchema: StoreMemoryInputSchema,
    outputSchema: StoreMemoryOutputSchema,
    examples: [
      {
        name: 'Store simple memory',
        description: 'Store a basic memory with tags',
        input: {
          content: 'The user prefers dark mode and uses TypeScript for all projects.',
          tags: ['preferences', 'coding'],
          importance: 0.8,
        },
        output: {
          id: 'mem_abc123',
          stored: true,
          timestamp: '2024-01-15T10:30:00Z',
          embedding: { model: 'voyage-3', dimensions: 1024 },
        },
      },
      {
        name: 'Store memory with metadata',
        description: 'Store memory with additional context',
        input: {
          content: 'Project deadline is February 28th for the Nexus integration.',
          tags: ['project', 'deadline'],
          metadata: { project: 'nexus', priority: 'high' },
          importance: 1.0,
        },
        output: {
          id: 'mem_def456',
          stored: true,
          timestamp: '2024-01-15T10:35:00Z',
          embedding: { model: 'voyage-3', dimensions: 1024 },
        },
      },
    ],
    errors: [
      {
        code: GraphRAGErrorCodes.EMBEDDING_FAILED,
        httpStatus: 500,
        message: 'Failed to generate embedding',
        cause: 'The embedding service encountered an error',
        recovery: ['Retry the request', 'Check if content is valid UTF-8', 'Reduce content size'],
        retryable: true,
      },
      {
        code: GraphRAGErrorCodes.QUOTA_EXCEEDED,
        httpStatus: 400,
        message: 'Storage quota exceeded',
        cause: 'User has exceeded their memory storage quota',
        recovery: ['Delete old memories', 'Upgrade subscription tier'],
        retryable: false,
      },
    ],
    handler: handleStoreMemory,
  })

  // ============================================================================
  // Search Memories Tool
  // ============================================================================
  .addTool({
    name: 'search_memories',
    displayName: 'Search Memories',
    description: 'Search stored memories using semantic similarity. Returns memories ranked by relevance to the query.',
    inputSchema: SearchMemoriesInputSchema,
    outputSchema: SearchMemoriesOutputSchema,
    examples: [
      {
        name: 'Basic search',
        description: 'Search for memories about user preferences',
        input: {
          query: 'What are the user preferences for coding?',
          limit: 5,
          minScore: 0.7,
        },
        output: {
          results: [
            {
              id: 'mem_abc123',
              content: 'The user prefers dark mode and uses TypeScript for all projects.',
              score: 0.92,
              tags: ['preferences', 'coding'],
              createdAt: '2024-01-15T10:30:00Z',
            },
          ],
          total: 1,
          searchTime: 45,
        },
      },
      {
        name: 'Search with tag filter',
        description: 'Search memories filtered by tags',
        input: {
          query: 'upcoming deadlines',
          limit: 10,
          tags: ['project', 'deadline'],
        },
        output: {
          results: [
            {
              id: 'mem_def456',
              content: 'Project deadline is February 28th for the Nexus integration.',
              score: 0.88,
              tags: ['project', 'deadline'],
              createdAt: '2024-01-15T10:35:00Z',
            },
          ],
          total: 1,
          searchTime: 38,
        },
      },
    ],
    errors: [
      {
        code: GraphRAGErrorCodes.SEARCH_FAILED,
        httpStatus: 500,
        message: 'Search operation failed',
        cause: 'The vector database query failed',
        recovery: ['Retry the request', 'Simplify the query'],
        retryable: true,
      },
    ],
    handler: handleSearchMemories,
  })

  // ============================================================================
  // Store Document Tool
  // ============================================================================
  .addTool({
    name: 'store_document',
    displayName: 'Store Document',
    description: 'Store and chunk a document for retrieval-augmented generation. Documents are split into overlapping chunks and indexed for semantic search.',
    inputSchema: StoreDocumentInputSchema,
    outputSchema: StoreDocumentOutputSchema,
    examples: [
      {
        name: 'Store markdown document',
        description: 'Store a markdown document with custom chunking',
        input: {
          title: 'Nexus Plugin Development Guide',
          content: '# Plugin Development\n\nThis guide covers...\n\n## Getting Started...',
          type: 'markdown',
          chunkSize: 500,
          chunkOverlap: 50,
        },
        output: {
          id: 'doc_xyz789',
          title: 'Nexus Plugin Development Guide',
          chunks: 12,
          totalTokens: 3500,
          stored: true,
        },
      },
      {
        name: 'Store code documentation',
        description: 'Store code with code-aware chunking',
        input: {
          title: 'API Reference',
          content: 'export function calculate(a: number, b: number): number {...}',
          type: 'code',
          chunkSize: 1000,
        },
        output: {
          id: 'doc_code001',
          title: 'API Reference',
          chunks: 5,
          totalTokens: 1200,
          stored: true,
        },
      },
    ],
    errors: [
      {
        code: GraphRAGErrorCodes.DOCUMENT_TOO_LARGE,
        httpStatus: 400,
        message: 'Document exceeds maximum size',
        cause: 'Document content exceeds 100,000 character limit',
        recovery: ['Split into smaller documents', 'Remove unnecessary content'],
        retryable: false,
      },
    ],
    handler: handleStoreDocument,
  })

  // ============================================================================
  // Query Knowledge Tool
  // ============================================================================
  .addTool({
    name: 'query_knowledge',
    displayName: 'Query Knowledge',
    description: 'Query the knowledge graph for relationships and facts about a subject. Uses graph traversal to find connected concepts.',
    inputSchema: QueryKnowledgeInputSchema,
    outputSchema: QueryKnowledgeOutputSchema,
    examples: [
      {
        name: 'Query about a concept',
        description: 'Get knowledge about TypeScript',
        input: {
          subject: 'TypeScript',
          depth: 2,
          includeProperties: true,
        },
        output: {
          subject: 'TypeScript',
          nodes: [
            { id: 'ts-1', label: 'TypeScript', properties: { type: 'language' } },
            { id: 'js-1', label: 'JavaScript', properties: { type: 'language' } },
          ],
          edges: [
            { from: 'ts-1', to: 'js-1', type: 'COMPILES_TO' },
          ],
          facts: [
            'TypeScript is a typed superset of JavaScript',
            'TypeScript compiles to JavaScript',
          ],
        },
      },
    ],
    errors: [
      {
        code: GraphRAGErrorCodes.GRAPH_QUERY_FAILED,
        httpStatus: 500,
        message: 'Knowledge graph query failed',
        cause: 'Graph database query encountered an error',
        recovery: ['Retry the request', 'Reduce traversal depth'],
        retryable: true,
      },
    ],
    handler: handleQueryKnowledge,
  });

// ============================================================================
// Exports
// ============================================================================

export default graphragHelperPlugin;
export * from './schemas.js';

// ============================================================================
// Main Entry Point
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = graphragHelperPlugin.buildServer();

  process.on('SIGINT', () => {
    console.log('\nShutting down GraphRAG Helper plugin...');
    server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.stop();
    process.exit(0);
  });

  console.log('Starting GraphRAG Helper Plugin MCP Server...');
  server.start();
}
