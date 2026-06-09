-- GoCardless bank connections
create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  institution_id text not null,
  institution_name text not null,
  institution_logo text,
  requisition_id text not null unique,
  status text default 'pending',
  account_ids text[] default '{}',
  created_at timestamptz default now(),
  last_synced_at timestamptz
);

alter table bank_connections enable row level security;
create policy "Users manage own bank connections" on bank_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Map GoCardless accounts to finance_accounts
create table bank_account_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  bank_connection_id uuid references bank_connections(id) on delete cascade not null,
  gocardless_account_id text not null unique,
  finance_account_id uuid references finance_accounts(id) on delete set null,
  account_name text,
  iban text,
  currency text default 'EUR',
  created_at timestamptz default now()
);

alter table bank_account_links enable row level security;
create policy "Users manage own bank account links" on bank_account_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
