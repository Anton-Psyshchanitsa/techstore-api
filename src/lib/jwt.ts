import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { unauthorized } from './errors.js';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

export const signAccessToken = (user: AuthUser): string => {
  const payload = {
    sub: String(user.id),
    email: user.email,
    role: user.role,
  };

  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
};

const isJwtPayload = (value: string | JwtPayload): value is JwtPayload =>
  typeof value === 'object';

export const verifyAccessToken = (token: string): AuthUser => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!isJwtPayload(decoded)) {
      throw unauthorized('Invalid token payload');
    }

    const userId = Number(decoded.sub);
    const email: unknown = decoded.email;
    const role: unknown = decoded.role;

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      typeof email !== 'string' ||
      (role !== 'customer' && role !== 'admin')
    ) {
      throw unauthorized('Invalid token payload');
    }

    return {
      id: userId,
      email,
      role,
    };
  } catch {
    throw unauthorized('Invalid or expired token');
  }
};
