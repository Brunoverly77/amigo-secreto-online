/* =====================================================================
   MODELO DO SEGREDO DO SERVIDOR LOCAL
   ---------------------------------------------------------------------
   So serve para TESTAR o cadastro (/api/criar-conta) aqui no seu PC.
   Na Vercel voce NAO usa este arquivo: la as chaves vao em
   Settings > Environment Variables.

   COMO USAR
   1. Copie este arquivo para  js/servidor.secreto.js
         Windows:  copy js\servidor.secreto.example.js js\servidor.secreto.js
   2. Preencha os dois valores abaixo.
   3. Rode  npm run dev  e teste criar conta em http://localhost:8099

   O arquivo js/servidor.secreto.js esta no .gitignore: NAO vai para o
   repositorio. A service_role e SECRETA e so pode ficar no seu PC e na
   Vercel, nunca no site nem no git.

   Onde achar a service_role:
     supabase.com > seu projeto > Settings > API Keys > "service_role"
   ===================================================================== */

module.exports = {
  SUPABASE_URL: "https://COLOQUE_O_SEU_PROJETO_AQUI.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "COLE_A_SUA_SERVICE_ROLE_AQUI"
};
