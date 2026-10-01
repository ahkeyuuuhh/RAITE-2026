import { readdir, readFile } from 'node:fs/promises';
import { pool, transaction } from '../src/db.js';
const files = (await readdir(new URL('../../../supabase/migrations/', import.meta.url)))
  .filter((f) => f.endsWith('.sql'))
  .sort();
const coreTables = [
  'schools',
  'profiles',
  'availability',
  'classes',
  'memberships',
  'consultations',
  'assessments',
  'approvals',
  'jobs',
  'calendar_events',
  'notifications',
  'attempts',
  'audit_events',
  'worker_heartbeat',
];
await transaction(async (db) => {
  await db.query('select pg_advisory_xact_lock(7302601)');
  await db.query('create schema if not exists supabase_migrations');
  await db.query(
    'create table if not exists supabase_migrations.schema_migrations(version text primary key,statements text[],name text)',
  );
  for (const file of files) {
    const [version, ...name] = file.replace('.sql', '').split('_');
    if (
      (
        await db.query('select 1 from supabase_migrations.schema_migrations where version=$1', [
          version,
        ])
      ).rowCount
    )
      continue;
    const sql = await readFile(
      new URL(`../../../supabase/migrations/${file}`, import.meta.url),
      'utf8',
    );
    if (file === '20261001102322_classassist_core.sql') {
      const existing = await db.query(
        `select count(*)::int as count from pg_tables
         where schemaname='classassist' and tablename = any($1::text[])`,
        [coreTables],
      );
      if (existing.rows[0].count === coreTables.length) {
        await db.query(
          'insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',
          [version, name.join('_'), [sql]],
        );
        console.log(`Recorded existing core schema baseline for ${file}`);
        continue;
      }
    }
    await db.query(sql);
    await db.query(
      'insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',
      [version, name.join('_'), [sql]],
    );
    console.log(`Applied ${file}`);
  }
});
await pool.end();
