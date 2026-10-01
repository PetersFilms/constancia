# Constância

Aplicativo pessoal de acompanhamento de hábitos, treinos e evolução corporal, publicado como site estático no GitHub Pages.

## Privacidade e armazenamento

O aplicativo não possui conta nem banco de dados. Hábitos, marcações, treinos, contexto do dia, avaliações e pesagens ficam no armazenamento local do navegador. Cada navegador e aparelho mantém dados separados.

Use **Backup** para exportar uma cópia dos registros e **Restaurar** para levá-los a outro navegador ou recuperá-los. Não adicione arquivos de backup ao repositório.

## Publicação

O site pode ser publicado diretamente pelo GitHub Pages a partir da branch `main` e da pasta raiz. Não há etapa de compilação.


## Diário de treinos

A aba **Treinos** registra exercícios, séries, repetições, carga, RIR, metodologia, duração e desempenho percebido. Sono, energia, alimentação, estresse e observações do dia podem ser associados a cada sessão. Os gráficos apresentam volume, maiores cargas e associações do histórico pessoal; não estabelecem causalidade.


## Atualizações e preservação

A versão de 01/10/2026 organiza sessões por treino, oferece catálogos reutilizáveis, gráficos de carga por exercício, carga corporal/barra de 10 kg e rankings geral, por exercício e por grupamento. Contexto usa descrições, e a leitura para próximos treinos explicita seus critérios e limites.

O armazenamento mantém a mesma chave. A atualização guarda uma cópia anterior, conserva campos desconhecidos e bloqueia gravações quando os dados estão inválidos ou outra aba tem uma revisão mais recente. Backups antigos preservam partes ausentes, inclusive de abas futuras. Ações explícitas de restauração substituem coleções presentes após confirmação. `AGENTS.md` registra este requisito para alterações futuras. Cada endereço e navegador mantém dados separados.


### Transferir dados para o site online

Use Backup na origem antiga e Restaurar no site publicado. A opção padrão **Reunir com meus dados atuais** adiciona registros sem apagar os que já estão no site. Identificações repetidas não são duplicadas; diferenças mantêm a versão atual e são avisadas. Avaliações e pesagens são reunidas por data. A opção **Substituir pelos registros do backup** mantém a restauração integral explícita. Cópias do destino e do arquivo importado ficam neste navegador e podem ser baixadas em Seus dados e atualizações. Dados pessoais permanecem no navegador e não são publicados no repositório. A nova versão preserva a cópia anterior em `constancia.recovery.before-merge-v3`.
