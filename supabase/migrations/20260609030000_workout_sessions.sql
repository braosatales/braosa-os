create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  planned_session_id uuid references planned_sessions(id) on delete set null,
  routine_id uuid references routines(id) on delete set null,
  name text not null,
  session_type text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  notes text,
  feedback text,
  spotify_playlist_id text,
  created_at timestamptz default now()
);
alter table workout_sessions enable row level security;
create policy "Users manage own workout sessions" on workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references workout_sessions(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  exercise_id uuid references exercises(id) not null,
  exercise_name text not null,
  set_number int not null,
  reps int,
  weight_kg numeric(6,2),
  duration_seconds int,
  rest_seconds int,
  completed boolean default false,
  notes text,
  is_pr boolean default false,
  created_at timestamptz default now()
);
alter table session_sets enable row level security;
create policy "Users manage own session sets" on session_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index session_sets_exercise on session_sets(user_id, exercise_id, created_at desc);

create table spotify_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  spotify_user_id text,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table spotify_connections enable row level security;
create policy "Users manage own spotify connections" on spotify_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
