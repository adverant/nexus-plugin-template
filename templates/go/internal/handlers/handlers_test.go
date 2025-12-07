package handlers

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/adverant/nexus-plugin-template/templates/go/internal/schemas"
)

func TestProcessData_Filter(t *testing.T) {
	h := NewHandlers()
	ctx := context.Background()

	input := schemas.ProcessDataInput{
		Data: []interface{}{
			map[string]interface{}{"name": "Alice", "age": 30},
			map[string]interface{}{"name": "Bob", "age": 25},
			map[string]interface{}{"name": "Alice", "age": 35},
		},
		Operation: "filter",
		Options: map[string]string{
			"field": "name",
			"value": "Alice",
		},
	}

	result, err := h.ProcessData(ctx, input)
	require.NoError(t, err)

	assert.Equal(t, "filter", result.Operation)
	assert.Equal(t, 3, result.InputCount)
	assert.Equal(t, 2, result.OutputCount)

	filtered, ok := result.Result.([]interface{})
	require.True(t, ok)
	assert.Len(t, filtered, 2)
}

func TestProcessData_Transform(t *testing.T) {
	h := NewHandlers()
	ctx := context.Background()

	input := schemas.ProcessDataInput{
		Data:      []interface{}{"hello", "world"},
		Operation: "transform",
		Options: map[string]string{
			"uppercase": "true",
		},
	}

	result, err := h.ProcessData(ctx, input)
	require.NoError(t, err)

	assert.Equal(t, "transform", result.Operation)

	transformed, ok := result.Result.([]interface{})
	require.True(t, ok)
	assert.Equal(t, "HELLO", transformed[0])
	assert.Equal(t, "WORLD", transformed[1])
}

func TestProcessData_Sort(t *testing.T) {
	h := NewHandlers()
	ctx := context.Background()

	input := schemas.ProcessDataInput{
		Data: []interface{}{
			map[string]interface{}{"name": "Charlie"},
			map[string]interface{}{"name": "Alice"},
			map[string]interface{}{"name": "Bob"},
		},
		Operation: "sort",
		Options: map[string]string{
			"field": "name",
			"order": "asc",
		},
	}

	result, err := h.ProcessData(ctx, input)
	require.NoError(t, err)

	sorted, ok := result.Result.([]interface{})
	require.True(t, ok)
	assert.Len(t, sorted, 3)

	first := sorted[0].(map[string]interface{})
	assert.Equal(t, "Alice", first["name"])
}

func TestProcessData_Deduplicate(t *testing.T) {
	h := NewHandlers()
	ctx := context.Background()

	input := schemas.ProcessDataInput{
		Data:      []interface{}{"a", "b", "a", "c", "b"},
		Operation: "deduplicate",
	}

	result, err := h.ProcessData(ctx, input)
	require.NoError(t, err)

	assert.Equal(t, 5, result.InputCount)
	assert.Equal(t, 3, result.OutputCount)

	unique, ok := result.Result.([]interface{})
	require.True(t, ok)
	assert.Len(t, unique, 3)
}

func TestQueryCache_ByKey(t *testing.T) {
	h := NewHandlers()
	ctx := context.Background()

	// First, add something to cache via ProcessData
	processInput := schemas.ProcessDataInput{
		Data:      []interface{}{1, 2, 3},
		Operation: "transform",
	}
	_, err := h.ProcessData(ctx, processInput)
	require.NoError(t, err)

	// Query cache by pattern
	queryInput := schemas.QueryCacheInput{
		Pattern: "process_*",
		Limit:   10,
	}

	result, err := h.QueryCache(ctx, queryInput)
	require.NoError(t, err)

	assert.True(t, result.CacheHit)
	assert.Greater(t, len(result.Entries), 0)
}

func TestQueryCache_ByTags(t *testing.T) {
	h := NewHandlers()
	ctx := context.Background()

	// Process data to populate cache
	processInput := schemas.ProcessDataInput{
		Data:      []interface{}{"test"},
		Operation: "transform",
	}
	_, err := h.ProcessData(ctx, processInput)
	require.NoError(t, err)

	// Query by tags
	queryInput := schemas.QueryCacheInput{
		Tags:  []string{"process", "transform"},
		Limit: 5,
	}

	result, err := h.QueryCache(ctx, queryInput)
	require.NoError(t, err)

	assert.True(t, result.CacheHit)
}

func TestQueryCache_NotFound(t *testing.T) {
	h := NewHandlers()
	ctx := context.Background()

	input := schemas.QueryCacheInput{
		Key: "nonexistent_key",
	}

	result, err := h.QueryCache(ctx, input)
	require.NoError(t, err)

	assert.False(t, result.CacheHit)
	assert.Empty(t, result.Entries)
}

func TestAggregateMetrics(t *testing.T) {
	h := NewHandlers()
	ctx := context.Background()

	input := schemas.AggregateMetricsInput{
		Metrics:    []string{"cpu_usage", "memory_usage"},
		Aggregator: "avg",
		GroupBy:    "host",
	}

	result, err := h.AggregateMetrics(ctx, input)
	require.NoError(t, err)

	assert.Len(t, result.Aggregations, 2)
	assert.Equal(t, "avg", result.Metadata.Aggregator)
	assert.Greater(t, result.Metadata.TotalDataPoints, 0)
}

func TestAggregateMetrics_WithTimeRange(t *testing.T) {
	h := NewHandlers()
	ctx := context.Background()

	input := schemas.AggregateMetricsInput{
		Metrics:    []string{"requests_total"},
		Aggregator: "sum",
		TimeRange: &struct {
			Start string `json:"start"`
			End   string `json:"end"`
		}{
			Start: "2024-01-01T00:00:00Z",
			End:   "2024-01-02T00:00:00Z",
		},
	}

	result, err := h.AggregateMetrics(ctx, input)
	require.NoError(t, err)

	assert.Contains(t, result.Metadata.TimeRange, "2024-01-01")
}

func TestAggregateMetrics_Percentile(t *testing.T) {
	h := NewHandlers()
	ctx := context.Background()

	input := schemas.AggregateMetricsInput{
		Metrics:    []string{"latency_ms"},
		Aggregator: "percentile",
	}

	result, err := h.AggregateMetrics(ctx, input)
	require.NoError(t, err)

	assert.Len(t, result.Aggregations, 1)

	value, ok := result.Aggregations[0].Value.(map[string]float64)
	require.True(t, ok)
	assert.Contains(t, value, "p50")
	assert.Contains(t, value, "p95")
	assert.Contains(t, value, "p99")
}
