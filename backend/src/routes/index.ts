import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';

const router = Router();

/**
 * CUSTOMIZE: Add your plugin's API routes here.
 *
 * All routes are prefixed with /{{PLUGIN_SLUG}}/api (set in index.ts).
 */

// Public health check
router.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: '{{PLUGIN_NAME}}', timestamp: new Date() });
});

// Protected routes (require authentication)
router.use(authenticateUser);

// Example: GET /{{PLUGIN_SLUG}}/api/entities
router.get('/entities', (req, res) => {
  res.json({
    entities: [],
    user_id: req.user?.id,
    message: 'Replace this with your actual entity list',
  });
});

// Example: POST /{{PLUGIN_SLUG}}/api/entities
router.post('/entities', (req, res) => {
  res.status(201).json({
    entity: { id: 'example-id', ...req.body },
    message: 'Replace this with your actual entity creation logic',
  });
});

export default router;
