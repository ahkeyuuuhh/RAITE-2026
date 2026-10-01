-- Add the missing classroom records while reusing the existing ClassAssist
-- schools, profiles, classes, assessments, attempts, consultations, and events.

-- The MVP account flow stores demo credentials in classassist.accounts. Profiles
-- remain the canonical identity rows referenced by classroom features; allowing
-- their IDs to come from the application account table preserves existing data
-- and leaves the API's Supabase Auth fallback intact.
do $$ declare constraint_name text; begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    join pg_class target on target.oid = c.confrelid
    join pg_namespace target_schema on target_schema.oid = target.relnamespace
    where c.conrelid = 'classassist.profiles'::regclass
      and c.contype = 'f'
      and a.attname = 'id'
      and target_schema.nspname = 'auth'
      and target.relname = 'users'
  loop
    execute format('alter table classassist.profiles drop constraint %I', constraint_name);
  end loop;
end $$;

alter table classassist.schools
  add column if not exists email_domain text,
  add column if not exists created_at timestamptz not null default now();

insert into classassist.schools(id, name)
values ('00000000-0000-4000-8000-000000000001', 'ClassAssist Demo School')
on conflict (id) do nothing;

create table if not exists classassist.accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  demo_password text not null,
  first_name text not null,
  last_name text not null,
  name text not null,
  role text not null check (role in ('teacher', 'student')),
  school_id uuid not null references classassist.schools,
  school_name text not null,
  student_id text not null default '',
  course text not null default '',
  year_level text not null default '',
  faculty_id text not null default '',
  department text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Upgrade an account table created by the old local setup helper, if present.
alter table classassist.accounts add column if not exists demo_password text;
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'classassist' and table_name = 'accounts' and column_name = 'password'
  ) then
    execute 'update classassist.accounts set demo_password = password where demo_password is null';
    execute 'alter table classassist.accounts alter column password drop not null';
    execute 'update classassist.accounts set password = null where password is not null';
  end if;
end $$;
alter table classassist.accounts alter column demo_password set not null;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'accounts_school_id_fkey'
      and conrelid = 'classassist.accounts'::regclass
  ) then
    alter table classassist.accounts
      add constraint accounts_school_id_fkey foreign key (school_id) references classassist.schools;
  end if;
end $$;
create unique index if not exists accounts_email_lower_uidx
  on classassist.accounts(lower(email));

alter table classassist.profiles
  add column if not exists email text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists student_number text,
  add column if not exists employee_number text,
  add column if not exists updated_at timestamptz not null default now();

update classassist.profiles p
set email = u.email,
    first_name = coalesce(p.first_name, nullif(split_part(trim(p.name), ' ', 1), '')),
    last_name = coalesce(p.last_name, nullif(regexp_replace(trim(p.name), '^\S+\s*', ''), ''))
from auth.users u
where u.id = p.id
  and (p.email is null or p.first_name is null or p.last_name is null);

create unique index if not exists profiles_email_lower_uidx
  on classassist.profiles(lower(email)) where email is not null;

alter table classassist.classes
  add column if not exists subject_code text,
  add column if not exists section text,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'classes_status_check'
      and conrelid = 'classassist.classes'::regclass
  ) then
    alter table classassist.classes
      add constraint classes_status_check check (status in ('active', 'archived'));
  end if;
end $$;

create table if not exists classassist.stream_posts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classassist.classes on delete cascade,
  author_id uuid not null references classassist.profiles,
  post_type text not null default 'announcement'
    check (post_type in ('announcement', 'discussion', 'question')),
  title text,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stream_posts_class_created_idx
  on classassist.stream_posts(class_id, created_at desc);

create table if not exists classassist.classwork (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classassist.classes on delete cascade,
  teacher_id uuid not null references classassist.profiles,
  title text not null,
  description text not null default '',
  classwork_type text not null check (classwork_type in ('lecture', 'assignment', 'quiz', 'material')),
  due_at timestamptz,
  points numeric(8,2) check (points is null or points >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists classwork_class_due_idx
  on classassist.classwork(class_id, due_at);

create table if not exists classassist.classwork_submissions (
  id uuid primary key default gen_random_uuid(),
  classwork_id uuid not null references classassist.classwork on delete cascade,
  student_id uuid not null references classassist.profiles,
  submission_text text,
  file_url text,
  storage_path text,
  submitted_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'graded', 'returned')),
  score numeric(8,2) check (score is null or score >= 0),
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (classwork_id, student_id)
);
create index if not exists classwork_submissions_student_idx
  on classassist.classwork_submissions(student_id, submitted_at desc);

create table if not exists classassist.classroom_materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classassist.classes on delete cascade,
  classwork_id uuid references classassist.classwork on delete set null,
  uploaded_by uuid not null references classassist.profiles,
  file_name text not null,
  file_url text,
  storage_path text,
  mime_type text,
  created_at timestamptz not null default now(),
  check (file_url is not null or storage_path is not null)
);
create index if not exists classroom_materials_class_created_idx
  on classassist.classroom_materials(class_id, created_at desc);

-- Requests represent approval workflows; existing consultations remain the
-- confirmed bookings used by the current calendar and reminder flow.
create table if not exists classassist.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references classassist.profiles,
  teacher_id uuid not null references classassist.profiles,
  class_id uuid references classassist.classes on delete set null,
  requested_start timestamptz not null,
  requested_end timestamptz not null,
  reason text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'cancelled')),
  teacher_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requested_start < requested_end)
);
create index if not exists consultation_requests_teacher_status_idx
  on classassist.consultation_requests(teacher_id, status, requested_start);
create index if not exists consultation_requests_student_idx
  on classassist.consultation_requests(student_id, created_at desc);

-- Existing assessments.questions and attempts.responses JSONB columns already
-- persist assessment questions and answers; no parallel tables are needed.
do $$ declare t record; begin
  for t in
    select tablename from pg_tables
    where schemaname = 'classassist'
      and tablename in ('accounts', 'stream_posts', 'classwork', 'classwork_submissions', 'classroom_materials', 'consultation_requests')
  loop
    execute format('alter table classassist.%I enable row level security', t.tablename);
    execute format('revoke all on classassist.%I from public, anon, authenticated', t.tablename);
  end loop;
end $$;
