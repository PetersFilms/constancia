# Constância — regras de manutenção

## Requisito permanente do usuário: preservar todos os dados

Toda atualização estrutural deve preservar hábitos, marcações, treinos, contexto, avaliações, pesagens, catálogos e dados de abas futuras.

- Mantenha o armazenamento `constancia.v1` e a origem do aplicativo. Nunca limpe localStorage nem substitua dados existentes por sementes/demo numa atualização.
- Migrações devem ser aditivas, idempotentes e aceitar backups anteriores. Valores ausentes continuam ausentes; não recalcule pesos históricos acrescentando uma barra que não foi informada.
- Antes da primeira gravação de cada atualização estrutural, preserve o JSON original em uma chave de recuperação específica daquela versão. Atualize o identificador `RECOVERY` em app.js ao publicar outra atualização estrutural. Se proteger ou validar falhar, mantenha o original e bloqueie novas gravações.
- Preserve propriedades desconhecidas, inclusive em registros, exercícios, séries e áreas futuras. Para editar um registro, estenda o objeto anterior, sem reconstruí-lo descartando campos.
- A importação usa `Persistence.merge` por padrão e reúne históricos sem apagar coleções. A opção explícita de substituir usa `Persistence.restore`, preservando campos ausentes. Guarde cópias completas do destino e da origem antes de gravar.
- Toda atualização de registros parte de uma cópia completa do estado. Não sobrescreva uma revisão mais recente vinda de outra aba.
- Teste recarga, backup antigo/novo, atualização idempotente, campos desconhecidos, armazenamento inválido e preservação das outras áreas. Informe honestamente a diferença entre testes DOM e validação visual no navegador.
- Arquivo local (file://), localhost e GitHub Pages são origens distintas; não mova o usuário entre elas presumindo sincronização. A mudança exige transferência explícita por backup.
- Na cópia pública Constancia-GitHub, mantenha Body.seed() vazio. Nenhum backup ou registro pessoal deve entrar no repositório público.


Importação de 01/10/2026: a ação Restaurar reúne históricos por padrão, sem substituir coleções por listas vazias. Hábitos e sessões usam id; avaliações e pesagens usam data; catálogos usam nome normalizado. Em diferenças do mesmo registro, mantém a versão atual e preenche campos ausentes, exibindo a quantidade de conflitos. A origem importada completa é protegida em constancia.recovery.import-source; o destino em constancia.recovery.before-restore. Partes desconhecidas permanecem, incluindo coleções futuras. A versão usa constancia.recovery.before-merge-v3. Dados pessoais não entram na cópia pública.

Versão móvel e sincronização: mantenha a chave constancia.v1, constancia.auth.v1 e constancia.sync.v1. RECOVERY atual: constancia.recovery.before-mobile-sync-v4. Não mude a associação owner de um histórico para outra conta. Preserve a base de sincronização e o histórico local pendente ao atualizar. Sincronização usa comparação de três versões e revisão esperada no servidor; não substitua por união permanente que ressuscita exclusões. Incremente as versões de recursos e o cache do service worker juntos. Dados pessoais não entram no GitHub.

To-Do: RECOVERY atual constancia.recovery.before-todo-v5. Preserve todo.items por id e todo.history por id; evento, execução e operação pendente são unidades atômicas na reconciliação. Tokens do Google são exclusivos do backend e nunca pertencem ao JSON do histórico. Não escreva em eventos reais para testar.

Metadados grandes de constancia.sync.v1 podem usar envelope version:2, codec:lz-utf16. Decodifique antes de usar owner/base/revision; nunca descarte a base por não reconhecê-la. O JSON principal constancia.v1 e cópias de recuperação continuam sem compressão. To-Do oculta feriados e limita pendências aos últimos 90 dias dentro do ano corrente e mantém o balanço anual, preservando registros antigos. Cursores do backend guardam etapas; não apague cursores para repetir carga inteira.

Convites duplicados entre agendas são agrupados na apresentação por iCalUID + ocorrência, sem apagar cópias. Preserve ações locais e auditorias; não deduplique por título. Enriquecimento de identidade usa cursor.identityVersion, sem reiniciar a leitura integral em toda sincronização.

Recuperações novas da vinculação, primeira sincronização e conflitos usam IndexedDB constancia-recovery/copies, com JSON completo sem compressão. Aguarde confirmação antes de associar a conta ou enviar dados. Cópias antigas no localStorage permanecem intactas e são aceitas no download. Falha de recuperação deve bloquear envio; não remover cópias para ganhar espaço.

Preferências do To-Do (v38): RECOVERY atual constancia.recovery.before-todo-preferences-v6. Aguarde a recuperação completa em IndexedDB antes da primeira gravação das preferências. Preserve todo.preferences, incluindo campos futuros, na restauração e sincronização. calendarIds filtra somente a apresentação, antes do agrupamento por convite; não exclua eventos de agendas ocultas. A interface tem Hoje, Amanhã, Próximos e Histórico. carryoverSince inicia a continuidade diária no dia de ativação; itens ativos que terminam nesse dia ou depois reaparecem nos dias seguintes sem modificar event/original, postponeCount ou operações do Google. Não recuperar o acúmulo anterior automaticamente.
