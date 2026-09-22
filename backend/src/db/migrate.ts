import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from './pool';

export async function migrate(): Promise<void> {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Schema is up to date.');
      return pool.end();
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
