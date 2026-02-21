import { Router, Request, Response } from 'express';
import { getReadyState } from '../index';
import { pool } from '../database/pool';

export const healthRouter = Router();

const PLUGIN_NAME = process.env.PLUGIN_NAME || '{{PLUGIN_NAME}}';
const PLUGIN_VERSION = process.env.PLUGIN_VERSION || '1.0.0';
const startedAt = new Date().toISOString();

/**
 * Health check endpoint.
 * Called by K8s liveness probe. Returns 200 if the process is alive.
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    plugin: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    uptime: process.uptime(),
    started_at: startedAt,
    timestamp: new Date().toISOString(),
    memory: {
      rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  });
});

/**
 * Readiness probe endpoint.
 * Called by K8s readiness probe. Returns 200 only when the plugin is ready
 * to accept traffic (database connected, services initialized, etc.)
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency_ms?: number }> = {};

  // Check server readiness
  const ready = getReadyState();
  checks.server = { status: ready ? 'ok' : 'not_ready' };

  // Check database if configured
  if (process.env.DATABASE_URL) {
    const dbStart = Date.now();
    try {
      await pool.query('SELECT 1');
      checks.database = { status: 'ok', latency_ms: Date.now() - dbStart };
    } catch {
      checks.database = { status: 'error', latency_ms: Date.now() - dbStart };
    }
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'ok');

  if (allHealthy) {
    res.json({ status: 'ready', checks });
  } else {
    res.status(503).json({ status: 'not_ready', checks });
  }
});

/**
 * Liveness probe endpoint.
 * Lightweight check that the process is alive and responsive.
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});
