-- Additive only: execution data stays in constancia_states.state.todo.
-- These tables are inaccessible to anon/authenticated, even via the Data API.
create table public.constancia_calendar_connections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 account_id text not null,
 token_box jsonb not null check (token_box->>'v' = '1' and token_box ? 'iv' and token_box ? 'data' and octet_length(token_box::text)<16000),
 cursors jsonb not null default '{}',
 reconnect boolean not null default false,
 last_sync timestamptz,
 lease_id uuid,
 lease_until timestamptz not null default '1970-01-01T00:00:00Z',
 created_at timestamptz not null default now()
);
create table public.constancia_calendar_oauth (
 state_hash text primary key check (state_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 return_url text not null,
 verifier_box jsonb not null check (verifier_box->>'v' = '1' and verifier_box ? 'iv' and verifier_box ? 'data'),
 expires_at timestamptz not null
);
create index constancia_calendar_oauth_user on public.constancia_calendar_oauth(user_id);
create index constancia_calendar_oauth_expiration on public.constancia_calendar_oauth(expires_at);
alter table public.constancia_calendar_connections enable row level security;
alter table public.constancia_calendar_oauth enable row level security;
revoke all on public.constancia_calendar_connections, public.constancia_calendar_oauth from public, anon, authenticated;
grant select, insert, update, delete on public.constancia_calendar_connections, public.constancia_calendar_oauth to service_role;
-- No client policies: only the verified-user backend may read encrypted boxes.
