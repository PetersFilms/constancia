-- Caixa de captura do segundo cérebro: texto ou foto enviados pelo aplicativo e
-- processados sob demanda no computador do proprietário. A foto viaja comprimida
-- dentro do registro e é uma fonte temporária: o conteúdo é esvaziado após a
-- classificação. Aditiva: nada em constancia_states muda.
create table public.constancia_brain_inbox (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 kind text not null check (kind in ('texto','foto')),
 content text not null check (octet_length(content) <= 2500000),
 note text not null default '' check (char_length(note) <= 10000),
 status text not null default 'pendente' check (status in ('pendente','classificado','descartado')),
 result text check (char_length(result) <= 10000),
 processed_at timestamptz
);
alter table public.constancia_brain_inbox enable row level security;
create policy "brain_inbox_own" on public.constancia_brain_inbox
 for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index constancia_brain_inbox_user_status
 on public.constancia_brain_inbox (user_id, status, created_at desc);
