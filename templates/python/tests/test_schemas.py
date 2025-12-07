"""Tests for Pydantic schemas."""

import pytest
from pydantic import ValidationError

from src.schemas import (
    ImportanceLevel,
    SearchKnowledgeInput,
    StoreMemoryInput,
)


class TestSearchKnowledgeInput:
    """Tests for SearchKnowledgeInput schema."""

    def test_valid_input(self) -> None:
        """Test valid input is accepted."""
        input_data = SearchKnowledgeInput(
            query="test query",
            limit=10,
            min_score=0.5,
        )
        assert input_data.query == "test query"
        assert input_data.limit == 10

    def test_defaults(self) -> None:
        """Test default values are applied."""
        input_data = SearchKnowledgeInput(query="test")
        assert input_data.limit == 10
        assert input_data.min_score == 0.5
        assert input_data.tags is None

    def test_empty_query_fails(self) -> None:
        """Test empty query is rejected."""
        with pytest.raises(ValidationError):
            SearchKnowledgeInput(query="")

    def test_limit_bounds(self) -> None:
        """Test limit must be within bounds."""
        with pytest.raises(ValidationError):
            SearchKnowledgeInput(query="test", limit=0)

        with pytest.raises(ValidationError):
            SearchKnowledgeInput(query="test", limit=101)

    def test_min_score_bounds(self) -> None:
        """Test min_score must be between 0 and 1."""
        with pytest.raises(ValidationError):
            SearchKnowledgeInput(query="test", min_score=-0.1)

        with pytest.raises(ValidationError):
            SearchKnowledgeInput(query="test", min_score=1.1)


class TestStoreMemoryInput:
    """Tests for StoreMemoryInput schema."""

    def test_valid_input(self) -> None:
        """Test valid input is accepted."""
        input_data = StoreMemoryInput(
            content="Test content",
            tags=["test"],
            importance=ImportanceLevel.HIGH,
        )
        assert input_data.content == "Test content"
        assert input_data.importance == ImportanceLevel.HIGH

    def test_defaults(self) -> None:
        """Test default values are applied."""
        input_data = StoreMemoryInput(content="Test")
        assert input_data.tags == []
        assert input_data.importance == ImportanceLevel.MEDIUM
        assert input_data.metadata is None

    def test_empty_content_fails(self) -> None:
        """Test empty content is rejected."""
        with pytest.raises(ValidationError):
            StoreMemoryInput(content="")

    def test_content_too_long(self) -> None:
        """Test content exceeding max length is rejected."""
        with pytest.raises(ValidationError):
            StoreMemoryInput(content="x" * 10001)

    def test_json_schema_generation(self) -> None:
        """Test JSON schema can be generated."""
        schema = StoreMemoryInput.model_json_schema()
        assert "properties" in schema
        assert "content" in schema["properties"]
        assert "tags" in schema["properties"]
