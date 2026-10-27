/* =====================================================================
   SERVIDOR LOCAL para desenvolvimento.
   ---------------------------------------------------------------------
   As paginas usam fetch, que nao funciona abrindo o arquivo com duplo
   clique. Este servidorzinho resolve isso, sem instalar nada.

       npm start

   Depois abra http://localhost:8099
   ===================================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = __dirname;
const PORTA = Number(process.env.PORT || 8099);

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
    const pedido = decodeURIComponent(req.url.split("?")[0]);
    const alvo = path.join(RAIZ, pedido === "/" ? "index.html" : pedido);

    /* nao deixa sair da pasta do projeto */
    if (!path.resolve(alvo).startsWith(path.resolve(RAIZ))) {
      res.writeHead(403).end("Fora da pasta do projeto");
      return;
    }

    fs.readFile(alvo, (erro, conteudo) => {
      if (erro) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 - nao achei " + pedido);
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
