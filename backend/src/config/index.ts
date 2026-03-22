/**
 * Plugin Configuration
 *
 * CUSTOMIZE: Add your plugin-specific environment variables
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '9099', 10),
    wsPort: parseInt(process.env.WS_PORT || '9100', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(','),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
  },
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'nexus',
    user: process.env.POSTGRES_USER || 'nexus',
    password: process.env.POSTGRES_PASSWORD || 'nexus',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  // CUSTOMIZE: Add plugin-specific config sections
  features: {
    enableWebSocket: process.env.ENABLE_WEBSOCKET === 'true',
  },
};
