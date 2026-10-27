-- =====================================================================
-- AMIGO SECRETO DE NATAL - estrutura do banco (Supabase / PostgreSQL)
-- =====================================================================
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cole TODO este arquivo e clique em Run.
--
-- ATENCAO: este arquivo APAGA e recria as tabelas do amigo secreto.
-- Rodar de novo zera todas as salas. Nao toca em nenhuma outra tabela
-- do projeto: so mexe nos cinco nomes listados aqui embaixo.
--
-- COMO FUNCIONA A ENTRADA
-- Ninguem adiciona ninguem. Cada pessoa abre o link e entra com o
-- proprio nome, no proprio celular. Quem nao entrou nao participa do
-- sorteio, entao nao existe "nome fantasma" na lista.
--
-- COMO FUNCIONA O SIGILO
-- Ao entrar, a pessoa ganha uma chave secreta (token) que fica guardada
-- no celular dela. E essa chave que prova quem ela e na hora de ver o
-- resultado. A chave nunca aparece na tela e nunca sai pelas tabelas
-- publicas - nem o organizador consegue ver.
--
-- O navegador roda com a chave publica (anon), e o tempo real transmite
-- a linha inteira para todos os celulares da sala. Por isso NADA secreto
-- mora nas tabelas publicas:
--
--   PUBLICO (o celular le)      SEGREDO (so as funcoes leem)
--   -------------------------   ----------------------------------
--   salas                       salas_admin  (token do organizador)
--   participantes               segredos     (token e dica de cada um)
--                               sorteios     (quem tirou quem)
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ============================================== limpeza da versao antiga
drop function if exists public.criar_sala(text, text, date);
drop function if exists public.criar_sala(text, date);
drop function if exists public.entrar_na_sala(text, text);
drop function if exists public.reivindicar_nome(uuid, text, text);
drop function if exists public.conferir_pin(uuid, text);
drop function if exists public.checar_pin(uuid, text);
drop function if exists public.atualizar_dica(uuid, text, text);
drop function if exists public.definir_dica(uuid, uuid, text);
drop function if exists public.sair_da_sala(uuid, uuid);
drop function if exists public.remover_participante(uuid, uuid, uuid);
drop function if exists public.liberar_nome(uuid, uuid, uuid);
drop function if exists public.recuperar_nome(uuid);
drop function if exists public.ver_resultado(uuid, text);
drop function if exists public.ver_resultado(uuid, uuid);
drop function if exists public.resetar_pin(uuid, uuid, uuid);
drop function if exists public.realizar_sorteio(uuid, uuid);
drop function if exists public.reabrir_sala(uuid, uuid);
drop function if exists public.apagar_sala(uuid, uuid);
drop function if exists public.gerar_codigo();

drop table if exists public.sorteios      cascade;
drop table if exists public.segredos      cascade;
drop table if exists public.salas_admin   cascade;
drop table if exists public.participantes cascade;
drop table if exists public.salas         cascade;

-- ===================================================== TABELAS PUBLICAS

create table public.salas (
  id           uuid primary key default gen_random_uuid(),
  codigo       text not null unique,
  nome_criador text not null,
  data_festa   date,
  sorteada     boolean not null default false,
  sorteada_em  timestamptz,
  criada_em    timestamptz not null default now()
);

create table public.participantes (
  id            uuid primary key default gen_random_uuid(),
  sala_id       uuid not null references public.salas(id) on delete cascade,
  nome          text not null,
  eh_admin      boolean not null default false,
  -- true quando o organizador libera o nome para a pessoa reassumir
  -- num celular novo (caso ela tenha perdido o acesso)
  liberado      boolean not null default false,
  viu_resultado boolean not null default false,
  visto_em      timestamptz,
  criado_em     timestamptz not null default now()
);

create index participantes_sala_idx on public.participantes(sala_id);

-- ===================================================== TABELAS SECRETAS

create table public.salas_admin (
  sala_id     uuid primary key references public.salas(id) on delete cascade,
  admin_token uuid not null default gen_random_uuid()
);

-- A chave secreta do celular de cada pessoa, e a dica de presente dela.
create table public.segredos (
  participante_id uuid primary key references public.participantes(id) on delete cascade,
  token           uuid not null default gen_random_uuid(),
  dica            text
);

