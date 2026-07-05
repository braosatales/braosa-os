-- Active weather location per user
create table if not exists user_weather_location (
  user_id uuid primary key references users(id) on delete cascade,
  display_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  updated_at timestamptz default now()
);

alter table user_weather_location enable row level security;

-- NOTE: users.id is an internal UUID distinct from auth.uid() (stored in users.supabase_uid).
-- The policy must join through the users table to map auth.uid() → users.id.
create policy "Users manage own weather location" on user_weather_location
  for all
  using  (user_id = (select id from users where supabase_uid = auth.uid()::text))
  with check (user_id = (select id from users where supabase_uid = auth.uid()::text));

-- Favorite locations per user
create table if not exists user_favorite_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  display_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz default now(),
  unique(user_id, latitude, longitude)
);

alter table user_favorite_locations enable row level security;

create policy "Users manage own favorites" on user_favorite_locations
  for all
  using  (user_id = (select id from users where supabase_uid = auth.uid()::text))
  with check (user_id = (select id from users where supabase_uid = auth.uid()::text));

create index user_favorite_locations_user_idx on user_favorite_locations(user_id, created_at asc);
