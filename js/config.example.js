/* =====================================================================
   MODELO DE CONFIGURACAO
   ---------------------------------------------------------------------
   Este arquivo e um exemplo e VAI para o repositorio.
   O arquivo de verdade, js/config.js, fica de fora (veja o .gitignore).

   PARA RODAR NA SUA MAQUINA
   1. Copie este arquivo para js/config.js
         Windows:  copy js\config.example.js js\config.js
         Linux/Mac: cp js/config.example.js js/config.js
   2. Preencha os dois valores abaixo com os do SEU projeto Supabase.
   3. Rode  npm start  e abra http://localhost:8099

   ONDE ACHAR OS VALORES
   supabase.com > seu projeto > Settings > API Keys
     SUPABASE_URL       = "Project URL"
     SUPABASE_ANON_KEY  = a chave "anon public"
                          (na aba "Legacy anon, service_role API keys")

   SOBRE A CHAVE anon
   Ela e publica de proposito: vai no navegador de quem acessa o site, e
   qualquer visitante consegue le-la. Quem protege os dados sao as regras
   RLS e as funcoes de sql/01-schema.sql, nao o sigilo dela.

   A chave service_role e OUTRA COISA: ela ignora todas as regras de
   seguranca. NUNCA coloque a service_role aqui, nem em lugar nenhum do
   front-end, nem em repositorio.
   ===================================================================== */

window.CONFIG = {
  SUPABASE_URL: "https://COLOQUE_O_SEU_PROJETO_AQUI.supabase.co",
  SUPABASE_ANON_KEY: "COLOQUE_A_SUA_CHAVE_ANON_PUBLIC_AQUI"
};
