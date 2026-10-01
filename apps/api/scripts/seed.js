import { createClient } from '@supabase/supabase-js';
import { pool, transaction } from '../src/db.js';
import { defaults, digest } from '../src/domain.js';
if (!process.env.SEED_PASSWORD || process.env.SEED_PASSWORD.length < 12)
  throw new Error('Set a SEED_PASSWORD of at least 12 characters.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(process.env.SUPABASE_URL).hostname) &&
  process.env.ALLOW_HOSTED_DEMO_SEED !== 'true'
)
  throw new Error('Hosted demo seeding requires ALLOW_HOSTED_DEMO_SEED=true.');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: existing, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const people = [
  ['teacher@classassist.demo', 'Ms. Biel Santos', 'teacher'],
  ['student@classassist.demo', 'Alex Reyes', 'student'],
  ['student2@classassist.demo', 'Jamie Cruz', 'student'],
];
const profiles = [];
for (const [email, name, role] of people) {
  let user = existing.users.find((u) => u.email === email);
  if (!user) {
    const result = await admin.auth.admin.createUser({
      email,
      password: process.env.SEED_PASSWORD,
      email_confirm: true,
    });
    if (result.error) throw result.error;
    user = result.data.user;
  }
  profiles.push({ id: user.id, email, name, role });
}
const school = '00000000-0000-4000-8000-000000000001',
  classId = '00000000-0000-4000-8000-000000000002';
await transaction(async (db) => {
  await db.query('insert into classassist.schools(id,name) values($1,$2) on conflict do nothing', [
    school,
    'ClassAssist Demo School',
  ]);
  for (const p of profiles)
    await db.query(
      'insert into classassist.profiles(id,school_id,name,role) values($1,$2,$3,$4) on conflict(id) do nothing',
      [p.id, school, p.name, p.role],
    );
  await db.query(
    'insert into classassist.availability(teacher_id,rules) values($1,$2) on conflict do nothing',
    [profiles[0].id, defaults],
  );
  await db.query(
    `insert into classassist.classes(id,school_id,teacher_id,name,subject,description,code_hash,code_expires_at) values($1,$2,$3,'Grade 10 · Newton','Science','A space to ask, discover, and grow. Let’s make sense of the world together.',$4,now()+interval '7 days') on conflict do nothing`,
    [classId, school, profiles[0].id, digest('NEWTON2026')],
  );
  for (const p of profiles.slice(1))
    await db.query(
      'insert into classassist.memberships(class_id,student_id) values($1,$2) on conflict do nothing',
      [classId, p.id],
    );
});
console.log(
  'Synthetic accounts ready: teacher@classassist.demo, student@classassist.demo, student2@classassist.demo. Password: your SEED_PASSWORD. Existing data preserved.',
);
await pool.end();
