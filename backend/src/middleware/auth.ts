import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * User type for authenticated requests.
 * CUSTOMIZE: Add plugin-specific user fields.
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  tier: 'free' | 'starter' | 'professional' | 'enterprise' | 'studio';
  subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled';
  trial_end?: string;
  trial_days_remaining?: number;
  created_at: Date;
  updated_at: Date;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Authenticate user from JWT token.
 * Trusts internal tool calls from the gateway (x-internal-tool-call header).
 */
export async function authenticateUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Trust internal tool calls from the gateway
    const isInternalToolCall = req.headers['x-internal-tool-call'] === 'true';
    const internalUserId = req.headers['x-user-id'] as string | undefined;

    if (isInternalToolCall && internalUserId) {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      req.user = {
        id: UUID_RE.test(internalUserId) ? internalUserId : '00000000-0000-0000-0000-000000000000',
        email: `${internalUserId}@internal`,
        name: internalUserId,
        tier: 'enterprise',
        created_at: new Date(),
        updated_at: new Date(),
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const token = authHeader.replace('Bearer ', '');
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');

    const decoded = jwt.verify(token, secret) as {
      user_id?: string;
      sub?: string;
      email: string;
      name?: string;
      tier?: string;
      subscription_tier?: string;
      subscription_status?: string;
      trial_end?: string;
    };

    const userId = decoded.user_id || decoded.sub;
    if (!userId) throw new UnauthorizedError('Token missing user identifier');

    const userTier = (decoded.subscription_tier || decoded.tier || 'free') as User['tier'];

    let trialDaysRemaining: number | undefined;
    if (decoded.trial_end) {
      const trialEndMs = new Date(decoded.trial_end).getTime();
      trialDaysRemaining = Math.max(0, Math.ceil((trialEndMs - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    req.user = {
      id: userId,
      email: decoded.email,
      name: decoded.name,
      tier: userTier,
      subscription_status: decoded.subscription_status as User['subscription_status'],
      trial_end: decoded.trial_end,
      trial_days_remaining: trialDaysRemaining,
      created_at: new Date(),
      updated_at: new Date(),
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Authentication token has expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid authentication token'));
    } else {
      next(error);
    }
  }
}

/** Check if user has required tier */
export function requireTier(...allowedTiers: User['tier'][]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));
    if (!allowedTiers.includes(req.user.tier)) {
      return next(new ForbiddenError(`This feature requires ${allowedTiers.join(' or ')} tier`));
    }
    next();
  };
}

/** Optional authentication -- doesn't fail if no token */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const secret = process.env.JWT_SECRET;
      if (!secret) return next();
      const decoded = jwt.verify(token, secret) as {
        user_id?: string; sub?: string; email: string; name?: string;
        tier?: string; subscription_tier?: string;
      };
      const userId = decoded.user_id || decoded.sub;
      if (userId) {
        req.user = {
          id: userId, email: decoded.email, name: decoded.name,
          tier: (decoded.subscription_tier || decoded.tier || 'free') as User['tier'],
          created_at: new Date(), updated_at: new Date(),
        };
      }
    }
    next();
  } catch { next(); }
}
