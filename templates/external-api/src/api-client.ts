/**
 * Weather API Client
 *
 * Handles all HTTP communication with the OpenWeatherMap API.
 * Includes rate limiting, caching, retry logic, and error handling.
 */

import { WeatherErrorCodes, type WeatherErrorCode } from './schemas.js';

// ============================================================================
// Configuration
// ============================================================================

export interface WeatherApiConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  cacheTtl?: number;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

const DEFAULT_CONFIG: Omit<Required<WeatherApiConfig>, 'apiKey'> = {
  baseUrl: 'https://api.openweathermap.org',
  timeout: 10000,
  maxRetries: 3,
  cacheTtl: 300, // 5 minutes
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerDay: 1000,
  },
};

// ============================================================================
// Error Classes
// ============================================================================

export class WeatherApiError extends Error {
  public readonly code: WeatherErrorCode;
  public readonly httpStatus: number;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;

  constructor(
    code: WeatherErrorCode,
    message: string,
    httpStatus: number,
    retryable: boolean,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'WeatherApiError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

class RateLimiter {
  private minuteRequests: number[] = [];
  private dayRequests: number[] = [];
  private readonly perMinute: number;
  private readonly perDay: number;

  constructor(perMinute: number, perDay: number) {
    this.perMinute = perMinute;
    this.perDay = perDay;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Clean up old entries
    this.minuteRequests = this.minuteRequests.filter((t) => t > oneMinuteAgo);
    this.dayRequests = this.dayRequests.filter((t) => t > oneDayAgo);

    return (
      this.minuteRequests.length < this.perMinute && this.dayRequests.length < this.perDay
    );
  }

  recordRequest(): void {
    const now = Date.now();
    this.minuteRequests.push(now);
    this.dayRequests.push(now);
  }

  getRetryAfter(): number {
    if (this.minuteRequests.length >= this.perMinute) {
      const oldestMinuteRequest = this.minuteRequests[0];
      return Math.ceil((oldestMinuteRequest + 60 * 1000 - Date.now()) / 1000);
    }
    if (this.dayRequests.length >= this.perDay) {
      const oldestDayRequest = this.dayRequests[0];
      return Math.ceil((oldestDayRequest + 24 * 60 * 60 * 1000 - Date.now()) / 1000);
    }
    return 0;
  }

  getUsage(): { minute: number; day: number } {
    return {
      minute: this.minuteRequests.length,
      day: this.dayRequests.length,
    };
  }
}

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;

  constructor(ttlSeconds: number) {
    this.ttl = ttlSeconds * 1000;
  }

  get(key: string): { data: T; expiresAt: Date } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return { data: entry.data, expiresAt: new Date(entry.expiresAt) };
  }

  set(key: string, data: T): Date {
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, { data, expiresAt });
    return new Date(expiresAt);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// API Client
// ============================================================================

export class WeatherApiClient {
  private readonly config: Required<WeatherApiConfig>;
  private readonly rateLimiter: RateLimiter;
  private readonly cache: SimpleCache<unknown>;

  constructor(config: WeatherApiConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<WeatherApiConfig>;
    this.rateLimiter = new RateLimiter(
      this.config.rateLimit.requestsPerMinute,
      this.config.rateLimit.requestsPerDay
    );
    this.cache = new SimpleCache(this.config.cacheTtl);
  }

