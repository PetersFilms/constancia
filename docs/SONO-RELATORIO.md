# Sono & Recuperação — relatório de implementação

## Resultado

Implementação no projeto existente, com PWA estática, identidade visual clara e fonte Pogonia, armazenamento local e conta privada existentes. Publicação preparada na versão de recursos 46. Nenhuma noite fictícia foi salva na conta real: dados de registro e gráficos foram exercitados somente numa origem isolada sem login.

## Arquivos

Criados: `sleep-core.js`, `sleep.js`, `sleep.css`, `sleep.test.cjs`, `sleep-dom.test.cjs`, `sync-mobile.test.cjs`, `docs/SONO-DIAGNOSTICO.md`, este relatório e `supabase/migrations/20261014110026_faster_constancia_history_compression.sql`.

Modificados: `app.js`, `core.js`, `persistence-core.js`, `sync-core.js`, `sync-engine.js`, `sync.js`, `todo-core.js`, `todo.js`, `todo.css`, `navigation.js`, `index.html`, `sw.js`, `supabase/functions/calendar/service.mjs`, `calendar-service.test.cjs`, `sync.test.cjs`, `README.md` e `AGENTS.md`.

## Dados e proteção

Nova estrutura aditiva `state.sleep`: records (data de despertar), settings, settingsVersions (id), plans (id), history (id). Registros guardam fonte, datas completas, fuso, campos opcionais, estimativas, meta aplicada e planejamento associado. Metas anteriores não são recalculadas ao mudar a configuração. Registros e metas são atômicos na reconciliação; backups antigos preservam as partes ausentes.

Antes da primeira escrita, a atualização confirma uma cópia byte a byte do JSON original em IndexedDB, sob `constancia.recovery.before-sleep-v7`. Proteção inválida, falha de armazenamento ou revisão alterada em outra aba bloqueiam a escrita. A nova área participa dos mesmos backups, conta e sincronização privada entre aparelhos. Sementes públicas vazias, propriedades desconhecidas e dados de outras abas preservados.

Não foram criadas tabelas redundantes. O documento continua em `constancia_states`, com recuperação diária em `constancia_snapshots`, autorização por `auth.uid()` e RLS. A migração de compressão foi aplicada e verificada no servidor: LZ4 somente para futuras gravações nas duas colunas state; não reescreve linhas existentes nem muda permissões, revisões ou conteúdo. O codec passou num teste temporário remoto com dados controlados e rollback. PGlite não inclui LZ4; a verificação desse codec foi feita no PostgreSQL remoto, e os testes de isolamento e recuperação continuam em PGlite.

## Funcionalidades

- Hoje, Histórico, Análises, Configurações, navegação horizontal e quinto botão principal no celular.
- Formulário rápido com opcionais recolhidos, datas explícitas, estimativa imediata, edição e uma noite por data de despertar.
- Oportunidade de sono separada do sono estimado; tempo na cama somente com entrada e saída; ausência de dados não vira zero.
- Meta exibida em horas (8 ou 7,5), com armazenamento interno em minutos e campos arredondados, despertar configurável, margem para adormecer, horário preferido para deitar, fuso, dias e horários por dia da semana.
- Planejamento por noite e séries nativas diárias/semanais/dias selecionados, agrupadas por horários, com período de até um ano e término explícito.
- Ação explícita para adicionar/atualizar Google Agenda, escolha da agenda, lembrete opcional, aviso de envio, revisão de conflitos, término de próximos horários e preservação dos anteriores.
- Conflitos reais e compromissos próximos são diferenciados; leitura das agendas selecionadas, sem reagendar terceiros.
- Histórico filtrável, calendário mensal e gráficos de duração/meta, horários, qualidade/energia e planejado/registrado.
- Médias, metas atingidas, diferença acumulada, regularidade circular e comparação de horários planejados. Sem indicador médico ou preenchimento de noites ausentes.
- Comparações com hábitos e treinos do dia anterior e execução de tarefas no dia de despertar. Comparação da duração dos treinos quando informada. Cancelamentos, exclusões e eventos de descanso planejado excluídos da comparação de produtividade.
- Insights determinísticos com período, amostra, números consultáveis e limiar explícito; nenhuma afirmação de causalidade.

## Google Agenda

