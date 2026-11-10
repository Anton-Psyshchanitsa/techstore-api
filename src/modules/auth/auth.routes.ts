import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { loginHandler, meHandler, registerHandler } from './auth.controller.js';

export const authRouter: Router = Router();

authRouter.post('/register', registerHandler);
authRouter.post('/login', loginHandler);
authRouter.get('/me', authenticate, meHandler);
