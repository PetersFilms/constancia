set local lock_timeout='2s';
-- Metadata only: existing rows and recoveries are not rewritten.
-- Future large histories use the verified server LZ4 codec.
alter table public.constancia_states alter column state set compression lz4;
alter table public.constancia_snapshots alter column state set compression lz4;