Reutilizados OAuth, escopos existentes, outbox idempotente, IDs estáveis, backend autenticado, PKCE e tokens cifrados. A função calendar foi publicada na versão 13 e está ACTIVE. O frontend não recebe client secret nem tokens Google.

Séries usam `recurrence`/RRULE e lembretes nativos. `seriesMaster` não aparece como uma tarefa extra; ocorrências têm execução independente e vínculo `sleepPlanId`. O descanso planejado não recebe continuidade diária e sua conclusão não cria noites registradas. A substituição futura encerra a série anterior e só libera a nova após confirmação do outbox. Exclusões externas preservam auditoria e ficam ocultas conforme as regras existentes.

Validação real: pelo formulário do Sono, duas séries na agenda previamente autorizada “Constância — testes”, abrangendo três despertares. Consulta independente ao Google confirmou RRULE, horários, descrição, destino e três ocorrências. A ação foi repetida e os dois vínculos foram reutilizados. Os planejamentos de teste foram encerrados operacionalmente, preservando eventos e auditorias; nenhum compromisso pessoal foi alterado.

## To-Do no aplicativo instalado

O iPhone instalado mantém sessão e armazenamento próprios, separados do Safari. A interface agora distingue carregamento, proteção do histórico, falta de sessão e falta de vinculação; oferece o acesso necessário no próprio aparelho. Retorno à janela retoma a sessão e consulta a conexão Google existente na conta, sem copiar tokens pela URL ou associar proprietários automaticamente.

Corrigidos também: conflito artificial em carryoverSince entre dispositivos (mantém primeira ativação), descarte de escolha explícita enquanto havia uma sincronização em andamento, e regravação de todo o histórico ao ler eventos inalterados. Eventos inalterados conservam os registros; somente a conexão recebe a data da consulta recente.

No servidor foram observadas falhas 57014 de tempo de execução. As gravações redundantes foram eliminadas e a compressão futura foi acelerada. Após as alterações, a prévia autenticada confirmou sincronização e envio das séries. Isso não substitui validação no iPhone físico do proprietário.

## Testes e limites

Suite completa: 105 testes aprovados, zero falhas. A última revisão foi executada numa cópia isolada do mesmo código, com as dependências do lockfile, após um bloqueio de leitura de dependências na pasta de desenvolvimento. Cobertura: meia-noite, fuso/DST, descontos, opcionais ausentes, metas históricas, edição, campos desconhecidos, recuperação assíncrona, falhas e revisões entre abas, backups, reconhecimento de aparelho novo, reconciliação, amostras, conflitos, RRULE, ocorrência individual, adiamento/cancelamento/exclusão, idempotência, substituição dependente, encerramento e sessões móveis simuladas. Regressões de hábitos, corpo, treinos e To-Do incluídas.

Interface exercitada visualmente em desktop e viewport de celular: cinco áreas, quatro vistas de Sono, criação/edição de noite fictícia isolada, gráficos, configuração real de rotina e planejamento Google controlado. Sem rolagem lateral na largura testada. Uma requisição anônima ao backend recebeu 401; RLS e políticas de proprietário verificados. Os avisos de credenciais sem políticas são intencionais: clientes não recebem acesso às tabelas cifradas. Aviso de proteção de senha pré-existente não foi alterado.

Limites: dados manuais são estimativas; insights precisam de amostra suficiente. Não integra Apple Health/Health Connect, não calcula necessidades médicas individuais, não inventa intensidade/modalidade ou horas de trabalho ausentes. Lembretes dependem das notificações do Google no aparelho; não há push duplicado do Constância. A sincronização acontece com o app aberto e conectado. Horários de verão podem alterar a duração de ocorrências nativas; datas e fusos reais permanecem no evento.

Atualizar futuros horários preserva as ocorrências já passadas e recria as futuras das séries vinculadas no período explicitamente escolhido. Exceções futuras individuais podem ser substituídas por essa ação; confirme conscientemente o período antes de aplicar. Uma edição de noite isolada afeta somente a ocorrência correspondente.

Pendente de validação pelo proprietário: fluxo completo no iPhone físico após atualizar o aplicativo, entrar e vincular no próprio ícone. O ambiente disponível permitiu simulação responsiva e testes da retomada de sessão, mas não acesso ao iPhone.
