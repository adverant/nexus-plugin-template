package schemas

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidate_ProcessDataInput_Valid(t *testing.T) {
	input := ProcessDataInput{
		Data:      []interface{}{1, 2, 3},
		Operation: "filter",
		Options:   map[string]string{"field": "name"},
	}

	err := Validate(ProcessDataInputSchema, input)
	assert.NoError(t, err)
}

func TestValidate_ProcessDataInput_MissingRequired(t *testing.T) {
	input := ProcessDataInput{
		Data: []interface{}{1, 2, 3},
		// Missing operation
	}

	err := Validate(ProcessDataInputSchema, input)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "operation")
}

func TestValidate_ProcessDataInput_InvalidOperation(t *testing.T) {
	input := ProcessDataInput{
		Data:      []interface{}{1, 2, 3},
		Operation: "invalid_op",
	}

	err := Validate(ProcessDataInputSchema, input)
	assert.Error(t, err)
}

func TestValidate_QueryCacheInput_ByKey(t *testing.T) {
	input := QueryCacheInput{
		Key:   "test_key",
		Limit: 10,
	}

	err := Validate(QueryCacheInputSchema, input)
	assert.NoError(t, err)
}

func TestValidate_QueryCacheInput_ByPattern(t *testing.T) {
	input := QueryCacheInput{
		Pattern: "prefix_*",
		Limit:   5,
	}

	err := Validate(QueryCacheInputSchema, input)
	assert.NoError(t, err)
}

func TestValidate_QueryCacheInput_ByTags(t *testing.T) {
	input := QueryCacheInput{
		Tags:  []string{"tag1", "tag2"},
		Limit: 20,
	}

	err := Validate(QueryCacheInputSchema, input)
	assert.NoError(t, err)
}

func TestValidate_AggregateMetricsInput_Valid(t *testing.T) {
	input := AggregateMetricsInput{
		Metrics:    []string{"cpu", "memory"},
		Aggregator: "avg",
		GroupBy:    "host",
	}

	err := Validate(AggregateMetricsInputSchema, input)
	assert.NoError(t, err)
}

func TestValidate_AggregateMetricsInput_WithTimeRange(t *testing.T) {
	input := AggregateMetricsInput{
		Metrics:    []string{"requests"},
		Aggregator: "sum",
		TimeRange: &struct {
			Start string `json:"start"`
			End   string `json:"end"`
		}{
			Start: "2024-01-01T00:00:00Z",
			End:   "2024-01-31T23:59:59Z",
		},
	}

	err := Validate(AggregateMetricsInputSchema, input)
	assert.NoError(t, err)
}

func TestValidate_AggregateMetricsInput_MissingMetrics(t *testing.T) {
	input := AggregateMetricsInput{
		Aggregator: "avg",
	}

	err := Validate(AggregateMetricsInputSchema, input)
	assert.Error(t, err)
}

func TestValidate_AggregateMetricsInput_InvalidAggregator(t *testing.T) {
	input := AggregateMetricsInput{
		Metrics:    []string{"cpu"},
		Aggregator: "invalid",
	}

	err := Validate(AggregateMetricsInputSchema, input)
	assert.Error(t, err)
}
