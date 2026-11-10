import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { uploadsRouter } from './modules/uploads/uploads.routes.js';
import { docsRouter } from './routes/docs.js';
import { healthRouter } from './routes/health.js';

export const app: Express = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || env.CORS_ORIGINS.includes(origin));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }),
);

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
      'HTTP request',
    );
  });
  next();
});

app.use(express.json({ limit: '100kb' }));

app.use('/health', healthRouter);
app.use('/api', docsRouter);
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/cart', cartRouter);

app.use(notFoundHandler);
app.use(errorHandler);
