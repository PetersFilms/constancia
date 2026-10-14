# Constância — relatório do módulo To-Do

Atualizado em 13/10/2026. Implementação sobre o projeto existente, base 8123540 (branco gelo e Pogonia). A entrega foi desenvolvida e validada localmente; o banco e o backend foram implantados no Supabase. O proprietário concluiu login, vinculação e consentimento. A importação real foi observada; a validação de ida e volta em agenda de teste foi concluída. O frontend foi publicado no GitHub Pages, com recursos/cache v37 e conferência de igualdade dos arquivos principais.

## Resultado implementado

- Quarta aba To-Do, responsiva, com Hoje, Pendências, Amanhã, Próximos por data e Histórico.
- Checkbox com conclusão e desfazer imediatos, timestamp real e persistência; sem modal para concluir.
- Painel de detalhes com cinco estados em controle horizontal. Em telas estreitas os controles quebram em duas linhas, mantendo áreas de toque.
- Cancelamento com motivo opcional, timestamp, planejamento original e histórico. Não é conclusão e não entra na base da taxa. Evento Google permanece com prefixo `[Cancelado]`, sem exclusão automática.
- Adiamento exige nova data/horário, preserva a primeira programação e audita cada alteração. Evento conta uma vez; remarcações contam ações separadamente.
- Métricas de planejados, concluídos, pendentes, cancelados, adiados, execução, acumulados e remarcações. Adiar para o futuro não retira o planejamento original do denominador.
- Eventos de dia inteiro sem horário artificial, dias múltiplos, fuso IANA e estado independente por ocorrência recorrente.
- Origem, calendário/evento/ocorrência, execução, outbox, conflito e histórico persistidos no estado existente do Constância.
- Sincronização bidirecional com paginação, tokens incrementais, reconciliação, IDs determinísticos para exportação e ETags para conflitos. Respostas perdidas e repetição de chamadas não criam novo evento.
- Exclusão externa conserva a auditoria e se distingue de cancelamento operacional. Agendas somente leitura não recebem alterações.
- OAuth de servidor com PKCE e estado de uso único de dez minutos; refresh, expiração e reconexão. Tokens cifrados com AES-GCM; credenciais exclusivas do backend.

## Arquivos

Criados:

- `todo-core.js`: modelo, transições, datas, indicadores, fila e importação compartilhados pelo frontend/backend.
- `todo.js`, `todo.css`: interface e coordenação da agenda.
- `navigation.js`: navegação unificada das quatro áreas.
- `supabase/functions/calendar/index.ts`: HTTP, autorização, OAuth e credenciais.
- `supabase/functions/calendar/service.mjs`: sincronização e conflitos, com dependências testáveis.
- `supabase/functions/calendar/deno.json`, `.env.example`, `supabase/config.toml`: configuração e modelo sem valores secretos.
- `supabase/migrations/20261013180824_todo_calendar_credentials.sql`: tabelas privadas aditivas.
- `todo.test.cjs`, `todo-dom.test.cjs`, `calendar-service.test.cjs`, `calendar-auth.test.cjs`, `calendar-database.test.cjs`: testes do módulo e seus limites.
- `docs/TODO-DIAGNOSTICO.md`, `docs/TODO-GOOGLE-CONFIGURACAO.md`, este relatório.

Modificados:

- `index.html`, `app.js`, `core.js`, `sw.js`: carregamento, aba, migração aditiva e recursos/cache v37.
- `body.js`, `training.js`: uso da navegação compartilhada; áreas existentes preservadas.
- `persistence-core.js`, `sync-core.js`, `sync.js`: preservação e reconciliação de itens/histórico, integração com a autenticação já existente.
- `body-decimal.test.cjs`, `training-dom.test.cjs`: regressões adaptadas à inicialização das quatro áreas.
- `package.json`, `package-lock.json`: versão 1.5.0, PostgreSQL isolado PGlite 0.5.9 para teste de RLS e LZ-String 1.5.0 para metadados grandes.
- `sdk-entry.js`, `cloud-sdk.js`, `sync-engine.js`, `sync.test.cjs`: compressão sem perdas da base local de sincronização, leitura do formato anterior e teste com quota.
- `.gitignore`, `AGENTS.md`, `README.md`: regras de manutenção, configuração e documentação.

