import { createClient } from '@supabase/supabase-js';
import { pool, one } from './db.js';
import { fail } from './domain.js';
let authClient;
export function supabaseAuth() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    fail('SETUP_REQUIRED', 'Configure Supabase to sign in.', 503);
  return (authClient ??= createClient(
    url,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ));
}
export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) fail('UNAUTHENTICATED', 'Sign in to continue.', 401);

    // 1. Direct application account/profile lookup
    const profile = await one(
      pool,
      `select p.*, coalesce(s.name, a.school_name, '') as school_name, coalesce(a.department, '') as department, coalesce(nullif(a.faculty_id, ''), p.employee_number, '') as faculty_id, coalesce(nullif(a.student_id, ''), p.student_number, '') as student_id, coalesce(a.course, '') as course, coalesce(a.year_level, '') as year_level from classassist.profiles p join classassist.accounts a on a.id = p.id left join classassist.schools s on s.id = p.school_id
       where a.id::text = $1`,
      [token],
    );
    if (profile) {
      req.user = profile;
      return next();
    }

    // 2. Supabase Auth fallback
    try {
      const { data, error } = await supabaseAuth().auth.getUser(token);
      if (!error && data?.user && !data.user.is_anonymous) {
        const supaProfile = await one(pool, 'select * from classassist.profiles where id=$1', [
          data.user.id,
        ]);
        if (supaProfile) {
          req.user = supaProfile;
          return next();
        }
      }
    } catch {
      // Ignored
    }

    fail('UNAUTHENTICATED', 'Your session has expired. Please sign in again.', 401);
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
