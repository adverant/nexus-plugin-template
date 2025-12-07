/**
 * Weather API Plugin - Tool Handlers
 *
 * Implements the business logic for each weather API tool.
 * Transforms raw API responses into structured output matching schemas.
 */

import { type MCPToolContext } from '@adverant-nexus/plugin-sdk';
import { getWeatherApiClient, WeatherApiError } from './api-client.js';
import {
  type GetCurrentWeatherInput,
  type GetCurrentWeatherOutput,
  type GetForecastInput,
  type GetForecastOutput,
  type GetAirQualityInput,
  type GetAirQualityOutput,
  WeatherErrorCodes,
} from './schemas.js';

// ============================================================================
// OpenWeatherMap API Response Types
// ============================================================================

interface OWMCurrentWeatherResponse {
  coord: { lon: number; lat: number };
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: { speed: number; deg: number; gust?: number };
  clouds: { all: number };
  dt: number;
  sys: { country: string; sunrise: number; sunset: number };
  timezone: number;
  name: string;
}

interface OWMForecastResponse {
  city: {
    name: string;
    country: string;
    coord: { lat: number; lon: number };
  };
  list: Array<{
    dt: number;
    main: { temp: number; feels_like: number; temp_min: number; temp_max: number; humidity: number };
    weather: Array<{ id: number; main: string; description: string; icon: string }>;
    wind: { speed: number; deg: number; gust?: number };
    pop: number;
    rain?: { '3h': number };
    snow?: { '3h': number };
  }>;
}

interface OWMAirPollutionResponse {
  coord: { lon: number; lat: number };
  list: Array<{
    dt: number;
    main: { aqi: number };
    components: {
      co: number;
      no: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      nh3: number;
    };
  }>;
}

// ============================================================================
// Unit Mapping
// ============================================================================

