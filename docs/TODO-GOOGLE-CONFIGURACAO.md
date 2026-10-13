# Conectar o Constância ao Google Agenda

O módulo usa o Supabase que já pertence ao Constância. Em 13/10/2026, o projeto Google Cloud `constancia-agenda` (Constancia Agenda), o cliente OAuth web “Constância Web”, a API e os três secrets necessários foram configurados com autorização do proprietário. O proprietário também concluiu o consentimento na prévia interna. Não envie client secret, refresh token, senha ou chave de cifragem pelo chat.

## Configuração realizada

- Google Calendar API ativada no projeto exclusivo `constancia-agenda`.
- Branding Constância, audiência externa em Testing e somente a conta do proprietário como usuário de teste.
- Somente os dois escopos abaixo foram salvos; Google Tasks não faz parte desta integração.
- Cliente web com um único callback autorizado: o backend Supabase abaixo. Nenhuma origem JavaScript adicional foi cadastrada.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_TOKEN_KEY` salvos nos secrets do projeto Constância. Os resumos SHA-256 exibidos pelo painel foram conferidos; valores não foram colocados no repositório.
- Migração aditiva `20261013180824` aplicada e função `calendar` ativa, versão 10.

Os passos seguintes documentam a configuração e sua manutenção. Para começar a usar, siga a etapa 5.

## 1. Criar o projeto e habilitar a API

No [Google Cloud Console](https://console.cloud.google.com/), crie ou selecione um projeto para o Constância. Em APIs e serviços → Biblioteca, habilite **Google Calendar API**. Não é necessário criar uma service account nem delegação de domínio.

## 2. Configurar o consentimento

Em **Google Auth platform**, configure Branding, Audience e Data Access:

- Nome: Constância. Informe seu e-mail real de suporte/contato.
- Para conta pessoal, use audiência External e mantenha em Testing inicialmente. Adicione sua conta Google em Test users.
- Solicite somente estes dois escopos:

```text
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/calendar.calendarlist.readonly
```

O proprietário deve ler e aceitar as políticas apresentadas pelo Google. Essa aceitação e o consentimento para a agenda pertencem ao usuário.

[Instruções oficiais de consentimento](https://developers.google.com/workspace/guides/configure-oauth-consent).

## 3. Criar um cliente OAuth web

Em Clients → Create client, escolha **Web application**. Cadastre esta URI de redirecionamento, exatamente:

```text
https://ahsnobrlcyaefdanjdsm.supabase.co/functions/v1/calendar/callback
```

O retorno OAuth é feito pelo backend. Não coloque o client secret no HTML, JavaScript do aplicativo, localStorage ou GitHub.

[Instruções oficiais para credenciais](https://developers.google.com/workspace/guides/create-credentials).

## 4. Registrar secrets no Supabase

Abra o [projeto Constância no Supabase](https://supabase.com/dashboard/project/ahsnobrlcyaefdanjdsm), vá aos Secrets das Edge Functions e registre:

| Nome | Valor |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Client ID do cliente web criado no Google |
| `GOOGLE_CLIENT_SECRET` | Client secret, somente no backend |
| `GOOGLE_TOKEN_KEY` | Chave aleatória de 32 bytes codificada em Base64 |
| `GOOGLE_REDIRECT_URI` | A URI de callback acima; opcional, pois esse é o padrão |
| `CALENDAR_APP_URLS` | `https://petersfilms.github.io/constancia/,http://127.0.0.1:8771/` |

Para gerar a chave no seu computador, execute:

```sh
openssl rand -base64 32
```

Cole a saída diretamente no secret `GOOGLE_TOKEN_KEY`. Não a publique nem a envie ao chat. Trocar essa chave exige reconectar as contas Google, porque os tokens antigos não poderão ser decifrados; os históricos de execução permanecem no Constância.

As variáveis `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY` são fornecidas pelo runtime Supabase. A chave de serviço nunca deve entrar no frontend.

[Instruções oficiais para secrets](https://supabase.com/docs/guides/functions/secrets).

## 5. Conectar pelo aplicativo

Abra a versão atualizada do Constância, entre na sua conta existente e vincule seu histórico. Na aba **To-Do**, toque em **Conectar Google Agenda**, escolha sua conta Google e revise os dois escopos. Após o retorno, toque em Sincronizar.

Para validar antes de usar compromissos importantes, crie no Google uma agenda secundária chamada “Constância — teste” e dois eventos fictícios: um com horário e um de dia inteiro. Para testar exportação, sincronize primeiro e selecione essa agenda no formulário Novo compromisso. Teste conclusão, desfazer, cancelamento, adiamento, uma série recorrente e alteração externa; confira os dois lados.

Somente execute exclusão de eventos de teste quando você decidir fazê-la no próprio Google Agenda. O módulo não possui exclusão automática de eventos.

## O que esperar

- Eventos não recorrentes das agendas acessíveis são importados sem limite de período; calendários de feriados do Google ficam excluídos. Pendências e os contadores de pendentes/acumulados consideram os últimos 90 dias dentro do ano corrente; o balanço e a taxa de execução continuam anuais, sem apagar o histórico antigo. Ocorrências recorrentes aparecem na janela de um ano antes/depois da data consultada, expandida ao navegar. Agendas de leitura ficam disponíveis para execução local, mas não aceitam alterações no Google.
- Atualizações chegam ao abrir/retornar ao aplicativo e a cada minuto enquanto ele estiver visível. Aplicativo fechado atualiza no próximo acesso.
- Cancelado mantém o evento e o prefixo `[Cancelado]`; os participantes não recebem mensagem por essa alteração.
- Adiar muda somente o evento/ocorrência selecionado e mantém o planejamento original no histórico.
- Em conflito, a agenda prevalece para título e horário confirmados; a proposta local fica disponível para reenvio explícito.
- Em Testing, o Google pode limitar a duração do refresh token. O aplicativo sinaliza reconexão em vez de descartar seu histórico. Para uso contínuo em produção, siga os requisitos de publicação/verificação do Google para esses escopos. [Referência OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).

## Pendências de liberação

O projeto/cliente OAuth, a API e os secrets já estão configurados. A entrada, a vinculação explícita do histórico e o consentimento Google foram concluídos pelo proprietário. A validação real de ida e volta foi concluída na agenda separada autorizada. Falta publicar e conferir o frontend no GitHub Pages. Testes simulados não comprovam sincronização com a conta Google real. O novo frontend ainda está na prévia local; publicar no GitHub Pages e conferir a versão ao vivo são etapas distintas.

Carga inicial grande é paginada em etapas, com pontos de retomada persistidos e continuação automática enquanto o aplicativo estiver visível. O intervalo normal após a conclusão permanece em um minuto.
