-- =====================================================================
-- AMIGO SECRETO DE NATAL - banco com LOGIN (Supabase Auth)
-- =====================================================================
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- ATENCAO: este arquivo APAGA e recria as tabelas do amigo secreto.
-- Rodar de novo zera todas as salas. So mexe nos nomes listados aqui.
--
-- COMO FUNCIONA AGORA (login de verdade)
-- Cada pessoa tem uma CONTA no site: nome + email + PIN de 6 numeros.
-- Quem prova a identidade e o proprio login (a sessao do Supabase Auth),
-- nao mais uma chave guardada no aparelho. Por isso sumiu toda aquela
-- mecanica de token, link pessoal e liberar nome: o login resolve.
--
-- - Cadastro: nome + email + PIN
-- - Entrar: email + PIN (no mesmo aparelho, fica logado)
-- - Esqueceu o PIN: recupera pelo email, sozinho
--
-- O SIGILO continua: o sorteio e a dica ficam em tabelas que o navegador
-- nao le direto. So as funcoes abaixo chegam nelas.
--
--   PUBLICO (o site le)        SEGREDO (so as funcoes leem)
--   -----------------------    ----------------------------------
--   perfis (so o proprio)      dicas     (a dica de cada um)
--   salas                      sorteios  (quem tirou quem)
--   participantes
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ============================================== limpeza da versao antiga
drop trigger if exists ao_criar_usuario on auth.users;

drop function if exists public.handle_new_user();
drop function if exists public.criar_sala(text, text, date);
drop function if exists public.criar_sala(text, date);
drop function if exists public.criar_sala(date);
drop function if exists public.entrar_na_sala(text, text);
drop function if exists public.entrar_na_sala(text);
drop function if exists public.definir_dica(uuid, uuid, text);
drop function if exists public.definir_dica(uuid, text);
drop function if exists public.minha_dica(uuid, uuid);
drop function if exists public.minha_dica(uuid);
drop function if exists public.sair_da_sala(uuid, uuid);
drop function if exists public.sair_da_sala(uuid);
drop function if exists public.remover_participante(uuid, uuid, uuid);
drop function if exists public.remover_participante(uuid, uuid);
drop function if exists public.liberar_nome(uuid, uuid, uuid);
drop function if exists public.recuperar_nome(uuid);
drop function if exists public.ver_resultado(uuid, text);
drop function if exists public.ver_resultado(uuid, uuid);
drop function if exists public.ver_resultado(uuid);
drop function if exists public.resetar_pin(uuid, uuid, uuid);
drop function if exists public.realizar_sorteio(uuid, uuid);
drop function if exists public.realizar_sorteio(uuid);
drop function if exists public.assumir_link(uuid, uuid);
drop function if exists public.reabrir_sala(uuid, uuid);
drop function if exists public.reabrir_sala(uuid);
drop function if exists public.apagar_sala(uuid, uuid);
drop function if exists public.apagar_sala(uuid);
drop function if exists public.checar_token(uuid, uuid);
drop function if exists public.gerar_codigo();

drop table if exists public.sorteios      cascade;
drop table if exists public.dicas         cascade;
drop table if exists public.segredos      cascade;
drop table if exists public.salas_admin   cascade;
drop table if exists public.participantes cascade;
drop table if exists public.salas         cascade;
drop table if exists public.perfis        cascade;

-- =========================================================== TABELAS

-- O perfil da conta. Nasce junto com o cadastro (gatilho mais abaixo).
create table public.perfis (
  id        uuid primary key references auth.users(id) on delete cascade,
  nome      text not null,
  criado_em timestamptz not null default now()
);

create table public.salas (
  id           uuid primary key default gen_random_uuid(),
  codigo       text not null unique,
  admin_id     uuid not null references auth.users(id) on delete cascade,
  nome_criador text not null,
  data_festa   date,
  sorteada     boolean not null default false,
  sorteada_em  timestamptz,
  criada_em    timestamptz not null default now()
);

