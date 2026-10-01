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

A chave `constancia.v1` permanece. A atualização guarda o conteúdo original em `constancia.recovery.before-mobile-sync-v4`, sem remover recuperações anteriores. Há cópias antes da vinculação, da primeira sincronização e de conflitos. Antes da primeira atualização de um histórico sincronizado em cada dia, o banco guarda uma cópia diária privada.

**Backup** baixa o histórico deste aparelho. **Minha conta** oferece a cópia atual da nuvem e a última recuperação diária. **Restaurar** reúne históricos por padrão, preservando campos e áreas futuras. Arquivo local, localhost e GitHub Pages são origens diferentes: importe um backup na origem online para levar um histórico local antigo para a conta. Nenhum histórico pessoal faz parte do repositório.

## Instalação e publicação

O GitHub Pages publica a pasta raiz da branch `main`. Os arquivos do aplicativo já estão prontos: não exige compilação no Pages. O manifesto, ícones e service worker preparam a instalação e o uso offline. Atualizações são oferecidas por um aviso no aplicativo e não removem localStorage. Reabra com internet para receber uma nova versão.

## Desenvolvimento

`npm ci` instala dependências com versões fixas. `npm run build:sdk` atualiza a biblioteca Supabase distribuída em `cloud-sdk.js`. `npm test` verifica preservação, catálogo, gráficos, revisões, conflitos, desmarcações, recarga offline, alterações durante envio e troca de conta. O arquivo `database.sql` documenta o esquema instalado no projeto privado. Não o execute em outro projeto existente sem revisar o esquema.

As regras permanentes de preservação estão em AGENTS.md. Dados pessoais e backups não devem ser publicados. `Body.seed()` na cópia pública permanece vazio.
