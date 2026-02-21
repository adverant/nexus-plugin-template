import request from 'supertest';
import express from 'express';
import { healthRouter } from '../src/routes/health';
import { apiRouter } from '../src/routes/api';
import { tenantContext } from '../src/middleware/auth';
import { errorHandler, notFoundHandler, AppError, ValidationError, NotFoundError } from '../src/middleware/error-handler';

// ============================================================================
// Test App Setup
// ============================================================================

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(tenantContext);
  app.use('/', healthRouter);
  app.use('/api/v1', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// ============================================================================
// Health Endpoint Tests
// ============================================================================

describe('Health Endpoints', () => {
  const app = createTestApp();

  test('GET /health returns 200 with plugin info', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('memory');
    expect(res.body.memory).toHaveProperty('rss_mb');
    expect(res.body.memory).toHaveProperty('heap_used_mb');
  });

  test('GET /live returns 200 with alive status', async () => {
    const res = await request(app).get('/live');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'alive');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('GET /ready returns status', async () => {
    const res = await request(app).get('/ready');

    // Ready endpoint may return 200 or 503 depending on database config
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('checks');
    expect(res.body.checks).toHaveProperty('server');
  });
});

// ============================================================================
// API Endpoint Tests
// ============================================================================

describe('API Endpoints', () => {
  const app = createTestApp();

  describe('GET /api/v1/info', () => {
    test('returns plugin info and available endpoints', async () => {
      const res = await request(app).get('/api/v1/info');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('endpoints');
      expect(Array.isArray(res.body.endpoints)).toBe(true);
      expect(res.body.endpoints.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('websocket');
      expect(res.body.websocket).toHaveProperty('path', '/ws');
    });
  });

  describe('GET /api/v1/items', () => {
    test('returns items list (empty when no database)', async () => {
      const res = await request(app).get('/api/v1/items');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body).toHaveProperty('total');
    });

    test('accepts query parameters', async () => {
      const res = await request(app)
        .get('/api/v1/items')
        .query({ limit: '10', offset: '0', search: 'test' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
    });
  });

  describe('POST /api/v1/items', () => {
    test('creates item with valid data (mock response without DB)', async () => {
      const res = await request(app)
        .post('/api/v1/items')
        .send({ name: 'Test Item', description: 'A test item' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('item');
      expect(res.body.item).toHaveProperty('name', 'Test Item');
      expect(res.body.item).toHaveProperty('description', 'A test item');
      expect(res.body.item).toHaveProperty('id');
      expect(res.body.item).toHaveProperty('status', 'active');
    });

    test('rejects item with missing name', async () => {
      const res = await request(app)
        .post('/api/v1/items')
        .send({ description: 'No name' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('rejects item with empty name', async () => {
      const res = await request(app)
        .post('/api/v1/items')
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});

// ============================================================================
// Tenant Context Middleware Tests
// ============================================================================

describe('Tenant Context Middleware', () => {
  test('extracts user-id from x-user-id header', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use(tenantContext);
    testApp.get('/test', (req: any, res) => {
      res.json({ userId: req.userId, tenantId: req.tenantId });
    });

    const res = await request(testApp)
      .get('/test')
      .set('x-user-id', 'user-123')
      .set('x-tenant-id', 'tenant-456');

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-123');
    expect(res.body.tenantId).toBe('tenant-456');
  });

  test('handles missing headers gracefully', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use(tenantContext);
    testApp.get('/test', (req: any, res) => {
      res.json({ userId: req.userId || null, tenantId: req.tenantId || null });
    });

    const res = await request(testApp).get('/test');

    expect(res.status).toBe(200);
    expect(res.body.userId).toBeNull();
  });
});

// ============================================================================
// Error Handler Tests
// ============================================================================

describe('Error Handler', () => {
  test('returns 404 for unknown routes', async () => {
    const app = createTestApp();
    const res = await request(app).get('/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Not Found');
    expect(res.body).toHaveProperty('code', 'ROUTE_NOT_FOUND');
  });

  test('AppError class sets correct properties', () => {
    const err = new AppError(400, 'Bad input', 'INVALID');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Bad input');
    expect(err.code).toBe('INVALID');
  });

  test('ValidationError creates 400 error', () => {
    const err = new ValidationError('Name required');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  test('NotFoundError creates 404 error', () => {
    const err = new NotFoundError('Item missing');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  test('handles thrown AppError in route', async () => {
    const app = express();
    app.use(express.json());
    app.get('/error-test', () => {
      throw new ValidationError('Test validation error');
    });
    app.use(errorHandler);

    const res = await request(app).get('/error-test');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Test validation error');
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('handles unknown errors as 500', async () => {
    const app = express();
    app.use(express.json());
    app.get('/error-test', () => {
      throw new Error('Something broke');
    });
    app.use(errorHandler);

    const res = await request(app).get('/error-test');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('code', 'INTERNAL_ERROR');
  });
});
