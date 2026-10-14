# Constância

Aplicativo pessoal de hábitos, treinos e evolução corporal. Site: https://petersfilms.github.io/constancia/

## Usar no iPhone

Abra o site no Safari, escolha Compartilhar → Adicionar à Tela de Início → Adicionar. Abra o ícone Constância. Entre com a mesma conta usada no computador. Safari e aplicativo instalado podem pedir acessos separados.

## Sincronização privada

No computador que já contém o histórico, abra Conectar, crie sua conta, confirme o e-mail e entre. Escolha **Vincular e reunir meu histórico** e aguarde **Sincronizado**. No iPhone, entre na mesma conta e vincule o aparelho. Um aparelho novo recebe o histórico da nuvem; um aparelho com registros reúne os históricos após vinculação explícita.

O Supabase mantém o projeto Constância separado na organização Petters. Os registros ficam protegidos por login e regras do banco que permitem acesso apenas ao proprietário. O cliente contém somente uma chave pública publicável; chaves administrativas nunca entram no site.

No plano atual, o serviço de e-mail padrão aceita endereços dos membros da organização e tem limite reduzido de envio. Para usar outros endereços, configure um provedor SMTP no projeto. Confirmação de e-mail permanece habilitada.

Alterações são salvas primeiro no aparelho. A sincronização acontece com o aplicativo aberto e conectado, ao editar, retomar a tela ou a cada 30 segundos. Sem internet, o histórico continua local e é enviado quando a conexão volta. Isso não promete execução em segundo plano no iOS.

Cada gravação na nuvem usa uma revisão esperada. Edições em registros diferentes se combinam; conflitos no mesmo treino, avaliação ou pesagem pedem uma escolha e protegem ambas as versões. Exclusões e desmarcações intencionais são reconhecidas. Não há estimativa de causalidade nos gráficos de contexto do treino.

Sair preserva o histórico local e sua associação à conta. Uma conta diferente não recebe esses registros. Em dispositivos compartilhados, mantenha também a proteção do aparelho.

## Preservação e recuperação

A chave `constancia.v1` permanece. A atualização guarda o conteúdo original em `constancia.recovery.before-todo-preferences-v6`, sem remover recuperações anteriores. Há cópias antes da vinculação, da primeira sincronização e de conflitos. Novas cópias de sincronização ficam no IndexedDB local, com JSON completo, e as cópias anteriores permanecem. Minha conta permite baixar a cópia anterior deste aparelho. Antes da primeira atualização de um histórico sincronizado em cada dia, o banco guarda uma cópia diária privada.

**Backup** baixa o histórico deste aparelho. **Minha conta** oferece a cópia atual da nuvem e a última recuperação diária. **Restaurar** reúne históricos por padrão, preservando campos e áreas futuras. Arquivo local, localhost e GitHub Pages são origens diferentes: importe um backup na origem online para levar um histórico local antigo para a conta. Nenhum histórico pessoal faz parte do repositório.

## Instalação e publicação

O GitHub Pages publica a pasta raiz da branch `main`. Os arquivos do aplicativo já estão prontos: não exige compilação no Pages. O manifesto, ícones e service worker preparam a instalação e o uso offline. Atualizações são oferecidas por um aviso no aplicativo e não removem localStorage. Reabra com internet para receber uma nova versão.

## Desenvolvimento

`npm ci` instala dependências com versões fixas. `npm run build:sdk` atualiza a biblioteca Supabase distribuída em `cloud-sdk.js`. `npm test` verifica preservação, catálogo, gráficos, revisões, conflitos, desmarcações, recarga offline, alterações durante envio e troca de conta. O arquivo `database.sql` documenta o esquema instalado no projeto privado. Não o execute em outro projeto existente sem revisar o esquema.

As regras permanentes de preservação estão em AGENTS.md. Dados pessoais e backups não devem ser publicados. `Body.seed()` na cópia pública permanece vazio.

## Identidade visual

A interface usa fundo branco gelo `#F3F6F7`, cartões quase brancos `#FCFDFD`, texto azul escuro `#253745`, texto secundário `#5B6C76` e detalhes discretos em cinza azulado. Gráficos, calendário, campos e navegação seguem o tema claro. A Pogonia fornecida pelo usuário é carregada localmente em WOFF2 nos pesos regular, médio e semibold, com os arquivos incluídos no cache offline. Os créditos da fonte estão em FONT-NOTICE.md. Esta mudança visual preserva as chaves de armazenamento, a sincronização e os registros existentes.

## To-Do e Google Agenda

A aba acompanha compromissos em Hoje, Amanhã, Próximos e Histórico, com conclusão direta, cancelamento, adiamento, histórico e indicadores. Escolher agendas filtra as listas e o balanço anual; começa pela principal e permite selecionar várias, preservando os registros das demais. Itens não concluídos continuam no dia seguinte com aviso, mantendo as datas originais no Google Agenda. A continuidade começa no dia de ativação desta revisão, sem trazer o acúmulo anterior. Preferências e recuperação são preservadas entre aparelhos. Estado local em `state.todo`, preservado nos backups e na sincronização existente.

O backend OAuth/Calendar é a função `calendar` no Supabase. Credenciais cifradas ficam fora do JSON do usuário e não são expostas ao cliente. A conexão exige um cliente OAuth Google e secrets do backend; o aplicativo informa quando essa configuração está pendente.

- [Diagnóstico e estratégia](docs/TODO-DIAGNOSTICO.md)
- [Configuração Google e teste de consentimento](docs/TODO-GOOGLE-CONFIGURACAO.md)
- [Relatório de implementação](docs/TODO-RELATORIO.md)

`npm ci` e `npm test` executam os testes locais: core, interface, reconciliação, OAuth/HTTP com serviços simulados e isolamento das tabelas em PostgreSQL local via PGlite. Nenhum teste usa agenda ou tokens reais. Node.js 24 é usado para validar o handler TypeScript sem um segundo compilador.

## Sono & Recuperação

A aba Sono tem Hoje, Histórico, Análises e Configurações. Noites manuais são identificadas pela data de despertar; entrada na cama, latência, tempo acordado, qualidade e energia são opcionais. Duração estimada e tempo planejado são distintos. Metas históricas ficam preservadas. Os registros entram nos backups e na sincronização privada existentes.

A configuração permite horários por dia da semana, meta, fuso e lembrete Google. Adicionar à agenda é sempre uma ação explícita. Repetições nativas usam séries agrupadas por horário, com período escolhido de até um ano. Atualizar ou encerrar próximas noites preserva ocorrências passadas. Os testes de interface salvam noites fictícias somente em origem isolada, sem login.

No iPhone instalado, entre e vincule o histórico no próprio ícone. O retorno à janela retoma a sessão e consulta a conexão Google que pertence à conta. Dados de login nunca são copiados pela URL. Relatório: docs/SONO-RELATORIO.md. Recuperação estrutural: constancia.recovery.before-sleep-v7, confirmada em IndexedDB antes da gravação.
