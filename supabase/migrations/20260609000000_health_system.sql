-- Workout profile (one per user)
create table workout_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null unique,
  goal text not null default 'build_muscle',
  equipment text[] default '{}',
  available_days text[] default '{}',
  sessions_per_week int default 3,
  session_duration int default 60,
  experience_level text default 'intermediate',
  injuries text default '',
  fitness_notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table workout_profiles enable row level security;
create policy "Users manage own workout profile" on workout_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Spotify connection
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
create policy "Users manage own spotify" on spotify_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
