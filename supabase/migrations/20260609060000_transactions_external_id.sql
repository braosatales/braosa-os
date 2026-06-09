alter table finance_transactions add column if not exists external_id text;
create unique index if not exists finance_transactions_external_id on finance_transactions(user_id, external_id) where external_id is not null;
