-- Retroactive baseline migration: tasks table
-- Live-introspected via the project's PostgREST OpenAPI schema (GET /rest/v1/,
-- service role key) since neither psql nor the supabase CLI were available in
-- this environment and no direct Postgres connection string exists in
-- .env.local. Captured 2026-07-17.
-- DO NOT run against production — table already exists.
-- Use only for fresh project rebuilds / disaster recovery.
--
-- VERIFIED (live introspection): all column names, types, defaults, and
-- NOT NULL/nullable status below come directly from the live schema via the
-- OpenAPI endpoint.
-- NOT VERIFIED: that endpoint does not expose indexes, RLS policy
-- definitions, unique constraints, or FK ON DELETE behavior (it only flags
-- PK/FK relationships, without delete rule). ON DELETE clauses are therefore
-- omitted rather than guessed. The RLS policy and indexes below are carried
-- over from an earlier code-inferred version of this file and are NOT
-- confirmed against the live catalog — verify with psql before relying on
-- them for disaster recovery.
--
-- Corrections vs. the previous (code-inferred) version of this file:
--   - "fav" did not exist; the real column is "is_favourite" (boolean, default false)
--   - "due" (timestamptz) did not exist; real columns are "due_date" (date) and
--     "due_time" (time without time zone)
--   - "tags text[]" was missing from this file as of 2026-07-17; added back
--     2026-07-19 after the column was added live via
--     ALTER TABLE tasks ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}'
--   - "system" and "source" are NOT NULL with defaults ('personal', 'manual'),
--     not freely nullable as previously written
--   - "priority" is integer, not smallint
--   - "external_id" uniqueness could not be confirmed — UNIQUE dropped rather than guessed
--   - id default is extensions.uuid_generate_v4(), not gen_random_uuid()
--   - added missing columns: parent_task_id, is_someday, signal_score,
--     best_time_of_day, due_time, completed_at, telegram_msg_id, source_detail

create table if not exists public.tasks (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references public.users(id),
  project_id uuid references public.projects(id),
  parent_task_id uuid references public.tasks(id),
  title text not null,
  notes text,
  priority integer not null default 3,
  status text not null default 'todo',
  system text not null default 'personal',
  is_favourite boolean not null default false,
  is_someday boolean not null default false,
  signal_score integer,
  estimated_mins integer,
  best_time_of_day text,
  due_date date,
  due_time time without time zone,
  completed_at timestamptz,
  source text not null default 'manual',
  telegram_msg_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  external_id text,
  source_detail text,
  description text,
  tags text[] not null default '{}'
);

-- NOT VERIFIED against the live catalog (see note above) — carried over
-- from the previous inference-based migration.
alter table public.tasks enable row level security;

-- NOTE: users.id is an internal UUID distinct from auth.uid() (stored in users.supabase_uid).
-- The policy must join through the users table to map auth.uid() → users.id.
drop policy if exists "Users can manage their own tasks" on public.tasks;
create policy "Users can manage their own tasks" on public.tasks
  for all
  using  (user_id = (select id from public.users where supabase_uid = auth.uid()::text))
  with check (user_id = (select id from public.users where supabase_uid = auth.uid()::text));

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_project_id_idx on public.tasks(project_id);
