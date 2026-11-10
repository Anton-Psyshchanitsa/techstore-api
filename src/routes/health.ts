import { Router } from 'express';
import { checkCacheHealth } from '../lib/cache.js';
import { prisma } from '../lib/prisma.js';

export const healthRouter: Router = Router();

healthRouter.get('/', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  const cache = await checkCacheHealth();

  res.json({
    status: 'ok',
    database: 'connected',
    cache,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
