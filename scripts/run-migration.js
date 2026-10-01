import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(__dirname, '..', 'supabase', 'migrations', '20261001102322_classassist_core.sql');
const sql = readFileSync(migrationPath, 'utf8');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

try {
  console.log('Running migration on hosted Supabase...');
  console.log('  File:', migrationPath);
  await pool.query(sql);
  console.log('Migration completed successfully!');

  // Verify
  const tables = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'classassist' ORDER BY tablename"
  );
  console.log('\nCreated tables in classassist schema:');
  for (const t of tables.rows) {
    console.log('  -', t.tablename);
  }
} catch (e) {
  console.error('Migration ERROR:', e.message);
  if (e.detail) console.error('  Detail:', e.detail);
  process.exit(1);
} finally {
  await pool.end();
}
