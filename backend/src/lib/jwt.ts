import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './errors';

export type UserRole = 'student' | 'professor';

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
}

interface TokenPayload {
  role: UserRole;
  name: string;
  email: string;
}

export function signToken(user: AuthUser): string {
  const payload: TokenPayload = { role: user.role, name: user.name, email: user.email };
  return jwt.sign(payload, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & TokenPayload;
    if (!decoded.sub) throw new Error('missing subject');
    return {
      id: decoded.sub,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
    };
  } catch {
    throw ApiError.unauthorized('Your session has expired. Sign in again.');
  }
}
