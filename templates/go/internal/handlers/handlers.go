// Package handlers implements the business logic for each MCP tool.
// Handlers receive validated input and return structured output.
package handlers

import (
	"context"
	"fmt"
	"reflect"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/adverant/nexus-plugin-template/templates/go/internal/schemas"
)

// Handlers contains all tool handler implementations.
type Handlers struct {
	cache *simpleCache
}

// NewHandlers creates a new Handlers instance.
func NewHandlers() *Handlers {
	return &Handlers{
		cache: newSimpleCache(5 * time.Minute),
	}
}

// simpleCache is a basic in-memory cache with TTL support.
type simpleCache struct {
	mu       sync.RWMutex
	entries  map[string]*cacheItem
	defaultTTL time.Duration
}

type cacheItem struct {
	value     interface{}
	tags      []string
	createdAt time.Time
	expiresAt time.Time
}

func newSimpleCache(defaultTTL time.Duration) *simpleCache {
	return &simpleCache{
		entries:    make(map[string]*cacheItem),
		defaultTTL: defaultTTL,
	}
}

func (c *simpleCache) set(key string, value interface{}, tags []string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	c.entries[key] = &cacheItem{
		value:     value,
		tags:      tags,
		createdAt: now,
		expiresAt: now.Add(c.defaultTTL),
	}
}

func (c *simpleCache) get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, ok := c.entries[key]
	if !ok || time.Now().After(item.expiresAt) {
		return nil, false
	}
	return item.value, true
}

func (c *simpleCache) getByPattern(pattern string, limit int) []schemas.CacheEntry {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var results []schemas.CacheEntry
	now := time.Now()

	for key, item := range c.entries {
		if now.After(item.expiresAt) {
			continue
		}
		if matchPattern(pattern, key) {
			results = append(results, schemas.CacheEntry{
				Key:       key,
				Value:     item.value,
				Tags:      item.tags,
				CreatedAt: item.createdAt.Format(time.RFC3339),
				ExpiresAt: item.expiresAt.Format(time.RFC3339),
			})
			if len(results) >= limit {
				break
			}
		}
	}
	return results
}

func (c *simpleCache) getByTags(tags []string, limit int) []schemas.CacheEntry {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var results []schemas.CacheEntry
	now := time.Now()

	for key, item := range c.entries {
		if now.After(item.expiresAt) {
			continue
		}
		if hasAnyTag(item.tags, tags) {
			results = append(results, schemas.CacheEntry{
				Key:       key,
				Value:     item.value,
				Tags:      item.tags,
				CreatedAt: item.createdAt.Format(time.RFC3339),
				ExpiresAt: item.expiresAt.Format(time.RFC3339),
			})
			if len(results) >= limit {
				break
			}
		}
	}
	return results
}

func matchPattern(pattern, key string) bool {
	// Simple glob matching (supports * wildcard)
	if pattern == "*" {
		return true
	}
	if strings.HasPrefix(pattern, "*") && strings.HasSuffix(pattern, "*") {
		return strings.Contains(key, strings.Trim(pattern, "*"))
	}
	if strings.HasPrefix(pattern, "*") {
		return strings.HasSuffix(key, strings.TrimPrefix(pattern, "*"))
	}
	if strings.HasSuffix(pattern, "*") {
		return strings.HasPrefix(key, strings.TrimSuffix(pattern, "*"))
	}
	return key == pattern
}

func hasAnyTag(itemTags, searchTags []string) bool {
	for _, st := range searchTags {
		for _, it := range itemTags {
			if st == it {
				return true
			}
		}
	}
	return false
}

// ProcessData processes input data according to the specified operation.
func (h *Handlers) ProcessData(ctx context.Context, input schemas.ProcessDataInput) (*schemas.ProcessDataOutput, error) {
	start := time.Now()

	log.Info().
		Str("operation", input.Operation).
		Msg("Processing data")

	var result interface{}
	var inputCount, outputCount int

	switch input.Operation {
	case "filter":
		result, inputCount, outputCount = h.filterData(input.Data, input.Options)
	case "transform":
		result, inputCount, outputCount = h.transformData(input.Data, input.Options)
	case "aggregate":
		result, inputCount, outputCount = h.aggregateData(input.Data, input.Options)
	case "sort":
		result, inputCount, outputCount = h.sortData(input.Data, input.Options)
	case "deduplicate":
		result, inputCount, outputCount = h.deduplicateData(input.Data, input.Options)
	default:
		return nil, fmt.Errorf("unsupported operation: %s", input.Operation)
	}

	// Cache the result
	cacheKey := fmt.Sprintf("process_%s_%d", input.Operation, time.Now().UnixNano())
	h.cache.set(cacheKey, result, []string{"process", input.Operation})

	return &schemas.ProcessDataOutput{
		Result:      result,
		Operation:   input.Operation,
		InputCount:  inputCount,
		OutputCount: outputCount,
		DurationMs:  time.Since(start).Milliseconds(),
	}, nil
}

func (h *Handlers) filterData(data interface{}, options map[string]string) (interface{}, int, int) {
	arr, ok := data.([]interface{})
	if !ok {
		return data, 1, 1
	}

	field := options["field"]
	value := options["value"]

	var filtered []interface{}
	for _, item := range arr {
		if m, ok := item.(map[string]interface{}); ok {
			if v, exists := m[field]; exists && fmt.Sprintf("%v", v) == value {
				filtered = append(filtered, item)
			}
		}
	}

	return filtered, len(arr), len(filtered)
}

