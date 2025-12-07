"""Main entry point for the Nexus plugin MCP server.

This module sets up the MCP server with tool definitions
and connects handlers to process requests.
"""

import asyncio
import signal
import sys
from typing import Any

import structlog
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from pydantic import ValidationError

from .handlers import (
    PluginContext,
    PluginException,
    handle_search_knowledge,
    handle_store_memory,
)
from .schemas import (
    ErrorCode,
    PluginError,
    SearchKnowledgeInput,
    StoreMemoryInput,
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

# ============================================================================
# Tool Definitions
# ============================================================================

TOOLS = [
    Tool(
        name="search_knowledge",
        description="""Search the knowledge base for relevant information.

Use this tool when you need to:
- Find previously stored information
- Look up facts or context
- Retrieve memories matching a query

Returns results ranked by relevance score.""",
        inputSchema=SearchKnowledgeInput.model_json_schema(),
    ),
    Tool(
        name="store_memory",
        description="""Store a memory for later retrieval.

Use this tool when you need to:
- Save important information for future reference
- Store context that may be useful later
- Create a searchable knowledge entry

Memories are indexed for semantic search.""",
        inputSchema=StoreMemoryInput.model_json_schema(),
    ),
]


# ============================================================================
# Server Setup
# ============================================================================


def create_server() -> Server:
    """Create and configure the MCP server."""
    server = Server("nexus-plugin-python")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        """Return the list of available tools."""
        return TOOLS

    @server.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
        """Handle tool invocations."""
        context = PluginContext()

        try:
            if name == "search_knowledge":
                input_data = SearchKnowledgeInput(**arguments)
                result = await handle_search_knowledge(input_data, context)
            elif name == "store_memory":
                input_data = StoreMemoryInput(**arguments)
                result = await handle_store_memory(input_data, context)
            else:
                raise PluginException(
                    code=ErrorCode.NOT_FOUND,
                    message=f"Unknown tool: {name}",
                )

            return [TextContent(type="text", text=result.model_dump_json(indent=2))]

        except ValidationError as e:
            error = PluginError(
                code=ErrorCode.VALIDATION_ERROR,
                message="Invalid input parameters",
                details={"errors": e.errors()},
            )
            return [TextContent(type="text", text=error.model_dump_json(indent=2))]

        except PluginException as e:
            return [TextContent(type="text", text=e.to_error().model_dump_json(indent=2))]

        except Exception as e:
            logger.exception("Unexpected error", error=str(e))
            error = PluginError(
                code=ErrorCode.SERVICE_ERROR,
                message=f"Internal error: {e}",
                retryable=True,
            )
            return [TextContent(type="text", text=error.model_dump_json(indent=2))]

    return server


# ============================================================================
# Main Entry Point
# ============================================================================


async def run_server() -> None:
    """Run the MCP server."""
    server = create_server()

    logger.info("Starting Nexus Python Plugin MCP Server")

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


def main() -> None:
    """Main entry point."""
    # Handle graceful shutdown
    def signal_handler(sig: int, frame: Any) -> None:
        logger.info("Shutting down...")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        asyncio.run(run_server())
    except KeyboardInterrupt:
        logger.info("Interrupted")
    except Exception as e:
        logger.exception("Server error", error=str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
