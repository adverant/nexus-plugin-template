/**
 * Weather API Plugin - Main Entry Point
 *
 * External API integration plugin demonstrating:
 * - HTTP API client with caching and retry logic
 * - Rate limiting for API quota management
 * - Comprehensive error handling
 * - Environment-based configuration
 *
 * @example
 * ```typescript
 * import { weatherPlugin } from 'nexus-plugin-weather';
 *
 * // Initialize with API key
 * initializeWeatherApi(process.env.OPENWEATHERMAP_API_KEY);
 *
 * // Start the MCP server
 * const server = weatherPlugin.buildServer();
 * server.start();
 * ```
 */

import {
  PluginBuilder,
  z,
} from '@adverant-nexus/plugin-sdk';
import {
  GetCurrentWeatherInputSchema,
  GetCurrentWeatherOutputSchema,
  GetForecastInputSchema,
  GetForecastOutputSchema,
  GetAirQualityInputSchema,
  GetAirQualityOutputSchema,
  WeatherErrorCodes,
} from './schemas.js';
import {
  handleGetCurrentWeather,
  handleGetForecast,
  handleGetAirQuality,
} from './handlers.js';
import { initializeWeatherApi } from './api-client.js';

// ============================================================================
// Plugin Definition
// ============================================================================

export const weatherPlugin = PluginBuilder.create({
  id: 'nexus-plugin-weather',
  name: 'weather',
  displayName: 'Weather API',
  version: '1.0.0',
  description: 'Get weather data, forecasts, and air quality information from OpenWeatherMap. Includes intelligent caching, rate limiting, and comprehensive error handling.',
})
  // ============================================================================
  // Semantic Context
  // ============================================================================
  .setSemantic({
    capabilities: [
      'weather_retrieval',
      'forecast_generation',
      'air_quality_monitoring',
      'location_weather',
    ],
    domain: 'weather',
    intent: 'query',
    whenToUse: [
      'User asks about current weather conditions',
      'User wants to know the forecast for coming days',
      'User asks about air quality or pollution levels',
      'Planning outdoor activities based on weather',
      'Travel preparation requiring weather information',
    ],
    whenNotToUse: [
      'Historical weather data (use a climate database instead)',
      'Real-time severe weather alerts (use emergency services)',
      'Hyper-local weather (like indoor temperature)',
      'Long-term climate predictions (>7 days)',
    ],
    commonMistakes: [
      'Not specifying country code for ambiguous city names',
      'Requesting more than 7 days of forecast',
      'Using coordinates instead of city name without the coordinates parameter',
    ],
    bestPractices: [
      'Include country code for international cities (e.g., "London,UK")',
      'Use metric units for international users',
      'Check air quality before recommending outdoor activities',
      'Cache responses are valid for 5 minutes',
    ],
    relatedPlugins: [
      'nexus-plugin-location',
      'nexus-plugin-calendar',
      'nexus-plugin-travel',
    ],
    suggestedChains: [
      {
        name: 'Travel Weather Check',
        description: 'Get weather forecast for travel planning',
        steps: ['search_location', 'get_forecast', 'get_air_quality'],
      },
      {
        name: 'Daily Briefing',
        description: 'Morning weather briefing',
        steps: ['get_current_weather', 'get_forecast'],
      },
    ],
  })

  // ============================================================================
  // Execution Profile
  // ============================================================================
  .setExecution({
    mode: 'mcp_container',
    isolationLevel: 1,
    resources: {
      cpuMillicores: 250,
      memoryMB: 256,
      timeoutMs: 30000,
    },
  })

  // ============================================================================
  // Context Requirements
  // ============================================================================
  .setContextRequirements({
    permissions: ['network:outbound:api.openweathermap.org'],
    requiredServices: [],
    environmentVariables: [
      {
        name: 'OPENWEATHERMAP_API_KEY',
        required: true,
        description: 'OpenWeatherMap API key for authentication',
      },
    ],
  })

  // ============================================================================
  // Trust Profile
  // ============================================================================
  .setTrust({
    level: 'community',
  })

  // ============================================================================
  // Get Current Weather Tool
  // ============================================================================
  .addTool({
    name: 'get_current_weather',
    displayName: 'Get Current Weather',
    description: 'Get current weather conditions for a location including temperature, humidity, wind, and sky conditions.',
    inputSchema: GetCurrentWeatherInputSchema,
    outputSchema: GetCurrentWeatherOutputSchema,
    examples: [
      {
        name: 'Get weather in Paris',
        description: 'Get current weather in Paris, France',
        input: {
          location: 'Paris,FR',
          units: 'metric',
        },
        output: {
          location: {
            name: 'Paris',
            country: 'FR',
            coordinates: { lat: 48.8566, lon: 2.3522 },
            timezone: 3600,
          },
          current: {
            timestamp: '2024-01-15T14:30:00Z',
            temperature: 8,
            feelsLike: 5,
            humidity: 72,
            pressure: 1015,
            windSpeed: 4.5,
            windDirection: 225,
            visibility: 10000,
            clouds: 40,
            conditions: [{ id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
          },
          sun: {
            sunrise: '2024-01-15T08:15:00Z',
            sunset: '2024-01-15T17:30:00Z',
          },
          cached: false,
        },
      },
      {
        name: 'Get weather in New York (Fahrenheit)',
        description: 'Get weather in imperial units',
        input: {
          location: 'New York,US',
          units: 'imperial',
        },
        output: {
          location: {
            name: 'New York',
            country: 'US',
            coordinates: { lat: 40.7128, lon: -74.006 },
            timezone: -18000,
          },
          current: {
            timestamp: '2024-01-15T09:30:00Z',
            temperature: 35,
            feelsLike: 28,
            humidity: 65,
            pressure: 1020,
            windSpeed: 12,
            windDirection: 315,
            visibility: 16093,
            clouds: 20,
            conditions: [{ id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' }],
          },
          sun: {
            sunrise: '2024-01-15T12:15:00Z',
            sunset: '2024-01-15T21:50:00Z',
          },
          cached: false,
        },
      },
    ],
    errors: [
      {
        code: WeatherErrorCodes.LOCATION_NOT_FOUND,
        httpStatus: 404,
        message: 'Location not found',
        cause: 'The specified city name could not be geocoded',
        recovery: ['Check spelling of city name', 'Add country code (e.g., "London,UK")', 'Use coordinates instead'],
        retryable: false,
      },
      {
        code: WeatherErrorCodes.RATE_LIMITED,
        httpStatus: 429,
        message: 'Rate limit exceeded',
        cause: 'Too many requests to the weather API',
        recovery: ['Wait for the specified retry-after period', 'Use cached data if available'],
        retryable: true,
      },
      {
        code: WeatherErrorCodes.API_KEY_INVALID,
        httpStatus: 401,
        message: 'Invalid API key',
        cause: 'The OpenWeatherMap API key is missing or invalid',
        recovery: ['Check OPENWEATHERMAP_API_KEY environment variable', 'Verify key is active at openweathermap.org'],
        retryable: false,
      },
    ],
    handler: handleGetCurrentWeather,
  })

  // ============================================================================
  // Get Forecast Tool
  // ============================================================================
  .addTool({
    name: 'get_forecast',
    displayName: 'Get Weather Forecast',
    description: 'Get multi-day weather forecast with daily high/low temperatures, precipitation probability, and conditions.',
    inputSchema: GetForecastInputSchema,
    outputSchema: GetForecastOutputSchema,
    examples: [
      {
        name: '5-day forecast',
        description: 'Get 5-day forecast for London',
        input: {
          location: 'London,UK',
          units: 'metric',
          days: 5,
        },
        output: {
          location: {
            name: 'London',
            country: 'GB',
            coordinates: { lat: 51.5074, lon: -0.1278 },
          },
          forecast: [
            {
              date: '2024-01-15',
              temperature: { min: 4, max: 9, morning: 5, day: 8, evening: 6, night: 4 },
              humidity: 78,
              precipitation: { probability: 60, amount: 2.5, type: 'rain' },
              wind: { speed: 5.2, direction: 240 },
              conditions: [{ id: 500, main: 'Rain', description: 'light rain', icon: '10d' }],
            },
          ],
          generatedAt: '2024-01-15T10:00:00Z',
          cached: false,
        },
      },
    ],
    errors: [
      {
        code: WeatherErrorCodes.LOCATION_NOT_FOUND,
        httpStatus: 404,
        message: 'Location not found',
        cause: 'The specified city name could not be geocoded',
        recovery: ['Check spelling', 'Add country code'],
        retryable: false,
      },
    ],
    handler: handleGetForecast,
  })

  // ============================================================================
  // Get Air Quality Tool
  // ============================================================================
  .addTool({
    name: 'get_air_quality',
    displayName: 'Get Air Quality',
    description: 'Get air quality index and pollutant levels with health recommendations.',
    inputSchema: GetAirQualityInputSchema,
    outputSchema: GetAirQualityOutputSchema,
    examples: [
      {
        name: 'Air quality in Beijing',
        description: 'Check air quality in a city with potential pollution',
        input: {
          location: 'Beijing,CN',
        },
        output: {
          location: {
            name: 'Beijing, CN',
            coordinates: { lat: 39.9042, lon: 116.4074 },
          },
          airQuality: {
            index: 3,
            level: 'moderate',
            dominantPollutant: 'PM2.5',
            components: [
              { name: 'PM2.5', value: 45, unit: 'μg/m³', level: 'moderate' },
              { name: 'PM10', value: 78, unit: 'μg/m³', level: 'moderate' },
            ],
          },
          healthRecommendations: {
            general: 'Consider reducing prolonged outdoor exertion.',
            sensitive: 'Sensitive groups should limit outdoor activities.',
            outdoor: true,
          },
          timestamp: '2024-01-15T10:00:00Z',
          cached: false,
        },
      },
    ],
    errors: [
      {
        code: WeatherErrorCodes.LOCATION_NOT_FOUND,
        httpStatus: 404,
        message: 'Air quality data not available',
        cause: 'No air quality monitoring data for this location',
        recovery: ['Try a nearby major city', 'Use coordinates for precise location'],
        retryable: false,
      },
    ],
    handler: handleGetAirQuality,
  });

// ============================================================================
// Exports
// ============================================================================

export default weatherPlugin;
export * from './schemas.js';
export { initializeWeatherApi, getWeatherApiClient, WeatherApiClient, WeatherApiError } from './api-client.js';

// ============================================================================
// Main Entry Point
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    console.error('Error: OPENWEATHERMAP_API_KEY environment variable is required');
    process.exit(1);
  }

  initializeWeatherApi(apiKey);

  const server = weatherPlugin.buildServer();

  process.on('SIGINT', () => {
    console.log('\nShutting down Weather Plugin...');
    server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.stop();
    process.exit(0);
  });

  console.log('Starting Weather Plugin MCP Server...');
  server.start();
}
