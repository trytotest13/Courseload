import { config } from 'dotenv';

config({ path: '.env.test' });

const databaseUrl = process.env.DATABASE_URL ?? '';
const isTestDatabase = /_test(\?|$)/.test(databaseUrl) || /test/i.test(databaseUrl);

if (!databaseUrl || !isTestDatabase) {
  throw new Error(
    'Tests only run against a throwaway database. Copy backend/.env.test.example to ' +
      'backend/.env.test and point DATABASE_URL at a database whose name ends in _test.',
  );
}
