// Package main provides the entry point for the Nexus Go plugin.
// This plugin demonstrates MCP server implementation in Go with
// JSON-RPC communication, structured logging, and graceful shutdown.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/adverant/nexus-plugin-template/templates/go/internal/handlers"
	"github.com/adverant/nexus-plugin-template/templates/go/internal/mcp"
	"github.com/adverant/nexus-plugin-template/templates/go/internal/schemas"
)

func main() {
	// Configure logging
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	log.Info().Msg("Starting Nexus Go Plugin...")

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigChan
		log.Info().Str("signal", sig.String()).Msg("Received shutdown signal")
		cancel()
	}()

	// Initialize handlers
	h := handlers.NewHandlers()

	// Create MCP server
	server := mcp.NewServer("nexus-plugin-go", "1.0.0")

	// Register tools
	registerTools(server, h)

	// Run server
	if err := server.Run(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server failed")
	}

	log.Info().Msg("Plugin shutdown complete")
}

func registerTools(server *mcp.Server, h *handlers.Handlers) {
	// Process Data tool
	server.RegisterTool(mcp.Tool{
		Name:        "process_data",
		Description: "Process and transform data with configurable options. Use for data transformation, filtering, and aggregation tasks.",
		InputSchema: schemas.ProcessDataInputSchema,
		Handler: func(ctx context.Context, params json.RawMessage) (interface{}, error) {
			var input schemas.ProcessDataInput
			if err := json.Unmarshal(params, &input); err != nil {
				return nil, fmt.Errorf("invalid input: %w", err)
			}
			if err := schemas.Validate(schemas.ProcessDataInputSchema, input); err != nil {
				return nil, err
			}
			return h.ProcessData(ctx, input)
		},
	})

	// Query Cache tool
	server.RegisterTool(mcp.Tool{
		Name:        "query_cache",
		Description: "Query the in-memory cache for stored results. Use to retrieve previously processed data or check cache status.",
		InputSchema: schemas.QueryCacheInputSchema,
		Handler: func(ctx context.Context, params json.RawMessage) (interface{}, error) {
			var input schemas.QueryCacheInput
			if err := json.Unmarshal(params, &input); err != nil {
				return nil, fmt.Errorf("invalid input: %w", err)
			}
			if err := schemas.Validate(schemas.QueryCacheInputSchema, input); err != nil {
				return nil, err
			}
			return h.QueryCache(ctx, input)
		},
	})

	// Aggregate Metrics tool
	server.RegisterTool(mcp.Tool{
		Name:        "aggregate_metrics",
		Description: "Aggregate metrics from multiple data sources. Use for computing statistics, summaries, and trend analysis.",
		InputSchema: schemas.AggregateMetricsInputSchema,
		Handler: func(ctx context.Context, params json.RawMessage) (interface{}, error) {
			var input schemas.AggregateMetricsInput
			if err := json.Unmarshal(params, &input); err != nil {
				return nil, fmt.Errorf("invalid input: %w", err)
			}
			if err := schemas.Validate(schemas.AggregateMetricsInputSchema, input); err != nil {
				return nil, err
			}
			return h.AggregateMetrics(ctx, input)
		},
	})

	log.Info().Int("tools", 3).Msg("Registered MCP tools")
}
