import type { Role } from '@prisma/client';
import type { RequestHandler } from 'express';
import { forbidden, unauthorized } from '../lib/errors.js';

export const requireRole = (...allowedRoles: Role[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      throw unauthorized();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw forbidden('You do not have permission to perform this action');
    }

    next();
  };
};
