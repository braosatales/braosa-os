create table training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  week_start date not null,
  plan_data jsonb not null,
  ai_reasoning text,
  status text default 'active',
  feedback text,
  created_at timestamptz default now()
);
alter table training_plans enable row level security;
create policy "Users manage own training plans" on training_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index training_plans_user_week on training_plans(user_id, week_start desc);

create table planned_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references training_plans(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  day_of_week text not null,
  session_date date not null,
  session_name text not null,
  session_type text not null,
  exercises jsonb not null default '[]',
  estimated_duration int,
  ai_notes text,
  status text default 'pending',
  created_at timestamptz default now()
);
alter table planned_sessions enable row level security;
create policy "Users manage own planned sessions" on planned_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index planned_sessions_user_date on planned_sessions(user_id, session_date);
