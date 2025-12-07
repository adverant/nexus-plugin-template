# Python Plugin Template

Python template for building Nexus plugins with MCP server support.

## Features

- **Pydantic Schemas** - Type-safe validation with automatic JSON Schema generation
- **Async Handlers** - Fully async architecture for performance
- **Structured Logging** - JSON logging with structlog
- **Poetry** - Modern dependency management
- **pytest** - Comprehensive test suite

## Quick Start

```bash
# Install dependencies
poetry install

# Run tests
poetry run pytest

# Type check
poetry run mypy src/

# Lint
poetry run ruff check src/

# Start the MCP server
poetry run nexus-plugin
```

## Project Structure

```
src/
├── __init__.py     # Package definition
├── main.py         # MCP server setup and entry point
├── schemas.py      # Pydantic input/output schemas
└── handlers.py     # Tool handler implementations

tests/
├── test_handlers.py  # Handler unit tests
└── test_schemas.py   # Schema validation tests
```

## Tools

### search_knowledge

Search the knowledge base for relevant information.

```python
from src.schemas import SearchKnowledgeInput

input = SearchKnowledgeInput(
    query="user preferences",
    limit=10,
    min_score=0.7,
    tags=["settings"]
)
```

### store_memory

Store a memory for later retrieval.

```python
from src.schemas import StoreMemoryInput, ImportanceLevel

input = StoreMemoryInput(
    content="User prefers dark mode",
    tags=["preferences", "ui"],
    importance=ImportanceLevel.HIGH,
    metadata={"source": "settings_page"}
)
```

## Pydantic Schemas

Schemas are defined using Pydantic v2 with full validation:

```python
from pydantic import BaseModel, Field

class SearchKnowledgeInput(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Search query"
    )
    limit: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Max results"
    )
```

### Generating JSON Schema

```python
# For MCP tool registration
schema = SearchKnowledgeInput.model_json_schema()
```

## Error Handling

Use `PluginException` for handled errors:

```python
from src.handlers import PluginException
from src.schemas import ErrorCode

raise PluginException(
    code=ErrorCode.NOT_FOUND,
    message="Resource not found",
    details={"id": "123"},
    retryable=False
)
```

## Testing

Tests use pytest with async support:

```python
import pytest
from src.handlers import handle_search_knowledge, PluginContext
from src.schemas import SearchKnowledgeInput

@pytest.fixture
def context():
    return PluginContext()

async def test_search(context):
    input = SearchKnowledgeInput(query="test")
    result = await handle_search_knowledge(input, context)
    assert result.total >= 0
```

## Configuration

### Environment Variables

Configure via environment:

```bash
export LOG_LEVEL=debug
export NEXUS_GRAPHRAG_URL=http://localhost:9000
```

### Nexus Manifest

See `nexus.manifest.json` for:
- Resource limits
- Permission requirements
- MCP tool definitions

## License

MIT
