import pg from 'pg';
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("set local statement_timeout='15s'");
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
export async function one(db, text, params = []) {
  return (await db.query(text, params)).rows[0];
}
export async function lockPeople(db, ids) {
  for (const id of [...new Set(ids)].sort())
    await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [id]);
}
export const audit = (db, actor, action, ref) =>
  db.query('insert into classassist.audit_events(actor_id,action,reference_id) values($1,$2,$3)', [
    actor,
    action,
    ref,
  ]);
