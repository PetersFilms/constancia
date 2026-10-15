# Horários e metas flexíveis — versão 51

Os campos de horário do Sono e do To-Do agora usam a tipografia e as cores do Constância. A digitação direta permanece disponível; o botão de relógio abre um painel arredondado com ajuste de hora e minuto, atalhos :00/:15/:30/:45, Cancelar e Pronto. Minutos exatos continuam permitidos. O painel suporta toque, teclado e Escape e não fecha o editor da noite ao ser dispensado.

## Formatos da meta de sono

- 8:30, 08:30, 8h30 e 8 h 30 min → 8h30.
- 8,5, 8,50 e 8.5 → 8h30 (horas decimais).
- 8 ou 8 horas → 8h00.
- 7:45 → 7h45.

O campo mostra a duração interpretada antes de salvar. As metas por dia da semana aceitam os mesmos formatos. Vírgula e ponto continuam decimais: 8,30 significa 8h18; para oito horas e trinta minutos, use 8:30 ou 8,5. Valores inválidos como 8:60 não são corrigidos silenciosamente. O limite existente de 1 a 18 horas foi mantido.

Nos horários do relógio, 7, 730, 0730, 7:30 e 7h30 são normalizados para HH:MM, conforme a entrada (7 → 07:00; os demais → 07:30). O relógio usa 00:00–23:59, sem confundir horário com duração decimal.

## Arquivos

- time-controls.js e time-controls.css: campo e painel de horários reutilizável, normalização, teclado, foco, descarte do rascunho e adaptação ao espaço disponível. Usa popover quando disponível e apresentação equivalente como fallback.
- sleep-core.js: interpretação das durações, sem alterar o formato dos registros.
- sleep.js e sleep.css: meta flexível, indicação da interpretação e proteção do formulário enquanto o seletor está em uso.
- todo.js: compatibilidade dos campos novos com a opção Dia inteiro.
- index.html, bootstrap.js e sw.js: inclusão dos recursos e versão de cache 51.
- time-controls.test.cjs, sleep.test.cjs e sleep-dom.test.cjs: testes novos e ajustes das expectativas de digitação.

## Preservação e validação

Sem migração de dados, tabelas, credenciais ou alterações na integração Google. Os valores continuam guardados como minutos na meta e HH:MM nos horários. Metas históricas das noites, registros anteriores e outras áreas permanecem preservados. Abrir, cancelar ou usar Pronto altera apenas o campo do formulário; a gravação segue dependendo da ação de salvar existente.

136 testes aprovados: formatos equivalentes e ambíguos, limites, minutos inválidos, campos opcionais, seleção exata, atalhos, cancelamento, foco, teclado, campos desabilitados, alteração de fundo, preservação de metas anteriores e outras áreas, formulários de noite e compromissos de dia inteiro, além da suíte anterior.

Validação visual e interativa no navegador em desktop e largura de celular. Escape no seletor preserva o diálogo da noite aberto. Não houve gravação de testes na conta real nem nos compromissos pessoais. A validação móvel por viewport não equivale a um teste em iPhone físico.


## Planejamento em dois sentidos — v52

Em Sono → Configurações → Meta e planejamento, escolha **Quero acordar às** ou **Vou dormir às**. A sugestão acompanha a meta, a margem e o horário digitados, sem gravar enquanto você experimenta.

- Quero acordar: hora de deitar = despertar − meta − margem.
- Vou deitar: despertar = hora de deitar + margem + meta.
- Exemplo: meta 8h30, margem 30 min e despertar 07:00 → deitar 22:00 na noite anterior.
- Exemplo inverso: deitar 22:45, mesma meta e margem → despertar 07:45 no dia seguinte.
- A virada do dia é indicada; valores incompletos ou inválidos não produzem um horário enganoso nem permitem salvar.
- Salvar minha rotina grava o par de horários calculado nos campos já existentes. Horários específicos por dia da semana continuam prevalecendo sobre a rotina habitual.
- A sugestão é uma reserva de tempo baseada na meta informada; não prevê ciclos ou estágios do sono. Não cria registros de sono nem compromissos no Google por si só.
- Sem migração de banco ou mudança no formato do histórico. Registros anteriores, metas aplicadas, planejamentos, agendas e propriedades desconhecidas são preservados. Nenhum compromisso real foi alterado para testar.

Validação: testes de cálculo nos dois sentidos, limites, virada do dia, entrada direta/picker, prévia sem gravação, preservação de rascunho, salvamento explícito, campos inválidos e preservação de outros módulos. Suíte completa: 138 testes.


### Refinamento visual — v53

Sugestão sem caixa preenchida: rótulo e horário em uma linha, explicação discreta abaixo e somente uma divisória fina. O estado vazio omite o traço grande. Seletores renomeados para “Quero acordar às” e “Vou dormir às”; cálculo e armazenamento permanecem iguais.
