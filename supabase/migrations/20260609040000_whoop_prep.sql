-- Whoop connection (ready for when band arrives)
create table whoop_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  whoop_user_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table whoop_connections enable row level security;
create policy "Users manage own whoop" on whoop_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Whoop daily metrics (populated when connected)
create table whoop_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  date date not null,
  recovery_score int, -- 0-100
  hrv_rmssd numeric(6,2), -- ms
  resting_hr int, -- bpm
  sleep_duration_seconds int,
  sleep_quality_score int, -- 0-100
  strain_score numeric(4,2), -- 0-21
  calories_burned int,
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table whoop_metrics enable row level security;
create policy "Users manage own whoop metrics" on whoop_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index whoop_metrics_user_date on whoop_metrics(user_id, date desc);
