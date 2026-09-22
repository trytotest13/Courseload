import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../lib/errors';
import { verifyToken, type UserRole } from '../lib/jwt';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(ApiError.unauthorized());
    return;
  }
  try {
    req.user = verifyToken(header.slice('Bearer '.length).trim());
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden('This area is for ' + roles.join(' and ') + ' accounts.'));
      return;
    }
    next();
  };
}

/** Same as requireAuth, but every handler reads req.user as a value rather than a maybe. */
export function currentUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
