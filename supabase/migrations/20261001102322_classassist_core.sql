-- Application records are intentionally outside the exposed Data API schema.
-- The Node API validates a live Supabase Auth user and scopes every operation.
create schema if not exists classassist;
revoke all on schema classassist from public, anon, authenticated;

create table classassist.schools (id uuid primary key default gen_random_uuid(), name text not null);
create table classassist.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references classassist.schools,
  name text not null, role text not null check (role in ('teacher','student')),
  created_at timestamptz not null default now()
);
create table classassist.availability (
  teacher_id uuid primary key references classassist.profiles,
  rules jsonb not null, updated_at timestamptz not null default now()
);
create table classassist.classes (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references classassist.schools,
  teacher_id uuid not null references classassist.profiles, name text not null, subject text not null,
  description text not null default '', code_hash text unique, code_expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index classes_teacher_idx on classassist.classes(teacher_id);
create table classassist.memberships (
  class_id uuid references classassist.classes on delete cascade,
  student_id uuid references classassist.profiles on delete cascade,
  active boolean not null default true, joined_at timestamptz not null default now(),
  primary key(class_id,student_id)
);
create index memberships_student_idx on classassist.memberships(student_id,class_id) where active;
create table classassist.consultations (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references classassist.profiles,
  student_id uuid not null references classassist.profiles, starts_at timestamptz not null,
  ends_at timestamptz not null, occupied_until timestamptz not null, location text not null,
  timezone text not null default 'Asia/Manila', status text not null default 'booked' check(status in ('booked','canceled')),
  request_key uuid not null, created_at timestamptz not null default now(),
  unique(student_id,request_key), check(starts_at < ends_at and ends_at <= occupied_until)
);
create index consultations_teacher_time_idx on classassist.consultations(teacher_id,starts_at) where status='booked';
create index consultations_student_time_idx on classassist.consultations(student_id,starts_at) where status='booked';
create table classassist.assessments (
  id uuid primary key default gen_random_uuid(), class_id uuid not null references classassist.classes,
  teacher_id uuid not null references classassist.profiles, title text not null,
  lesson text not null, questions jsonb not null, announcement text not null,
  announce_at timestamptz not null, opens_at timestamptz not null, closes_at timestamptz not null,
  duration_minutes integer not null default 30 check(duration_minutes between 1 and 180),
  version integer not null default 1, state text not null default 'draft' check(state in ('draft','approved','announced','canceled','expired')),
  source text not null, approved_digest text, announced_at timestamptz,
  created_at timestamptz not null default now(), check(announce_at <= opens_at and opens_at < closes_at)
);
create index assessments_class_idx on classassist.assessments(class_id);
create index assessments_teacher_idx on classassist.assessments(teacher_id);
create table classassist.approvals (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references classassist.assessments,
  version integer not null, approver_id uuid not null references classassist.profiles, digest text not null,
  approved_at timestamptz not null default now(), revoked_at timestamptz,
  unique(assessment_id,version)
);
create table classassist.jobs (
  id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('announce','assessment_reminder','consultation_reminder')),
  reference_id uuid not null, version integer not null default 1, due_at timestamptz not null,
  state text not null default 'pending' check(state in ('pending','done','failed','canceled')),
  attempts integer not null default 0, last_error text, finished_at timestamptz,
  unique(kind,reference_id,version)
);
create index jobs_due_idx on classassist.jobs(due_at) where state='pending';
create table classassist.calendar_events (
  id uuid primary key default gen_random_uuid(), user_id uuid references classassist.profiles,
  class_id uuid references classassist.classes, reference_id uuid not null, version integer not null default 1,
  kind text not null, title text not null, starts_at timestamptz not null, ends_at timestamptz not null,
  canceled boolean not null default false, dedupe_key text not null unique
);
create index calendar_user_idx on classassist.calendar_events(user_id,starts_at);
create index calendar_class_idx on classassist.calendar_events(class_id,starts_at);
create index calendar_ref_idx on classassist.calendar_events(reference_id);
create table classassist.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references classassist.profiles,
  class_id uuid references classassist.classes, reference_id uuid not null, title text not null, body text not null,
  read_at timestamptz, created_at timestamptz not null default now(), dedupe_key text not null unique
);
create index notifications_user_idx on classassist.notifications(user_id,created_at desc);
create table classassist.attempts (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references classassist.assessments,
  version integer not null, student_id uuid not null references classassist.profiles,
  started_at timestamptz not null default now(), deadline timestamptz not null,
  responses jsonb not null default '{}', submitted_at timestamptz,
  unique(assessment_id,version,student_id)
);
create index attempts_student_idx on classassist.attempts(student_id);
create table classassist.audit_events (
  id bigint generated always as identity primary key, actor_id uuid references classassist.profiles,
  action text not null, reference_id uuid not null, created_at timestamptz not null default now()
);
create table classassist.worker_heartbeat (id integer primary key check(id=1), last_seen timestamptz not null);

-- Defense in depth: no client role can access private records, including keys.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='classassist' loop
    execute format('alter table classassist.%I enable row level security',t.tablename);
    execute format('revoke all on classassist.%I from public, anon, authenticated',t.tablename);
  end loop;
end $$;
alter default privileges in schema classassist revoke all on tables from public, anon, authenticated;
