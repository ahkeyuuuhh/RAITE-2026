-- Server-only records: never expose Google credentials through the Data API.
create table classassist.app_sessions (
  token_hash text primary key,
  user_id uuid not null references classassist.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index app_sessions_user_idx on classassist.app_sessions(user_id);
create index app_sessions_expiry_idx on classassist.app_sessions(expires_at);

create table classassist.google_calendar_connections (
  user_id uuid primary key references classassist.profiles(id) on delete cascade,
  credentials text not null,
  email text not null,
  updated_at timestamptz not null default now()
);
create table classassist.google_calendar_oauth (
  state_hash text primary key,
  user_id uuid not null unique references classassist.profiles(id) on delete cascade,
  session_hash text not null,
  verifier text not null,
  browser_hash text,
  stage text not null default 'created' check (stage in ('created','authorizing','exchanging','ready','failed')),
  result text,
  email text,
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create index google_calendar_oauth_expiry_idx on classassist.google_calendar_oauth(expires_at);

alter table classassist.app_sessions enable row level security;
alter table classassist.google_calendar_connections enable row level security;
alter table classassist.google_calendar_oauth enable row level security;
revoke all on classassist.app_sessions, classassist.google_calendar_connections,
  classassist.google_calendar_oauth from public, anon, authenticated;
-- No client policies: only the server database role may access these tables.
