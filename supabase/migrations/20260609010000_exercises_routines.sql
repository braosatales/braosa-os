create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_pt text,
  muscle_groups text[] default '{}',
  equipment_needed text[] default '{}',
  type text default 'strength',
  difficulty text default 'intermediate',
  instructions text,
  youtube_search_query text,
  created_at timestamptz default now()
);
alter table exercises enable row level security;
create policy "Exercises are publicly readable" on exercises for select using (true);

create table routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  description text,
  target_days text[] default '{}',
  estimated_duration int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table routines enable row level security;
create policy "Users manage own routines" on routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid references routines(id) on delete cascade not null,
  exercise_id uuid references exercises(id) not null,
  order_index int not null default 0,
  sets int default 3,
  reps int,
  duration_seconds int,
  rest_seconds int default 60,
  notes text,
  is_superset boolean default false,
  superset_group int
);
alter table routine_exercises enable row level security;
create policy "Users manage own routine exercises" on routine_exercises
  for all using (
    exists (select 1 from routines where id = routine_id and user_id = auth.uid())
  );

create table exercise_video_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  exercise_id uuid references exercises(id) not null,
  youtube_video_id text not null,
  youtube_title text,
  status text default 'neutral',
  used_count int default 0,
  last_used_at timestamptz,
  unique(user_id, exercise_id, youtube_video_id)
);
alter table exercise_video_prefs enable row level security;
create policy "Users manage own video prefs" on exercise_video_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into exercises (name, name_pt, muscle_groups, equipment_needed, type, difficulty, youtube_search_query) values
('Push Up','Flexão de Braços',ARRAY['chest','triceps','shoulders'],ARRAY['none'],'strength','beginner','push up proper form tutorial'),
('Pull Up','Puxada na Barra',ARRAY['back','biceps'],ARRAY['none'],'strength','intermediate','pull up form tutorial'),
('Squat','Agachamento',ARRAY['legs','glutes'],ARRAY['none'],'strength','beginner','bodyweight squat form tutorial'),
('Deadlift','Peso Morto',ARRAY['back','legs','glutes'],ARRAY['barbell_rack','full_gym'],'strength','intermediate','deadlift form tutorial beginners'),
('Bench Press','Supino',ARRAY['chest','triceps','shoulders'],ARRAY['barbell_rack','full_gym'],'strength','intermediate','bench press form tutorial'),
('Overhead Press','Desenvolvimento',ARRAY['shoulders','triceps'],ARRAY['barbell_rack','dumbbells','full_gym'],'strength','intermediate','overhead press form tutorial'),
('Barbell Row','Remada com Barra',ARRAY['back','biceps'],ARRAY['barbell_rack','full_gym'],'strength','intermediate','barbell row form tutorial'),
('Dumbbell Curl','Curl com Haltere',ARRAY['biceps'],ARRAY['dumbbells','full_gym'],'strength','beginner','dumbbell bicep curl form'),
('Tricep Dip','Mergulho de Tríceps',ARRAY['triceps','chest'],ARRAY['none'],'strength','beginner','tricep dips form tutorial'),
('Plank','Prancha',ARRAY['core'],ARRAY['none'],'strength','beginner','plank form tutorial'),
('Romanian Deadlift','Peso Morto Romeno',ARRAY['glutes','legs','back'],ARRAY['dumbbells','barbell_rack','full_gym'],'strength','intermediate','romanian deadlift dumbbell form'),
('Lunges','Afundos',ARRAY['legs','glutes'],ARRAY['none'],'strength','beginner','lunges form tutorial'),
('Dumbbell Row','Remada com Haltere',ARRAY['back','biceps'],ARRAY['dumbbells','full_gym'],'strength','beginner','dumbbell row form tutorial'),
('Lateral Raise','Elevação Lateral',ARRAY['shoulders'],ARRAY['dumbbells','full_gym'],'strength','beginner','lateral raise form tutorial'),
('Face Pull','Face Pull',ARRAY['shoulders','back'],ARRAY['full_gym'],'strength','beginner','face pull cable form tutorial'),
('Hip Thrust','Elevação de Anca',ARRAY['glutes'],ARRAY['barbell_rack','dumbbells','full_gym'],'strength','beginner','hip thrust form tutorial'),
('Burpee','Burpee',ARRAY['full_body','cardio'],ARRAY['none'],'hiit','intermediate','burpee form tutorial'),
('Mountain Climber','Escalador',ARRAY['core','cardio'],ARRAY['none'],'hiit','beginner','mountain climbers form'),
('Kettlebell Swing','Swing com Kettlebell',ARRAY['glutes','back','core'],ARRAY['kettlebells'],'strength','intermediate','kettlebell swing form tutorial'),
('Ring Dip','Mergulho em Argolas',ARRAY['chest','triceps','shoulders'],ARRAY['rings'],'strength','advanced','ring dips form tutorial'),
('Ring Row','Remada em Argolas',ARRAY['back','biceps'],ARRAY['rings'],'strength','beginner','ring rows form tutorial'),
('Box Jump','Salto na Caixa',ARRAY['legs','cardio'],ARRAY['full_gym'],'hiit','intermediate','box jump form tutorial'),
('Cable Fly','Crucifixo no Cabo',ARRAY['chest'],ARRAY['full_gym'],'strength','beginner','cable fly chest form'),
('Leg Press','Leg Press',ARRAY['legs','glutes'],ARRAY['full_gym'],'strength','beginner','leg press form tutorial'),
('Calf Raise','Elevação em Pontas',ARRAY['legs'],ARRAY['none','full_gym'],'strength','beginner','calf raise form tutorial');
