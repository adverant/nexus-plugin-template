/**
 * Weather API Plugin - Zod Schemas
 *
 * Defines all input/output schemas for the weather API plugin.
 * These schemas are auto-extracted into the Plugin Intelligence Document.
 */

import { z } from 'zod';

// ============================================================================
// Shared Schemas
// ============================================================================

export const UnitsSchema = z
  .enum(['metric', 'imperial', 'kelvin'])
  .default('metric')
  .describe('Temperature units: metric (Celsius), imperial (Fahrenheit), or kelvin');

export const CoordinatesSchema = z.object({
  lat: z
    .number()
    .min(-90)
    .max(90)
    .describe('Latitude coordinate (-90 to 90)'),
  lon: z
    .number()
    .min(-180)
    .max(180)
    .describe('Longitude coordinate (-180 to 180)'),
});

export const WeatherConditionSchema = z.object({
  id: z.number().describe('Weather condition code'),
  main: z.string().describe('Weather condition group (Rain, Snow, Clear, etc.)'),
  description: z.string().describe('Detailed weather description'),
  icon: z.string().describe('Weather icon code'),
});

// ============================================================================
// Get Current Weather Schemas
// ============================================================================

export const GetCurrentWeatherInputSchema = z.object({
  location: z
    .string()
    .min(1)
    .max(100)
    .describe('City name, optionally with country code (e.g., "London,UK" or "New York,US")'),
  units: UnitsSchema,
  lang: z
    .string()
    .length(2)
    .optional()
    .describe('Language code for descriptions (e.g., "en", "es", "fr")'),
});

export const GetCurrentWeatherOutputSchema = z.object({
  location: z.object({
    name: z.string().describe('City name'),
    country: z.string().describe('Country code'),
    coordinates: CoordinatesSchema,
    timezone: z.number().describe('Timezone offset from UTC in seconds'),
  }),
  current: z.object({
    timestamp: z.string().describe('ISO 8601 timestamp of observation'),
    temperature: z.number().describe('Current temperature in requested units'),
    feelsLike: z.number().describe('Perceived temperature'),
    humidity: z.number().min(0).max(100).describe('Humidity percentage'),
    pressure: z.number().describe('Atmospheric pressure in hPa'),
    windSpeed: z.number().describe('Wind speed in requested units'),
    windDirection: z.number().min(0).max(360).describe('Wind direction in degrees'),
    visibility: z.number().describe('Visibility in meters'),
    clouds: z.number().min(0).max(100).describe('Cloudiness percentage'),
    conditions: z.array(WeatherConditionSchema).describe('Current weather conditions'),
  }),
  sun: z.object({
    sunrise: z.string().describe('ISO 8601 sunrise time'),
    sunset: z.string().describe('ISO 8601 sunset time'),
  }),
  cached: z.boolean().describe('Whether this response was served from cache'),
  cacheExpires: z.string().optional().describe('ISO 8601 cache expiration time'),
});

export type GetCurrentWeatherInput = z.infer<typeof GetCurrentWeatherInputSchema>;
export type GetCurrentWeatherOutput = z.infer<typeof GetCurrentWeatherOutputSchema>;

// ============================================================================
// Get Forecast Schemas
// ============================================================================

export const GetForecastInputSchema = z.object({
  location: z
    .string()
    .min(1)
    .max(100)
    .describe('City name, optionally with country code'),
  units: UnitsSchema,
  days: z
    .number()
    .int()
    .min(1)
    .max(7)
    .default(5)
    .describe('Number of days to forecast (1-7)'),
  hourly: z
    .boolean()
    .default(false)
    .describe('Include hourly breakdown for each day'),
});

