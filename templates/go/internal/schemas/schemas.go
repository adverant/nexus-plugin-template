// Package schemas defines JSON Schema validation for plugin inputs and outputs.
// Uses gojsonschema for runtime validation of incoming requests.
package schemas

import (
	"encoding/json"
	"fmt"

	"github.com/xeipuuv/gojsonschema"
)

// ProcessDataInput defines the input for the process_data tool.
type ProcessDataInput struct {
	Data       interface{}       `json:"data"`
	Operation  string            `json:"operation"`
	Options    map[string]string `json:"options,omitempty"`
	OutputType string            `json:"outputType,omitempty"`
}

// ProcessDataOutput defines the output for the process_data tool.
type ProcessDataOutput struct {
	Result      interface{} `json:"result"`
	Operation   string      `json:"operation"`
	InputCount  int         `json:"inputCount"`
	OutputCount int         `json:"outputCount"`
	DurationMs  int64       `json:"durationMs"`
}

// QueryCacheInput defines the input for the query_cache tool.
type QueryCacheInput struct {
	Key     string   `json:"key,omitempty"`
	Pattern string   `json:"pattern,omitempty"`
	Tags    []string `json:"tags,omitempty"`
	Limit   int      `json:"limit,omitempty"`
}

// QueryCacheOutput defines the output for the query_cache tool.
type QueryCacheOutput struct {
	Entries    []CacheEntry `json:"entries"`
	TotalCount int          `json:"totalCount"`
	CacheHit   bool         `json:"cacheHit"`
}

// CacheEntry represents a single cache entry.
type CacheEntry struct {
	Key       string      `json:"key"`
	Value     interface{} `json:"value"`
	Tags      []string    `json:"tags"`
	CreatedAt string      `json:"createdAt"`
	ExpiresAt string      `json:"expiresAt,omitempty"`
}

// AggregateMetricsInput defines the input for the aggregate_metrics tool.
type AggregateMetricsInput struct {
	Metrics    []string `json:"metrics"`
	Aggregator string   `json:"aggregator"`
	GroupBy    string   `json:"groupBy,omitempty"`
	TimeRange  *struct {
		Start string `json:"start"`
		End   string `json:"end"`
	} `json:"timeRange,omitempty"`
}

// AggregateMetricsOutput defines the output for the aggregate_metrics tool.
type AggregateMetricsOutput struct {
	Aggregations []Aggregation `json:"aggregations"`
	Metadata     struct {
		TotalDataPoints int    `json:"totalDataPoints"`
		TimeRange       string `json:"timeRange"`
		Aggregator      string `json:"aggregator"`
	} `json:"metadata"`
}

// Aggregation represents a single aggregation result.
type Aggregation struct {
	Metric string      `json:"metric"`
	Value  interface{} `json:"value"`
	Count  int         `json:"count"`
	Group  string      `json:"group,omitempty"`
}

// JSON Schema definitions for validation
var (
	// ProcessDataInputSchema is the JSON Schema for ProcessDataInput.
	ProcessDataInputSchema = map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"data": map[string]interface{}{
				"description": "The data to process (can be any JSON type)",
			},
			"operation": map[string]interface{}{
				"type":        "string",
				"enum":        []string{"filter", "transform", "aggregate", "sort", "deduplicate"},
				"description": "The operation to perform on the data",
			},
			"options": map[string]interface{}{
				"type":        "object",
				"description": "Additional options for the operation",
				"additionalProperties": map[string]interface{}{
					"type": "string",
				},
			},
			"outputType": map[string]interface{}{
				"type":        "string",
				"enum":        []string{"json", "csv", "table"},
				"default":     "json",
				"description": "Output format for the processed data",
			},
		},
		"required": []string{"data", "operation"},
	}

	// QueryCacheInputSchema is the JSON Schema for QueryCacheInput.
	QueryCacheInputSchema = map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"key": map[string]interface{}{
				"type":        "string",
				"minLength":   1,
				"maxLength":   256,
				"description": "Exact cache key to retrieve",
			},
			"pattern": map[string]interface{}{
				"type":        "string",
				"description": "Glob pattern to match cache keys",
			},
			"tags": map[string]interface{}{
				"type":        "array",
				"items":       map[string]interface{}{"type": "string"},
				"description": "Filter by cache entry tags",
			},
			"limit": map[string]interface{}{
				"type":        "integer",
				"minimum":     1,
				"maximum":     100,
				"default":     10,
				"description": "Maximum entries to return",
			},
		},
		"anyOf": []map[string]interface{}{
			{"required": []string{"key"}},
			{"required": []string{"pattern"}},
			{"required": []string{"tags"}},
		},
	}

	// AggregateMetricsInputSchema is the JSON Schema for AggregateMetricsInput.
	AggregateMetricsInputSchema = map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"metrics": map[string]interface{}{
				"type":        "array",
				"items":       map[string]interface{}{"type": "string"},
				"minItems":    1,
				"description": "List of metric names to aggregate",
			},
			"aggregator": map[string]interface{}{
				"type":        "string",
				"enum":        []string{"sum", "avg", "min", "max", "count", "percentile"},
				"description": "Aggregation function to apply",
			},
			"groupBy": map[string]interface{}{
				"type":        "string",
				"description": "Field to group results by",
			},
			"timeRange": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"start": map[string]interface{}{
						"type":        "string",
						"format":      "date-time",
						"description": "Start of time range (ISO 8601)",
					},
					"end": map[string]interface{}{
						"type":        "string",
						"format":      "date-time",
						"description": "End of time range (ISO 8601)",
					},
				},
				"required": []string{"start", "end"},
			},
		},
		"required": []string{"metrics", "aggregator"},
	}
)

// Validate validates input data against a JSON schema.
func Validate(schema map[string]interface{}, data interface{}) error {
	schemaBytes, err := json.Marshal(schema)
	if err != nil {
		return fmt.Errorf("failed to marshal schema: %w", err)
	}

	dataBytes, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %w", err)
	}

	schemaLoader := gojsonschema.NewBytesLoader(schemaBytes)
	dataLoader := gojsonschema.NewBytesLoader(dataBytes)

	result, err := gojsonschema.Validate(schemaLoader, dataLoader)
	if err != nil {
		return fmt.Errorf("validation error: %w", err)
	}

	if !result.Valid() {
		var errors string
		for _, err := range result.Errors() {
			errors += err.String() + "; "
		}
		return fmt.Errorf("validation failed: %s", errors)
	}

	return nil
}
