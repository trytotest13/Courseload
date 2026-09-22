import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/app';

// Vercel reuses warm instances, so build the app once per process.
const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as never, res as never);
}