create table public.sorteios (
  id        uuid primary key default gen_random_uuid(),
  sala_id   uuid not null references public.salas(id) on delete cascade,
  de_id     uuid not null references public.participantes(id) on delete cascade,
  para_id   uuid not null references public.participantes(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (sala_id, de_id)
);

-- ============================================================ PERMISSOES

alter table public.salas         enable row level security;
alter table public.participantes enable row level security;
alter table public.salas_admin   enable row level security;
alter table public.segredos      enable row level security;
alter table public.sorteios      enable row level security;

revoke all on public.salas         from anon, authenticated;
revoke all on public.participantes from anon, authenticated;
revoke all on public.salas_admin   from anon, authenticated;
revoke all on public.segredos      from anon, authenticated;
revoke all on public.sorteios      from anon, authenticated;

-- O celular so LE as duas tabelas publicas. Toda escrita passa pelas
-- funcoes aqui embaixo, que conferem token antes de fazer qualquer coisa.
grant select on public.salas         to anon, authenticated;
grant select on public.participantes to anon, authenticated;

create policy "ler salas" on public.salas
  for select to anon, authenticated using (true);

create policy "ler participantes" on public.participantes
  for select to anon, authenticated using (true);

-- ================================================================ FUNCOES

-- -------------------------------------------------- codigo de 6 digitos
-- Sem os caracteres que confundem na leitura: I, O, 0 e 1.
create or replace function public.gerar_codigo()
returns text
language plpgsql
set search_path = public
as $func$
declare
  v_letras text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_cod text;
  v_i int;
begin
  loop
    v_cod := '';
    for v_i in 1..6 loop
      v_cod := v_cod || substr(v_letras, 1 + floor(random() * length(v_letras))::int, 1);
    end loop;
    exit when not exists (select 1 from public.salas where codigo = v_cod);
  end loop;
  return v_cod;
end;
$func$;

-- ---------------------------------------------------------- criar a sala
-- Quem cria ja entra como primeiro participante.
create or replace function public.criar_sala(
  p_nome text,
  p_data date default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_nome text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_sala public.salas;
  v_part public.participantes;
  v_admin uuid;
  v_token uuid;
begin
  if length(v_nome) < 2 then raise exception 'NOME_CURTO'; end if;

  insert into public.salas (codigo, nome_criador, data_festa)
  values (public.gerar_codigo(), v_nome, p_data)
  returning * into v_sala;

  insert into public.salas_admin (sala_id)
  values (v_sala.id)
  returning admin_token into v_admin;

  insert into public.participantes (sala_id, nome, eh_admin)
  values (v_sala.id, v_nome, true)
  returning * into v_part;

  insert into public.segredos (participante_id)
  values (v_part.id)
  returning token into v_token;

  return json_build_object(
    'sala_id', v_sala.id,
    'codigo', v_sala.codigo,
    'participante_id', v_part.id,
    'token', v_token,
    'admin_token', v_admin
  );
end;
$func$;

-- ------------------------------------------- entrar na sala com meu nome
-- E a unica forma de alguem entrar na lista: pelo proprio celular.
create or replace function public.entrar_na_sala(
  p_codigo text,
  p_nome text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_nome text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_sala public.salas;
  v_part public.participantes;
  v_token uuid;
begin
  if length(v_nome) < 2 then raise exception 'NOME_CURTO'; end if;

  select * into v_sala from public.salas where codigo = upper(btrim(p_codigo));
  if v_sala is null then raise exception 'SALA_NAO_ENCONTRADA'; end if;
  if v_sala.sorteada then raise exception 'JA_SORTEADA'; end if;

  if exists (
    select 1 from public.participantes
     where sala_id = v_sala.id and lower(nome) = lower(v_nome)
  ) then
    raise exception 'NOME_REPETIDO';
  end if;

  insert into public.participantes (sala_id, nome)
  values (v_sala.id, v_nome)
  returning * into v_part;

  insert into public.segredos (participante_id)
  values (v_part.id)
  returning token into v_token;

  return json_build_object(
    'sala_id', v_sala.id,
    'participante_id', v_part.id,
    'token', v_token
  );
end;
$func$;

-- --------------------------------------------- conferencia interna da chave
create or replace function public.checar_token(
  p_participante_id uuid,
  p_token uuid
)
returns public.segredos
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_s public.segredos;
begin
  select * into v_s from public.segredos where participante_id = p_participante_id;
  if v_s is null then raise exception 'PARTICIPANTE_NAO_ENCONTRADO'; end if;
  if v_s.token <> p_token then raise exception 'CHAVE_INVALIDA'; end if;
  return v_s;
end;
$func$;

-- ----------------------------------------------------- escrever minha dica
create or replace function public.definir_dica(
  p_participante_id uuid,
  p_token uuid,
  p_dica text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
begin
  perform public.checar_token(p_participante_id, p_token);

  update public.segredos
     set dica = nullif(btrim(p_dica), '')
   where participante_id = p_participante_id;

  return json_build_object('ok', true);
end;
$func$;

-- ------------------------------------------------- ler a minha propria dica
create or replace function public.minha_dica(
  p_participante_id uuid,
  p_token uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_s public.segredos;
begin
  v_s := public.checar_token(p_participante_id, p_token);
  return json_build_object('dica', v_s.dica);
end;
$func$;

-- ------------------------------------------------------- sair da sala (eu)
create or replace function public.sair_da_sala(
  p_participante_id uuid,
  p_token uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_p public.participantes;
  v_sala public.salas;
begin
  perform public.checar_token(p_participante_id, p_token);

  select * into v_p from public.participantes where id = p_participante_id;
  select * into v_sala from public.salas where id = v_p.sala_id;

  if v_sala.sorteada then raise exception 'JA_SORTEADA'; end if;
  if v_p.eh_admin then raise exception 'ADMIN_NAO_SAI'; end if;

  delete from public.participantes where id = p_participante_id;
  return json_build_object('ok', true);
end;
$func$;

-- ------------------------------------- organizador tira alguem da lista
create or replace function public.remover_participante(
  p_sala_id uuid,
  p_admin_token uuid,
  p_participante_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_sala public.salas;
begin
  if not exists (
    select 1 from public.salas_admin
     where sala_id = p_sala_id and admin_token = p_admin_token
  ) then
    raise exception 'SEM_PERMISSAO';
  end if;

  select * into v_sala from public.salas where id = p_sala_id;
  if v_sala.sorteada then raise exception 'JA_SORTEADA'; end if;

  delete from public.participantes
   where id = p_participante_id
     and sala_id = p_sala_id
     and eh_admin = false;

  return json_build_object('ok', true);
end;
$func$;

-- ------------------------- organizador libera um nome (celular perdido)
-- Nao devolve chave nenhuma para o organizador: ele so destrava o nome,
-- e quem reassume e a propria pessoa, no celular dela.
create or replace function public.liberar_nome(
  p_sala_id uuid,
  p_admin_token uuid,
  p_participante_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
begin
  if not exists (
    select 1 from public.salas_admin
     where sala_id = p_sala_id and admin_token = p_admin_token
  ) then
    raise exception 'SEM_PERMISSAO';
  end if;

  update public.participantes
     set liberado = true
   where id = p_participante_id and sala_id = p_sala_id;

  if not found then raise exception 'PARTICIPANTE_NAO_ENCONTRADO'; end if;

  return json_build_object('ok', true);
end;
$func$;

-- ------------------------------- reassumir um nome liberado, num celular
create or replace function public.recuperar_nome(
  p_participante_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_p public.participantes;
  v_token uuid := gen_random_uuid();
begin
  select * into v_p from public.participantes where id = p_participante_id;
  if v_p is null then raise exception 'PARTICIPANTE_NAO_ENCONTRADO'; end if;
  if not v_p.liberado then raise exception 'NOME_NAO_LIBERADO'; end if;

  update public.segredos set token = v_token where participante_id = p_participante_id;
  update public.participantes set liberado = false where id = p_participante_id;

  return json_build_object('participante_id', p_participante_id, 'token', v_token);
end;
$func$;

-- ------------------------------------------------------------ O SORTEIO
-- Embaralha no servidor e refaz enquanto alguem estiver tirando a si mesmo.
create or replace function public.realizar_sorteio(
  p_sala_id uuid,
  p_admin_token uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_sala public.salas;
  v_ids uuid[];
  v_emb uuid[];
  v_n int;
  v_i int;
  v_ok boolean;
  v_voltas int := 0;
begin
  -- trava a linha da sala: dois cliques simultaneos nao geram dois sorteios
  select * into v_sala from public.salas where id = p_sala_id for update;
  if v_sala is null then raise exception 'SALA_NAO_ENCONTRADA'; end if;

  if not exists (
    select 1 from public.salas_admin
     where sala_id = p_sala_id and admin_token = p_admin_token
  ) then
    raise exception 'SEM_PERMISSAO';
  end if;

  if v_sala.sorteada then raise exception 'JA_SORTEADA'; end if;

  select array_agg(id order by criado_em, id) into v_ids
    from public.participantes where sala_id = p_sala_id;

  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n < 3 then raise exception 'MINIMO_3'; end if;

  loop
    v_voltas := v_voltas + 1;
    select array_agg(x order by random()) into v_emb from unnest(v_ids) as t(x);

    v_ok := true;
    for v_i in 1..v_n loop
      if v_ids[v_i] = v_emb[v_i] then
        v_ok := false;
        exit;
      end if;
    end loop;

    exit when v_ok;
    if v_voltas > 2000 then raise exception 'SORTEIO_FALHOU'; end if;
  end loop;

  for v_i in 1..v_n loop
    insert into public.sorteios (sala_id, de_id, para_id)
    values (p_sala_id, v_ids[v_i], v_emb[v_i]);
  end loop;

  update public.salas
     set sorteada = true, sorteada_em = now()
   where id = p_sala_id;

  return json_build_object('ok', true, 'total', v_n, 'voltas', v_voltas);
end;
$func$;

-- ------------------------------------------------- ver quem eu tirei
create or replace function public.ver_resultado(
  p_participante_id uuid,
  p_token uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_nome text;
  v_dica text;
begin
  perform public.checar_token(p_participante_id, p_token);

  select alvo.nome, seg.dica
    into v_nome, v_dica
    from public.sorteios s
    join public.participantes alvo on alvo.id = s.para_id
    left join public.segredos seg on seg.participante_id = alvo.id
   where s.de_id = p_participante_id;

  if v_nome is null then raise exception 'SORTEIO_NAO_REALIZADO'; end if;

  update public.participantes
     set viu_resultado = true,
         visto_em      = coalesce(visto_em, now())
   where id = p_participante_id;

  return json_build_object('nome', v_nome, 'dica', v_dica);
end;
$func$;

-- ------------------------------------------- desfazer o sorteio
-- Só vale enquanto ninguem tiver aberto o resultado. Depois que alguem
-- viu, refazer vazaria informacao: aí o caminho e apagar a sala.
create or replace function public.reabrir_sala(
  p_sala_id uuid,
  p_admin_token uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_viram int;
begin
  if not exists (
    select 1 from public.salas_admin
     where sala_id = p_sala_id and admin_token = p_admin_token
  ) then
    raise exception 'SEM_PERMISSAO';
  end if;

  select count(*) into v_viram
    from public.participantes
   where sala_id = p_sala_id and viu_resultado = true;

  if v_viram > 0 then raise exception 'ALGUEM_JA_VIU'; end if;

  delete from public.sorteios where sala_id = p_sala_id;

  update public.salas
     set sorteada = false, sorteada_em = null
   where id = p_sala_id;

  return json_build_object('ok', true);
end;
$func$;

-- ------------------------------------------------ apagar a sala inteira
-- Leva junto participantes, chaves, dicas e o sorteio (on delete cascade).
create or replace function public.apagar_sala(
  p_sala_id uuid,
  p_admin_token uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
begin
  if not exists (
    select 1 from public.salas_admin
     where sala_id = p_sala_id and admin_token = p_admin_token
  ) then
    raise exception 'SEM_PERMISSAO';
  end if;

  delete from public.salas where id = p_sala_id;

  return json_build_object('ok', true);
end;
$func$;

-- ------------------------------------------------------------ permissoes
revoke all on function public.gerar_codigo() from public;
revoke all on function public.checar_token(uuid, uuid) from public;

grant execute on function public.criar_sala(text, date)                   to anon, authenticated;
grant execute on function public.entrar_na_sala(text, text)               to anon, authenticated;
grant execute on function public.definir_dica(uuid, uuid, text)           to anon, authenticated;
grant execute on function public.minha_dica(uuid, uuid)                   to anon, authenticated;
grant execute on function public.sair_da_sala(uuid, uuid)                 to anon, authenticated;
grant execute on function public.remover_participante(uuid, uuid, uuid)   to anon, authenticated;
grant execute on function public.liberar_nome(uuid, uuid, uuid)           to anon, authenticated;
grant execute on function public.recuperar_nome(uuid)                     to anon, authenticated;
grant execute on function public.realizar_sorteio(uuid, uuid)             to anon, authenticated;
grant execute on function public.ver_resultado(uuid, uuid)                to anon, authenticated;
grant execute on function public.reabrir_sala(uuid, uuid)                 to anon, authenticated;
grant execute on function public.apagar_sala(uuid, uuid)                  to anon, authenticated;

-- ============================================================ TEMPO REAL
-- Somente as tabelas publicas entram. As secretas nunca sao transmitidas.
do $bloco$
begin
  begin
    alter publication supabase_realtime add table public.participantes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.salas;
  exception when duplicate_object then null;
  end;
end;
$bloco$;

alter table public.participantes replica identity full;
alter table public.salas replica identity full;
