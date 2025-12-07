// Package mcp provides a minimal MCP (Model Context Protocol) server implementation.
// This is a simplified version suitable for stdio transport.
package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/rs/zerolog/log"
)

// Tool represents an MCP tool definition.
type Tool struct {
	Name        string
	Description string
	InputSchema interface{}
	Handler     ToolHandler
}

// ToolHandler is the function signature for tool handlers.
type ToolHandler func(ctx context.Context, params json.RawMessage) (interface{}, error)

// Server is a minimal MCP server implementation.
type Server struct {
	name    string
	version string
	tools   map[string]Tool
}

// NewServer creates a new MCP server.
func NewServer(name, version string) *Server {
	return &Server{
		name:    name,
		version: version,
		tools:   make(map[string]Tool),
	}
}

// RegisterTool registers a tool with the server.
func (s *Server) RegisterTool(tool Tool) {
	s.tools[tool.Name] = tool
}

// JSON-RPC message types
type jsonrpcRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	ID      interface{}     `json:"id,omitempty"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type jsonrpcResponse struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      interface{}   `json:"id,omitempty"`
	Result  interface{}   `json:"result,omitempty"`
	Error   *jsonrpcError `json:"error,omitempty"`
}

type jsonrpcError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// MCP-specific types
type initializeResult struct {
	ProtocolVersion string       `json:"protocolVersion"`
	Capabilities    capabilities `json:"capabilities"`
	ServerInfo      serverInfo   `json:"serverInfo"`
}

type capabilities struct {
	Tools     *toolsCapability     `json:"tools,omitempty"`
	Resources *resourcesCapability `json:"resources,omitempty"`
}

type toolsCapability struct {
	ListChanged bool `json:"listChanged,omitempty"`
}

type resourcesCapability struct {
	ListChanged bool `json:"listChanged,omitempty"`
}

type serverInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

type toolDefinition struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	InputSchema interface{} `json:"inputSchema"`
}

type toolsListResult struct {
	Tools []toolDefinition `json:"tools"`
}

type callToolParams struct {
	Name      string          `json:"name"`
	Arguments json.RawMessage `json:"arguments"`
}

type callToolResult struct {
	Content []contentItem `json:"content"`
	IsError bool          `json:"isError,omitempty"`
}

type contentItem struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// Run starts the MCP server with stdio transport.
func (s *Server) Run(ctx context.Context) error {
	log.Info().Str("name", s.name).Str("version", s.version).Msg("Starting MCP server")

	scanner := bufio.NewScanner(os.Stdin)
	// Increase buffer size for large messages
	buf := make([]byte, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Context cancelled, shutting down")
			return nil
		default:
			if !scanner.Scan() {
				if err := scanner.Err(); err != nil {
					log.Error().Err(err).Msg("Scanner error")
					return err
				}
				log.Info().Msg("EOF received, shutting down")
				return nil
			}

			line := scanner.Text()
			if line == "" {
				continue
			}

			response := s.handleMessage(ctx, []byte(line))
			if response != nil {
				output, err := json.Marshal(response)
				if err != nil {
					log.Error().Err(err).Msg("Failed to marshal response")
					continue
				}
				fmt.Println(string(output))
			}
		}
	}
}

func (s *Server) handleMessage(ctx context.Context, data []byte) *jsonrpcResponse {
	var req jsonrpcRequest
	if err := json.Unmarshal(data, &req); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal request")
		return &jsonrpcResponse{
			JSONRPC: "2.0",
			Error: &jsonrpcError{
				Code:    -32700,
				Message: "Parse error",
			},
		}
	}

	log.Debug().Str("method", req.Method).Interface("id", req.ID).Msg("Received request")

	var result interface{}
	var rpcErr *jsonrpcError

	switch req.Method {
	case "initialize":
		result = s.handleInitialize()
	case "initialized":
		// Notification, no response needed
		return nil
	case "tools/list":
		result = s.handleToolsList()
	case "tools/call":
		result, rpcErr = s.handleToolCall(ctx, req.Params)
	case "ping":
		result = map[string]interface{}{}
	default:
		rpcErr = &jsonrpcError{
			Code:    -32601,
			Message: fmt.Sprintf("Method not found: %s", req.Method),
		}
	}

	if req.ID == nil {
		// Notification, no response
		return nil
	}

	return &jsonrpcResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result:  result,
		Error:   rpcErr,
	}
}

func (s *Server) handleInitialize() *initializeResult {
	log.Info().Msg("Handling initialize request")
	return &initializeResult{
		ProtocolVersion: "2024-11-05",
		Capabilities: capabilities{
			Tools: &toolsCapability{ListChanged: true},
		},
		ServerInfo: serverInfo{
			Name:    s.name,
			Version: s.version,
		},
	}
}

func (s *Server) handleToolsList() *toolsListResult {
	log.Info().Int("count", len(s.tools)).Msg("Listing tools")

	var tools []toolDefinition
	for _, tool := range s.tools {
		tools = append(tools, toolDefinition{
			Name:        tool.Name,
			Description: tool.Description,
			InputSchema: tool.InputSchema,
		})
	}

	return &toolsListResult{Tools: tools}
}

func (s *Server) handleToolCall(ctx context.Context, params json.RawMessage) (*callToolResult, *jsonrpcError) {
	var callParams callToolParams
	if err := json.Unmarshal(params, &callParams); err != nil {
		return nil, &jsonrpcError{
			Code:    -32602,
			Message: "Invalid params",
			Data:    err.Error(),
		}
	}

	log.Info().Str("tool", callParams.Name).Msg("Calling tool")

	tool, ok := s.tools[callParams.Name]
	if !ok {
		return nil, &jsonrpcError{
			Code:    -32602,
			Message: fmt.Sprintf("Unknown tool: %s", callParams.Name),
		}
	}

	result, err := tool.Handler(ctx, callParams.Arguments)
	if err != nil {
		log.Error().Err(err).Str("tool", callParams.Name).Msg("Tool execution failed")
		return &callToolResult{
			Content: []contentItem{
				{Type: "text", Text: fmt.Sprintf("Error: %s", err.Error())},
			},
			IsError: true,
		}, nil
	}

	// Marshal result to JSON text
	resultJSON, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return nil, &jsonrpcError{
			Code:    -32603,
			Message: "Failed to marshal result",
			Data:    err.Error(),
		}
	}

	return &callToolResult{
		Content: []contentItem{
			{Type: "text", Text: string(resultJSON)},
		},
	}, nil
}
