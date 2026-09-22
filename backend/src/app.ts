import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { allowedOrigins, env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { assignmentsRouter, groupsRouter, submissionRouter } from './modules/assignments/routes';
import { authRouter } from './modules/auth/routes';
import { coursesRouter } from './modules/courses/routes';
import { dashboardRouter } from './modules/dashboard/routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());

  // The deployed frontend and the preview URLs Vercel hands out both need to talk to this API.
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
        if (/^http:\/\/localhost:\d+$/i.test(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', environment: env.NODE_ENV, time: new Date().toISOString() });
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.AUTH_RATE_LIMIT,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    message: {
      error: { message: 'Too many attempts. Wait a few minutes and try again.', code: 'rate_limited' },
    },
  });

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/courses', coursesRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api', submissionRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