create table public.participantes (
  id            uuid primary key default gen_random_uuid(),
  sala_id       uuid not null references public.salas(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  nome          text not null,
  eh_admin      boolean not null default false,
  viu_resultado boolean not null default false,
  visto_em      timestamptz,
  criado_em     timestamptz not null default now(),
  unique (sala_id, user_id)
);

create index participantes_sala_idx on public.participantes(sala_id);

-- a dica de presente de cada um (secreta: so quem te tirou le)
create table public.dicas (
  participante_id uuid primary key references public.participantes(id) on delete cascade,
  dica            text
);

-- o resultado: "de_id tirou para_id" (secreto)
create table public.sorteios (
  id        uuid primary key default gen_random_uuid(),
  sala_id   uuid not null references public.salas(id) on delete cascade,
  de_id     uuid not null references public.participantes(id) on delete cascade,
  para_id   uuid not null references public.participantes(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (sala_id, de_id)
);

-- ========================================== PERFIL NASCE NO CADASTRO
-- Quando alguem se cadastra, o Supabase cria a conta em auth.users; este
-- gatilho cria o perfil junto, pegando o nome que veio do formulario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), 'Participante')
  );
  return new;
end;
$func$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================ PERMISSOES

alter table public.perfis        enable row level security;
alter table public.salas         enable row level security;
alter table public.participantes enable row level security;
alter table public.dicas         enable row level security;
alter table public.sorteios      enable row level security;

revoke all on public.perfis        from anon, authenticated;
revoke all on public.salas         from anon, authenticated;
revoke all on public.participantes from anon, authenticated;
revoke all on public.dicas         from anon, authenticated;
revoke all on public.sorteios      from anon, authenticated;

-- O site logado LE o proprio perfil, as salas e os participantes.
-- Escrever e so pelas funcoes. dicas e sorteios ninguem le direto.
grant select on public.perfis        to authenticated;
grant select on public.salas         to authenticated;
grant select on public.participantes to authenticated;

-- cada um ve so o proprio perfil
create policy "ler meu perfil" on public.perfis
  for select to authenticated using (auth.uid() = id);

-- salas e participantes nao sao secretos (codigo, nome, quem entrou)
create policy "ler salas" on public.salas
  for select to authenticated using (true);

create policy "ler participantes" on public.participantes
  for select to authenticated using (true);

-- dicas e sorteios: sem politica de propósito. So as funcoes chegam.

-- ================================================================ FUNCOES
-- Todas rodam no servidor com poder de dono (security definer) e usam
-- auth.uid() - o id de quem esta logado - para saber quem e a pessoa.