## Banco de dados e preservação

Migração remota aplicada: `20261013180824`, `todo_calendar_credentials`.

| Recurso | Finalidade | Acesso |
| --- | --- | --- |
| `constancia_calendar_connections` | Caixa cifrada de tokens, cursores, reconexão e lease por usuário | Somente backend `service_role` |
| `constancia_calendar_oauth` | Hash do estado, verificador cifrado, usuário, retorno e expiração | Somente backend `service_role` |
| `constancia_states.state.todo` | Itens, execução e histórico do To-Do | Autenticação/RLS e RPC existentes |

Nenhuma tabela anterior foi removida ou substituída. Não houve migração de hábitos, treinos ou evolução corporal para outra tecnologia. O módulo grava pelo RPC `constancia_save`, mantendo revisão otimista e recuperação existentes.

Localmente, `constancia.recovery.before-todo-v5` protege os bytes do JSON anterior antes da primeira gravação estrutural. Backups antigos sem To-Do não apagam o To-Do atual. IDs, campos desconhecidos e dados de áreas futuras são preservados; falha de recuperação ou estado inválido bloqueiam novas gravações. Nenhum registro pessoal ou de teste foi inserido no Git público.

## Integrações efetivamente configuradas

- Supabase existente: `ahsnobrlcyaefdanjdsm`, organização Petters.
- Função `calendar` implantada e ativa, versão 10. Verificação HTTP própria de usuário em todo POST; callback usa estado expirável de uso único. `verify_jwt=false` é necessário para o callback e não elimina a autenticação dos demais caminhos.
- Google Cloud: `constancia-agenda`, nome Constancia Agenda; API Google Calendar ativada.
- Consentimento: Constância, External/Testing, um usuário de teste (proprietário).
- Cliente OAuth: Constância Web, aplicativo web, um único callback `https://ahsnobrlcyaefdanjdsm.supabase.co/functions/v1/calendar/callback`.
- Escopos: `calendar.events` e `calendar.calendarlist.readonly`, sem Tasks/Gmail/Drive.
- Secrets `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_KEY` salvos e conferidos por digest, sem exposição dos valores. Chave de cifragem aleatória de 32 bytes.
- Login do painel via GitHub autorizado separadamente pelo proprietário, com leitura de e-mails somente para o login Supabase.

O consentimento da Agenda foi concedido pelo próprio proprietário na prévia interna. Nenhum compromisso real foi alterado para testes.

## Testes e evidências

`npm test`: **65 testes, 65 aprovados, zero falhas**, em 13/10/2026.

| Área | Validação |
| --- | --- |
| Funcionalidades anteriores | Peso `70,50`, dados ausentes, hábitos, treinos, edição, catálogos, backups e sincronização entre aparelhos |
| Núcleo To-Do | Cinco estados, timestamp, desfazer, cancelamento, indicadores, múltiplos adiamentos, timezone, dia inteiro, ocorrências e exclusão externa |
| Interface DOM | Checkbox sem modal, painel oculto, motivo, seletor de adiamento, teclado, recarga, migração idempotente, proteção contra aba desatualizada |
| Google simulado | Importação/exportação, paginação, repetição idempotente, respostas perdidas, 409/410/412, leitura, alteração durante envio, reconexão para outra conta, lease |
| Autenticação simulada | JWT inválido, Origin não permitido, PKCE, cifragem, repetição de callback, refresh e desconexão |
| Banco PostgreSQL isolado | RLS e privilégios: anon/authenticated não leem nem escrevem tokens; somente service_role |
| Supabase real | Migração aplicada, RLS/privilégios conferidos; POST sem conta retorna 401 e Origin desconhecida retorna 403 |
| Navegador | Chrome desktop e viewport reduzida: criação fictícia, conclusão, recarga, cancelamento por terceiro, histórico e adiamento; cinco estados visíveis em duas linhas; sem overflow horizontal |

O teste visual usou origem separada `127.0.0.1:8772`, com um compromisso fictício e sem conexão Google. A origem principal `127.0.0.1:8771` conserva o histórico do usuário. Viewport reduzida no Chrome não equivale a teste em iPhone físico/Safari.

