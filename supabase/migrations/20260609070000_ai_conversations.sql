alter table ai_conversations add column if not exists title text;
alter table ai_conversations add column if not exists updated_at timestamptz default now();
alter table ai_conversations add column if not exists message_count int default 0;

-- Separate messages table for proper conversation history
create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references ai_conversations(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  role text not null, -- 'user' | 'assistant'
  content text not null,
  created_at timestamptz default now()
);

alter table ai_messages enable row level security;
create policy "Users manage own ai messages" on ai_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index ai_messages_conversation on ai_messages(conversation_id, created_at asc);
create index ai_conversations_user on ai_conversations(user_id, updated_at desc);
