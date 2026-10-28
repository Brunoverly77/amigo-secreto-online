-- =====================================================================
-- LINK PESSOAL DE USO UNICO
-- =====================================================================
-- Acrescenta uma funcao ao banco. NAO apaga nada, nao mexe nas tabelas
-- nem nos dados: pode rodar com sala em andamento.
--
-- Quem ja rodou o 01-schema.sql depois desta data nao precisa deste
-- arquivo: a funcao ja esta la dentro.
--
-- Como usar: Supabase > SQL Editor > New query > colar > Run.
-- =====================================================================

-- O link pessoal e de USO UNICO: ao ser usado, a chave antiga morre e
-- uma nova nasce. Assim, se o link vazar e um curioso clicar, o celular
-- da dona para de funcionar na hora e ela percebe, em vez de ser
-- espionada em silencio. O link vazado tambem ja nao serve a ninguem.
create or replace function public.assumir_link(
  p_participante_id uuid,
  p_token uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_novo uuid := gen_random_uuid();
  v_nome text;
begin
  perform public.checar_token(p_participante_id, p_token);

  update public.segredos
     set token = v_novo
   where participante_id = p_participante_id;

  select nome into v_nome from public.participantes where id = p_participante_id;

  return json_build_object(
    'participante_id', p_participante_id,
    'token', v_novo,
    'nome', v_nome
  );
end;
$func$;

grant execute on function public.assumir_link(uuid, uuid) to anon, authenticated;

-- confere que entrou
select 'assumir_link criada' as resultado
  from pg_proc
 where proname = 'assumir_link';
