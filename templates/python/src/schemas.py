"""Pydantic schemas for plugin inputs and outputs.

These schemas define the structure and validation for all tool
inputs and outputs. They are automatically converted to JSON Schema
for the Plugin Intelligence Document.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ============================================================================
# Enums
# ============================================================================


class ImportanceLevel(str, Enum):
    """Importance level for memories."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCode(str, Enum):
    """Error codes for plugin operations."""

    NOT_FOUND = "NOT_FOUND"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    SERVICE_ERROR = "SERVICE_ERROR"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    UNAUTHORIZED = "UNAUTHORIZED"


# ============================================================================
# Search Knowledge Schemas
# ============================================================================


class SearchKnowledgeInput(BaseModel):
    """Input schema for search_knowledge tool."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Search query for finding relevant knowledge",
    )
    limit: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Maximum number of results to return",
    )
    min_score: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Minimum similarity score threshold (0-1)",
    )
    tags: Optional[list[str]] = Field(
        default=None,
        description="Optional tags to filter results",
    )


class SearchResult(BaseModel):
    """A single search result."""

    id: str = Field(..., description="Unique identifier for the result")
    content: str = Field(..., description="The matched content")
    score: float = Field(..., ge=0, le=1, description="Similarity score")
    tags: list[str] = Field(default_factory=list, description="Associated tags")
    created_at: datetime = Field(..., description="When this was created")
    metadata: Optional[dict] = Field(default=None, description="Additional metadata")


class SearchKnowledgeOutput(BaseModel):
    """Output schema for search_knowledge tool."""

    results: list[SearchResult] = Field(..., description="List of search results")
    total: int = Field(..., ge=0, description="Total number of matches")
    query: str = Field(..., description="The original query")
    search_time_ms: int = Field(..., ge=0, description="Search duration in milliseconds")


# ============================================================================
# Store Memory Schemas
# ============================================================================


class StoreMemoryInput(BaseModel):
    """Input schema for store_memory tool."""

    content: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="The memory content to store",
    )
    tags: list[str] = Field(
        default_factory=list,
        max_length=10,
        description="Tags for categorizing the memory",
    )
    importance: ImportanceLevel = Field(
        default=ImportanceLevel.MEDIUM,
        description="Importance level of the memory",
    )
    metadata: Optional[dict] = Field(
        default=None,
        description="Optional metadata to store with the memory",
    )


class EmbeddingInfo(BaseModel):
    """Information about the embedding."""

    model: str = Field(..., description="Embedding model used")
    dimensions: int = Field(..., description="Vector dimensions")


class StoreMemoryOutput(BaseModel):
    """Output schema for store_memory tool."""

    id: str = Field(..., description="Unique identifier for the stored memory")
    stored: bool = Field(..., description="Whether the memory was successfully stored")
    timestamp: datetime = Field(..., description="When the memory was stored")
    embedding: EmbeddingInfo = Field(..., description="Embedding information")


# ============================================================================
# Error Schemas
# ============================================================================


class PluginError(BaseModel):
    """Standard error response."""

    code: ErrorCode = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(default=None, description="Additional error details")
    retryable: bool = Field(default=False, description="Whether the operation can be retried")