`git diff --check` sem erros. Capturas de tela ficam fora do repositório público. Os testes simulados não são evidência de uma conexão real Google concluída.

## Limites e pendências de aceite

1. Login, vinculação do histórico e consentimento Google foram concluídos pelo proprietário. A importação real foi observada.
2. Importação, exportação, conclusão/desfazer, cancelamento, adiamento, edição externa e alteração por ocorrência foram conferidos nos dois lados na agenda de testes autorizada. A remoção de uma cópia de convite foi refletida como exclusão externa; exclusão permanente de eventos não foi executada.
3. O frontend v37 foi publicado em https://petersfilms.github.io/constancia/#todo. A publicação inclui o tema branco gelo e o módulo To-Do. index.html, todo-core.js, todo.js e sw.js responderam HTTP 200 e coincidiram byte a byte com a versão local. O envio foi feito pela sessão autorizada do GitHub no Chrome; o Git local não tinha autenticação de escrita.
4. Atualizações automáticas ocorrem ao abrir/retornar e a cada 60 segundos com o aplicativo visível. Não há atualização contínua enquanto o aplicativo está fechado.
5. Eventos comuns entram sem limite de data; recorrências são expandidas em ±366 dias da data consultada. Navegar recompõe a janela; não há expansão de série infinita.
6. O Google mantém a referência de dados confirmados. Alteração simultânea conserva a proposta local para resolução explícita; não há sobrescrita automática forçada.
7. OAuth permanece em Testing. Para uso duradouro ou por mais pessoas, seguir publicação/verificação do Google e suas regras de expiração de refresh token.
8. O histórico JSON não é compactado. O limite de tamanho do mecanismo anterior continua valendo e falhas de gravação não apagam o estado.
9. Não houve validação em iPhone físico. As alterações de teste foram executadas na agenda separada, com consentimento do proprietário.

