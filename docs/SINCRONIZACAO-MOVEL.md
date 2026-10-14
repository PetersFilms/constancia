# Sincronização móvel — versão 48

A mensagem genérica “Não foi possível salvar” era emitida ao gravar localmente, e escondia o motivo. Um histórico de aproximadamente 3,9 MB, somado à base de sincronização e às recuperações, pode exceder a quota do localStorage. Havia também verificações independentes por intervalo no histórico, To-Do e Sono; logs do servidor registraram consultas e gravações canceladas por tempo limite.

## Alterações

- history-store.js e bootstrap.js: inicialização a partir do armazenamento durável; fallback para IndexedDB, mantendo JSON completo, chave constancia.v1, arquivo legado e recuperações. A base constancia.sync.v1 acompanha o armazenamento quando necessário. Gravações em fila com comparação do conteúdo esperado evitam sobrescrita entre abas. A confirmação da nuvem aguarda a conclusão da transação.
- app.js: recuperação before-mobile-storage-v8, exportação do histórico atual e importação com recuperações confirmadas em IndexedDB. Conteúdo e campos desconhecidos das demais abas são preservados.
- sync-engine.js e sync.js: escolha explícita mantida durante corrida de revisão; botões bloqueados enquanto a escolha é gravada e erro visível no próprio diálogo. Revisão pequena consultada antes de baixar o histórico; RPC de gravação retorna somente confirmação e revisão. Conflitos e falhas interrompem tentativas automáticas até nova ação.
- calendar-sync.js: um coordenador atende Sono e To-Do. Não há importação por intervalo. Gatilhos: alteração local, aviso de nova revisão, aviso do Google, primeira carga, ampliação de cobertura e pedido manual. Ao voltar após mais de 15 minutos, reconcilia uma vez para cobrir possíveis notificações perdidas. A continuidade de paginação termina o mesmo trabalho, sem iniciar outro por relógio.
- Backend: Google Events.watch e CalendarList.watch, renovados ao abrir/retomar quando próximos de expirar; webhook com canal aleatório, hash de segredo, recurso, validade e número de mensagem monotônico. Nunca recebe nem encaminha os eventos no corpo do aviso. Avisos pequenos são entregues por Supabase Realtime, com RLS por proprietário.
- Migração aditiva: constancia_change_notices, constancia_calendar_channels, constancia_notice_revision, constancia_calendar_notice e constancia_save_compact. Tabelas antigas, histórico, snapshots e políticas de autenticação são mantidos. Somente a tabela pequena de avisos é publicada no Realtime.

## Limites e validação

A API do Google não garante entrega de todos os avisos. Há conferência na abertura/retomada após pausa e botão manual. Enquanto o iPhone suspende o app, o backend guarda avisos para a próxima abertura; não se promete execução contínua em segundo plano. Canais expirados são recriados quando o app é usado. Credenciais existentes e escopos existentes são reutilizados.

Testes automatizados cobrem histórico de 6 milhões de caracteres com quota simulada, persistência/reabertura, revisão concorrente, preservação de campos, conflito da nuvem, suspensão de tentativas após falha, paginação compartilhada, avisos repetidos, renovação, autenticidade do webhook, RLS e snapshots. A validação visual usa navegador com largura móvel simulada, não um iPhone físico.

Fontes técnicas: https://developers.google.com/workspace/calendar/api/guides/push e https://supabase.com/docs/guides/realtime/subscribing-to-database-changes.

Resultado desta entrega: 117 testes automatizados aprovados. No navegador, a escolha da nuvem foi concluída com histórico fictício de 6 milhões de caracteres e quota reduzida; também houve validação de toque em largura móvel sem overflow. No backend real, seis canais Google foram confirmados; um compromisso fictício na agenda de testes gerou avisos e foi importado automaticamente. A versão dos avisos chegou a 3 e foi reconhecida como sincronizada em 3, sem pedido manual de importação.
