-- =====================================================================
-- LIMPEZA DO ia-teck
-- ---------------------------------------------------------------------
-- Remove os restos do AMIGO SECRETO que foram rodados no ia-teck por
-- engano, no comeco. Apaga SOMENTE os objetos do amigo secreto (pelos
-- nomes). Nao toca em nada da IA TECK.
--
-- >>> RODE ISTO NO PROJETO ia-teck, NUNCA no projeto "Amigo secreto"! <<<
--     (no "Amigo secreto" isto apagaria o site todo)
--
-- Antes de rodar, confira no Table Editor do ia-teck que as tabelas
-- perfis / salas / participantes / dicas / sorteios sao mesmo do amigo
-- secreto (vazias ou com dado de teste). Se alguma for da IA TECK, PARE.
-- =====================================================================

-- gatilho em auth.users (o mais importante: era ele que criava um perfil
-- a cada cadastro da IA TECK)
drop trigger if exists ao_criar_usuario on auth.users;

-- ------------------------------------------------- funcoes do amigo secreto
drop function if exists public.handle_new_user()                     cascade;
drop function if exists public.gerar_codigo()                        cascade;
drop function if exists public.criar_sala(date)                      cascade;
drop function if exists public.criar_sala(text, date)                cascade;
drop function if exists public.criar_sala(text, text, date)          cascade;
drop function if exists public.entrar_na_sala(text)                  cascade;
drop function if exists public.entrar_na_sala(text, text)            cascade;
drop function if exists public.meu_participante(uuid)                cascade;
drop function if exists public.definir_dica(uuid, text)              cascade;
drop function if exists public.definir_dica(uuid, uuid, text)        cascade;
drop function if exists public.minha_dica(uuid)                      cascade;
drop function if exists public.minha_dica(uuid, uuid)                cascade;
drop function if exists public.sair_da_sala(uuid)                    cascade;
drop function if exists public.sair_da_sala(uuid, uuid)              cascade;
drop function if exists public.remover_participante(uuid, uuid)      cascade;
drop function if exists public.remover_participante(uuid, uuid, uuid) cascade;
drop function if exists public.realizar_sorteio(uuid)               cascade;
drop function if exists public.realizar_sorteio(uuid, uuid)         cascade;
drop function if exists public.ver_resultado(uuid)                  cascade;
drop function if exists public.ver_resultado(uuid, text)            cascade;
drop function if exists public.ver_resultado(uuid, uuid)            cascade;
drop function if exists public.reabrir_sala(uuid)                   cascade;
drop function if exists public.reabrir_sala(uuid, uuid)             cascade;
drop function if exists public.apagar_sala(uuid)                    cascade;
drop function if exists public.apagar_sala(uuid, uuid)              cascade;

-- funcoes da versao antiga (token/link pessoal), caso ainda existam
drop function if exists public.liberar_nome(uuid, uuid, uuid)        cascade;
drop function if exists public.recuperar_nome(uuid)                 cascade;
drop function if exists public.assumir_link(uuid, uuid)             cascade;
drop function if exists public.checar_token(uuid, uuid)             cascade;
drop function if exists public.resetar_pin(uuid, uuid, uuid)        cascade;

-- ------------------------------------------------- tabelas do amigo secreto
drop table if exists public.sorteios      cascade;
drop table if exists public.dicas         cascade;
drop table if exists public.segredos      cascade;
drop table if exists public.salas_admin   cascade;
drop table if exists public.participantes cascade;
drop table if exists public.salas         cascade;
drop table if exists public.perfis        cascade;
