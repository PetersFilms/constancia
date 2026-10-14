# Sono & Recuperação — diagnóstico e estratégia

O Constância é uma PWA estática em JavaScript, com estado version:1 em constancia.v1, validação por módulos, recuperação em IndexedDB e reconciliação privada de três versões no Supabase. O banco guarda o documento completo por proprietário; novas tabelas são desnecessárias.

A extensão sleep será aditiva: records por data de despertar, settingsVersions e plans por id, history por id. Cada noite conserva a meta e o planejamento aplicados; alterar a configuração não recalcula a meta histórica. Dados opcionais ausentes permanecem null. O schema inclui origem e tipo para futuras fontes, sem integrar dispositivos nesta versão.

A cópia integral anterior à atualização será confirmada em IndexedDB antes da primeira escrita. A proteção é compartilhada entre módulos para impedir que o To-Do libere a gravação antes da migração Sono. Os novos registros entram nos mesmos backups, autenticação, políticas RLS e sincronização entre aparelhos.

Planejamentos usam o outbox do To-Do, IDs estáveis, tokens exclusivos do backend e lembretes Google. Séries nativas RRULE são limitadas ao horizonte escolhido e expandidas por ocorrência na importação. O documento de planejamento conserva o vínculo; conclusão no To-Do nunca cria registros de sono. Alterações futuras exigem ação explícita, preservando eventos anteriores. Testes usam provedores falsos e uma origem isolada; o histórico real não recebe noites fictícias.

Comparações com hábitos e treino usam o dia anterior ao despertar; produtividade usa o dia do despertar, exclui cancelamentos e eventos de descanso planejado. Gráficos não preenchem lacunas com zero. Insights exibem período, amostra e valores, sem diagnóstico ou causalidade. Horários usam fuso explícito e regularidade circular ao redor da meia-noite.
