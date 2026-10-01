import { createClient } from '@supabase/supabase-js';
import { pool, one } from './db.js';
import { fail } from './domain.js';
let authClient;
export function supabaseAuth() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY)
    fail('SETUP_REQUIRED', 'Configure Supabase to sign in.', 503);
  return (authClient ??= createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ));
}
export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) fail('UNAUTHENTICATED', 'Sign in to continue.', 401);
    const { data, error } = await supabaseAuth().auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous)
      fail('UNAUTHENTICATED', 'Your session has expired. Please sign in again.', 401);
    const profile = await one(pool, 'select * from classassist.profiles where id=$1', [
      data.user.id,
    ]);
    if (!profile)
      fail(
        'PROFILE_REQUIRED',
        'Your account needs a school profile. Contact your class administrator.',
        403,
      );
    req.user = profile;
    next();
  } catch (error) {
    next(error);
  }
}
export function role(user, expected) {
  if (user.role !== expected) fail('FORBIDDEN', 'This action is unavailable for your role.', 403);
}
export async function classAccess(db, user, id, owner = false) {
  const row = await one(
    db,
    `select c.* from classassist.classes c where c.id=$1 and c.school_id=$2 and
    (c.teacher_id=$3 or ($4=false and exists(select 1 from classassist.memberships m where m.class_id=c.id and m.student_id=$3 and m.active)))`,
    [id, user.school_id, user.id, owner],
  );
  if (!row) fail('NOT_FOUND', 'Class not found or access has been removed.', 404);
  return row;
}
export async function teacherAccess(db, user, id) {
  const row = await one(
    db,
    `select p.id,p.name from classassist.profiles p where p.id=$1 and p.school_id=$2 and p.role='teacher'
    and (p.id=$3 or exists(select 1 from classassist.classes c join classassist.memberships m on m.class_id=c.id where c.teacher_id=p.id and m.student_id=$3 and m.active))`,
    [id, user.school_id, user.id],
  );
  if (!row) fail('NOT_FOUND', 'Teacher is not available to your account.', 404);
  return row;
}
