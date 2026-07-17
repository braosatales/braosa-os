-- Retroactive baseline migration: tasks table
-- Schema inferred from codebase (live DB unreachable from migration environment).
-- Captured 2026-07-17. Includes description column added manually on this date.
-- DO NOT run against production — table already exists.
-- Use only for fresh project rebuilds.
--
-- CONFIDENCE NOTE: columns below are split into two groups. The first group is
-- corroborated by the UI (AddTaskModal.tsx, TaskDetailModal.tsx) AND the main
-- CRUD routes (app/api/tasks/route.ts, app/api/tasks/[id]/route.ts) agreeing
-- with each other. The second group (notes, due_date, estimated_mins) only
-- appears in lib/iclaudeMapping.ts + app/api/iclaude/task/route.ts (write) and
-- app/api/iclaude/state/route.ts + app/api/calendar/ai-suggest/route.ts (read),
-- which also use status 'in_progress' and priority 'high' — values that don't
-- exist anywhere else in the codebase (canonical status set is
-- todo/doing/done/cancelled, canonical priority is integer 1/2/3). This could
-- mean these are real extra columns the main UI just doesn't surface, OR it
-- could mean those four files are broken/stale and would error against the
-- real table. This was not verified against the live DB — flag for manual
-- confirmation before relying on it.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null default 'todo',
  priority smallint not null default 3,
  fav boolean not null default false,
  due timestamptz,
  system text,
  project_id uuid references public.projects(id) on delete set null,
  tags text[] not null default '{}',
  external_id text unique,
  source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Unverified columns, see confidence note above.
  notes text,
  due_date timestamptz,
  estimated_mins integer
);

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