O Advisor Supabase informa RLS sem policies nas duas tabelas privadas: é intencional, pois clientes não devem acessá-las. Também já existia, antes desta migração, o aviso de proteção contra senhas vazadas desativada; a configuração de autenticação anterior não foi alterada. [Referência da proteção de senha](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Critério para considerar concluído

A implementação e os testes isolados passaram. Os critérios funcionais foram exercitados localmente, inclusive sincronização real. A disponibilidade no GitHub Pages foi conferida por HTTP e comparação dos arquivos publicados. Os testes de ida e volta com a conta do proprietário ocorreram na prévia local; o teste interativo autenticado no domínio público foi realizado após abrir a versão atualizada.

## Atualização após consentimento do proprietário

O proprietário entrou, vinculou o histórico e concluiu o consentimento Google na prévia interna. A importação real foi observada, assim como conclusões já registradas pelo proprietário. Não foi necessário repetir OAuth. A primeira leitura encontrou limite de CPU na função; foi implantada a reutilização de formatadores e validações de fuso (versão 10).

Conforme nova instrução, o calendário de feriados do Google deixa de ser importado e seus itens anteriores ficam ocultos das visualizações/indicadores, sem apagamento. Pendências e contadores de pendentes/acumulados consideram os últimos 90 dias dentro do ano corrente. Balanço e taxa de execução continuam anuais, com registros antigos conservados. A base de sincronização grande usa compressão sem perdas em envelope de metadados v2; chave e JSON principal permanecem. Adicionados testes de volume, quota, recarga, metadados legados, feriados e recorte anual. Total: 65 testes aprovados. A validação bidirecional foi concluída na agenda autorizada. O frontend foi publicado no GitHub Pages, com recursos/cache v37 e conferência de igualdade dos arquivos principais.

A função agora processa três páginas/operações por chamada, com páginas de até 250 eventos. Cursores intermediários guardam fase, página e agenda atual, e a retomada prossegue para agendas seguintes e para a fila de exportação. Não reinicia a primeira agenda a cada chamada. A interface continua em intervalos de três segundos enquanto a carga inicial estiver parcial; após concluir, retorna ao intervalo de um minuto. Teste de retomada paginada com múltiplas agendas e exportação aprovado.

## Validação real concluída

O proprietário autorizou criar a agenda privada **Constância — testes**, fuso America/Sao_Paulo. Foram usados somente registros fictícios claramente identificados. Nenhum compromisso pessoal anterior foi editado pelo agente.

- Evento com horário e evento de dia inteiro criados no Google apareceram no To-Do.
- Checkbox concluiu diretamente, sem modal, e o horário real permaneceu após recarga. Desfazer preservou auditoria.
- Cancelamento por terceiro ficou no histórico, saiu das pendências e apareceu no Google como `[Cancelado]`, com o mesmo ID e horário.
- Adiamento mudou o mesmo evento para o dia seguinte; o Google confirmou a nova data e o painel manteve a programação original e um reagendamento.
- Um compromisso criado pela interface do Constância gerou exatamente um evento no Google. Releituras mantiveram o mesmo ID.
- Edição posterior de título/horário no Google apareceu na interface, preservando a origem Constância e sem duplicação.
- Cancelar uma ocorrência de uma série diária não alterou a ocorrência seguinte; ambas foram relidas no Google para conferir.
- Uma cópia de convite removida do lado Google passou a “Excluído na agenda”, com histórico conservado. Não foi usado DELETE permanente para testar.
- Feriados sumiram das listas/indicadores, e Pendências passou a mostrar o ano corrente. O histórico anterior permanece armazenado.
- Convites presentes em duas agendas passaram a contar uma vez por iCalUID e ocorrência. A ação de execução mais recente prevalece na apresentação, sem remover as cópias ou auditorias. Eventos distintos com o mesmo título continuam distintos. Ocorrências distintas continuam independentes. A identidade dos registros anteriores foi enriquecida em uma leitura paginada única.

Os compromissos fictícios foram cancelados ao encerrar a validação, para não deixarem pendências ativas na rotina. A agenda de testes e os históricos foram preservados. Cancelamentos de teste permanecem identificados nos registros e podem aparecer no contador de cancelados, mas não entram na taxa de execução.

Capturas de comprovação foram salvas fora do repositório: conclusão com horário real, adiamento com planejamento original e edição externa recebida. A função final é a versão 10; frontend local usa recursos/cache v37. Testes automatizados finais: **65 aprovados, zero falhas**.

Revisões Google que alteram somente metadados internos (por exemplo, a revisão de outra ocorrência) atualizam a base ETag sem criar conflito quando título, descrição, datas e cancelamento confirmado permanecem iguais. A operação pendente conserva a programação confirmada que lhe deu origem. Mudanças reais nesses campos continuam protegidas como conflito, e o envio usa If-Match. Teste de revisão interna versus edição real aprovado.

## Recorte de 90 dias antes da publicação

Por solicitação do proprietário, compromissos com mais de 90 dias saem da lista e dos contadores de pendências. O dia exato do limite permanece incluído; a janela avança diariamente no fuso configurado e nunca inclui o ano anterior. Registros, estados, histórico, fila de sincronização e eventos Google não são apagados ou alterados por esse filtro. Eventos de vários dias que ainda estão acontecendo permanecem em Hoje. O balanço anual e seu denominador são preservados, para que ocultar pendências antigas não aumente artificialmente a taxa de execução.

Foram adicionados testes de fronteira 90/91 dias, avanço diário, ano, fuso, eventos em andamento e preservação byte a byte do estado. Total final: 65 testes aprovados, zero falhas. Recursos/cache frontend v37.

## Carregamento de histórico já migrado

Na conferência do domínio publicado foi observado bloqueio de leitura apesar de o backup exportado ser válido. A inicialização foi ajustada para não exigir uma nova cópia de recuperação quando hábitos, treinos, corpo e To-Do já estão no formato atual e não há migração estrutural. Migrações reais e dados inválidos continuam exigindo proteção; falha da proteção conserva o original e bloqueia escrita. Teste de armazenamento com quota confirma ambos os caminhos. Nenhum dado ou cópia anterior foi removido. Total: 65 testes aprovados, zero falhas.

## Recuperação grande na origem online

A leitura online confirmou um backup válido, mas a primeira sincronização encontrou quota ao duplicar sua recuperação no localStorage. Novas cópias da vinculação, primeira sincronização e conflitos são guardadas com JSON completo e verificação de leitura no IndexedDB local constancia-recovery/copies. Os registros principais, metadados, autenticação e cópias anteriores no localStorage permanecem. O envio e a vinculação aguardam a confirmação da gravação; erros ou troca de conta impedem continuar. A conta oferece download da recuperação anterior do aparelho, e o download de conflitos aceita o armazenamento novo e o legado.

Criados recovery-store.js e recovery-store.test.cjs. Atualizados app.js, sync-engine.js, sync.js, index.html, sw.js e as dependências de teste (fake-indexeddb 6.2.5). Testes de cópia grande byte a byte, quota, recarga, recuperação legada, falha antes do envio e troca de conta durante a proteção aprovados. Total final: 65 testes, zero falhas. [Referência da API local](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB).

## Conferência do site publicado

A conta existente abriu no domínio público e a reunião de históricos terminou com status Sincronizado. As diferenças foram comparadas em backup protegido: hábitos, treinos e corpo eram iguais; títulos e horários do To-Do coincidiam. Foram mantidas as conclusões mais recentes da conta, além das duas cópias completas. Nenhum registro pessoal entrou no GitHub.

Na agenda de testes autorizada, um compromisso fictício criado pelo site apareceu como exatamente um evento no Google, com a data e o horário escolhidos. A conclusão pelo checkbox não abriu modal, registrou o instante real e permaneceu após recarga. O teste foi cancelado ao encerrar; a releitura Google confirmou [Cancelado], com o mesmo ID e horário, e o histórico foi mantido. O limite de 90 dias foi conferido na interface e nas fronteiras automatizadas.

Pedidos simultâneos de sincronização automática/manual da mesma conta agora aguardam o mesmo resultado; não exibem falha somente por haver um envio em andamento. Teste de concorrência e isolamento de conta aprovado. Função Calendar permanece na versão 10; frontend final v37. Total: 65 testes aprovados. A publicação usa commits da sessão autorizada do GitHub; o histórico Git local difere, mas a conferência final compara os arquivos de ambos os lados.


## Revisão de 13/10/2026 — seleção de agendas e continuidade diária (v38)

- Editor de compromisso com margem interna, tipografia compacta, foco de 2 px, campos de 16 px e datas/horários em duas colunas. Validado visualmente em desktop e viewport de celular; não é teste físico no Safari do iPhone.
- Hoje, Amanhã, Próximos e Histórico. A aba Pendências e o contador Acumulados foram retirados da interface. Balanço anual resumido a Planejados, Concluídos, Cancelados e Execução.
- Escolher agendas permite selecionar uma ou várias agendas. O padrão é a principal. O filtro se aplica às listas e métricas antes da deduplicação entre calendários; eventos ocultos e auditorias permanecem guardados. Criação oferece destino e prioriza agendas selecionadas graváveis. Feriados continuam ocultos.
- Conforme escolha explícita do usuário, itens ativos reaparecem no To-Do no dia seguinte com aviso e data de origem. Amanhã mostra uma prévia condicional dos itens de Hoje. Isso não altera nenhum horário no Google, não cria evento, não incrementa adiamentos e não modifica auditorias na renderização. Concluir, cancelar, excluir externamente ou reagendar explicitamente interrompe essa continuidade.
- A continuidade começa no primeiro uso desta revisão, por todo.preferences.carryoverSince. O acúmulo anterior permanece preservado, sem preencher a nova lista de Hoje. Eventos em curso no dia da ativação são incluídos quando terminarem. A virada é calculada pelo fuso do usuário ao atualizar a interface, inclusive após reabrir o app; não exige um agendador no backend. O aviso é dentro do aplicativo, sem notificação push.
- Preferências aditivas no JSON privado existente: calendarIds, calendarNames e carryoverSince. Nenhuma nova tabela, migração SQL, credencial, escopo Google ou alteração do backend foi necessária. A recuperação constancia.recovery.before-todo-preferences-v6 protege o JSON anterior em IndexedDB; falha bloqueia gravações. Downloads de recuperação aceitam IndexedDB e cópias antigas.
- 73 testes passaram: preservação de todas as áreas e campos futuros, sincronização e restauração de preferências, agendas selecionadas e convites, mudanças de dia/fuso, dias inteiros, eventos com vários dias, recorrência por ocorrência, conclusão/desfazer/cancelamento, ausência de operações Google por continuidade, proteção assíncrona e revisão concorrente. Testes anteriores de integração e RLS continuam incluídos.
- Teste visual isolado com dados fictícios: seleção persistiu após recarga, listas e contadores trocaram de agenda, avisos apareceram em Amanhã; editor sem transbordamento horizontal em celular. Nenhum compromisso real foi editado para validar esta revisão.
- Arquivos alterados: app.js, todo-core.js, todo.js, todo.css, index.html, sw.js, todo.test.cjs, todo-dom.test.cjs, training-dom.test.cjs, AGENTS.md e este relatório. Recursos/cache v38.


### Refinamento publicado v39 — catálogo de agendas independente

A validação com a conta existente identificou que os nomes dependiam da conclusão da sincronização de um histórico grande. A ação autenticada `calendars` no backend agora lê somente o catálogo, com paginação, renovação de token, lease e isolamento por usuário, sem ler/gravar eventos ou alterar o histórico. Os nomes personalizados da agenda também são respeitados. A interface carrega esse catálogo antes da atualização dos registros e reconhece a principal pelo accountId enquanto aguarda os nomes. Os escopos e a autenticação existentes são mantidos.

Backend calendar ACTIVE v11; nenhum segredo novo ou migração de tabela. Frontend/cache v39. Mais um teste DOM confirma catálogo e filtro principal disponíveis enquanto a sincronização de registros ainda aguarda; os testes HTTP verificam ausência de alterações no histórico, ausência de credenciais na resposta, bloqueio de origem/usuário e lease concorrente. Total: 74 testes aprovados. Arquivos adicionais: README.md, calendar-auth.test.cjs e supabase/functions/calendar/index.ts.

Documentação consultada: [autenticação das Edge Functions](https://supabase.com/docs/guides/functions/auth) e [catálogo do Google Calendar](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list). O handler existente mantém verificação do usuário em cada POST e estado/PKCE no callback; a configuração verify_jwt=false já existente foi preservada, sem ampliar acesso.


### Verificação final publicada e recuperação diária

- O site publicado carregou recursos v39; index.html, app.js, todo.js, todo-core.js, todo.css e sw.js responderam HTTP 200 e coincidiram byte a byte com a revisão local. O catálogo real apresentou a principal selecionada e a agenda de trabalho desmarcada. A escolha foi salva, confirmada no banco privado e o aplicativo mostrou histórico sincronizado. Amanhã apresentou os itens de Hoje ainda ativos com aviso condicional, além dos eventos já programados para amanhã.
- A gravação do histórico grande apresentou timeouts 57014 na RPC existente. O trigger de recuperação diária passou a conferir a existência da cópia antes de preparar uma inserção repetida. A primeira cópia do dia, incremento de revisão, autorização e RLS continuam preservados. Não houve limpeza de registros nem aumento de privilégios ou timeout global.
- Migração aditiva aplicada e verificada: 20261014010546_optimize_constancia_daily_recovery.sql. Nenhuma nova tabela. database.sql documenta a função atualizada. A função continua SECURITY INVOKER; a verificação no banco confirmou isso e as cópias anteriores continuam existentes. Teste PostgreSQL local cobre cópia inicial única, gravações seguintes, revisão antiga recusada, estado completo preservado e isolamento entre usuários.
- Resultado final: 75 testes, todos aprovados. Arquivos adicionais da última correção: database.sql, calendar-database.test.cjs e a migração acima. Backend calendar permanece ACTIVE v11, frontend/cache v39. O aviso diário é interno ao aplicativo; não existe notificação push. A passagem física da meia-noite e Safari no iPhone não foram acompanhados em aparelho real; os limites de dia/fuso foram testados automaticamente, e o layout foi conferido em viewport de celular.


Revisão final v40: a virada local do dia também atualiza o To-Do aberto sem internet e sem conta Google, sem gravar eventos. Teste DOM com relógio simulado confirma o aviso após a meia-noite e o JSON armazenado inalterado. Total final: 76 testes aprovados; frontend/cache v40; backend Calendar v11.
