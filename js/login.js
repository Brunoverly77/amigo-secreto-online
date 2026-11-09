/* =====================================================================
   LOGIN — criar conta, entrar e recuperar o PIN.
   ===================================================================== */

(function () {
  if (!exigirConfig()) return;

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const proxima = params.get("proxima") || "index.html";

  /* para onde ir depois de entrar */
  function seguir() {
    location.replace(proxima);
  }

  /* ja logado? entao nem mostra o login, vai direto */
  Auth.usuario().then((u) => { if (u) seguir(); });

  /* se o email voltou confirmado (?confirmado=1), avisa */
  if (params.get("confirmado")) {
    aviso("Email confirmado! Agora é só entrar.", "certo");
  }

  /* ------------------------------------------------------- abas -- */
  const paineis = { entrar: "painel-entrar", criar: "painel-criar", esqueci: "painel-esqueci" };

  function mostrarAba(qual) {
    Object.values(paineis).forEach((id) => $(id).classList.add("escondido"));
    $(paineis[qual]).classList.remove("escondido");
    document.querySelectorAll(".aba").forEach((b) => {
      b.classList.toggle("ativa", b.dataset.aba === qual);
    });
    $("abas").classList.toggle("escondido", qual === "esqueci");
  }

  document.querySelectorAll(".aba").forEach((b) => {
    b.addEventListener("click", () => mostrarAba(b.dataset.aba));
  });
  $("btn-esqueci").addEventListener("click", () => mostrarAba("esqueci"));
  document.querySelectorAll("[data-voltar]").forEach((b) => {
    b.addEventListener("click", () => mostrarAba("entrar"));
  });

  /* só deixa número nos campos de PIN */
  ["entrar-pin", "criar-pin"].forEach((id) => {
    $(id).addEventListener("input", () => {
      $(id).value = $(id).value.replace(/\D/g, "").slice(0, 6);
    });
  });

  /* --------------------------------------------- mensagens de erro -- */
  function recadoAuth(erro) {
    const m = (erro && erro.message) || "";
    if (/Invalid login credentials/i.test(m)) return "Email ou PIN errado.";
    if (/Email not confirmed/i.test(m)) return "Confirme seu email primeiro — veja sua caixa de entrada (e o spam).";
    if (/already registered|already exists/i.test(m)) return "Esse email já tem conta. Use 'Entrar', ou 'Esqueci meu PIN'.";
    if (/rate limit|too many/i.test(m)) return "Muitas tentativas. Espere um minutinho e tente de novo.";
    if (/password/i.test(m) && /6/.test(m)) return "O PIN precisa ter 6 números.";
    if (/Failed to fetch|NetworkError/i.test(m)) return "Sem conexão. Confira sua internet.";
    console.error(erro);
    return "Algo deu errado. Tente de novo.";
  }

  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  /* --------------------------------------------------- CRIAR CONTA -- */
  $("form-criar").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const botao = $("btn-criar");
    const nome = $("criar-nome").value.trim().replace(/\s+/g, " ");
    const email = $("criar-email").value.trim();
    const pin = $("criar-pin").value;

    if (nome.length < 2) { aviso("Escreva seu nome.", "erro"); return; }
    if (!emailOk(email)) { aviso("Confira o email.", "erro"); return; }
    if (!/^\d{6}$/.test(pin)) { aviso("O PIN tem que ter 6 números.", "erro"); return; }

    ocupado(botao, true);

    /* cria a conta JA confirmada pela funcao do servidor (sem email).
       Assim a pessoa entra na hora e o projeto da IA TECK nao e tocado. */
    let resp, dados = {};
    try {
      resp = await fetch("/api/criar-conta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, pin })
      });
      try { dados = await resp.json(); } catch (e) {}
    } catch (e) {
      ocupado(botao, false);
      aviso("Sem conexão. Confira sua internet.", "erro");
      return;
    }

    if (!resp.ok) {
      ocupado(botao, false);
      if (dados.erro === "EMAIL_EXISTE") {
        mostrarAba("entrar");
        $("entrar-email").value = email;
        aviso("Esse email já tem conta. É só entrar (ou usar 'Esqueci meu PIN').", "erro");
      } else if (dados.erro === "DADOS") {
        aviso("Confira o nome, o email e o PIN.", "erro");
      } else if (dados.erro === "SEM_CONFIG") {
        aviso("O cadastro ainda não foi configurado no servidor.", "erro");
      } else {
        aviso("Não deu pra criar a conta agora. Tente de novo.", "erro");
      }
      return;
    }

    /* conta criada e ja confirmada: entra direto */
    const { error } = await db.auth.signInWithPassword({ email, password: pin });
    if (error) {
      ocupado(botao, false);
      aviso(recadoAuth(error), "erro");
      return;
    }

    Auth.guardarPreferencia(true);
    aviso("Conta criada! Bem-vindo(a), " + nome + ".", "certo");
    setTimeout(seguir, 500);
  });

  /* --------------------------------------------------------- ENTRAR -- */
  $("form-entrar").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const botao = $("btn-entrar");
    const email = $("entrar-email").value.trim();
    const pin = $("entrar-pin").value;

    if (!emailOk(email)) { aviso("Confira o email.", "erro"); return; }
    if (!/^\d{6}$/.test(pin)) { aviso("O PIN tem 6 números.", "erro"); return; }

    ocupado(botao, true);
    const { error } = await db.auth.signInWithPassword({ email, password: pin });

    if (error) { ocupado(botao, false); aviso(recadoAuth(error), "erro"); return; }

    Auth.guardarPreferencia($("lembrar").checked);
    seguir();
  });

  /* ------------------------------------------------------- ESQUECI -- */
  $("form-esqueci").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const botao = $("btn-enviar-reset");
    const email = $("esqueci-email").value.trim();

    if (!emailOk(email)) { aviso("Confira o email.", "erro"); return; }

    ocupado(botao, true);
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + "/nova-senha.html"
    });
    ocupado(botao, false);

    if (error) { aviso(recadoAuth(error), "erro"); return; }

    aviso("Pronto! Se o email tiver conta, o link chega em instantes.", "certo");
    mostrarAba("entrar");
  });
})();
