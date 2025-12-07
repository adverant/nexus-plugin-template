/**
 * GraphRAG Helper Plugin - Schemas
 *
 * Zod schemas for GraphRAG operations with automatic JSON Schema generation.
 */

import { z } from 'zod';

// ============================================================================
// Store Memory Tool Schemas
// ============================================================================

export const StoreMemoryInputSchema = z.object({
  content: z.string().min(1).max(10000).describe('The memory content to store'),
  tags: z.array(z.string()).max(10).optional().describe('Tags for categorization'),
  metadata: z.record(z.any()).optional().describe('Additional metadata'),
  importance: z.number().min(0).max(1).default(0.5).describe('Importance score (0-1)'),
});
export type StoreMemoryInput = z.infer<typeof StoreMemoryInputSchema>;

export const StoreMemoryOutputSchema = z.object({
  id: z.string().describe('Unique memory ID'),
  stored: z.boolean().describe('Whether storage was successful'),
  timestamp: z.string().datetime().describe('Storage timestamp'),
  embedding: z.object({
    model: z.string().describe('Embedding model used'),
    dimensions: z.number().int().describe('Vector dimensions'),
  }).describe('Embedding information'),
});
export type StoreMemoryOutput = z.infer<typeof StoreMemoryOutputSchema>;

// ============================================================================
// Search Memories Tool Schemas
// ============================================================================

export const SearchMemoriesInputSchema = z.object({
  query: z.string().min(1).max(500).describe('Search query for semantic matching'),
  limit: z.number().int().min(1).max(50).default(10).describe('Maximum results to return'),
  minScore: z.number().min(0).max(1).default(0.5).describe('Minimum similarity score'),
  tags: z.array(z.string()).optional().describe('Filter by tags'),
  dateRange: z.object({
    start: z.string().datetime().optional().describe('Start date filter'),
    end: z.string().datetime().optional().describe('End date filter'),
  }).optional().describe('Date range filter'),
});
export type SearchMemoriesInput = z.infer<typeof SearchMemoriesInputSchema>;

export const MemoryResultSchema = z.object({
  id: z.string().describe('Memory ID'),
  content: z.string().describe('Memory content'),
  score: z.number().describe('Similarity score'),
  tags: z.array(z.string()).optional().describe('Memory tags'),
  createdAt: z.string().datetime().describe('Creation timestamp'),
});

export const SearchMemoriesOutputSchema = z.object({
  results: z.array(MemoryResultSchema).describe('Search results'),
  total: z.number().int().describe('Total matching memories'),
  searchTime: z.number().describe('Search time in milliseconds'),
});
export type SearchMemoriesOutput = z.infer<typeof SearchMemoriesOutputSchema>;

// ============================================================================
// Store Document Tool Schemas
// ============================================================================

export const StoreDocumentInputSchema = z.object({
  title: z.string().min(1).max(200).describe('Document title'),
  content: z.string().min(1).max(100000).describe('Document content'),
  type: z.enum(['text', 'markdown', 'code', 'structured']).default('text').describe('Document type'),
  metadata: z.record(z.any()).optional().describe('Additional metadata'),
  chunkSize: z.number().int().min(100).max(2000).default(500).describe('Chunk size for splitting'),
  chunkOverlap: z.number().int().min(0).max(500).default(50).describe('Overlap between chunks'),
});
export type StoreDocumentInput = z.infer<typeof StoreDocumentInputSchema>;

export const StoreDocumentOutputSchema = z.object({
  id: z.string().describe('Document ID'),
  title: z.string().describe('Document title'),
  chunks: z.number().int().describe('Number of chunks created'),
  totalTokens: z.number().int().describe('Estimated total tokens'),
  stored: z.boolean().describe('Whether storage was successful'),
});
export type StoreDocumentOutput = z.infer<typeof StoreDocumentOutputSchema>;

// ============================================================================
// Query Knowledge Tool Schemas
// ============================================================================

export const QueryKnowledgeInputSchema = z.object({
  subject: z.string().min(1).describe('Subject to query about'),
  relationTypes: z.array(z.string()).optional().describe('Filter by relation types'),
  depth: z.number().int().min(1).max(5).default(2).describe('Graph traversal depth'),
  includeProperties: z.boolean().default(true).describe('Include node properties'),
});
export type QueryKnowledgeInput = z.infer<typeof QueryKnowledgeInputSchema>;

export const KnowledgeNodeSchema = z.object({
  id: z.string().describe('Node ID'),
  label: z.string().describe('Node label/type'),
  properties: z.record(z.any()).optional().describe('Node properties'),
});

export const KnowledgeEdgeSchema = z.object({
  from: z.string().describe('Source node ID'),
  to: z.string().describe('Target node ID'),
  type: z.string().describe('Relationship type'),
  properties: z.record(z.any()).optional().describe('Edge properties'),
});

export const QueryKnowledgeOutputSchema = z.object({
  subject: z.string().describe('Queried subject'),
  nodes: z.array(KnowledgeNodeSchema).describe('Related nodes'),
  edges: z.array(KnowledgeEdgeSchema).describe('Relationships'),
  facts: z.array(z.string()).describe('Extracted facts'),
});
export type QueryKnowledgeOutput = z.infer<typeof QueryKnowledgeOutputSchema>;

// ============================================================================
// Error Types
// ============================================================================

export const GraphRAGErrorCodes = {
  MEMORY_NOT_FOUND: 'MEMORY_NOT_FOUND',
  DOCUMENT_TOO_LARGE: 'DOCUMENT_TOO_LARGE',
  EMBEDDING_FAILED: 'EMBEDDING_FAILED',
  SEARCH_FAILED: 'SEARCH_FAILED',
  GRAPH_QUERY_FAILED: 'GRAPH_QUERY_FAILED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
} as const;

export type GraphRAGErrorCode = keyof typeof GraphRAGErrorCodes;