-- -------------------------------------------------- codigo de 6 letras
-- Sem os caracteres que confundem: I, O, 0 e 1.
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
create or replace function public.criar_sala(
  p_data date default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_uid uuid := auth.uid();
  v_nome text;
  v_sala public.salas;
  v_part public.participantes;
begin
  if v_uid is null then raise exception 'NAO_LOGADO'; end if;
  select nome into v_nome from public.perfis where id = v_uid;
  if v_nome is null then raise exception 'SEM_PERFIL'; end if;

  insert into public.salas (codigo, admin_id, nome_criador, data_festa)
  values (public.gerar_codigo(), v_uid, v_nome, p_data)
  returning * into v_sala;

  insert into public.participantes (sala_id, user_id, nome, eh_admin)
  values (v_sala.id, v_uid, v_nome, true)
  returning * into v_part;

  return json_build_object('sala_id', v_sala.id, 'codigo', v_sala.codigo);
end;
$func$;

-- ------------------------------------------- entrar numa sala existente
create or replace function public.entrar_na_sala(
  p_codigo text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_uid uuid := auth.uid();
  v_nome text;
  v_sala public.salas;
  v_part public.participantes;
begin
  if v_uid is null then raise exception 'NAO_LOGADO'; end if;
  select nome into v_nome from public.perfis where id = v_uid;
  if v_nome is null then raise exception 'SEM_PERFIL'; end if;

  select * into v_sala from public.salas where codigo = upper(btrim(p_codigo));
  if v_sala is null then raise exception 'SALA_NAO_ENCONTRADA'; end if;

  -- ja esta na sala: idempotente, so devolve o id
  select * into v_part from public.participantes
   where sala_id = v_sala.id and user_id = v_uid;
  if v_part.id is not null then
    return json_build_object('sala_id', v_sala.id, 'ja_estava', true);
  end if;

  if v_sala.sorteada then raise exception 'JA_SORTEADA'; end if;

  insert into public.participantes (sala_id, user_id, nome)
  values (v_sala.id, v_uid, v_nome);

  return json_build_object('sala_id', v_sala.id, 'ja_estava', false);
end;
$func$;

-- ------------------------------------- o participante do usuario na sala
create or replace function public.meu_participante(p_sala_id uuid)
returns public.participantes
language sql
security definer
set search_path = public
as $func$
  select * from public.participantes
   where sala_id = p_sala_id and user_id = auth.uid();
$func$;

-- ----------------------------------------------------- escrever a dica
create or replace function public.definir_dica(
  p_sala_id uuid,
  p_dica text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_part public.participantes;
begin
  v_part := public.meu_participante(p_sala_id);
  if v_part.id is null then raise exception 'NAO_PARTICIPA'; end if;

  insert into public.dicas (participante_id, dica)
  values (v_part.id, nullif(btrim(p_dica), ''))
  on conflict (participante_id)
  do update set dica = excluded.dica;

  return json_build_object('ok', true);
end;
$func$;

-- --------------------------------------------------- ler a minha dica
create or replace function public.minha_dica(p_sala_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_part public.participantes;
  v_dica text;
begin
  v_part := public.meu_participante(p_sala_id);
  if v_part.id is null then raise exception 'NAO_PARTICIPA'; end if;
  select dica into v_dica from public.dicas where participante_id = v_part.id;
  return json_build_object('dica', v_dica);
end;
$func$;

-- ------------------------------------------------------ sair da sala
create or replace function public.sair_da_sala(p_sala_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_part public.participantes;
  v_sala public.salas;
begin
  v_part := public.meu_participante(p_sala_id);
  if v_part.id is null then raise exception 'NAO_PARTICIPA'; end if;

  select * into v_sala from public.salas where id = p_sala_id;
  if v_sala.sorteada then raise exception 'JA_SORTEADA'; end if;
  if v_part.eh_admin then raise exception 'ADMIN_NAO_SAI'; end if;

  delete from public.participantes where id = v_part.id;
  return json_build_object('ok', true);
end;
$func$;

-- ---------------------------- organizador tira alguem da lista
create or replace function public.remover_participante(
  p_sala_id uuid,
  p_participante_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_sala public.salas;
begin
  select * into v_sala from public.salas where id = p_sala_id;
  if v_sala is null then raise exception 'SALA_NAO_ENCONTRADA'; end if;
  if v_sala.admin_id <> auth.uid() then raise exception 'SEM_PERMISSAO'; end if;
  if v_sala.sorteada then raise exception 'JA_SORTEADA'; end if;

  delete from public.participantes
   where id = p_participante_id and sala_id = p_sala_id and eh_admin = false;

  return json_build_object('ok', true);
end;
$func$;

-- --------------------------------------------------------- O SORTEIO
create or replace function public.realizar_sorteio(p_sala_id uuid)
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
  select * into v_sala from public.salas where id = p_sala_id for update;
  if v_sala is null then raise exception 'SALA_NAO_ENCONTRADA'; end if;
  if v_sala.admin_id <> auth.uid() then raise exception 'SEM_PERMISSAO'; end if;
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
      if v_ids[v_i] = v_emb[v_i] then v_ok := false; exit; end if;
    end loop;
    exit when v_ok;
    if v_voltas > 2000 then raise exception 'SORTEIO_FALHOU'; end if;
  end loop;

  for v_i in 1..v_n loop
    insert into public.sorteios (sala_id, de_id, para_id)
    values (p_sala_id, v_ids[v_i], v_emb[v_i]);
  end loop;

  update public.salas set sorteada = true, sorteada_em = now() where id = p_sala_id;
  return json_build_object('ok', true, 'total', v_n);
end;
$func$;

-- ----------------------------------------------- ver quem eu tirei
create or replace function public.ver_resultado(p_sala_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_part public.participantes;
  v_nome text;
  v_dica text;
begin
  v_part := public.meu_participante(p_sala_id);
  if v_part.id is null then raise exception 'NAO_PARTICIPA'; end if;

  select alvo.nome, d.dica
    into v_nome, v_dica
    from public.sorteios s
    join public.participantes alvo on alvo.id = s.para_id
    left join public.dicas d on d.participante_id = alvo.id
   where s.de_id = v_part.id;

  if v_nome is null then raise exception 'SORTEIO_NAO_REALIZADO'; end if;

  update public.participantes
     set viu_resultado = true, visto_em = coalesce(visto_em, now())
   where id = v_part.id;

  return json_build_object('nome', v_nome, 'dica', v_dica);
end;
$func$;

-- --------------------------------------- desfazer o sorteio
create or replace function public.reabrir_sala(p_sala_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_sala public.salas;
  v_viram int;
begin
  select * into v_sala from public.salas where id = p_sala_id;
  if v_sala is null then raise exception 'SALA_NAO_ENCONTRADA'; end if;
  if v_sala.admin_id <> auth.uid() then raise exception 'SEM_PERMISSAO'; end if;

  select count(*) into v_viram from public.participantes
   where sala_id = p_sala_id and viu_resultado = true;
  if v_viram > 0 then raise exception 'ALGUEM_JA_VIU'; end if;

  delete from public.sorteios where sala_id = p_sala_id;
  update public.salas set sorteada = false, sorteada_em = null where id = p_sala_id;
  return json_build_object('ok', true);
end;
$func$;

-- --------------------------------------- apagar a sala inteira
create or replace function public.apagar_sala(p_sala_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_sala public.salas;
begin
  select * into v_sala from public.salas where id = p_sala_id;
  if v_sala is null then raise exception 'SALA_NAO_ENCONTRADA'; end if;
  if v_sala.admin_id <> auth.uid() then raise exception 'SEM_PERMISSAO'; end if;

  delete from public.salas where id = p_sala_id;
  return json_build_object('ok', true);
end;
$func$;

-- ------------------------------------------------------------ permissoes
revoke all on function public.gerar_codigo() from public;
revoke all on function public.meu_participante(uuid) from public;
revoke all on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.criar_sala(date)                    to authenticated;
grant execute on function public.entrar_na_sala(text)                to authenticated;
grant execute on function public.definir_dica(uuid, text)            to authenticated;
grant execute on function public.minha_dica(uuid)                    to authenticated;
grant execute on function public.sair_da_sala(uuid)                  to authenticated;
grant execute on function public.remover_participante(uuid, uuid)    to authenticated;
grant execute on function public.realizar_sorteio(uuid)              to authenticated;
grant execute on function public.ver_resultado(uuid)                 to authenticated;
grant execute on function public.reabrir_sala(uuid)                  to authenticated;
grant execute on function public.apagar_sala(uuid)                   to authenticated;

-- ============================================================ TEMPO REAL
do $bloco$
begin
  begin alter publication supabase_realtime add table public.participantes;
  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.salas;
  exception when duplicate_object then null; end;
end;
$bloco$;

alter table public.participantes replica identity full;
alter table public.salas replica identity full;
