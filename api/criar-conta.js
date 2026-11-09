/* =====================================================================
   /api/criar-conta  — cria a conta JA CONFIRMADA (sem email de confirmacao)
   ---------------------------------------------------------------------
   O cadastro do site chama este endereco em vez de criar a conta direto no
   navegador. Aqui, no servidor, a gente usa a chave service_role (que NUNCA
   vai pro navegador) para criar o usuario no Supabase ja com o email
   marcado como confirmado.

   Assim:
     - a pessoa entra na hora, sem clicar em link de email nenhum;
     - nenhum email e enviado no cadastro (o limite grátis nem e tocado);
     - a gente NAO precisa desligar o "Confirm email" do projeto, entao o
       outro projeto (IA TECK) continua intacto.

   VARIAVEIS DE AMBIENTE (precisa das duas)
     SUPABASE_URL                = https://xxxx.supabase.co
     SUPABASE_SERVICE_ROLE_KEY   = a chave service_role (SECRETA)

   Onde por:
     - Na Vercel: Settings > Environment Variables.
     - No seu PC (so para testar local): js/servidor.secreto.js
       (copie de js/servidor.secreto.example.js).
   ===================================================================== */

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* le o corpo da requisicao como JSON, funcionando tanto na Vercel (que ja
   pode ter montado req.body) quanto no servidor local (stream cru) */
async function lerCorpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return await new Promise((resolve) => {
    let bruto = "";
    req.on("data", (p) => {
      bruto += p;
      if (bruto.length > 10000) req.destroy();   /* trava anti-abuso */
    });
    req.on("end", () => {
      try { resolve(JSON.parse(bruto || "{}")); } catch (e) { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

function responder(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

module.exports = async function criarConta(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "METODO" });

  const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const chave = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !chave) return responder(res, 500, { erro: "SEM_CONFIG" });

  const corpo = await lerCorpo(req);
  const nome = String(corpo.nome || "").trim().replace(/\s+/g, " ");
  const email = String(corpo.email || "").trim().toLowerCase();
  const pin = String(corpo.pin || "");

  if (nome.length < 2 || !EMAIL_OK.test(email) || !/^\d{6}$/.test(pin)) {
    return responder(res, 400, { erro: "DADOS" });
  }

  let resp;
  try {
    resp = await fetch(url + "/auth/v1/admin/users", {
      method: "POST",
      headers: {
        "apikey": chave,
        "Authorization": "Bearer " + chave,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        password: pin,
        email_confirm: true,             /* <- o pulo do gato: ja confirmado */
        user_metadata: { nome: nome }
      })
    });
  } catch (e) {
    return responder(res, 502, { erro: "SUPABASE_OFF" });
  }

  if (resp.ok) return responder(res, 200, { ok: true });

  /* traduz o erro do Supabase para algo util ao site */
  let dados = {};
  try { dados = await resp.json(); } catch (e) {}
  const msg = String(
    dados.msg || dados.error_description || dados.error || dados.message || ""
  ).toLowerCase();

  if (msg.includes("password")) {
    return responder(res, 400, { erro: "PIN_FRACO" });
  }
  if (
    resp.status === 422 ||
    msg.includes("already been registered") ||
    msg.includes("already registered") ||
    msg.includes("already exists") ||
    msg.includes("exists")
  ) {
    return responder(res, 409, { erro: "EMAIL_EXISTE" });
  }
  return responder(res, 500, { erro: "FALHOU" });
};
