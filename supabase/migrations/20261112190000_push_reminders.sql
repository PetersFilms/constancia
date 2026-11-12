-- Lembrete diário por Web Push: cada aparelho inscrito guarda sua assinatura e o
-- horário local escolhido. O envio roda num agendamento do próprio banco que chama
-- a função push a cada 10 minutos; last_sent garante no máximo um aviso por dia.
-- Aditiva: nada em constancia_states muda e nenhuma tabela existente é tocada.
create table public.constancia_push_reminders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null check (char_length(endpoint) <= 1000),
 subscription jsonb not null,
 remind_at text not null check (remind_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 tz text not null default 'America/Sao_Paulo' check (char_length(tz) <= 64),
 enabled boolean not null default true,
 last_sent date,
 created_at timestamptz not null default now(),
 unique (user_id, endpoint)
);
alter table public.constancia_push_reminders enable row level security;
create policy "push_reminders_own" on public.constancia_push_reminders
 for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index constancia_push_reminders_enabled
 on public.constancia_push_reminders (enabled) where enabled;

-- Disparo: a rota /cron é idempotente e não exige segredo (só reenvia se ainda não
-- enviou hoje), então o agendamento não carrega credencial neste repositório público.
-- shortcut: quem conhecer a URL pode acionar verificações extras (sem efeito além de
-- consumo mínimo); se um dia incomodar, mover um segredo pro Vault e conferir na função.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
 'constancia-push-reminders',
 '*/10 * * * *',
 $$select net.http_post(
   url:='https://ahsnobrlcyaefdanjdsm.supabase.co/functions/v1/push/cron',
   body:='{}'::jsonb,
   headers:='{"Content-Type":"application/json"}'::jsonb
 )$$
);