  /**
   * Make a cached API request
   */
  async request<T>(
    endpoint: string,
    params: Record<string, string | number | boolean>,
    options: { skipCache?: boolean } = {}
  ): Promise<{ data: T; cached: boolean; cacheExpires?: Date }> {
    const cacheKey = this.buildCacheKey(endpoint, params);

    // Check cache first
    if (!options.skipCache) {
      const cached = this.cache.get(cacheKey) as { data: T; expiresAt: Date } | null;
      if (cached) {
        return { data: cached.data, cached: true, cacheExpires: cached.expiresAt };
      }
    }

    // Check rate limit
    if (!this.rateLimiter.canMakeRequest()) {
      const retryAfter = this.rateLimiter.getRetryAfter();
      throw new WeatherApiError(
        WeatherErrorCodes.RATE_LIMITED,
        `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
        429,
        true,
        retryAfter
      );
    }

    // Make the request with retry logic
    const data = await this.fetchWithRetry<T>(endpoint, params);

    // Cache the result
    const cacheExpires = this.cache.set(cacheKey, data);

    return { data, cached: false, cacheExpires };
  }

  /**
   * Fetch with exponential backoff retry
   */
  private async fetchWithRetry<T>(
    endpoint: string,
    params: Record<string, string | number | boolean>,
    attempt: number = 1
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);

    try {
      this.rateLimiter.recordRequest();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'NexusWeatherPlugin/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await this.handleHttpError(response);
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error) {
      if (error instanceof WeatherApiError) {
        // Retry if retryable and we have attempts left
        if (error.retryable && attempt < this.config.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await this.sleep(delay);
          return this.fetchWithRetry<T>(endpoint, params, attempt + 1);
        }
        throw error;
      }

      // Handle network errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new WeatherApiError(
            WeatherErrorCodes.TIMEOUT,
            `Request timed out after ${this.config.timeout}ms`,
            408,
            true
          );
        }

        throw new WeatherApiError(
          WeatherErrorCodes.NETWORK_ERROR,
          `Network error: ${error.message}`,
          0,
          true
        );
      }

      throw new WeatherApiError(
        WeatherErrorCodes.API_ERROR,
        'Unknown error occurred',
        500,
        false
      );
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleHttpError(response: Response): Promise<WeatherApiError> {
    let message = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch {
      // Ignore JSON parse errors
    }

    switch (response.status) {
      case 401:
        return new WeatherApiError(
          WeatherErrorCodes.API_KEY_INVALID,
          'Invalid API key',
          401,
          false
        );
      case 404:
        return new WeatherApiError(
          WeatherErrorCodes.LOCATION_NOT_FOUND,
          `Location not found: ${message}`,
          404,
          false
        );
      case 429:
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        return new WeatherApiError(
          WeatherErrorCodes.RATE_LIMITED,
          'API rate limit exceeded',
          429,
          true,
          retryAfter
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new WeatherApiError(
          WeatherErrorCodes.SERVICE_UNAVAILABLE,
          `Service unavailable: ${message}`,
          response.status,
          true
        );
      default:
        return new WeatherApiError(
          WeatherErrorCodes.API_ERROR,
          message,
          response.status,
          response.status >= 500
        );
    }
  }

  /**
   * Build the full URL with query parameters
   */
  private buildUrl(
    endpoint: string,
    params: Record<string, string | number | boolean>
  ): string {
    const url = new URL(endpoint, this.config.baseUrl);
    url.searchParams.set('appid', this.config.apiKey);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  /**
   * Build cache key from endpoint and params
   */
  private buildCacheKey(
    endpoint: string,
    params: Record<string, string | number | boolean>
  ): string {
    const sortedParams = Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    return `${endpoint}?${sortedParams}`;
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get rate limit usage statistics
   */
  getRateLimitUsage(): { minute: number; day: number; maxMinute: number; maxDay: number } {
    const usage = this.rateLimiter.getUsage();
    return {
      ...usage,
      maxMinute: this.config.rateLimit.requestsPerMinute,
      maxDay: this.config.rateLimit.requestsPerDay,
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let clientInstance: WeatherApiClient | null = null;

export function getWeatherApiClient(config?: WeatherApiConfig): WeatherApiClient {
  if (!clientInstance && !config) {
    throw new WeatherApiError(
      WeatherErrorCodes.API_KEY_INVALID,
      'Weather API client not initialized. Provide config with API key.',
      401,
      false
    );
  }

  if (config) {
    clientInstance = new WeatherApiClient(config);
  }

  return clientInstance!;
}

export function initializeWeatherApi(apiKey: string, config?: Partial<WeatherApiConfig>): void {
  clientInstance = new WeatherApiClient({ apiKey, ...config });
}
