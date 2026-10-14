-- Small, owner-isolated change notices; never stream complete histories or tokens.
create table public.constancia_change_notices (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0,
 calendar_version bigint not null default 0,
 calendar_synced_version bigint not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.constancia_change_notices enable row level security;
revoke all on public.constancia_change_notices from public,anon,authenticated;
grant select on public.constancia_change_notices to authenticated;
grant insert(user_id,revision),update(revision,updated_at) on public.constancia_change_notices to authenticated;
grant all on public.constancia_change_notices to service_role;
create policy notices_read on public.constancia_change_notices for select to authenticated using(user_id=(select auth.uid()));
create policy notices_insert on public.constancia_change_notices for insert to authenticated with check(user_id=(select auth.uid()));
create policy notices_update on public.constancia_change_notices for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
insert into public.constancia_change_notices(user_id,revision) select user_id,revision from public.constancia_states;
create function public.constancia_notice_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.constancia_change_notices(user_id,revision) values(new.user_id,new.revision)
 on conflict(user_id) do update set revision=excluded.revision,updated_at=now();
 return new;
end $$;
revoke all on function public.constancia_notice_revision() from public,anon,authenticated;
create trigger constancia_change_notice after insert or update on public.constancia_states for each row execute function public.constancia_notice_revision();
-- Publish only small notices, not constancia_states or credential tables.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.constancia_change_notices;
 end if;
end $$;
create table public.constancia_calendar_channels (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 calendar_id text not null,
 token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
 resource_id text,
 expires_at timestamptz not null,
 message_number numeric not null default 0
);
create index constancia_channels_owner on public.constancia_calendar_channels(user_id,calendar_id,expires_at);
alter table public.constancia_calendar_channels enable row level security;
revoke all on public.constancia_calendar_channels from public,anon,authenticated;
grant all on public.constancia_calendar_channels to service_role;
create function public.constancia_calendar_notice(channel_id uuid,token_digest text,resource text,message_no numeric) returns boolean
language plpgsql security invoker set search_path='' as $$
declare owner uuid;
begin
 update public.constancia_calendar_channels set message_number=message_no
 where id=channel_id and token_hash=token_digest and expires_at>now()
 and (resource_id is null or resource_id=resource) and message_number<message_no
 returning user_id into owner;
 if owner is null then return false; end if;
 insert into public.constancia_change_notices(user_id,calendar_version) values(owner,1)
 on conflict(user_id) do update set calendar_version=public.constancia_change_notices.calendar_version+1,updated_at=now();
 return true;
end $$;
revoke all on function public.constancia_calendar_notice(uuid,text,text,numeric) from public,anon,authenticated;
grant execute on function public.constancia_calendar_notice(uuid,text,text,numeric) to service_role;
-- Successful writes return a revision, avoiding a second serialization/transfer of the entire JSON.
create function public.constancia_save_compact(owner_id uuid,expected_revision bigint,next_state jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result_revision bigint;
begin
 if auth.uid() is null or owner_id<>auth.uid() then raise exception 'Authentication required' using errcode='42501'; end if;
 if expected_revision=0 then
  insert into public.constancia_states(user_id,state) values(auth.uid(),next_state) on conflict do nothing returning revision into result_revision;
 else
  update public.constancia_states set state=next_state where user_id=auth.uid() and revision=expected_revision returning revision into result_revision;
 end if;
 if result_revision is not null then return jsonb_build_object('saved',true,'revision',result_revision); end if;
 select revision into result_revision from public.constancia_states where user_id=auth.uid();
 return jsonb_build_object('saved',false,'revision',coalesce(result_revision,0));
end $$;
revoke all on function public.constancia_save_compact(uuid,bigint,jsonb) from public,anon;
grant execute on function public.constancia_save_compact(uuid,bigint,jsonb) to authenticated;
