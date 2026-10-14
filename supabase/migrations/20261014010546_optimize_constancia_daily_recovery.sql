-- Avoid preparing/compressing a multi-megabyte recovery that already exists.
-- UPDATE holds the state row lock; ON CONFLICT remains a final concurrency guard.
-- No state or snapshot rows are changed by this migration.
create or replace function public.constancia_protect_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if not exists (select 1 from public.constancia_snapshots where user_id = old.user_id and day = current_date) then
      insert into public.constancia_snapshots(user_id, day, state, revision)
      values (old.user_id, current_date, old.state, old.revision) on conflict do nothing;
    end if;
    new.revision := old.revision + 1;
  else
    new.revision := 1;
  end if;
  new.updated_at := now();
  return new;
end $$;
