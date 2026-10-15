# Ciclo de Sono e configurações laterais — versão 50

## Resultado

A aba Sono ganhou a visualização **Ciclo de Sono**, alternativa ao Histórico. O logotipo Constância passou a abrir um painel lateral de configurações, mantendo a área que estava aberta.

## Sono

- SVG mensal com 28, 29, 30 ou 31 divisões; escala fixa de 0 a 12h no anel e indicação de valores acima do limite.
- Linha interrompida nos dias sem registro; ausência de registro não entra como zero na média ou consistência.
- Meta atual tracejada; cores e consistência respeitam a meta histórica guardada em cada noite. Mudanças de meta ficam explicadas na legenda.
- Centro com média, meta, consistência e denominador de noites registradas.
- Seleção por mouse, toque, teclado e seletor de dia com controles maiores. Detalhes e edição reutilizam o editor existente.
- Indicadores de média, noites na meta, regularidade e diferença para o mês anterior. Regularidade reutiliza a dispersão circular dos horários de tentativa e despertar; não confundir com duração ou diagnóstico.
- Data de referência é o despertar. Não soma cochilos indiscriminadamente, nem preenche latência e tempo acordado ausentes.
- Aparência clara ou escura restrita ao gráfico; mês e aparência persistem em uma preferência separada do histórico.
- Planejamento, horários por dia da semana e integração com a agenda permanecem no fluxo existente.

## Configurações

- O logotipo abre um dialog lateral acessível, com Escape, contenção de foco, devolução do foco e fechamento pelo fundo.
- Conta, status do histórico e Google Agenda, erros, última atualização, sincronização manual, conexão Google, fuso, backups, recuperação, instalação e atualização ficam no painel.
- “Trazer da nuvem” reutiliza a reconciliação existente: não força substituição do histórico local nem escolhe automaticamente um lado em conflitos.
- O formulário de acesso e a revisão de diferenças continuam usando os diálogos existentes, abertos a partir do painel.
- Remove “Espaço pessoal”, a faixa geral de sincronização, o bloco de conexão no To-Do e avisos de sincronização nas linhas. Contagens de operações pendentes e conflitos ficam nas configurações; a revisão de um conflito de compromisso continua em seus detalhes.
- O seletor de agendas permanece na aba To-Do, por ser um filtro da lista.

## Dados e integração

Nenhuma tabela, função backend, token, permissão OAuth ou regra de autorização foi alterada. Não há migração do histórico nesta versão. São preservadas constancia.v1, constancia.auth.v1, constancia.sync.v1, recuperações anteriores, metas por noite e propriedades desconhecidas. A nova preferência local é constancia.sleep.cycle.ui.v1, contendo somente mês e tema. O cache e os recursos passaram juntos para v50.

O seed público continua vazio. As demonstrações visuais usam uma origem local isolada, identificada como fictícia e sem conexão à conta; esses dados não fazem parte da publicação.

## Verificação

130 testes automatizados aprovados, incluindo meses e ano bissexto; lacunas; duração zero real; valores acima de 12h; metas históricas; passagem pela meia-noite; exclusão de cochilos; comparação mensal; edição sem perda; navegação por teclado; configurações; manutenção de foco durante avisos; acesso à nuvem; preservação de outras áreas; e toda a suíte anterior de armazenamento, reconciliação e integração.

Validação visual em navegador desktop e largura móvel, incluindo seleção de um dia, detalhes, aparência escura e fechamento do painel por Escape. A validação móvel é por viewport de navegador, não em um iPhone físico.

Não havia imagem de referência anexada ao pedido radial; a composição segue a especificação textual e o design existente. Não afirmar equivalência a uma imagem que não foi recebida.
