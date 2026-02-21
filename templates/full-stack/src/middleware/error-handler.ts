import { Request, Response, NextFunction } from 'express';

/**
 * Application-specific error class with HTTP status codes.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({
    error: 'Not Found',
    message: `${req.method} ${req.path} does not exist`,
    code: 'ROUTE_NOT_FOUND',
  });
}

/**
 * Global error handler middleware.
 * Must be registered last in the middleware chain (4-argument signature).
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Log the error
  console.error(JSON.stringify({
    level: 'error',
    msg: 'unhandled_error',
    error: err.message,
    code: err instanceof AppError ? err.code : 'INTERNAL_ERROR',
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    method: req.method,
    path: req.path,
    request_id: req.requestId,
    user_id: req.userId,
  }));

  // Determine status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  res.status(statusCode).json({
    error: err.message,
    code,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
