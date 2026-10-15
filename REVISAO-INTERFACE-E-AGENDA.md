# Revisão de interface e sincronização — v55

Implementação conjunta dos itens 1 a 9 do pedido de interface e do item 10 de sincronização.

1. Ciclo de Sono apresenta diretamente o gráfico radial, sem seletor interno. Histórico continua na navegação principal.
2. A navegação de sono usa Hoje, Ciclo de Sono, Histórico, Análises, Meta e Planejamento. Os identificadores e funcionalidades foram mantidos.
3. Cabeçalhos usam Hábitos, To-Do, Treinos, Evolução corporal e Sono. Slogans e chamadas decorativas foram removidos; instruções, métricas, explicações de cálculo e alertas permanecem.
4. Meta e Planejamento ocupa a largura do contêiner compartilhado. Duas colunas no desktop e tablet, uma no mobile.
5. Cabeçalhos compartilham espaçamentos, alinhamento e tamanho de título em theme.css, sem novo design system.
6. Pogonia, cores, botões, bordas e tema alternativo do gráfico radial foram preservados.
7. Verificação visual em desktop, tablet e mobile, incluindo ausência de rolagem horizontal nas cinco áreas.
8. Suíte de regressão cobre navegação, edição, histórico, migrações e preservação de campos desconhecidos.
9. Sem novas rotas, substituição de stack ou remoção de dados.

## 10. Correção da identidade dos eventos

O vínculo existente é reutilizado: item.id, item.google.calendarId, item.google.eventId, google.etag e sync.lastSync/state. Não há uma segunda tabela de tarefas nem uma segunda integração.

- Evento vinculado sempre usa PATCH com If-Match, mesmo se uma operação antiga estiver marcada como create.
- Sem vínculo, consulta o ID determinístico por usuário/tarefa e procura o marcador privado constanciaId na agenda correta antes de inserir.
- Uma edição posterior a uma resposta de criação perdida recupera o vínculo e atualiza o mesmo evento. Divergências externas reais continuam exigindo resolução explícita.
- 404/410 em evento vinculado nunca dispara criação substituta. Eventos excluídos continuam ocultos; cancelamento operacional mantém sua regra anterior.
- O formulário impede um segundo submit da mesma gravação.
- Operações são relidas antes de cada envio; a proteção de revisão do histórico e o lease por conta permanecem.
- Metadados aditivos sourceTaskId e htmlLink permitem revisar eventos distintos com o mesmo marcador exato na mesma conta/agenda. Ocorrências recorrentes e eventos de agendas diferentes não são tratados como cópias por esse critério.
- Nenhum evento é apagado automaticamente. A revisão mostra os registros e, quando disponível, o link oficial do Google; a correção de cópias é feita explicitamente pelo proprietário no Google Agenda.
- Títulos iguais, isoladamente, não demonstram duplicação.

## Preservação e segurança

Sem DDL, alteração de autenticação, permissões ou secrets. Mantidas as chaves de histórico e a origem pública. Recuperação anterior à primeira gravação: constancia.recovery.before-calendar-identity-v9. Cópias anteriores permanecem disponíveis. O backend continua validando o usuário em cada requisição; callback e webhook conservam suas verificações específicas.

## Validação

148 testes automatizados passam, incluindo resposta perdida, edição em voo, edição depois de recarregar, alterações de data/título/descrição/fuso, cancelamento, exclusão, recorrência, falhas e preservação das outras áreas. O teste de igualdade distingue normalização do offset de uma alteração explícita do fuso.

Validação visual usa prévia isolada sem conexão com a conta. A inspeção de produção foi somente leitura e não excluiu nem alterou compromissos. A suíte usa adaptadores simulados; não equivale a uma nova rodada autenticada de alterações em uma agenda real.
