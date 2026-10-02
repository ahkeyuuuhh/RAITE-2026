import { createHash, randomBytes } from 'node:crypto';
import { pool } from './db.js';

export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
export async function issueSession(userId, db = pool) {
  const token = `ca_${randomBytes(32).toString('base64url')}`;
  await db.query('delete from classassist.app_sessions where expires_at <= now()');
  await db.query(
    "insert into classassist.app_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '7 days')",
    [tokenHash(token), userId],
  );
  return token;
}
export async function revokeSession(token) {
  await pool.query('delete from classassist.app_sessions where token_hash=$1', [tokenHash(token)]);
  await pool.query('delete from classassist.google_calendar_oauth where session_hash=$1', [tokenHash(token)]);
}
