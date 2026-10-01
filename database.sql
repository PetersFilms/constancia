-- Private personal state, optimistic revision checks and daily recovery copies.
create table public.constancia_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object' and state ? 'habits' and state ? 'checks' and octet_length(state::text) <= 15000000),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create table public.constancia_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  state jsonb not null,
  revision bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.constancia_states enable row level security;
alter table public.constancia_snapshots enable row level security;
revoke all on public.constancia_states, public.constancia_snapshots from anon, authenticated;
grant select, insert, update on public.constancia_states to authenticated;
grant select, insert on public.constancia_snapshots to authenticated;
create policy states_read on public.constancia_states for select to authenticated using (user_id = (select auth.uid()));
create policy states_create on public.constancia_states for insert to authenticated with check (user_id = (select auth.uid()));
create policy states_update on public.constancia_states for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy snapshots_read on public.constancia_snapshots for select to authenticated using (user_id = (select auth.uid()));
create policy snapshots_create on public.constancia_snapshots for insert to authenticated with check (user_id = (select auth.uid()));
create function public.constancia_protect_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.constancia_snapshots(user_id, day, state, revision)
    values (old.user_id, current_date, old.state, old.revision) on conflict do nothing;
    new.revision := old.revision + 1;
  else
    new.revision := 1;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger constancia_revision before insert or update on public.constancia_states
for each row execute function public.constancia_protect_revision();
create function public.constancia_save(owner_id uuid, expected_revision bigint, next_state jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare saved public.constancia_states;
begin
  if auth.uid() is null or owner_id <> auth.uid() then raise exception 'Authentication required' using errcode = '42501'; end if;
  if expected_revision = 0 then
    insert into public.constancia_states(user_id, state) values (auth.uid(), next_state)
    on conflict do nothing returning * into saved;
  else
    update public.constancia_states set state = next_state
    where user_id = auth.uid() and revision = expected_revision returning * into saved;
  end if;
  if saved.user_id is not null then
    return jsonb_build_object('saved', true, 'state', saved.state, 'revision', saved.revision, 'updated_at', saved.updated_at);
  end if;
  select * into saved from public.constancia_states where user_id = auth.uid();
  return jsonb_build_object('saved', false, 'state', saved.state, 'revision', coalesce(saved.revision, 0), 'updated_at', saved.updated_at);
end $$;
revoke execute on function public.constancia_protect_revision() from public, anon, authenticated;
revoke execute on function public.constancia_save(uuid, bigint, jsonb) from public, anon;
grant execute on function public.constancia_save(uuid, bigint, jsonb) to authenticated;
