import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors';

interface DatabaseError {
  code?: string;
  constraint?: string;
  detail?: string;
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound('There is no endpoint at ' + req.method + ' ' + req.path + '.'));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: { message: error.message, code: error.code, details: error.details },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: { message: 'Check the highlighted fields.', code: 'bad_request', details: error.issues },
    });
    return;
  }

  const dbError = error as DatabaseError;
  if (dbError?.code === '23505') {
    res.status(409).json({
      error: { message: 'That record already exists.', code: 'conflict' },
    });
    return;
  }
  if (dbError?.code === '23503') {
    res.status(400).json({
      error: { message: 'That references something which does not exist.', code: 'bad_request' },
    });
    return;
  }
  if (dbError?.code === '23514') {
    res.status(400).json({
      error: { message: 'A constraint rejected that value.', code: 'bad_request' },
    });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      error: { message: 'That request body is not valid JSON.', code: 'bad_request' },
    });
    return;
  }

  console.error('Unhandled error:', error);
  res.status(500).json({
    error: { message: 'Something broke on our side. Try that again.', code: 'server_error' },
  });
}
