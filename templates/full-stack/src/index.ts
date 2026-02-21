import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { healthRouter } from './routes/health';
import { apiRouter } from './routes/api';
import { tenantContext } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { NexusRegistration } from './services/nexus-registration';
import { pool, initDatabase } from './database/pool';

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const PLUGIN_NAME = process.env.PLUGIN_NAME || '{{PLUGIN_NAME}}';
const PLUGIN_VERSION = process.env.PLUGIN_VERSION || '1.0.0';

// ============================================================================
// Express Application
// ============================================================================

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS - allow Nexus dashboard and proxy
app.use(cors({
  origin: [
    'https://dashboard.adverant.ai',
    'https://api.adverant.ai',
    /^https?:\/\/localhost(:\d+)?$/,
  ],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  req.headers['x-request-id'] = requestId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health' && req.path !== '/ready' && req.path !== '/live') {
      console.log(JSON.stringify({
        level: 'info',
        msg: 'request',
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: duration,
        request_id: requestId,
        user_id: req.headers['x-user-id'],
        tenant_id: req.headers['x-tenant-id'],
      }));
    }
  });

  next();
});

// Tenant context extraction from Nexus proxy headers
app.use(tenantContext);

// ============================================================================
// Routes
// ============================================================================

// Health check endpoints (no auth required)
app.use('/', healthRouter);

// Plugin API routes
app.use('/api/v1', apiRouter);

// Serve static UI files if present (for standalone UI mode)
// The UI build output should be placed in ./public/
import path from 'path';
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA fallback: serve index.html for unmatched routes (for Next.js standalone or SPA)
app.get('*', (req, res, next) => {
  // Don't intercept API routes or health checks
  if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/ready' || req.path === '/live') {
    return next();
  }

  const indexPath = path.join(publicDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      next(); // Fall through to 404 handler
    }
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// WebSocket Server
// ============================================================================

const wss = new WebSocketServer({ server, path: '/ws' });

// Track connected clients by tenant
const wsClients = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const userId = url.searchParams.get('user_id') ||
                 req.headers['x-user-id'] as string ||
                 'anonymous';

  console.log(JSON.stringify({
    level: 'info',
    msg: 'ws_connected',
    user_id: userId,
  }));

  // Track client
  if (!wsClients.has(userId)) {
    wsClients.set(userId, new Set());
  }
  wsClients.get(userId)!.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    plugin: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    timestamp: new Date().toISOString(),
  }));

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleWebSocketMessage(ws, userId, message);
    } catch (err) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  });

  ws.on('close', () => {
    const clients = wsClients.get(userId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        wsClients.delete(userId);
      }
    }
    console.log(JSON.stringify({
      level: 'info',
      msg: 'ws_disconnected',
      user_id: userId,
    }));
  });

  ws.on('error', (err) => {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'ws_error',
      user_id: userId,
      error: err.message,
    }));
  });
});

/**
 * Handle incoming WebSocket messages.
 * Extend this function with your plugin's real-time message handlers.
 */
function handleWebSocketMessage(ws: WebSocket, userId: string, message: Record<string, unknown>) {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;

    case 'subscribe':
      // Example: subscribe to events for a specific resource
      ws.send(JSON.stringify({
        type: 'subscribed',
        channel: message.channel,
        timestamp: new Date().toISOString(),
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'ack',
        received: message.type,
        timestamp: new Date().toISOString(),
      }));
  }
}

/**
 * Broadcast a message to all WebSocket clients for a specific user.
 * Use this from your API routes to push real-time updates.
 */
export function broadcastToUser(userId: string, message: Record<string, unknown>) {
  const clients = wsClients.get(userId);
  if (clients) {
    const payload = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}

/**
 * Broadcast a message to ALL connected WebSocket clients.
 */
export function broadcastToAll(message: Record<string, unknown>) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ============================================================================
// Server Startup
// ============================================================================

let isReady = false;

async function start() {
  try {
    console.log(JSON.stringify({
      level: 'info',
      msg: 'starting',
      plugin: PLUGIN_NAME,
      version: PLUGIN_VERSION,
      env: NODE_ENV,
    }));

    // Initialize database connection pool and run migrations
    if (process.env.DATABASE_URL) {
      await initDatabase();
      console.log(JSON.stringify({ level: 'info', msg: 'database_connected' }));
    } else {
      console.log(JSON.stringify({ level: 'info', msg: 'database_skipped', reason: 'DATABASE_URL not set' }));
    }

    // Self-register with Nexus platform
    if (process.env.NEXUS_API_URL && process.env.NEXUS_API_KEY) {
      const registration = new NexusRegistration();
      await registration.register();
    } else {
      console.log(JSON.stringify({ level: 'info', msg: 'nexus_registration_skipped', reason: 'NEXUS_API_URL or NEXUS_API_KEY not set' }));
    }

    // Start HTTP server
    server.listen(PORT, HOST, () => {
      isReady = true;
      console.log(JSON.stringify({
        level: 'info',
        msg: 'listening',
        host: HOST,
        port: PORT,
        url: `http://${HOST}:${PORT}`,
        health: `http://${HOST}:${PORT}/health`,
        api: `http://${HOST}:${PORT}/api/v1`,
        ws: `ws://${HOST}:${PORT}/ws`,
      }));
    });
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'startup_failed',
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }));
    process.exit(1);
  }
}

// Export isReady for health checks
export function getReadyState(): boolean {
  return isReady;
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

async function shutdown(signal: string) {
  console.log(JSON.stringify({
    level: 'info',
    msg: 'shutdown_initiated',
    signal,
  }));

  isReady = false;

  // Close WebSocket connections
  wss.clients.forEach((client) => {
    client.close(1001, 'Server shutting down');
  });
  wss.close();

  // Close HTTP server (stop accepting new connections)
  server.close();

  // Close database pool
  try {
    await pool.end();
  } catch {
    // Pool may not be initialized
  }

  console.log(JSON.stringify({
    level: 'info',
    msg: 'shutdown_complete',
  }));

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled error safety nets
process.on('uncaughtException', (err) => {
  console.error(JSON.stringify({
    level: 'error',
    msg: 'uncaught_exception',
    error: err.message,
    stack: err.stack,
  }));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(JSON.stringify({
    level: 'error',
    msg: 'unhandled_rejection',
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  }));
});

// Start the server
start();
