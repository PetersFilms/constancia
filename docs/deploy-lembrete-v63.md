# Deploy do lembrete diário (v63) — passos do Pedro

Os três comandos rodam a partir da pasta do repo (`Codex/Constancia-GitHub`), com a CLI do Supabase já logada. Nenhum segredo entra no GitHub.

## 1. Segredos da função (uma vez)
As chaves VAPID estão em `~/.config/constancia/push-vapid.env` (fora do repo):

```bash
npx -y supabase@latest secrets set --env-file ~/.config/constancia/push-vapid.env --project-ref ahsnobrlcyaefdanjdsm
```

## 2. Banco (tabela + agendamento a cada 10 min)
Os comandos de db/functions SÓ funcionam a partir da pasta do repo (o cd faz parte do comando):
```bash
cd "/Users/pettersonponttes/Documents/Documents - Petters M4/Codex/Constancia-GitHub" && npx -y supabase@latest db push --project-ref ahsnobrlcyaefdanjdsm
```
Se ainda reclamar de "remote migration versions not found" (o histórico remoto tem versões antigas que não estão no repo), NÃO rode `migration repair`: aplique a migration direto no painel — SQL Editor do projeto → colar o conteúdo de `supabase/migrations/20261112190000_push_reminders.sql` → Run.

## 3. Função push
```bash
cd "/Users/pettersonponttes/Documents/Documents - Petters M4/Codex/Constancia-GitHub" && npx -y supabase@latest functions deploy push --project-ref ahsnobrlcyaefdanjdsm
```

## 4. Publicar o app
Commit + push pelo GitHub Desktop (v63: index.html, sw.js, bootstrap.js, sync.js, reminder.js, AGENTS.md, supabase/*, push-service.test.cjs).

## 5. Testar no iPhone
1. Abrir o Constância **instalado na tela de início** (push só funciona assim no iOS).
2. Atualizar o app quando o aviso de atualização aparecer.
3. Configurações → **Lembrete diário** → escolher um horário 15 min à frente → Ativar → permitir notificações.
4. Fechar o app e esperar: o aviso chega em até 10 min após o horário (granularidade do agendamento).

Se não chegar: conferir em SQL `select * from cron.job;` (job `constancia-push-reminders`) e os logs da função push no painel.
