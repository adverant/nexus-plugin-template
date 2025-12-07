"""Tool handlers implementing the business logic.

Each handler receives validated input and context,
performs the operation, and returns validated output.
"""

import time
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import structlog

from .schemas import (
    EmbeddingInfo,
    ErrorCode,
    ImportanceLevel,
    PluginError,
    SearchKnowledgeInput,
    SearchKnowledgeOutput,
    SearchResult,
    StoreMemoryInput,
    StoreMemoryOutput,
)

logger = structlog.get_logger()


# ============================================================================
# Context Interface
# ============================================================================


class PluginContext:
    """Context provided to handlers with services and utilities."""

    def __init__(self, services: dict[str, Any] | None = None) -> None:
        self.services = services or {}
        self.logger = logger

    @property
    def graphrag(self) -> Any:
        """Access the GraphRAG service."""
        return self.services.get("graphrag")

    @property
    def mageagent(self) -> Any:
        """Access the MageAgent service."""
        return self.services.get("mageagent")


# ============================================================================
# Custom Exceptions
# ============================================================================


class PluginException(Exception):
    """Base exception for plugin errors."""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: dict | None = None,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details
        self.retryable = retryable

    def to_error(self) -> PluginError:
        """Convert to PluginError schema."""
        return PluginError(
            code=self.code,
            message=self.message,
            details=self.details,
            retryable=self.retryable,
        )


# ============================================================================
# Handlers
# ============================================================================


async def handle_search_knowledge(
    input_data: SearchKnowledgeInput,
    context: PluginContext,
) -> SearchKnowledgeOutput:
    """Search the knowledge base for relevant information.

    Args:
        input_data: Validated search parameters
        context: Plugin context with services

    Returns:
        Search results with relevance scores

    Raises:
        PluginException: If the search fails
    """
    context.logger.info(
        "Searching knowledge base",
        query=input_data.query[:50],
        limit=input_data.limit,
    )

    start_time = time.monotonic()

    try:
        # Use GraphRAG service if available
        if context.graphrag:
            results = await context.graphrag.search(
                query=input_data.query,
                limit=input_data.limit,
                min_score=input_data.min_score,
                tags=input_data.tags,
            )
        else:
            # Mock results for testing without services
            results = [
                SearchResult(
                    id=str(uuid4()),
                    content=f"Mock result for: {input_data.query}",
                    score=0.85,
                    tags=["mock"],
                    created_at=datetime.now(timezone.utc),
                    metadata={"source": "mock"},
                )
            ]

        search_time_ms = int((time.monotonic() - start_time) * 1000)

        context.logger.info(
            "Search completed",
            result_count=len(results),
            search_time_ms=search_time_ms,
        )

        return SearchKnowledgeOutput(
            results=results,
            total=len(results),
            query=input_data.query,
            search_time_ms=search_time_ms,
        )

    except Exception as e:
        context.logger.error("Search failed", error=str(e))
        raise PluginException(
            code=ErrorCode.SERVICE_ERROR,
            message=f"Search operation failed: {e}",
            retryable=True,
        ) from e


async def handle_store_memory(
    input_data: StoreMemoryInput,
    context: PluginContext,
) -> StoreMemoryOutput:
    """Store a memory for later retrieval.

    Args:
        input_data: Memory content and metadata
        context: Plugin context with services

    Returns:
        Storage confirmation with ID

    Raises:
        PluginException: If storage fails
    """
    context.logger.info(
        "Storing memory",
        content_length=len(input_data.content),
        tags=input_data.tags,
        importance=input_data.importance,
    )

    try:
        # Use GraphRAG service if available
        if context.graphrag:
            result = await context.graphrag.store_memory(
                content=input_data.content,
                tags=input_data.tags,
                metadata={
                    "importance": input_data.importance.value,
                    **(input_data.metadata or {}),
                },
            )
            memory_id = result.id
        else:
            # Mock storage for testing
            memory_id = str(uuid4())

        context.logger.info("Memory stored", memory_id=memory_id)

        return StoreMemoryOutput(
            id=memory_id,
            stored=True,
            timestamp=datetime.now(timezone.utc),
            embedding=EmbeddingInfo(
                model="voyage-3",
                dimensions=1024,
            ),
        )

    except Exception as e:
        context.logger.error("Storage failed", error=str(e))
        raise PluginException(
            code=ErrorCode.SERVICE_ERROR,
            message=f"Failed to store memory: {e}",
            retryable=True,
        ) from e