function getUnitsParam(units: 'metric' | 'imperial' | 'kelvin'): string {
  switch (units) {
    case 'metric':
      return 'metric';
    case 'imperial':
      return 'imperial';
    case 'kelvin':
      return 'standard';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function timestampToISO(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function getAirQualityLevel(
  aqi: number
): 'good' | 'fair' | 'moderate' | 'poor' | 'very_poor' {
  switch (aqi) {
    case 1:
      return 'good';
    case 2:
      return 'fair';
    case 3:
      return 'moderate';
    case 4:
      return 'poor';
    case 5:
      return 'very_poor';
    default:
      return 'moderate';
  }
}

function getHealthRecommendations(aqi: number): {
  general: string;
  sensitive: string;
  outdoor: boolean;
} {
  switch (aqi) {
    case 1:
      return {
        general: 'Air quality is ideal for most outdoor activities.',
        sensitive: 'No restrictions for sensitive groups.',
        outdoor: true,
      };
    case 2:
      return {
        general: 'Air quality is acceptable for outdoor activities.',
        sensitive: 'Sensitive individuals should consider limiting prolonged outdoor exertion.',
        outdoor: true,
      };
    case 3:
      return {
        general: 'Consider reducing prolonged outdoor exertion.',
        sensitive: 'Sensitive groups should limit outdoor activities.',
        outdoor: true,
      };
    case 4:
      return {
        general: 'Reduce prolonged outdoor exertion. Take more breaks during outdoor activities.',
        sensitive: 'Sensitive groups should avoid outdoor activities.',
        outdoor: false,
      };
    case 5:
      return {
        general: 'Avoid all outdoor physical activities. Stay indoors if possible.',
        sensitive: 'Sensitive groups should stay indoors with air filtration.',
        outdoor: false,
      };
    default:
      return {
        general: 'Air quality information unavailable.',
        sensitive: 'Monitor local air quality reports.',
        outdoor: true,
      };
  }
}

function getDominantPollutant(components: OWMAirPollutionResponse['list'][0]['components']): string {
  const thresholds: Record<string, number> = {
    pm2_5: 25, // WHO guideline
    pm10: 50,
    o3: 100,
    no2: 200,
    so2: 350,
    co: 10000,
  };

  let dominant = 'pm2_5';
  let highestRatio = 0;

  for (const [pollutant, threshold] of Object.entries(thresholds)) {
    const value = components[pollutant as keyof typeof components];
    const ratio = value / threshold;
    if (ratio > highestRatio) {
      highestRatio = ratio;
      dominant = pollutant;
    }
  }

  return dominant.toUpperCase().replace('_', '.');
}

// ============================================================================
// Handlers
// ============================================================================

export async function handleGetCurrentWeather(
  input: GetCurrentWeatherInput,
  context: MCPToolContext
): Promise<GetCurrentWeatherOutput> {
  const { location, units, lang } = input;

  context.logger.info('Fetching current weather', { location, units });

  const client = getWeatherApiClient();

  const { data, cached, cacheExpires } = await client.request<OWMCurrentWeatherResponse>(
    '/data/2.5/weather',
    {
      q: location,
      units: getUnitsParam(units),
      ...(lang && { lang }),
    }
  );

  context.logger.debug('Weather data received', {
    city: data.name,
    temp: data.main.temp,
    cached,
  });

  return {
    location: {
      name: data.name,
      country: data.sys.country,
      coordinates: {
        lat: data.coord.lat,
        lon: data.coord.lon,
      },
      timezone: data.timezone,
    },
    current: {
      timestamp: timestampToISO(data.dt),
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      visibility: data.visibility,
      clouds: data.clouds.all,
      conditions: data.weather.map((w) => ({
        id: w.id,
        main: w.main,
        description: w.description,
        icon: w.icon,
      })),
    },
    sun: {
      sunrise: timestampToISO(data.sys.sunrise),
      sunset: timestampToISO(data.sys.sunset),
    },
    cached,
    cacheExpires: cacheExpires?.toISOString(),
  };
}

export async function handleGetForecast(
  input: GetForecastInput,
  context: MCPToolContext
): Promise<GetForecastOutput> {
  const { location, units, days, hourly } = input;

  context.logger.info('Fetching weather forecast', { location, units, days, hourly });

  const client = getWeatherApiClient();

  const { data, cached, cacheExpires } = await client.request<OWMForecastResponse>(
    '/data/2.5/forecast',
    {
      q: location,
      units: getUnitsParam(units),
      cnt: Math.min(days * 8, 40), // 3-hour intervals, max 5 days
    }
  );

  // Group forecast entries by day
  const dailyMap = new Map<
    string,
    {
      temps: number[];
      humidity: number[];
      precip: { prob: number; amount: number; type: string }[];
      wind: { speed: number; gust?: number; direction: number }[];
      conditions: Array<{ id: number; main: string; description: string; icon: string }>;
      hourly: Array<{
        time: string;
        temperature: number;
        feelsLike: number;
        conditions: Array<{ id: number; main: string; description: string; icon: string }>;
      }>;
    }
  >();

  for (const entry of data.list) {
    const date = new Date(entry.dt * 1000).toISOString().split('T')[0];

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        temps: [],
        humidity: [],
        precip: [],
        wind: [],
        conditions: [],
        hourly: [],
      });
    }

    const dayData = dailyMap.get(date)!;
    dayData.temps.push(entry.main.temp);
    dayData.humidity.push(entry.main.humidity);

    const precipAmount = (entry.rain?.['3h'] || 0) + (entry.snow?.['3h'] || 0);
    const precipType = entry.snow?.['3h']
      ? 'snow'
      : entry.rain?.['3h']
        ? 'rain'
        : precipAmount > 0
          ? 'mixed'
          : 'none';

    dayData.precip.push({ prob: entry.pop * 100, amount: precipAmount, type: precipType });
    dayData.wind.push({ speed: entry.wind.speed, gust: entry.wind.gust, direction: entry.wind.deg });
    dayData.conditions.push(...entry.weather);

    if (hourly) {
      dayData.hourly.push({
        time: timestampToISO(entry.dt),
        temperature: entry.main.temp,
        feelsLike: entry.main.feels_like,
        conditions: entry.weather,
      });
    }
  }

  // Convert to forecast days
  const forecast = Array.from(dailyMap.entries())
    .slice(0, days)
    .map(([date, dayData]) => {
      const temps = dayData.temps;
      const avgHumidity = dayData.humidity.reduce((a, b) => a + b, 0) / dayData.humidity.length;
      const maxPrecipProb = Math.max(...dayData.precip.map((p) => p.prob));
      const totalPrecip = dayData.precip.reduce((a, b) => a + b.amount, 0);
      const avgWindSpeed = dayData.wind.reduce((a, b) => a + b.speed, 0) / dayData.wind.length;
      const avgWindDir = dayData.wind.reduce((a, b) => a + b.direction, 0) / dayData.wind.length;

      // Determine precipitation type
      const precipTypes = dayData.precip.map((p) => p.type).filter((t) => t !== 'none');
      const precipType = precipTypes.length === 0 ? 'none' : precipTypes.includes('mixed') ? 'mixed' : precipTypes[0];

      // Get unique conditions
      const uniqueConditions = dayData.conditions.filter(
        (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i
      );

      return {
        date,
        temperature: {
          min: Math.min(...temps),
          max: Math.max(...temps),
          morning: temps[0] || temps[Math.floor(temps.length / 4)],
          day: temps[Math.floor(temps.length / 2)],
          evening: temps[Math.floor((temps.length * 3) / 4)],
          night: temps[temps.length - 1] || temps[Math.floor((temps.length * 7) / 8)],
        },
        humidity: Math.round(avgHumidity),
        precipitation: {
          probability: Math.round(maxPrecipProb),
          amount: Math.round(totalPrecip * 10) / 10,
          type: precipType as 'none' | 'rain' | 'snow' | 'mixed',
        },
        wind: {
          speed: Math.round(avgWindSpeed * 10) / 10,
          direction: Math.round(avgWindDir),
        },
        conditions: uniqueConditions.slice(0, 3),
        hourly: hourly ? dayData.hourly : undefined,
      };
    });

  context.logger.debug('Forecast processed', {
    city: data.city.name,
    daysReturned: forecast.length,
    cached,
  });

  return {
    location: {
      name: data.city.name,
      country: data.city.country,
      coordinates: {
        lat: data.city.coord.lat,
        lon: data.city.coord.lon,
      },
    },
    forecast,
    generatedAt: new Date().toISOString(),
    cached,
    cacheExpires: cacheExpires?.toISOString(),
  };
}

export async function handleGetAirQuality(
  input: GetAirQualityInput,
  context: MCPToolContext
): Promise<GetAirQualityOutput> {
  const { location, coordinates } = input;

  context.logger.info('Fetching air quality', { location, coordinates });

  const client = getWeatherApiClient();

  // If no coordinates provided, first geocode the location
  let lat: number;
  let lon: number;
  let locationName: string;

  if (coordinates) {
    lat = coordinates.lat;
    lon = coordinates.lon;
    locationName = location;
  } else {
    // Get coordinates from location name
    const { data: geoData } = await client.request<OWMCurrentWeatherResponse>(
      '/data/2.5/weather',
      { q: location }
    );
    lat = geoData.coord.lat;
    lon = geoData.coord.lon;
    locationName = `${geoData.name}, ${geoData.sys.country}`;
  }

  // Fetch air quality data
  const { data, cached } = await client.request<OWMAirPollutionResponse>(
    '/data/2.5/air_pollution',
    { lat, lon }
  );

  if (!data.list || data.list.length === 0) {
    throw new WeatherApiError(
      WeatherErrorCodes.LOCATION_NOT_FOUND,
      'Air quality data not available for this location',
      404,
      false
    );
  }

  const pollution = data.list[0];
  const aqi = pollution.main.aqi;
  const level = getAirQualityLevel(aqi);

  // Build component list
  const components = [
    { name: 'PM2.5', value: pollution.components.pm2_5, unit: 'μg/m³', level: getAirQualityLevel(pollution.components.pm2_5 > 75 ? 5 : pollution.components.pm2_5 > 50 ? 4 : pollution.components.pm2_5 > 25 ? 3 : pollution.components.pm2_5 > 10 ? 2 : 1) },
    { name: 'PM10', value: pollution.components.pm10, unit: 'μg/m³', level: getAirQualityLevel(pollution.components.pm10 > 150 ? 5 : pollution.components.pm10 > 100 ? 4 : pollution.components.pm10 > 50 ? 3 : pollution.components.pm10 > 20 ? 2 : 1) },
    { name: 'O3 (Ozone)', value: pollution.components.o3, unit: 'μg/m³', level: getAirQualityLevel(pollution.components.o3 > 240 ? 5 : pollution.components.o3 > 180 ? 4 : pollution.components.o3 > 100 ? 3 : pollution.components.o3 > 60 ? 2 : 1) },
    { name: 'NO2', value: pollution.components.no2, unit: 'μg/m³', level: getAirQualityLevel(pollution.components.no2 > 400 ? 5 : pollution.components.no2 > 200 ? 4 : pollution.components.no2 > 70 ? 3 : pollution.components.no2 > 40 ? 2 : 1) },
    { name: 'SO2', value: pollution.components.so2, unit: 'μg/m³', level: getAirQualityLevel(pollution.components.so2 > 500 ? 5 : pollution.components.so2 > 350 ? 4 : pollution.components.so2 > 100 ? 3 : pollution.components.so2 > 20 ? 2 : 1) },
    { name: 'CO', value: pollution.components.co, unit: 'μg/m³', level: getAirQualityLevel(pollution.components.co > 15400 ? 5 : pollution.components.co > 12400 ? 4 : pollution.components.co > 9400 ? 3 : pollution.components.co > 4400 ? 2 : 1) },
  ];

  context.logger.debug('Air quality processed', {
    location: locationName,
    aqi,
    level,
    cached,
  });

  return {
    location: {
      name: locationName,
      coordinates: { lat, lon },
    },
    airQuality: {
      index: aqi,
      level,
      dominantPollutant: getDominantPollutant(pollution.components),
      components,
    },
    healthRecommendations: getHealthRecommendations(aqi),
    timestamp: timestampToISO(pollution.dt),
    cached,
  };
}
