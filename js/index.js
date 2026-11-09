/* =====================================================================
   PAGINA INICIAL — precisa de login. Criar sala, entrar numa sala e
   listar as salas da conta (de qualquer aparelho, vindo do banco).
   ===================================================================== */

(function () {
  if (!exigirConfig()) return;

  const $ = (id) => document.getElementById(id);
  const mostrar = (id, sim) => $(id).classList.toggle("escondido", !sim);

  /* chegou aqui depois de apagar uma sala */
  const apagada = new URLSearchParams(location.search).get("apagada");
  if (apagada) {
    aviso("Sala " + apagada + " apagada. Ela sumiu para todo mundo.", "certo");
    history.replaceState(null, "", location.pathname);
  }

  /* precisa estar logado; se nao estiver, vai pro login e volta pra ca */
  (async () => {
    const user = await Auth.exigir();
    if (!user) return;
    iniciar(user);
  })();

  async function iniciar(user) {
    /* saudacao com o nome da conta + botao sair */
    let nome = (user.user_metadata && user.user_metadata.nome) || "";
    try {
      const { data } = await db.from("perfis").select("nome").eq("id", user.id).single();
      if (data && data.nome) nome = data.nome;
    } catch (e) { /* segue com o nome do metadata */ }

    $("ola-nome").textContent = nome || "você";
    mostrar("barra-conta", true);
    $("btn-sair-conta").addEventListener("click", () => Auth.sair(true));

    ligarForms();
    carregarMinhasSalas(user);
  }

  function ligarForms() {
    /* -------------------------------------------- criar a sala -- */
    $("form-criar").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const botao = $("btn-criar");
      const data = $("data").value || null;

      ocupado(botao, true);
      const { data: res, error } = await db.rpc("criar_sala", { p_data: data });
      if (error) {
        ocupado(botao, false);
        aviso(recado(error), "erro");
        return;
      }
      location.href = "sala.html?c=" + encodeURIComponent(res.codigo);
    });

    /* -------------------------------------------- entrar na sala -- */
    const campoCodigo = $("codigo");
    campoCodigo.addEventListener("input", () => {
      campoCodigo.value = campoCodigo.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    });

    $("form-entrar").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const codigo = campoCodigo.value.trim().toUpperCase();
      if (codigo.length !== 6) {
        aviso("O código tem 6 caracteres.", "erro");
        campoCodigo.focus();
        return;
      }
      /* so leva pra sala; participar e um toque la dentro */
      location.href = "sala.html?c=" + encodeURIComponent(codigo);
    });
  }

  /* -------------------------------------- salas da minha conta -- */
  async function carregarMinhasSalas(user) {
    const { data, error } = await db
      .from("participantes")
      .select("eh_admin, salas ( codigo, nome_criador, data_festa, sorteada, criada_em )")
      .eq("user_id", user.id);

    if (error || !data) return;

    /* da mais nova pra mais antiga */
    const linhas = data
      .filter((p) => p.salas)
      .sort((a, b) => String(b.salas.criada_em || "").localeCompare(String(a.salas.criada_em || "")));

    if (!linhas.length) return;

    const lista = $("lista-minhas");
    lista.innerHTML = linhas
      .map((p) => {
        const s = p.salas;
        const estado = s.sorteada
          ? '<span class="selo cereja">sorteada</span>'
          : '<span class="selo menta">aberta</span>';
        const admin = p.eh_admin ? '<span class="selo">organizador</span>' : "";
        return `
          <li class="clicavel" data-codigo="${escapar(s.codigo)}">
            <span class="bolinha">&#127873;</span>
            <span class="nome" style="font-family:'Courier New',monospace;letter-spacing:.14em">${escapar(s.codigo)}</span>
            ${admin}${estado}
          </li>`;
      })
      .join("");

    lista.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => {
        location.href = "sala.html?c=" + encodeURIComponent(li.dataset.codigo);
      });
    });

    mostrar("secao-minhas", true);
  }
})();
