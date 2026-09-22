import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Some shells export PORT as an empty string or 0, so fall back instead of failing.
  PORT: z.coerce.number().int().positive().catch(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  // Sign in attempts allowed per address per fifteen minutes. Raise it when a
  // script or a demo run needs more, keep it tight in production.
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().catch(40),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  console.error('Environment is not configured correctly:\n  ' + problems.join('\n  '));
  process.exit(1);
}

export const env = parsed.data;

export const allowedOrigins = env.CLIENT_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const isProduction = env.NODE_ENV === 'production';