func (h *Handlers) transformData(data interface{}, options map[string]string) (interface{}, int, int) {
	arr, ok := data.([]interface{})
	if !ok {
		return data, 1, 1
	}

	uppercase := options["uppercase"] == "true"

	var transformed []interface{}
	for _, item := range arr {
		if s, ok := item.(string); ok && uppercase {
			transformed = append(transformed, strings.ToUpper(s))
		} else {
			transformed = append(transformed, item)
		}
	}

	return transformed, len(arr), len(transformed)
}

func (h *Handlers) aggregateData(data interface{}, options map[string]string) (interface{}, int, int) {
	arr, ok := data.([]interface{})
	if !ok {
		return map[string]interface{}{"count": 1}, 1, 1
	}

	field := options["field"]
	counts := make(map[string]int)

	for _, item := range arr {
		if m, ok := item.(map[string]interface{}); ok {
			if v, exists := m[field]; exists {
				counts[fmt.Sprintf("%v", v)]++
			}
		}
	}

	return counts, len(arr), len(counts)
}

func (h *Handlers) sortData(data interface{}, options map[string]string) (interface{}, int, int) {
	arr, ok := data.([]interface{})
	if !ok {
		return data, 1, 1
	}

	field := options["field"]
	desc := options["order"] == "desc"

	sorted := make([]interface{}, len(arr))
	copy(sorted, arr)

	sort.Slice(sorted, func(i, j int) bool {
		mi, oki := sorted[i].(map[string]interface{})
		mj, okj := sorted[j].(map[string]interface{})
		if !oki || !okj {
			return false
		}
		vi := fmt.Sprintf("%v", mi[field])
		vj := fmt.Sprintf("%v", mj[field])
		if desc {
			return vi > vj
		}
		return vi < vj
	})

	return sorted, len(arr), len(sorted)
}

func (h *Handlers) deduplicateData(data interface{}, options map[string]string) (interface{}, int, int) {
	arr, ok := data.([]interface{})
	if !ok {
		return data, 1, 1
	}

	seen := make(map[string]bool)
	var unique []interface{}

	for _, item := range arr {
		key := fmt.Sprintf("%v", item)
		if !seen[key] {
			seen[key] = true
			unique = append(unique, item)
		}
	}

	return unique, len(arr), len(unique)
}

// QueryCache queries the in-memory cache.
func (h *Handlers) QueryCache(ctx context.Context, input schemas.QueryCacheInput) (*schemas.QueryCacheOutput, error) {
	log.Info().
		Str("key", input.Key).
		Str("pattern", input.Pattern).
		Msg("Querying cache")

	limit := input.Limit
	if limit == 0 {
		limit = 10
	}

	var entries []schemas.CacheEntry
	cacheHit := false

	if input.Key != "" {
		if value, ok := h.cache.get(input.Key); ok {
			entries = append(entries, schemas.CacheEntry{
				Key:   input.Key,
				Value: value,
			})
			cacheHit = true
		}
	} else if input.Pattern != "" {
		entries = h.cache.getByPattern(input.Pattern, limit)
		cacheHit = len(entries) > 0
	} else if len(input.Tags) > 0 {
		entries = h.cache.getByTags(input.Tags, limit)
		cacheHit = len(entries) > 0
	}

	return &schemas.QueryCacheOutput{
		Entries:    entries,
		TotalCount: len(entries),
		CacheHit:   cacheHit,
	}, nil
}

// AggregateMetrics aggregates metrics from data sources.
func (h *Handlers) AggregateMetrics(ctx context.Context, input schemas.AggregateMetricsInput) (*schemas.AggregateMetricsOutput, error) {
	log.Info().
		Strs("metrics", input.Metrics).
		Str("aggregator", input.Aggregator).
		Msg("Aggregating metrics")

	// Simulate metric aggregation
	var aggregations []schemas.Aggregation
	totalDataPoints := 0

	for _, metric := range input.Metrics {
		value := h.computeAggregation(metric, input.Aggregator)
		dataPoints := 100 // Simulated
		totalDataPoints += dataPoints

		agg := schemas.Aggregation{
			Metric: metric,
			Value:  value,
			Count:  dataPoints,
		}

		if input.GroupBy != "" {
			agg.Group = input.GroupBy
		}

		aggregations = append(aggregations, agg)
	}

	timeRange := "all"
	if input.TimeRange != nil {
		timeRange = fmt.Sprintf("%s to %s", input.TimeRange.Start, input.TimeRange.End)
	}

	return &schemas.AggregateMetricsOutput{
		Aggregations: aggregations,
		Metadata: struct {
			TotalDataPoints int    `json:"totalDataPoints"`
			TimeRange       string `json:"timeRange"`
			Aggregator      string `json:"aggregator"`
		}{
			TotalDataPoints: totalDataPoints,
			TimeRange:       timeRange,
			Aggregator:      input.Aggregator,
		},
	}, nil
}

func (h *Handlers) computeAggregation(metric, aggregator string) interface{} {
	// Simulate metric computation
	switch aggregator {
	case "sum":
		return 1250.75
	case "avg":
		return 12.51
	case "min":
		return 0.5
	case "max":
		return 100.0
	case "count":
		return 100
	case "percentile":
		return map[string]float64{"p50": 10.5, "p95": 45.2, "p99": 89.7}
	default:
		return nil
	}
}

// reflect is used to check if data is an array type
var _ = reflect.TypeOf
