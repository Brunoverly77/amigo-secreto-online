/* =====================================================================
   SERVIDOR LOCAL para desenvolvimento.
   ---------------------------------------------------------------------
   As paginas usam fetch, que nao funciona abrindo o arquivo com duplo
   clique. Este servidorzinho resolve isso, sem instalar nada.

       npm run dev

   Depois abra http://localhost:8099

   CADASTRO LOCAL (opcional)
   O cadastro chama /api/criar-conta, que precisa da chave service_role.
   Para testar isso no PC, copie js/servidor.secreto.example.js para
   js/servidor.secreto.js e preencha. Sem isso, todo o resto funciona
   normal; so o criar-conta local fica desligado (na Vercel funciona pelas
   variaveis de ambiente).
   ===================================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = __dirname;
const PORTA = Number(process.env.PORT || 8099);

/* carrega o segredo local (gitignored), se existir, para o /api/criar-conta
   tambem funcionar aqui no PC */
try {
  const segredo = require("./js/servidor.secreto.js");
  if (segredo.SUPABASE_URL && !process.env.SUPABASE_URL) {
    process.env.SUPABASE_URL = segredo.SUPABASE_URL;
  }
  if (segredo.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = segredo.SUPABASE_SERVICE_ROLE_KEY;
  }
} catch (e) {
  /* sem arquivo de segredo: cadastro local fica desligado, resto funciona */
}

const criarConta = require("./api/criar-conta.js");

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8",
  ".sql": "text/plain; charset=utf-8"
};

/* Avisa cedo se o config.js ainda nao existe, em vez de deixar a pagina
   quebrar sem explicacao. */
if (!fs.existsSync(path.join(RAIZ, "js", "config.js"))) {
  console.log("\n  Atencao: js/config.js nao existe ainda.");
  console.log("  Copie js/config.example.js para js/config.js e preencha as chaves.\n");
}

http
  .createServer((req, res) => {
    const caminho = decodeURIComponent(req.url.split("?")[0]);

    /* funcao de servidor: criar a conta ja confirmada */
    if (caminho === "/api/criar-conta") {
      criarConta(req, res).catch(() => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ erro: "FALHOU" }));
      });
      return;
    }

    const alvo = path.join(RAIZ, caminho === "/" ? "index.html" : caminho);

    /* nao deixa sair da pasta do projeto */
    if (!path.resolve(alvo).startsWith(path.resolve(RAIZ))) {
      res.writeHead(403).end("Fora da pasta do projeto");
      return;
    }

    fs.readFile(alvo, (erro, conteudo) => {
      if (erro) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 - nao achei " + caminho);
        return;
      }
      res.writeHead(200, {
        "Content-Type": TIPOS[path.extname(alvo).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-cache"
      });
      res.end(conteudo);
    });
  })
  .listen(PORTA, () => {
    console.log("\n  \u{1F384} Amigo Secreto de Natal rodando em http://localhost:" + PORTA);
    console.log("  Para parar, aperte Ctrl+C\n");
  });
