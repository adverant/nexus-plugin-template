"""Tests for plugin handlers."""

import pytest
from datetime import datetime, timezone

from src.handlers import (
    PluginContext,
    handle_search_knowledge,
    handle_store_memory,
)
from src.schemas import (
    ImportanceLevel,
    SearchKnowledgeInput,
    StoreMemoryInput,
)


@pytest.fixture
def context() -> PluginContext:
    """Create a test context."""
    return PluginContext()


class TestSearchKnowledge:
    """Tests for search_knowledge handler."""

    async def test_basic_search(self, context: PluginContext) -> None:
        """Test basic search returns results."""
        input_data = SearchKnowledgeInput(
            query="test query",
            limit=5,
        )

        result = await handle_search_knowledge(input_data, context)

        assert result.query == "test query"
        assert len(result.results) > 0
        assert result.search_time_ms >= 0

    async def test_search_with_filters(self, context: PluginContext) -> None:
        """Test search with tag filters."""
        input_data = SearchKnowledgeInput(
            query="filtered query",
            limit=10,
            min_score=0.7,
            tags=["important", "work"],
        )

        result = await handle_search_knowledge(input_data, context)

        assert result.total >= 0
        for r in result.results:
            assert r.score >= 0
            assert r.score <= 1


class TestStoreMemory:
    """Tests for store_memory handler."""

    async def test_basic_storage(self, context: PluginContext) -> None:
        """Test basic memory storage."""
        input_data = StoreMemoryInput(
            content="This is a test memory",
            tags=["test"],
        )

        result = await handle_store_memory(input_data, context)

        assert result.stored is True
        assert result.id is not None
        assert result.embedding.model == "voyage-3"
        assert result.embedding.dimensions == 1024

    async def test_storage_with_importance(self, context: PluginContext) -> None:
        """Test storage with importance level."""
        input_data = StoreMemoryInput(
            content="Critical information",
            tags=["critical"],
            importance=ImportanceLevel.CRITICAL,
            metadata={"source": "test"},
        )

        result = await handle_store_memory(input_data, context)

        assert result.stored is True
        assert isinstance(result.timestamp, datetime)

    async def test_storage_validates_content_length(self) -> None:
        """Test that content length is validated."""
        with pytest.raises(ValueError):
            StoreMemoryInput(
                content="",  # Empty content should fail
                tags=[],
            )
