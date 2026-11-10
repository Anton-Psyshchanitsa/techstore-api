import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  MEMCACHED_HOST: z.string().min(1).default('localhost'),
  MEMCACHED_PORT: z.coerce.number().int().min(1).max(65535).default(11211),
  CACHE_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(120).default(90),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );
  console.error('Invalid environment variables:\n' + details.join('\n'));
  process.exit(1);
}

export const env = parsed.data;
