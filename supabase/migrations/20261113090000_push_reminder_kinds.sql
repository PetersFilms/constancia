-- Segundo lembrete por aparelho: 'habitos' (noite) e 'sono' (manhã), cada um com
-- seu horário e seu last_sent. Aditiva: coluna nova com default; a unicidade passa
-- a incluir o tipo para o mesmo aparelho guardar os dois.
alter table public.constancia_push_reminders
 add column kind text not null default 'habitos' check (kind in ('habitos','sono'));
alter table public.constancia_push_reminders
 drop constraint constancia_push_reminders_user_id_endpoint_key;
alter table public.constancia_push_reminders
 add constraint constancia_push_reminders_user_endpoint_kind_key unique (user_id, endpoint, kind);
