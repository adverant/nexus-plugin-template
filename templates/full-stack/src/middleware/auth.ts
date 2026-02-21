import { Request, Response, NextFunction } from 'express';

/**
 * Tenant context extraction middleware.
 *
 * When a request comes through the Nexus plugin proxy, it includes
 * standardized headers identifying the user and tenant. This middleware
 * extracts those headers and attaches them to the request object.
 *
 * Headers set by the Nexus proxy:
 * - x-user-id: The authenticated user's ID
 * - x-tenant-id: The tenant/organization ID
 * - x-request-id: Unique request trace ID
 * - x-subscription-tier: User's subscription tier (free, starter, professional, etc.)
 *
 * For direct access (development), falls back to query params or defaults.
 */

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string;
      requestId?: string;
      subscriptionTier?: string;
    }
  }
}

export function tenantContext(req: Request, _res: Response, next: NextFunction) {
  // Extract from Nexus proxy headers (primary)
  req.userId = req.headers['x-user-id'] as string || undefined;
  req.tenantId = req.headers['x-tenant-id'] as string || undefined;
  req.requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  req.subscriptionTier = req.headers['x-subscription-tier'] as string || 'free';

  // Fallback: extract from JWT auth_token query param (browser access via proxy)
  if (!req.userId && req.query.auth_token) {
    const token = req.query.auth_token as string;
    try {
      // Decode JWT payload (without verification - proxy already verified)
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
        req.userId = payload.user_id || payload.sub;
        req.tenantId = payload.tenant_id || payload.org_id;
      }
    } catch {
      // Invalid token format, continue without user context
    }
  }

  // Fallback: extract from Authorization header (direct API access)
  if (!req.userId && req.headers.authorization) {
    const auth = req.headers.authorization;
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
          req.userId = payload.user_id || payload.sub;
          req.tenantId = payload.tenant_id || payload.org_id;
        }
      } catch {
        // Invalid token
      }
    }
  }

  next();
}

/**
 * Middleware that requires authentication.
 * Use on routes that should only be accessible to authenticated users.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'This endpoint requires a valid user context. Ensure requests are routed through the Nexus proxy.',
    });
  }
  next();
}