export const ForecastDaySchema = z.object({
  date: z.string().describe('ISO 8601 date'),
  temperature: z.object({
    min: z.number().describe('Minimum temperature'),
    max: z.number().describe('Maximum temperature'),
    morning: z.number().describe('Morning temperature'),
    day: z.number().describe('Day temperature'),
    evening: z.number().describe('Evening temperature'),
    night: z.number().describe('Night temperature'),
  }),
  humidity: z.number().min(0).max(100).describe('Average humidity percentage'),
  precipitation: z.object({
    probability: z.number().min(0).max(100).describe('Precipitation probability'),
    amount: z.number().describe('Expected precipitation in mm'),
    type: z.enum(['none', 'rain', 'snow', 'mixed']).describe('Precipitation type'),
  }),
  wind: z.object({
    speed: z.number().describe('Wind speed'),
    gust: z.number().optional().describe('Wind gust speed'),
    direction: z.number().describe('Wind direction in degrees'),
  }),
  conditions: z.array(WeatherConditionSchema).describe('Weather conditions for the day'),
  hourly: z
    .array(
      z.object({
        time: z.string().describe('ISO 8601 time'),
        temperature: z.number(),
        feelsLike: z.number(),
        conditions: z.array(WeatherConditionSchema),
      })
    )
    .optional()
    .describe('Hourly breakdown if requested'),
});

export const GetForecastOutputSchema = z.object({
  location: z.object({
    name: z.string().describe('City name'),
    country: z.string().describe('Country code'),
    coordinates: CoordinatesSchema,
  }),
  forecast: z.array(ForecastDaySchema).describe('Daily forecast data'),
  generatedAt: z.string().describe('ISO 8601 timestamp when forecast was generated'),
  cached: z.boolean(),
  cacheExpires: z.string().optional(),
});

export type GetForecastInput = z.infer<typeof GetForecastInputSchema>;
export type GetForecastOutput = z.infer<typeof GetForecastOutputSchema>;

// ============================================================================
// Get Air Quality Schemas
// ============================================================================

export const GetAirQualityInputSchema = z.object({
  location: z
    .string()
    .min(1)
    .max(100)
    .describe('City name or coordinates'),
  coordinates: CoordinatesSchema.optional().describe(
    'Optional precise coordinates (overrides location string)'
  ),
});

export const AirQualityComponentSchema = z.object({
  name: z.string().describe('Pollutant name'),
  value: z.number().describe('Concentration value'),
  unit: z.string().describe('Measurement unit (usually μg/m³)'),
  level: z.enum(['good', 'fair', 'moderate', 'poor', 'very_poor']).describe('Quality level'),
});

export const GetAirQualityOutputSchema = z.object({
  location: z.object({
    name: z.string().describe('Location name'),
    coordinates: CoordinatesSchema,
  }),
  airQuality: z.object({
    index: z.number().min(1).max(5).describe('Air Quality Index (1=Good, 5=Very Poor)'),
    level: z.enum(['good', 'fair', 'moderate', 'poor', 'very_poor']).describe('Overall quality level'),
    dominantPollutant: z.string().describe('Main pollutant affecting the index'),
    components: z.array(AirQualityComponentSchema).describe('Individual pollutant measurements'),
  }),
  healthRecommendations: z.object({
    general: z.string().describe('General health recommendation'),
    sensitive: z.string().describe('Recommendation for sensitive groups'),
    outdoor: z.boolean().describe('Whether outdoor activities are recommended'),
  }),
  timestamp: z.string().describe('ISO 8601 measurement timestamp'),
  cached: z.boolean(),
});

export type GetAirQualityInput = z.infer<typeof GetAirQualityInputSchema>;
export type GetAirQualityOutput = z.infer<typeof GetAirQualityOutputSchema>;

// ============================================================================
// Error Codes
// ============================================================================

export const WeatherErrorCodes = {
  LOCATION_NOT_FOUND: 'LOCATION_NOT_FOUND',
  API_ERROR: 'API_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  API_KEY_INVALID: 'API_KEY_INVALID',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export type WeatherErrorCode = (typeof WeatherErrorCodes)[keyof typeof WeatherErrorCodes];
