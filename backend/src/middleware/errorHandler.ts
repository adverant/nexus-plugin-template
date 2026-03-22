import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  if (status >= 500) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
  }

  res.status(status).json({
    error: message,
    status,
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    status: 404,
  });
}
