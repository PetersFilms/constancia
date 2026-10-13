# To-Do — diagnóstico e estratégia

Projeto analisado em 13/10/2026, antes da implementação. Base: commit 8123540, tema branco gelo com Pogonia.

## Estrutura existente

- Aplicativo estático em HTML, CSS e JavaScript; funciona localmente, em GitHub Pages e como PWA.
- Estado principal em `constancia.v1`; backups, migrações aditivas e bloqueio de gravação quando a recuperação falha.
- Autenticação Supabase existente, sem introduzir outra conta do Constância.
- `constancia_states` com estado JSON, revisão otimista, RLS por usuário e cópias diárias em `constancia_snapshots`.
- Reconciliação de três versões em `sync-core.js` e `sync-engine.js`; remoções deliberadas e campos de abas futuras precisam permanecer intactos.
- Navegação estava distribuída entre `body.js` e `training.js`. Foi extraída para `navigation.js` para incorporar a quarta aba sem controles concorrentes.

## Decisões

1. Acrescentar `state.todo` com `items`, `history` e fuso. Não migrar as áreas existentes para outra tecnologia ou substituir seu banco.
2. Tratar cada ocorrência como item estável. A identidade importada depende de calendário, evento e ocorrência. Eventos criados no Constância usam um ID Google determinístico, válido em base32hex, para tolerar respostas perdidas.
3. Preservar planejamento original separado do atual. Estado de execução, horário real, cancelamento e quantidade de adiamentos pertencem ao Constância. Adiar não duplica a tarefa.
4. Usar uma Edge Function no projeto Supabase existente. Tokens de acesso/refresh são cifrados com AES-GCM e ficam em tabelas sem acesso para `anon` ou `authenticated`; a chave de cifragem e o client secret ficam em secrets do runtime.
5. Usar OAuth de servidor com PKCE, state aleatório, validade de dez minutos e consumo único. O callback é o único GET sem JWT; todos os POST validam o usuário no Supabase Auth antes de acessar dados.
6. Google é a referência para título, descrição e datas confirmadas. Operações locais aguardam envio, com ETag e `If-Match`. Em conflito, o estado remoto é apresentado, e a proposta local fica protegida para escolha explícita. A execução não é substituída por campos do Google.
7. Importar as agendas acessíveis, exceto o calendário de feriados do Google, conforme ajuste solicitado pelo usuário. Agendas de leitura podem ser acompanhadas, mas não são editadas. Não enviar convites nem mensagens: alterações usam `sendUpdates=none`, sem modificar participantes.
8. Não implementar Google Tasks: o usuário confirmou que o escopo é eventos e compromissos do Google Agenda.

## Sincronização e limites operacionais

- Sincronização automática na abertura/retorno e a cada 60 segundos enquanto o aplicativo está visível, além do botão de tentativa manual. Aplicativo fechado recebe as mudanças no próximo acesso; não há webhook ou execução contínua em segundo plano nesta versão.
- Eventos não recorrentes são importados sem filtro de data. Séries recorrentes são expandidas em uma janela de 366 dias antes/depois da data consultada, renovada diariamente ou quando a série muda. Isso evita expandir séries infinitas. Navegar para outra data recompõe a janela sem apagar histórico; datas entre 1900 e 2200 são aceitas.
- A coleção de eventos usa paginação e `nextSyncToken` incremental, mantendo os mestres fora dos indicadores; ocorrências expandidas usam seus próprios IDs. `410` inicia nova leitura, preservando execução e histórico. Eventos ausentes da leitura completa são consultados individualmente antes de serem considerados excluídos.
- Ocorrências individuais são atualizadas pelo próprio ID; não há PATCH da série mãe nem endpoint que exclua eventos Google.
- Cancelamento operacional mantém o mesmo evento com `[Cancelado]` e uma propriedade privada; exclusão externa é uma marca distinta, com auditoria e proteção contra recriação automática.
- Um lease por usuário impede sincronizações concorrentes. Revisão otimista protege o JSON em cada atualização. Novas edições durante envio continuam na fila.
- Uma fila vinculada à conta Google não é enviada para outra conta após reconexão.
- Histórico não é compactado nesta versão; o limite existente do JSON do Supabase continua valendo. Em falha de tamanho ou gravação, a fila e os dados anteriores são preservados.

## Indicadores

Base: eventos do ano corrente cujo planejamento original ou atual chegou até hoje, excluindo feriados. Pendências começam em 1º de janeiro do ano corrente; registros anteriores permanecem armazenados. Um adiamento para o futuro continua na base; não aumenta artificialmente a taxa ao retirar o compromisso atrasado do denominador. Cancelados e excluídos externamente são retirados dos elegíveis. Conclusões usam o estado atual e timestamp real. Eventos adiados são contados uma vez; ações de reagendamento têm contador separado. Pendências usam a data atual confirmada e nunca são reagendadas automaticamente.

## Preservação e testes

Nova proteção: `constancia.recovery.before-todo-v5`, com o JSON original antes da primeira gravação estrutural. Backup antigo sem To-Do mantém o To-Do atual. Merge identifica itens e auditorias por ID. Evento, execução e operação pendente são unidades atômicas na reconciliação; alterações independentes de agenda e conclusão podem ser reunidas.

Testes usam JSDOM, serviços HTTP simulados e PostgreSQL local via PGlite. Não usam tokens reais nem alteram compromissos reais. A verificação visual no navegador e os testes com consentimento Google real precisam ser relatados separadamente.

## Documentação consultada

- [Google — sincronização incremental](https://developers.google.com/workspace/calendar/api/guides/sync)
- [Google — recorrência](https://developers.google.com/workspace/calendar/api/guides/recurringevents)
- [Google — versões e ETags](https://developers.google.com/workspace/calendar/api/guides/version-resources)
- [Google — OAuth no servidor](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Supabase — autenticação das Edge Functions](https://supabase.com/docs/guides/functions/auth-headers)
- [Supabase — secrets](https://supabase.com/docs/guides/functions/secrets)

## Ajustes após conexão real

A leitura real revelou custo alto na criação repetida de formatadores IANA e tamanho elevado da base de sincronização. O núcleo reutiliza formatadores e validações de fuso em caches limitados. Metadados grandes de `constancia.sync.v1` usam um envelope v2 com LZ-UTF16; o carregador aceita v1 e decodifica v2 para o mesmo objeto interno. Código antigo recusa v2 para evitar sincronizar usando uma base incompleta. `constancia.v1`, credenciais de autenticação e JSONs de recuperação permanecem com o formato anterior. Não há remoção de registros.

Carga inicial grande é paginada em etapas, com pontos de retomada persistidos e continuação automática enquanto o aplicativo estiver visível. O intervalo normal após a conclusão permanece em um minuto.

Convites em duas agendas são apresentados uma vez por iCalUID e ocorrência. A ação de execução mais recente escolhe a cópia apresentada; sem ação, prefere uma cópia editável e a agenda principal. As cópias e auditorias originais permanecem armazenadas. Não deduplicar por título/horário, pois eventos diferentes podem coincidir.
