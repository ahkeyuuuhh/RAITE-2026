import { pool, one, transaction } from './db.js';

export class CalendarStore {
  constructor(db = pool) { this.db = db; }
  async lock(userId, fn) {
    return transaction(async (db) => {
      await db.query("select pg_advisory_xact_lock(hashtextextended($1,1))", [`google-calendar:${userId}`]);
      return fn(new CalendarStore(db));
    });
  }
  connection(userId) {
    return one(this.db, 'select * from classassist.google_calendar_connections where user_id=$1', [userId]);
  }
  async save(userId, credentials, email) {
    await this.db.query(`insert into classassist.google_calendar_connections(user_id,credentials,email)
      values($1,$2,$3) on conflict(user_id) do update set credentials=excluded.credentials,
      email=excluded.email,updated_at=now()`, [userId, credentials, email]);
  }
  async remove(userId) {
    await this.db.query('delete from classassist.google_calendar_connections where user_id=$1', [userId]);
    await this.db.query('delete from classassist.google_calendar_oauth where user_id=$1', [userId]);
  }
  async begin(row) {
    await this.db.query('delete from classassist.google_calendar_oauth where expires_at<=now()');
    await this.db.query(`insert into classassist.google_calendar_oauth(state_hash,user_id,session_hash,verifier)
      values($1,$2,$3,$4) on conflict(user_id) do update set state_hash=excluded.state_hash,
      session_hash=excluded.session_hash,verifier=excluded.verifier,browser_hash=null,stage='created',
      result=null,email=null,expires_at=now()+interval '10 minutes'`,
    [row.state_hash, row.user_id, row.session_hash, row.verifier]);
  }
  start(hash, browserHash) {
    return one(this.db, `update classassist.google_calendar_oauth set browser_hash=$2,stage='authorizing'
      where state_hash=$1 and stage='created' and expires_at>now() returning *`, [hash, browserHash]);
  }
  consume(hash, browserHash) {
    return one(this.db, `update classassist.google_calendar_oauth set stage='exchanging',browser_hash=null
      where state_hash=$1 and browser_hash=$2 and stage='authorizing' and expires_at>now() returning *`, [hash, browserHash]);
  }
  async result(hash, result, email) {
    await this.db.query(`update classassist.google_calendar_oauth set stage=$2,result=$3,email=$4
      where state_hash=$1 and stage='exchanging' and expires_at>now()`, [hash, result ? 'ready' : 'failed', result, email]);
  }
  pending(userId, sessionHash) {
    return one(this.db, `select * from classassist.google_calendar_oauth
      where user_id=$1 and session_hash=$2 and expires_at>now()`, [userId, sessionHash]);
  }
  async clearPending(userId) {
    await this.db.query('delete from classassist.google_calendar_oauth where user_id=$1', [userId]);
  }
}
