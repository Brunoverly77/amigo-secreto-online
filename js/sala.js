/* =====================================================================
   SALA — agora com LOGIN. Quem voce e vem da sua conta (auth), nao mais de
   uma chave guardada no aparelho. Por isso sumiu o link pessoal, o liberar
   nome e o recuperar: a pessoa entra em qualquer aparelho so com a conta.

   - Entrar na sala: um toque (o nome vem da conta).
   - Ver quem tirei: so quem esta logado como o proprio participante.
   O sorteio e as dicas continuam secretos, guardados no servidor.
   ===================================================================== */

(function () {
  if (!exigirConfig()) return;

  /* ---------------------------------------------------------- estado -- */
  const codigo = (new URLSearchParams(location.search).get("c") || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const baseUrl = location.href.split("#")[0].split("?")[0];
  const linkSala = baseUrl + "?c=" + codigo;

  let sala = null;        // linha da tabela salas
  let pessoas = [];       // quem ja entrou
  let eu = null;          // o participante que SOU nesta sala
  let canal = null;       // assinatura do tempo real
  let eraSorteada = null; // para avisar quando o sorteio acontecer
  let recarregando = null;
  let ultimoResultado = null;

  let meuId = null;       // id da conta logada (auth.uid)
  let meuNome = "";       // nome da conta, so para mostrar na tela

  const $ = (id) => document.getElementById(id);
  const mostrar = (id, sim) => $(id).classList.toggle("escondido", !sim);
  const ehAdmin = () => Boolean(sala && meuId && sala.admin_id === meuId);

  /* ====================================================== INICIO ===== */
  (async () => {
    const user = await Auth.exigir();   /* sem login, vai pro login e volta */
    if (!user) return;

    meuId = user.id;
    meuNome = (user.user_metadata && user.user_metadata.nome) || "";
    try {
      const { data } = await db.from("perfis").select("nome").eq("id", user.id).single();
      if (data && data.nome) meuNome = data.nome;
    } catch (e) { /* segue com o nome do metadata */ }

    ligarBotoes();
    carregar();
  })();

  /* ======================================================= CARREGAR == */
  async function carregar() {
    if (codigo.length !== 6) {
      return falhar("O link está incompleto. Peça para mandarem de novo no grupo.");
    }

    const { data: s, error } = await db
      .from("salas")
      .select("*")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) return falhar(recado(error));
    if (!s) return falhar("Esse código não existe. Confira o link que mandaram no grupo.");

    sala = s;

    const { data: ps, error: erroP } = await db
      .from("participantes")
      .select("*")
      .eq("sala_id", s.id)
      .order("criado_em", { ascending: true });

    if (erroP) return falhar(recado(erroP));

    pessoas = ps || [];
    desenhar();
    if (!canal) ligarTempoReal();
  }

  /* junta varios eventos do tempo real numa recarga so */
  function recarregarEmBreve() {
    clearTimeout(recarregando);
    recarregando = setTimeout(carregar, 180);
  }

  function falhar(texto) {
    mostrar("tela-carregando", false);
    mostrar("tela-sala", false);
    mostrar("tela-erro", true);
    $("texto-erro").textContent = texto;
    $("subtitulo-sala").textContent = "Não foi possível abrir a sala";
  }

  /* ======================================================== DESENHAR == */
  function desenhar() {
    mostrar("tela-carregando", false);
    mostrar("tela-erro", false);
    mostrar("tela-sala", true);

    eu = pessoas.find((p) => p.user_id === meuId) || null;

    const travada = sala.sorteada;

    /* ------------------------------------------- topo e informacoes -- */
    $("codigo-sala").textContent = sala.codigo;
    $("titulo-sala").textContent = "Amigo Secreto";
    $("subtitulo-sala").textContent = eu
      ? "Você está nesta sala como " + eu.nome
      : "Sala criada por " + sala.nome_criador;

    const etiquetas = [
      `<span class="etiqueta">&#128101; ${pessoas.length} ${pessoas.length === 1 ? "pessoa" : "pessoas"}</span>`
    ];
    if (sala.data_festa) {
      etiquetas.push(`<span class="etiqueta">&#128197; ${dataBonita(sala.data_festa)}</span>`);
    }
    etiquetas.push(
      travada
        ? '<span class="etiqueta cereja">&#128274; Sorteada</span>'
        : '<span class="etiqueta menta">&#9989; Aberta</span>'
    );
    $("faixa-info").innerHTML = etiquetas.join("");
    $("contador-pessoas").textContent = pessoas.length;

    /* ---------------------------------------------- avisa o sorteio -- */
    if (eraSorteada === false && travada) {
      aviso("O sorteio foi realizado!", "certo");
    }
    eraSorteada = travada;

    mostrar("aviso-travada", travada);

    /* ----------------------------------------------- participar ----- */
    /* So aparece para quem ainda nao entrou, e so enquanto a sala
       estiver aberta. Depois do sorteio ninguem mais entra. */
    mostrar("secao-entrar", !eu && !travada);
    if (!eu && !travada) $("entrar-como").textContent = meuNome || "você";

    /* -------------------------------------------- lista de quem entrou */
    desenharParticipantes(travada);

    $("ajuda-lista").textContent = travada
      ? "A lista travou no sorteio. Estes são os participantes definitivos."
      : "A lista cresce sozinha conforme o pessoal vai entrando. Aparece na hora no celular de todos.";

    /* ---------------------------------------------------- minha dica -- */
    mostrar("secao-dica", Boolean(eu && !travada));
    if (eu && !travada) carregarMinhaDica();

    /* ------------------------------------------------- revelacao -- */
    mostrar("secao-revelar", Boolean(travada && eu));
    if (travada && eu) {
      $("texto-revelar").innerHTML = eu.viu_resultado
        ? "Você já abriu uma vez. Pode ver de novo quantas vezes quiser &mdash; vai ser sempre a mesma pessoa."
        : "Toque no presente e descubra quem você tirou.";
    }

    /* --------------------------------------------------- sorteio -- */
    const podeSortear = !travada && ehAdmin();
    mostrar("secao-sortear", podeSortear);
    if (podeSortear) {
      const faltam = 3 - pessoas.length;
      $("btn-sortear").disabled = pessoas.length < 3;
      $("ajuda-sortear").innerHTML =
        pessoas.length < 3
          ? `Já entraram <strong>${pessoas.length}</strong>. Faltam <strong>${faltam}</strong>
             ${faltam === 1 ? "pessoa" : "pessoas"} para dar o mínimo de 3.`
          : `Já entraram <strong>${pessoas.length} pessoas</strong>. Confira se não falta
             ninguém: quem não entrou até agora vai ficar de fora.`;
    }

    /* -------------------------------------------- painel do admin -- */
    mostrar("secao-admin", ehAdmin());
    if (ehAdmin()) desenharAdmin(travada);

    /* ------------------------------------------- cancelar a sala -- */
    mostrar("secao-perigo", ehAdmin());
    if (ehAdmin()) {
      const alguemViu = pessoas.some((p) => p.viu_resultado);
      const podeDesfazer = travada && !alguemViu;

      mostrar("btn-reabrir", podeDesfazer);

      $("ajuda-perigo").innerHTML = !travada
        ? "Desistiu do amigo secreto? Você pode apagar a sala. Ela some para todo mundo."
        : podeDesfazer
          ? `Esqueceu de esperar alguém? Como <strong>ninguém abriu o resultado ainda</strong>,
             dá para desfazer o sorteio, esperar o pessoal que falta e sortear de novo.`
          : `Alguém já abriu o resultado, então não dá mais para desfazer o sorteio
             &mdash; seria injusto com quem já viu. Se precisar recomeçar, apague a
             sala e crie outra.`;
    }

    mostrar("btn-sair", Boolean(eu && !travada && !eu.eh_admin));
  }

  /* ------------------------------------------- lista de quem ja entrou */
  function desenharParticipantes(travada) {
    const lista = $("lista-participantes");

    if (!pessoas.length) {
      lista.innerHTML = `
        <li style="display:block">
          <div class="vazio">
            <span class="icone">&#127876;</span>
            Ninguém entrou ainda.<br>Mande o link no grupo para o pessoal começar.
          </div>
        </li>`;
      return;
    }

    lista.innerHTML = pessoas
      .map((p) => {
        const souEu = eu && eu.id === p.id;
        const selos = [];
        if (p.eh_admin) selos.push('<span class="selo">organizador</span>');
        if (travada && p.viu_resultado) selos.push('<span class="selo menta">já viu</span>');

        return `
          <li class="${souEu ? "eu" : ""}">
            <span class="bolinha">${escapar(inicial(p.nome))}</span>
            <span class="nome">${escapar(p.nome)}${souEu ? " <span style='opacity:.6;font-weight:400'>(você)</span>" : ""}</span>
            ${selos.join("")}
          </li>`;
      })
      .join("");
  }

  /* -------------------------------------------- painel do organizador -- */
  function desenharAdmin(travada) {
    const lista = $("lista-admin");

    $("ajuda-admin").innerHTML = travada
      ? `Você vê quem já abriu o resultado, mas nunca quem tirou quem. Nem você
         consegue espiar &mdash; isso fica guardado no servidor.`
      : `Se alguém entrou por engano, use o <strong>&times;</strong> ao lado para
         tirar da lista. Quem sair pode entrar de novo a qualquer momento.`;

    if (!pessoas.length) {
      lista.innerHTML = '<li style="display:block"><div class="vazio">Ninguém entrou ainda.</div></li>';
      return;
    }

    lista.innerHTML = pessoas
      .map((p) => {
        const estado = travada
          ? p.viu_resultado
            ? '<span class="selo menta">já viu</span>'
            : '<span class="selo cinza">não viu</span>'
          : '<span class="selo menta">entrou</span>';

        const tirar =
          !travada && !p.eh_admin
            ? `<button class="remover" data-remover="${p.id}"
                 title="Tirar ${escapar(p.nome)} da lista"
                 aria-label="Tirar ${escapar(p.nome)} da lista">&times;</button>`
            : "";

        return `
          <li>
            <span class="bolinha">${escapar(inicial(p.nome))}</span>
            <span class="nome">${escapar(p.nome)}</span>
            ${estado}
            ${tirar}
          </li>`;
      })
      .join("");

    lista.querySelectorAll("[data-remover]").forEach((b) => {
      b.addEventListener("click", () => remover(b.dataset.remover));
    });
  }

  /* ===================================================== TEMPO REAL == */
  function ligarTempoReal() {
    canal = db
      .channel("sala:" + sala.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participantes", filter: "sala_id=eq." + sala.id },
        recarregarEmBreve
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "salas", filter: "id=eq." + sala.id },
        recarregarEmBreve
      )
      .subscribe();
  }

  /* ========================================================== ACOES == */
  function ligarBotoes() {
    /* ---------------------------------------------- participar ----- */
    $("btn-participar").addEventListener("click", async () => {
      const botao = $("btn-participar");
      ocupado(botao, true);

      const { error } = await db.rpc("entrar_na_sala", { p_codigo: codigo });

      ocupado(botao, false);
      if (error) {
        aviso(recado(error), "erro");
        return;
      }
      aviso("Pronto, você está na lista!", "certo");
      carregar();
    });

    /* ------------------------------------------------- sair da sala -- */
    $("btn-sair").addEventListener("click", async () => {
      const { error } = await db.rpc("sair_da_sala", { p_sala_id: sala.id });
      if (error) {
        aviso(recado(error), "erro");
        return;
      }
      aviso("Você saiu da sala. Pode entrar de novo quando quiser.", "certo");
      carregar();
    });

    /* ------------------------------------------------- minha dica -- */
    $("dica-editar").addEventListener("input", () => {
      $("conta-dica-editar").textContent = $("dica-editar").value.length;
    });
    $("btn-editar-dica").addEventListener("click", () => abrirModal("modal-dica"));
    $("btn-salvar-dica").addEventListener("click", salvarDica);

    /* ---------------------------------------------------- o sorteio -- */
    $("btn-sortear").addEventListener("click", () => {
      $("resumo-sortear").innerHTML =
        `Vou sortear entre as <strong>${pessoas.length} pessoas</strong> que já entraram.`;
      abrirModal("modal-sortear");
    });
    $("btn-confirmar-sorteio").addEventListener("click", confirmarSorteio);

    /* -------------------------------------------- ver quem eu tirei -- */
    $("btn-revelar").addEventListener("click", pedirRevelacao);
    $("presente").addEventListener("click", pedirRevelacao);
    $("presente").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        pedirRevelacao();
      }
    });
    $("btn-estou-sozinho").addEventListener("click", revelar);
    $("btn-resultado-whatsapp").addEventListener("click", mandarResultadoWhatsapp);

    /* ------------------------------------------- desfazer o sorteio -- */
    $("btn-reabrir").addEventListener("click", () => abrirModal("modal-reabrir"));
    $("btn-confirmar-reabrir").addEventListener("click", confirmarReabrir);

    /* ------------------------------------------------ apagar a sala -- */
    $("btn-apagar").addEventListener("click", () => {
      $("confirma-codigo").value = "";
      $("btn-confirmar-apagar").disabled = true;
      abrirModal("modal-apagar");
    });
    $("confirma-codigo").addEventListener("input", () => {
      const campo = $("confirma-codigo");
      campo.value = campo.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      $("btn-confirmar-apagar").disabled = campo.value !== codigo;
    });
    $("btn-confirmar-apagar").addEventListener("click", confirmarApagar);

    /* ---------------------------------------------------- compartilhar -- */
    $("btn-whatsapp").addEventListener("click", () => {
      window.open("https://wa.me/?text=" + encodeURIComponent(textoConvite()), "_blank", "noopener");
    });
    $("btn-copiar").addEventListener("click", copiarLink);

    /* ------------------------------------------------ fechar modais -- */
    document.querySelectorAll("[data-fechar]").forEach((botao) => {
      botao.addEventListener("click", () => fecharModal(botao.dataset.fechar));
    });
  }

  /* ------------------------------ organizador tira alguem da lista -- */
  async function remover(id) {
    const pessoa = pessoas.find((p) => p.id === id);

    const { error } = await db.rpc("remover_participante", {
      p_sala_id: sala.id,
      p_participante_id: id
    });

    if (error) {
      aviso(recado(error), "erro");
      return;
    }
    aviso((pessoa ? pessoa.nome : "A pessoa") + " saiu da lista.", "certo");
    carregar();
  }

  /* ------------------------------------------------- minha dica -- */
  async function carregarMinhaDica() {
    const { data: res, error } = await db.rpc("minha_dica", { p_sala_id: sala.id });
    if (error) return;

    const temDica = Boolean(res && res.dica);
    $("dica-atual").classList.toggle("escondido", !temDica);
    if (temDica) {
      $("dica-atual").innerHTML = "<strong>Sua dica de agora</strong>" + escapar(res.dica);
      $("dica-editar").value = res.dica;
      $("conta-dica-editar").textContent = res.dica.length;
    }
  }

  async function salvarDica() {
    const botao = $("btn-salvar-dica");
    ocupado(botao, true);

    const { error } = await db.rpc("definir_dica", {
      p_sala_id: sala.id,
      p_dica: $("dica-editar").value.trim() || null
    });

    ocupado(botao, false);
    if (error) {
      aviso(recado(error), "erro");
      return;
    }
    fecharModal("modal-dica");
    aviso("Dica salva! Só quem te tirar vai ler.", "certo");
    carregarMinhaDica();
  }

  /* ---------------------------------------------------- o sorteio -- */
  async function confirmarSorteio() {
    const botao = $("btn-confirmar-sorteio");
    ocupado(botao, true);

    const { error } = await db.rpc("realizar_sorteio", { p_sala_id: sala.id });

    ocupado(botao, false);
    fecharModal("modal-sortear");
    if (error) {
      aviso(recado(error), "erro");
      carregar();
      return;
    }
    aviso("Sorteio feito! Avise o grupo para abrirem o link.", "certo");
    carregar();
  }

  /* -------------------------------------------- ver quem eu tirei -- */
  function pedirRevelacao() {
    if (!eu) return;
    abrirModal("modal-aviso");
  }

  async function revelar() {
    const botao = $("btn-estou-sozinho");
    ocupado(botao, true);

    const { data: res, error } = await db.rpc("ver_resultado", { p_sala_id: sala.id });

    ocupado(botao, false);
    fecharModal("modal-aviso");
    if (error) {
      aviso(recado(error), "erro");
      return;
    }

    $("nome-sorteado").textContent = res.nome;
    const temDica = Boolean(res.dica);
    $("dica-sorteado").classList.toggle("escondido", !temDica);
    if (temDica) $("texto-dica-sorteado").textContent = res.dica;

    ultimoResultado = res;
    abrirModal("modal-resultado");
    carregar();
  }

  function mandarResultadoWhatsapp() {
    if (!ultimoResultado) return;

    const partes = [
      "🎁 Amigo secreto (sala " + codigo + ")",
      "",
      "Eu tirei: " + ultimoResultado.nome
    ];
    if (ultimoResultado.dica) partes.push("", "A dica dela: " + ultimoResultado.dica);
    if (sala && sala.data_festa) partes.push("", "Festa em " + dataBonita(sala.data_festa));
    partes.push("", "Segredo! Não contar para ninguém.");

    window.open("https://wa.me/?text=" + encodeURIComponent(partes.join("\n")), "_blank", "noopener");
  }

  /* ------------------------------------------- desfazer o sorteio -- */
  async function confirmarReabrir() {
    const botao = $("btn-confirmar-reabrir");
    ocupado(botao, true);

    const { error } = await db.rpc("reabrir_sala", { p_sala_id: sala.id });

    ocupado(botao, false);
    fecharModal("modal-reabrir");
    if (error) {
      aviso(recado(error), "erro");
      carregar();
      return;
    }
    eraSorteada = null; /* nao avisar "sorteio realizado" por engano */
    aviso("Sorteio desfeito. A sala voltou a aceitar gente nova.", "certo");
    carregar();
  }

  /* ------------------------------------------------ apagar a sala -- */
  async function confirmarApagar() {
    const botao = $("btn-confirmar-apagar");
    if ($("confirma-codigo").value !== codigo) return;

    ocupado(botao, true);
    const { error } = await db.rpc("apagar_sala", { p_sala_id: sala.id });

    if (error) {
      ocupado(botao, false);
      aviso(recado(error), "erro");
      return;
    }
    location.href = "index.html?apagada=" + encodeURIComponent(codigo);
  }

  /* ---------------------------------------------------- compartilhar -- */
  function textoConvite() {
    const partes = [
      "🎄 Amigo Secreto!",
      "",
      "Abra este link, entre com sua conta (ou crie em 10s) e participe:",
      linkSala,
      "",
      "Ou use o código: " + codigo,
      "",
      "Quem não entrar fica de fora do sorteio."
    ];
    if (sala && sala.data_festa) partes.push("Data da festa: " + dataBonita(sala.data_festa));
    return partes.join("\n");
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkSala);
      aviso("Link copiado! Agora cole no grupo.", "certo");
    } catch (e) {
      const campo = document.createElement("input");
      campo.value = linkSala;
      document.body.appendChild(campo);
      campo.select();
      try {
        document.execCommand("copy");
        aviso("Link copiado!", "certo");
      } catch (e2) {
        aviso("Não deu para copiar. O link é: " + linkSala, "erro");
      }
      campo.remove();
    }
  }
})();
