import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { env, isProduction } from '../config/env';

// Neon and most managed hosts hand out a URL that expects TLS. Local Docker does not,
// so the switch is driven by the connection string instead of a second variable.
const wantsSsl = /neon\.tech|render\.com|sslmode=require/.test(env.DATABASE_URL);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Serverless platforms open a fresh process per cold start, so keep the pool tiny.
  max: isProduction ? 3 : 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
});

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function closePool(): Promise<void> {
  await pool.end();
}
