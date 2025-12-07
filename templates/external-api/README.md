# Weather API Plugin Template

External API integration template demonstrating HTTP API best practices with the Nexus Plugin SDK.

## Features

- **HTTP Client** - Robust API client with proper error handling
- **Rate Limiting** - Per-minute and per-day quota management
- **Response Caching** - TTL-based caching for reduced API calls
- **Retry Logic** - Exponential backoff for transient failures
- **Zod Validation** - Type-safe schemas for all inputs/outputs

## Quick Start

```bash
# Install dependencies
npm install

# Set your API key
export OPENWEATHERMAP_API_KEY="your-api-key"

# Build and run
npm run build
npm start
```

## Tools

### get_current_weather
Get current weather conditions for a location.

```json
{
  "location": "Paris,FR",
  "units": "metric"
}
```

### get_forecast
Get multi-day weather forecast (1-7 days).

```json
{
  "location": "London,UK",
  "units": "metric",
  "days": 5,
  "hourly": true
}
```

### get_air_quality
Get air quality index and health recommendations.

```json
{
  "location": "Beijing,CN"
}
```

## Architecture

```
src/
├── index.ts      # Plugin definition and MCP server
├── schemas.ts    # Zod schemas for validation
├── handlers.ts   # Tool handler implementations
└── api-client.ts # HTTP client with caching/retry
```

## API Client Features

### Rate Limiting
```typescript
const client = new WeatherApiClient({
  apiKey: 'your-key',
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerDay: 1000,
  },
});
```

### Caching
```typescript
const client = new WeatherApiClient({
  apiKey: 'your-key',
  cacheTtl: 300, // 5 minutes
});

// Skip cache for fresh data
const result = await client.request('/endpoint', params, { skipCache: true });
```

### Retry Logic
```typescript
const client = new WeatherApiClient({
  apiKey: 'your-key',
  maxRetries: 3,
  timeout: 10000,
});
```

## Error Handling

The plugin defines specific error codes:

| Code | Description | Retryable |
|------|-------------|----------|
| `LOCATION_NOT_FOUND` | City not found | No |
| `API_KEY_INVALID` | Invalid API key | No |
| `RATE_LIMITED` | Quota exceeded | Yes |
| `TIMEOUT` | Request timeout | Yes |
| `NETWORK_ERROR` | Network failure | Yes |
| `SERVICE_UNAVAILABLE` | API down | Yes |

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENWEATHERMAP_API_KEY` | Yes | OpenWeatherMap API key |

### Manifest Options

See `nexus.manifest.json` for full configuration including:
- Resource limits (CPU, memory, timeout)
- Network permissions
- Credential requirements

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Validate plugin
npm run validate
```

## License

MIT
