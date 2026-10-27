/* =====================================================================
   GERADOR DO js/config.js
   ---------------------------------------------------------------------
   O site e estatico e le as chaves de js/config.js, que NAO vai para o
   repositorio. Entao, na hora de publicar, este script monta esse arquivo
   a partir das variaveis de ambiente da Vercel.

   Na Vercel: Settings > Environment Variables
     SUPABASE_URL        = https://xxxxxxxx.supabase.co
     SUPABASE_ANON_KEY   = eyJhbGciOi...

   Nao usa nenhuma biblioteca: roda so com o Node.
   ===================================================================== */

const fs = require("fs");
const path = require("path");

const url = (process.env.SUPABASE_URL || "").trim();
const chave = (process.env.SUPABASE_ANON_KEY || "").trim();

const destino = path.join(__dirname, "js", "config.js");

/* ------------------------------------------------------- conferencias */
const faltando = [];
if (!url) faltando.push("SUPABASE_URL");
if (!chave) faltando.push("SUPABASE_ANON_KEY");

if (faltando.length) {
  /* Rodando na sua maquina, um js/config.js feito a mao ja basta:
     neste caso o script nao reclama, so avisa e sai. */
  if (fs.existsSync(destino)) {
    console.log("· Sem variaveis de ambiente, mas js/config.js ja existe. Mantendo o que esta la.");
    process.exit(0);
  }

  console.error("\nERRO: faltam as variaveis de ambiente " + faltando.join(" e ") + ".");
  console.error("Na Vercel: Settings > Environment Variables.");
  console.error("Na sua maquina: copie js/config.example.js para js/config.js e preencha.\n");
  process.exit(1);
}

/* Trava de seguranca: a service_role nunca pode ir para o front-end.
   No formato JWT antigo ela tem "service_role" dentro do corpo; no
   formato novo ela comeca com sb_secret_. */
function pareceServiceRole(valor) {
  if (valor.startsWith("sb_secret_")) return true;
  const partes = valor.split(".");
  if (partes.length !== 3) return false;
  try {
    const corpo = Buffer.from(partes[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(corpo).role === "service_role";
  } catch (e) {
    return false;
  }
}

if (pareceServiceRole(chave)) {
  console.error("\nPARADO: a chave informada parece ser a service_role.");
  console.error("Ela ignora todas as regras de seguranca e nao pode ir para o site.");
  console.error("Use a chave anon public.\n");
  process.exit(1);
}

/* ---------------------------------------------------------- gravacao */
const conteudo = `/* Arquivo gerado automaticamente por build.js. Nao edite a mao. */
window.CONFIG = {
  SUPABASE_URL: ${JSON.stringify(url)},
  SUPABASE_ANON_KEY: ${JSON.stringify(chave)}
};
`;

fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, conteudo, "utf8");

console.log("✓ js/config.js gerado para " + url);
