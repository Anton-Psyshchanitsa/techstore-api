import type { RequestHandler } from 'express';
import { unauthorized } from '../../lib/errors.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { getCurrentUser, loginUser, registerUser } from './auth.service.js';

export const registerHandler: RequestHandler = async (req, res) => {
  const input = registerSchema.parse(req.body);
  const result = await registerUser(input);
  res.status(201).json(result);
};

export const loginHandler: RequestHandler = async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await loginUser(input);
  res.status(200).json(result);
};

export const meHandler: RequestHandler = async (req, res) => {
  if (!req.user) {
    throw unauthorized();
  }

  const user = await getCurrentUser(req.user.id);
  res.status(200).json({ user });
};
