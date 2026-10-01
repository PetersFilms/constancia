# Constância — regras de manutenção

## Requisito permanente do usuário: preservar todos os dados

Toda atualização estrutural deve preservar hábitos, marcações, treinos, contexto, avaliações, pesagens, catálogos e dados de abas futuras.

- Mantenha o armazenamento `constancia.v1` e a origem do aplicativo. Nunca limpe localStorage nem substitua dados existentes por sementes/demo numa atualização.
- Migrações devem ser aditivas, idempotentes e aceitar backups anteriores. Valores ausentes continuam ausentes; não recalcule pesos históricos acrescentando uma barra que não foi informada.
- Antes da primeira gravação de cada atualização estrutural, preserve o JSON original em uma chave de recuperação específica daquela versão. Atualize o identificador `RECOVERY` em app.js ao publicar outra atualização estrutural. Se proteger ou validar falhar, mantenha o original e bloqueie novas gravações.
- Preserve propriedades desconhecidas, inclusive em registros, exercícios, séries e áreas futuras. Para editar um registro, estenda o objeto anterior, sem reconstruí-lo descartando campos.
- `Persistence.restore` mantém recursivamente campos ausentes do arquivo recebido, incluindo abas futuras. Coleções explicitamente presentes, inclusive vazias, só substituem o estado após confirmação de restauração. Preserve uma cópia antes da restauração.
- Toda atualização de registros parte de uma cópia completa do estado. Não sobrescreva uma revisão mais recente vinda de outra aba.
- Teste recarga, backup antigo/novo, atualização idempotente, campos desconhecidos, armazenamento inválido e preservação das outras áreas. Informe honestamente a diferença entre testes DOM e validação visual no navegador.
- Arquivo local (file://), localhost e GitHub Pages são origens distintas; não mova o usuário entre elas presumindo sincronização. A mudança exige transferência explícita por backup.
- Na cópia pública Constancia-GitHub, mantenha Body.seed() vazio. Nenhum backup ou registro pessoal deve entrar no repositório público.
