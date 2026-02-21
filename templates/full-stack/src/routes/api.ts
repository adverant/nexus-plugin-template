import { Router, Request, Response } from 'express';
import { pool } from '../database/pool';
import { broadcastToUser } from '../index';

export const apiRouter = Router();

// ============================================================================
// Types
// ============================================================================

interface TenantRequest extends Request {
  userId?: string;
  tenantId?: string;
  requestId?: string;
}

// ============================================================================
// Example: Items CRUD API
// Replace this with your plugin's actual API endpoints.
// ============================================================================

/**
 * GET /api/v1/items
 * List items for the current tenant.
 */
apiRouter.get('/items', async (req: TenantRequest, res: Response) => {
  try {
    const { limit = '50', offset = '0', search } = req.query;

    if (!process.env.DATABASE_URL) {
      return res.json({
        items: [],
        total: 0,
        message: 'Database not configured. Set DATABASE_URL to enable persistence.',
      });
    }

    let sql = `
      SELECT id, name, description, status, metadata, created_at, updated_at
      FROM items
      WHERE organization_id = $1
    `;
    const params: (string | number)[] = [req.tenantId || req.userId || 'default'];

    if (search) {
      sql += ` AND (name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

    const result = await pool.query(sql, params);

    // Get total count
    const countSql = `SELECT COUNT(*) FROM items WHERE organization_id = $1`;
    const countResult = await pool.query(countSql, [req.tenantId || req.userId || 'default']);

    res.json({
      items: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'list_items_failed',
      error: err instanceof Error ? err.message : String(err),
      request_id: req.requestId,
    }));
    res.status(500).json({ error: 'Failed to list items' });
  }
});

/**
 * GET /api/v1/items/:id
 * Get a single item by ID.
 */
apiRouter.get('/items/:id', async (req: TenantRequest, res: Response) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(404).json({ error: 'Item not found (database not configured)' });
    }

    const sql = `
      SELECT id, name, description, status, metadata, created_at, updated_at
      FROM items
      WHERE id = $1 AND organization_id = $2
    `;
    const result = await pool.query(sql, [
      req.params.id,
      req.tenantId || req.userId || 'default',
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'get_item_failed',
      error: err instanceof Error ? err.message : String(err),
      item_id: req.params.id,
    }));
    res.status(500).json({ error: 'Failed to get item' });
  }
});

/**
 * POST /api/v1/items
 * Create a new item.
 */
apiRouter.post('/items', async (req: TenantRequest, res: Response) => {
  try {
    const { name, description, metadata } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!process.env.DATABASE_URL) {
      // Return mock response when database is not configured
      const mockItem = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description || null,
        status: 'active',
        metadata: metadata || {},
        organization_id: req.tenantId || req.userId || 'default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return res.status(201).json({ item: mockItem, note: 'Database not configured - item not persisted' });
    }

    const sql = `
      INSERT INTO items (name, description, status, metadata, organization_id)
      VALUES ($1, $2, 'active', $3, $4)
      RETURNING id, name, description, status, metadata, created_at, updated_at
    `;
    const result = await pool.query(sql, [
      name.trim(),
      description || null,
      JSON.stringify(metadata || {}),
      req.tenantId || req.userId || 'default',
    ]);

    const item = result.rows[0];

    // Broadcast creation event via WebSocket
    if (req.userId) {
      broadcastToUser(req.userId, {
        type: 'item:created',
        item,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({ item });
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'create_item_failed',
      error: err instanceof Error ? err.message : String(err),
    }));
    res.status(500).json({ error: 'Failed to create item' });
  }
});

/**
 * PATCH /api/v1/items/:id
 * Update an existing item.
 */
apiRouter.patch('/items/:id', async (req: TenantRequest, res: Response) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(404).json({ error: 'Item not found (database not configured)' });
    }

    const { name, description, status, metadata } = req.body;
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(metadata));
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    setClauses.push(`updated_at = NOW()`);

    const sql = `
      UPDATE items
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
      RETURNING id, name, description, status, metadata, created_at, updated_at
    `;
    values.push(req.params.id, req.tenantId || req.userId || 'default');

    const result = await pool.query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = result.rows[0];

    // Broadcast update event via WebSocket
    if (req.userId) {
      broadcastToUser(req.userId, {
        type: 'item:updated',
        item,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ item });
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'update_item_failed',
      error: err instanceof Error ? err.message : String(err),
      item_id: req.params.id,
    }));
    res.status(500).json({ error: 'Failed to update item' });
  }
});

/**
 * DELETE /api/v1/items/:id
 * Delete an item.
 */
apiRouter.delete('/items/:id', async (req: TenantRequest, res: Response) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(404).json({ error: 'Item not found (database not configured)' });
    }

    const sql = `
      DELETE FROM items
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `;
    const result = await pool.query(sql, [
      req.params.id,
      req.tenantId || req.userId || 'default',
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Broadcast deletion event via WebSocket
    if (req.userId) {
      broadcastToUser(req.userId, {
        type: 'item:deleted',
        item_id: req.params.id,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'delete_item_failed',
      error: err instanceof Error ? err.message : String(err),
      item_id: req.params.id,
    }));
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ============================================================================
// Plugin Info Endpoint
// ============================================================================

/**
 * GET /api/v1/info
 * Returns plugin metadata and available endpoints.
 */
apiRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    plugin: process.env.PLUGIN_NAME || '{{PLUGIN_NAME}}',
    version: process.env.PLUGIN_VERSION || '1.0.0',
    description: '{{PLUGIN_DISPLAY_NAME}} - A Nexus marketplace plugin',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check' },
      { method: 'GET', path: '/ready', description: 'Readiness probe' },
      { method: 'GET', path: '/live', description: 'Liveness probe' },
      { method: 'GET', path: '/api/v1/info', description: 'Plugin info' },
      { method: 'GET', path: '/api/v1/items', description: 'List items' },
      { method: 'GET', path: '/api/v1/items/:id', description: 'Get item' },
      { method: 'POST', path: '/api/v1/items', description: 'Create item' },
      { method: 'PATCH', path: '/api/v1/items/:id', description: 'Update item' },
      { method: 'DELETE', path: '/api/v1/items/:id', description: 'Delete item' },
    ],
    websocket: {
      path: '/ws',
      events: ['item:created', 'item:updated', 'item:deleted'],
    },
  });
});
