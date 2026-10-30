-- Capturas de áudio no segundo cérebro: o aplicativo grava pelo microfone e o
-- áudio viaja comprimido em content, como a foto. Aditiva; conteúdo continua
-- esvaziado após a classificação.
alter table public.constancia_brain_inbox drop constraint constancia_brain_inbox_kind_check;
alter table public.constancia_brain_inbox add constraint constancia_brain_inbox_kind_check check (kind in ('texto','foto','audio'));
