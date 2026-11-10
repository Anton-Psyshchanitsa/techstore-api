import type { RequestHandler } from 'express';
import { unauthorized } from '../lib/errors.js';
import { verifyAccessToken, type AuthUser } from '../lib/jwt.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw unauthorized('Missing or invalid Authorization header');
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw unauthorized('Missing bearer token');
  }

  req.user = verifyAccessToken(token);
  next();
};
