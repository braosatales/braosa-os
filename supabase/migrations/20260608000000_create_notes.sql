-- drop existing notes table (old schema: id text, world, status, source)
drop table if exists notes cascade;

create table notes (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete cascade not null, title text, content text not null default '', color text default 'default', pinned boolean default false, archived boolean default false, tags text[] default '{}', created_at timestamptz default now(), updated_at timestamptz default now());
alter table notes enable row level security;
create policy "Users can manage their own notes" on notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index notes_user_id_idx on notes(user_id);
create index notes_pinned_idx on notes(user_id, pinned) where pinned = true;
