import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
try {
  // Test 1: basic connectivity
  const r = await pool.query('SELECT 1 as ok');
  console.log('1. Basic query OK');

  // Test 2: advisory lock (needed by consultations booking)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('test',0))");
    await client.query('COMMIT');
    console.log('2. Advisory lock OK');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('2. Advisory lock FAILED:', e.message);
  } finally {
    client.release();
  }

  // Test 3: check if classassist schema exists
  const schema = await pool.query(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'classassist'"
  );
  console.log('3. classassist schema:', schema.rows.length > 0 ? 'EXISTS' : 'NOT YET CREATED');

  // Test 4: check auth.users table access
  const auth = await pool.query('SELECT count(*) FROM auth.users');
  console.log('4. auth.users accessible, count:', auth.rows[0].count);

} catch (e) {
  console.error('ERROR:', e.message);
} finally {
  await pool.end();
}
