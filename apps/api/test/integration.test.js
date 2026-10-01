import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import supertest from 'supertest';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import { app } from '../src/app.js';
import { pool, one } from '../src/db.js';
import { defaults, bundleDigest } from '../src/domain.js';
import { processJob } from '../src/jobs.js';
import { sampleLesson } from '../src/fixtures.js';
if (!process.env.DATABASE_URL?.includes('127.0.0.1:55322'))
  throw new Error('Integration tests run only on the isolated ClassAssist local database.');
const api = supertest(app);
let teacher, student, student2, classId, teacherId, studentId;
const created = [];
const authed = (method, path, token) =>
  api[method](`/api${path}`).set('Authorization', `Bearer ${token}`);
before(async () => {
  const login = async (email) => {
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: process.env.SEED_PASSWORD,
    });
    if (error) throw error;
    return data.session.access_token;
  };
  [teacher, student, student2] = await Promise.all(
    ['teacher', 'student', 'student2'].map((n) => login(`${n}@classassist.demo`)),
  );
  teacherId = (await authed('get', '/me', teacher)).body.id;
  studentId = (await authed('get', '/me', student)).body.id;
  const c = await authed('post', '/classes', teacher).send({
    name: `Verification ${randomUUID().slice(0, 8)}`,
    subject: 'Science',
  });
  assert.equal(c.status, 200);
  classId = c.body.id;
  for (const token of [student, student2]) {
    const preview = await authed('post', '/classes/preview', token).send({ code: c.body.code });
    assert.equal(preview.body.id, classId);
    const join = await authed('post', '/classes/join', token).send({ classId, code: c.body.code });
    assert.equal(join.status, 200);
  }
});
after(async () => {
  // Delete only data created by this test suite, preserving the user's demo records.
  if (classId) {
    const ids = (
      await pool.query('select id from classassist.assessments where class_id=$1', [classId])
    ).rows.map((r) => r.id);
    for (const table of ['notifications', 'calendar_events', 'jobs'])
      await pool.query(`delete from classassist.${table} where reference_id=any($1::uuid[])`, [
        [...ids, ...created],
      ]);
    await pool.query('delete from classassist.audit_events where reference_id=any($1::uuid[])', [
      [...ids, ...created],
    ]);
    await pool.query('delete from classassist.attempts where assessment_id=any($1::uuid[])', [ids]);
    await pool.query('delete from classassist.approvals where assessment_id=any($1::uuid[])', [
      ids,
    ]);
    await pool.query('delete from classassist.assessments where class_id=$1', [classId]);
    await pool.query('delete from classassist.consultations where id=any($1::uuid[])', [created]);
    await pool.query('delete from classassist.classes where id=$1', [classId]);
  }
  await pool.end();
});
test('real Auth rejects missing/forged tokens and student teacher-actions', async () => {
  assert.equal((await api.get('/api/classes')).status, 401);
  assert.equal((await authed('get', '/me', 'forged')).status, 401);
  assert.equal(
    (await authed('post', '/classes', student).send({ name: 'Unauthorized', subject: 'Science' }))
      .status,
    403,
  );
  const roleBefore = (await authed('get', '/me', student)).body.role;
  assert.equal(roleBefore, 'student');
});
test('two simultaneous confirmations reserve exactly once; retry returns same receipt', async () => {
  const date = DateTime.now().setZone('Asia/Manila').plus({ days: 1 }).toISODate();
  const original = await one(
    pool,
    'select rules from classassist.availability where teacher_id=$1',
    [teacherId],
  );
  await pool.query('update classassist.availability set rules=$2 where teacher_id=$1', [
    teacherId,
    {
      ...defaults,
      windows: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, start: '09:00', end: '16:00' })),
    },
  ]);
  try {
    const slots = (await authed('get', `/teachers/${teacherId}/slots?from=${date}&days=1`, student))
      .body;
    assert.ok(slots.length);
    const bodies = [student, student2].map(() => ({
      teacherId,
      starts_at: slots[0].starts_at,
      requestKey: randomUUID(),
    }));
    const results = await Promise.all(
      [student, student2].map((token, i) =>
        authed('post', '/consultations', token).send(bodies[i]),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    const win = results.findIndex((r) => r.status === 200);
    created.push(results[win].body.id);
    const retry = await authed('post', '/consultations', [student, student2][win]).send(
      bodies[win],
    );
    assert.equal(retry.body.id, results[win].body.id);
    const mismatch = await authed('post', '/consultations', [student, student2][win]).send({
      ...bodies[win],
      starts_at: slots[1].starts_at,
    });
    assert.equal(mismatch.status, 409);
    assert.equal(
      (
        await one(
          pool,
          'select count(*)::int as n from classassist.calendar_events where reference_id=$1',
          [retry.body.id],
        )
      ).n,
      2,
    );
    const cancel = await authed('post', `/consultations/${retry.body.id}/cancel`, teacher).send({});
    assert.equal(cancel.body.status, 'canceled');
    assert.equal(
      (
        await one(
          pool,
          "select count(*)::int as n from classassist.jobs where reference_id=$1 and state='pending'",
          [retry.body.id],
        )
      ).n,
      0,
    );
  } finally {
    await pool.query('update classassist.availability set rules=$2 where teacher_id=$1', [
      teacherId,
      original.rules,
    ]);
  }
});
async function draft() {
  const n = Date.now();
  const r = await authed('post', `/classes/${classId}/assessment-drafts`, teacher).send({
    sample: true,
    lesson: sampleLesson,
    schedule: {
      announce_at: new Date(n - 1000).toISOString(),
      opens_at: new Date(n + 120000).toISOString(),
      closes_at: new Date(n + 3600000).toISOString(),
      duration_minutes: 30,
    },
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}
test('approval is version-bound; edit revokes pending jobs; stale worker cannot publish', async () => {
  const a = await draft();
  assert.equal((await authed('get', `/assessments/${a.id}`, student)).status, 404);
  assert.equal(
    (
      await authed('post', `/publication-bundles/${a.id}/approve`, student).send({
        version: a.version,
        digest: a.digest,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await authed('post', `/publication-bundles/${a.id}/approve`, teacher).send({
        version: a.version,
        digest: a.digest,
      })
    ).status,
    200,
  );
  const job = await one(
    pool,
    "select id from classassist.jobs where reference_id=$1 and kind='announce'",
    [a.id],
  );
  const edited = await authed('patch', `/assessment-drafts/${a.id}`, teacher).send({
    ...a,
    expectedVersion: a.version,
    title: 'Reviewed photosynthesis',
  });
  assert.equal(edited.status, 200);
  await processJob(job.id);
  assert.equal(
    (await one(pool, 'select state from classassist.assessments where id=$1', [a.id])).state,
    'draft',
  );
  assert.equal(
    (
      await authed('post', `/publication-bundles/${a.id}/approve`, teacher).send({
        version: a.version,
        digest: a.digest,
      })
    ).status,
    409,
  );
  const v2 = edited.body;
  await authed('post', `/publication-bundles/${a.id}/approve`, teacher).send({
    version: v2.version,
    digest: v2.digest,
  });
  await authed('post', `/publication-bundles/${a.id}/cancel`, teacher).send({});
  const jobs = (await pool.query('select id from classassist.jobs where reference_id=$1', [a.id]))
    .rows;
  for (const j of jobs) await processJob(j.id);
  assert.equal((await authed('get', `/assessments/${a.id}`, student)).status, 404);
});
test('worker publication is replay-safe; student answers persist and submit once without keys', async () => {
  const a = await draft();
  await authed('post', `/publication-bundles/${a.id}/approve`, teacher).send({
    version: a.version,
    digest: a.digest,
  });
  const job = await one(
    pool,
    "select id from classassist.jobs where reference_id=$1 and kind='announce'",
    [a.id],
  );
  await Promise.all([processJob(job.id), processJob(job.id)]);
  assert.equal(
    (
      await one(
        pool,
        'select count(*)::int as n from classassist.calendar_events where reference_id=$1',
        [a.id],
      )
    ).n,
    1,
  );
  const before = (await authed('get', `/assessments/${a.id}`, student)).body;
  assert.equal(before.questions, undefined);
  // Move this synthetic fixture's approved window into the present to exercise server time.
  const dbrow = await one(
    pool,
    "update classassist.assessments set opens_at=now()-interval '1 second' where id=$1 returning *",
    [a.id],
  );
  const hash = bundleDigest(dbrow);
  await pool.query('update classassist.assessments set approved_digest=$2 where id=$1', [
    a.id,
    hash,
  ]);
  await pool.query('update classassist.approvals set digest=$2 where assessment_id=$1', [
    a.id,
    hash,
  ]);
  const response = await authed('get', `/assessments/${a.id}`, student);
  assert.equal(response.body.questions.length, 5);
  assert.ok(!JSON.stringify(response.body).includes('correctOptionId'));
  assert.ok(!JSON.stringify(response.body).includes('explanation'));
  const start = await authed('post', `/assessments/${a.id}/attempts`, student).send({});
  assert.equal(start.status, 200);
  const attempt = start.body.attempt;
  const answers = Object.fromEntries(response.body.questions.map((q) => [q.id, q.options[0].id]));
  assert.equal(
    (
      await authed('put', `/attempts/${attempt.id}/responses`, student2).send({
        responses: answers,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await authed('put', `/attempts/${attempt.id}/responses`, student).send({
        responses: { bogus: 'bad' },
      })
    ).status,
    400,
  );
  assert.deepEqual(
    (await authed('put', `/attempts/${attempt.id}/responses`, student).send({ responses: answers }))
      .body.responses,
    answers,
  );
  const submit = await authed('post', `/attempts/${attempt.id}/submit`, student).send({
    responses: answers,
  });
  assert.ok(submit.body.submitted_at);
  const retry = await authed('post', `/attempts/${attempt.id}/submit`, student).send({
    responses: answers,
  });
  assert.equal(retry.body.submitted_at, submit.body.submitted_at);
  const other = await authed('post', `/assessments/${a.id}/attempts`, student2).send({});
  await pool.query(
    "update classassist.attempts set deadline=now()-interval '1 second' where id=$1",
    [other.body.attempt.id],
  );
  assert.equal(
    (
      await authed('post', `/attempts/${other.body.attempt.id}/submit`, student2).send({
        responses: answers,
      })
    ).status,
    409,
  );
  await authed('delete', `/classes/${classId}/members/${studentId}`, teacher);
  assert.equal((await authed('get', `/assessments/${a.id}`, student)).status, 404);
});
test('Data API roles cannot access private records; RLS enabled everywhere', async () => {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query('set local role authenticated');
    await assert.rejects(
      () => c.query('select * from classassist.assessments'),
      (e) => e.code === '42501',
    );
    await c.query('rollback');
  } finally {
    c.release();
  }
  const rows = (
    await pool.query(
      "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='classassist' and relkind='r' and not relrowsecurity",
    )
  ).rows;
  assert.equal(rows.length, 0);
});
