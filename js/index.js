/* =====================================================================
   PAGINA INICIAL — criar sala, entrar numa sala, listar salas visitadas.
   ===================================================================== */

(function () {
  if (!exigirConfig()) return;

  /* chegou aqui depois de apagar uma sala */
  const apagada = new URLSearchParams(location.search).get("apagada");
  if (apagada) {
    aviso("Sala " + apagada + " apagada. Ela sumiu para todo mundo.", "certo");
    history.replaceState(null, "", location.pathname);
  }

  const formCriar = document.getElementById("form-criar");
  const formEntrar = document.getElementById("form-entrar");
  const campoCodigo = document.getElementById("codigo");

  /* -------------------------------------------------- criar a sala -- */
  formCriar.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const botao = document.getElementById("btn-criar");
    const nome = document.getElementById("nome").value.trim();
    const data = document.getElementById("data").value || null;

    if (nome.length < 2) {
      aviso("Escreva seu nome com pelo menos 2 letras.", "erro");
      document.getElementById("nome").focus();
      return;
    }

    ocupado(botao, true);

    const { data: res, error } = await db.rpc("criar_sala", {
      p_nome: nome,
      p_data: data
    });

    if (error) {
      ocupado(botao, false);
      aviso(recado(error), "erro");
      return;
    }

    Memoria.gravar(res.codigo, {
      pid: res.participante_id,
      token: res.token,
      admin: res.admin_token,
      nome: nome
    });

    location.href = "sala.html?c=" + encodeURIComponent(res.codigo);
  });

  /* ------------------------------------------------ entrar na sala -- */
  campoCodigo.addEventListener("input", () => {
    campoCodigo.value = campoCodigo.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  });

  formEntrar.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const botao = document.getElementById("btn-entrar");
    const codigo = campoCodigo.value.trim().toUpperCase();

    if (codigo.length !== 6) {
      aviso("O codigo tem 6 caracteres.", "erro");
      campoCodigo.focus();
      return;
    }

    ocupado(botao, true);

    const { data: sala, error } = await db
      .from("salas")
      .select("codigo")
      .eq("codigo", codigo)
      .maybeSingle();

    ocupado(botao, false);

    if (error) {
      aviso(recado(error), "erro");
      return;
    }

    if (!sala) {
      aviso("Nao achei nenhuma sala com esse codigo. Confira as letras.", "erro");
      campoCodigo.focus();
      campoCodigo.select();
      return;
    }

    location.href = "sala.html?c=" + encodeURIComponent(codigo);
  });

  /* --------------------------------------------- salas deste celular -- */
  function minhasSalas() {
    const prefixo = "amigo-secreto-natal:";
    const achadas = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (!chave || !chave.startsWith(prefixo)) continue;
        const codigo = chave.slice(prefixo.length);
        let dados = {};
        try { dados = JSON.parse(localStorage.getItem(chave)) || {}; } catch (e) { dados = {}; }
        achadas.push({ codigo, admin: Boolean(dados.admin), nome: dados.nome || "" });
      }
    } catch (e) {
      return;
    }

    if (!achadas.length) return;

    const secao = document.getElementById("secao-minhas");
    const lista = document.getElementById("lista-minhas");

    lista.innerHTML = achadas
      .map((s) => `
        <li class="clicavel" data-codigo="${escapar(s.codigo)}">
          <span class="bolinha">&#127873;</span>
          <span class="nome" style="font-family:'Courier New',monospace;letter-spacing:.14em">${escapar(s.codigo)}</span>
          ${s.admin ? '<span class="selo">organizador</span>' : ""}
        </li>`)
      .join("");

    lista.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => {
        location.href = "sala.html?c=" + encodeURIComponent(li.dataset.codigo);
      });
    });

    secao.classList.remove("escondido");
  }

  minhasSalas();
})();
