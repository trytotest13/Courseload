import { createApp } from './app';
import { env } from './config/env';
import { pool } from './db/pool';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log('API listening on http://localhost:' + env.PORT);
});

async function shutdown(signal: string) {
  console.log('\n' + signal + ' received, closing down.');
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
