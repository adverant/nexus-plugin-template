# Nexus Plugin Go Template

A complete template for building Nexus plugins in Go with MCP (Model Context Protocol) support.

## Features

- **MCP Server Implementation** - JSON-RPC 2.0 over stdio transport
- **JSON Schema Validation** - Runtime input validation with gojsonschema
- **Structured Logging** - zerolog for high-performance logging
- **In-Memory Cache** - TTL-based caching with pattern matching
- **Comprehensive Tests** - Full test coverage with testify
- **Docker Support** - Multi-stage build for minimal images

## Quick Start

### Prerequisites

- Go 1.21 or later
- Make (optional, for convenience commands)

### Installation

```bash
# Clone and setup
git clone https://github.com/your-org/your-plugin.git
cd your-plugin

# Download dependencies
go mod download

# Build
make build

# Run tests
make test

# Run the plugin
make run
```

## Project Structure

```
.
├── cmd/
│   └── plugin/
│       └── main.go           # Entry point
├── internal/
│   ├── handlers/
│   │   ├── handlers.go       # Tool implementations
│   │   └── handlers_test.go  # Handler tests
│   ├── mcp/
│   │   └── server.go         # MCP server implementation
│   └── schemas/
│       ├── schemas.go        # Input/output schemas
│       └── schemas_test.go   # Schema validation tests
├── go.mod
├── go.sum
├── Makefile
├── Dockerfile
├── nexus.manifest.json
└── README.md
```

## Tools

This template includes three example tools:

### process_data

Process and transform data with configurable operations.

**Operations:**
- `filter` - Filter data by field value
- `transform` - Transform data (uppercase, etc.)
- `aggregate` - Aggregate data by field
- `sort` - Sort data by field
- `deduplicate` - Remove duplicate entries

**Example:**
```json
{
  "data": [{"name": "Alice"}, {"name": "Bob"}],
  "operation": "filter",
  "options": {"field": "name", "value": "Alice"}
}
```

### query_cache

Query the in-memory cache for stored results.

**Query methods:**
- By exact key
- By glob pattern (e.g., `prefix_*`)
- By tags

**Example:**
```json
{
  "pattern": "process_*",
  "limit": 10
}
```

### aggregate_metrics

Aggregate metrics from data sources.

**Aggregators:**
- `sum`, `avg`, `min`, `max`, `count`, `percentile`

**Example:**
```json
{
  "metrics": ["cpu_usage", "memory_usage"],
  "aggregator": "avg",
  "groupBy": "host"
}
```

## MCP Integration

This plugin uses MCP (Model Context Protocol) for communication with AI IDEs like Claude Code.

### Transport

The plugin uses **stdio transport** - it reads JSON-RPC messages from stdin and writes responses to stdout.

### Protocol

Implements MCP protocol version `2024-11-05` with the following methods:

- `initialize` - Initialize the server
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `ping` - Health check

### Running with Claude Code

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "nexus-go-plugin": {
      "command": "./bin/nexus-plugin"
    }
  }
}
```

## Development

### Adding a New Tool

1. **Define schemas** in `internal/schemas/schemas.go`:

```go
type MyToolInput struct {
    Field1 string `json:"field1"`
    Field2 int    `json:"field2"`
}

type MyToolOutput struct {
    Result string `json:"result"`
}

var MyToolInputSchema = map[string]interface{}{
    "type": "object",
    "properties": map[string]interface{}{
        "field1": map[string]interface{}{
            "type": "string",
            "description": "Field description",
        },
        // ...
    },
    "required": []string{"field1"},
}
```

2. **Implement handler** in `internal/handlers/handlers.go`:

```go
func (h *Handlers) MyTool(ctx context.Context, input schemas.MyToolInput) (*schemas.MyToolOutput, error) {
    // Implementation
    return &schemas.MyToolOutput{Result: "success"}, nil
}
```

3. **Register tool** in `cmd/plugin/main.go`:

```go
server.RegisterTool(mcp.Tool{
    Name:        "my_tool",
    Description: "Description for LLM",
    InputSchema: schemas.MyToolInputSchema,
    Handler: func(ctx context.Context, params json.RawMessage) (interface{}, error) {
        var input schemas.MyToolInput
        if err := json.Unmarshal(params, &input); err != nil {
            return nil, err
        }
        if err := schemas.Validate(schemas.MyToolInputSchema, input); err != nil {
            return nil, err
        }
        return h.MyTool(ctx, input)
    },
})
```

4. **Add tests** in `internal/handlers/handlers_test.go`

### Running Tests

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Run specific test
go test -v -run TestProcessData_Filter ./internal/handlers/
```

### Linting

```bash
# Install golangci-lint
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Run linter
make lint

# Format code
make fmt
```

## Docker

### Building

```bash
make docker
```

### Running

```bash
docker run -i nexus-plugin-go:latest
```

The image is optimized for production:
- Multi-stage build (~15MB final image)
- Non-root user
- Health check endpoint
- Minimal Alpine base

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `CACHE_TTL` | Cache TTL in seconds | `300` |

### Manifest

The `nexus.manifest.json` defines plugin metadata:

```json
{
  "name": "nexus-plugin-go-template",
  "version": "1.0.0",
  "nexus": {
    "minVersion": "2.0.0",
    "executionMode": "mcp_container",
    "permissions": ["nexus:graphrag:read"]
  }
}
```

## Performance

- **Low memory footprint**: ~10MB base memory
- **Fast startup**: <100ms cold start
- **Efficient caching**: O(1) key lookup, O(n) pattern matching

## License

MIT

## Support

- Issues: https://github.com/adverant/nexus-plugin-template/issues
- Docs: https://docs.nexus.adverant.ai/plugins/go
