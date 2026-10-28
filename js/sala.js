/* =====================================================================
   SALA — cada um entra com o proprio nome, pelo proprio celular.

   Nao existe "adicionar fulano": quem nao abriu o link nao esta na lista,
   e por isso nao entra no sorteio. A identidade de cada pessoa e uma
   chave secreta guardada no celular dela, criada na hora de entrar.
   ===================================================================== */

(function () {
  if (!exigirConfig()) return;

  /* ---------------------------------------------------------- estado -- */
  const codigo = (new URLSearchParams(location.search).get("c") || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const baseUrl = location.href.split("#")[0].split("?")[0];
  const linkSala = baseUrl + "?c=" + codigo;

  /* O link pessoal leva a identidade dentro: e por ele que a pessoa volta
     num aparelho novo. E de uso unico - ao ser usado, a chave troca. */
  const meuLink = () => {
    const g = mem();
    return g.pid && g.token ? `${baseUrl}?c=${codigo}&eu=${g.pid}.${g.token}` : null;
  };

  /* identidade vinda pela URL, se a pessoa abriu um link pessoal */
  const convite = (new URLSearchParams(location.search).get("eu") || "").split(".");
  const conviteValido = convite.length === 2 && convite[0].length > 20 && convite[1].length > 20;

  /* tira a chave da barra de endereco, para nao ficar exposta nem ir
     parar num print sem a pessoa perceber */
  function limparUrl() {
    history.replaceState(null, "", `${location.pathname}?c=${codigo}`);
  }

  let sala = null;        // linha da tabela salas
  let pessoas = [];       // quem ja entrou
  let eu = null;          // o participante que este celular e
  let canal = null;       // assinatura do tempo real
  let eraSorteada = null; // para avisar quando o sorteio acontecer
  let recarregando = null;

  const mem = () => Memoria.ler(codigo);
  const ehAdmin = () => Boolean(mem().admin);

  const $ = (id) => document.getElementById(id);
  const mostrar = (id, sim) => $(id).classList.toggle("escondido", !sim);

  /* ======================================================= CARREGAR == */
  async function carregar() {
    if (codigo.length !== 6) {
      return falhar("O link esta incompleto. Peca para mandarem de novo no grupo.");
    }

    const { data: s, error } = await db
      .from("salas")
      .select("*")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) return falhar(recado(error));
    if (!s) return falhar("Esse codigo nao existe. Confira o link que mandaram no grupo.");

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
    conferirConvite();
  }

  /* ============================= LINK PESSOAL (convite na URL) ====== */
  let conviteJaTratado = false;

  function conferirConvite() {
    if (!conviteValido || conviteJaTratado) return;
    conviteJaTratado = true;

    const [pid] = convite;
    const dono = pessoas.find((p) => p.id === pid);

    /* o link aponta para alguem que nao esta mais na sala */
    if (!dono) {
      limparUrl();
      aviso("Esse link nao vale mais: a pessoa nao esta na lista.", "erro");
      return;
    }

    /* ja e este aparelho: nao precisa gastar o link */
    if (mem().pid === pid) {
      limparUrl();
      return;
    }

    $("nome-assumir").textContent = dono.nome;
    abrirModal("modal-assumir");
  }

  $("btn-confirmar-assumir").addEventListener("click", async () => {
    const botao = $("btn-confirmar-assumir");
    ocupado(botao, true);

    const { data: res, error } = await db.rpc("assumir_link", {
      p_participante_id: convite[0],
      p_token: convite[1]
    });

    ocupado(botao, false);
    fecharModal("modal-assumir");
    limparUrl();

    if (error) {
      aviso(recado(error), "erro");
      return;
    }

    Memoria.gravar(codigo, { pid: res.participante_id, token: res.token, nome: res.nome });
    mostrarMeuLink("Pronto, voce voltou! <strong>Seu link mudou</strong> por segurança: guarde o novo, o antigo nao vale mais.");
    aviso("Boas-vindas de volta, " + res.nome + "!", "certo");
    carregar();
  });

  /* mostra o cartao do link pessoal, com um texto de abertura */
  function mostrarMeuLink(texto) {
    if (!meuLink()) return;
    if (texto) $("ajuda-meu-link").innerHTML = texto;
    mostrar("secao-meu-link", true);
    $("secao-meu-link").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* Junta varios eventos do tempo real numa recarga so. */
  function recarregarEmBreve() {
    clearTimeout(recarregando);
    recarregando = setTimeout(carregar, 180);
  }

  function falhar(texto) {
    mostrar("tela-carregando", false);
    mostrar("tela-sala", false);
    mostrar("tela-erro", true);
    $("texto-erro").textContent = texto;
    $("subtitulo-sala").textContent = "Nao foi possivel abrir a sala";
  }

  /* ======================================================== DESENHAR == */
  function desenhar() {
    mostrar("tela-carregando", false);
    mostrar("tela-erro", false);
    mostrar("tela-sala", true);

    const guardado = mem();
    eu = pessoas.find((p) => p.id === guardado.pid) || null;

    /* saiu da lista, ou o organizador liberou o nome para outro celular */
    if (guardado.pid && !eu) Memoria.gravar(codigo, { pid: null, token: null });
    if (eu && eu.liberado) {
      Memoria.gravar(codigo, { pid: null, token: null });
      eu = null;
    }

    const travada = sala.sorteada;

    /* ------------------------------------------- topo e informacoes -- */
    $("codigo-sala").textContent = sala.codigo;
    $("titulo-sala").textContent = "Amigo Secreto";
    $("subtitulo-sala").textContent = eu
      ? "Voce esta nesta sala como " + eu.nome
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

    /* ----------------------------------------------- entrar na sala -- */
    /* So aparece para quem ainda nao entrou, e so enquanto a sala
       estiver aberta. Depois do sorteio ninguem mais entra. */
    mostrar("secao-entrar", !eu && !travada);

    /* o cartao do link pessoal so faz sentido para quem esta na sala */
    if (!eu) mostrar("secao-meu-link", false);
    mostrar("cartao-convite", !travada);

    /* ------------------------------- nomes liberados para recuperar -- */
    desenharLiberados(travada);

    /* -------------------------------------------- lista de quem entrou */
    desenharParticipantes(travada);

    $("ajuda-lista").textContent = travada
      ? "A lista travou no sorteio. Estes sao os participantes definitivos."
      : "A lista cresce sozinha conforme o pessoal vai abrindo o link. Aparece na hora no celular de todos.";

    /* ---------------------------------------------------- minha dica -- */
    mostrar("secao-dica", Boolean(eu && !travada));
    if (eu && !travada) carregarMinhaDica();

    /* ------------------------------------------------- revelacao -- */
    mostrar("secao-revelar", Boolean(travada && eu));
    if (travada && eu) {
      $("texto-revelar").innerHTML = eu.viu_resultado
        ? "Voce ja abriu uma vez. Pode ver de novo quantas vezes quiser &mdash; vai ser sempre a mesma pessoa."
        : "Toque no presente e descubra quem voce tirou.";
    }

    /* --------------------------------------------------- sorteio -- */
    const podeSortear = !travada && ehAdmin();
    mostrar("secao-sortear", podeSortear);
    if (podeSortear) {
      const faltam = 3 - pessoas.length;
      $("btn-sortear").disabled = pessoas.length < 3;
      $("ajuda-sortear").innerHTML =
        pessoas.length < 3
          ? `Ja entraram <strong>${pessoas.length}</strong>. Faltam <strong>${faltam}</strong>
             ${faltam === 1 ? "pessoa" : "pessoas"} para dar o minimo de 3.`
          : `Ja entraram <strong>${pessoas.length} pessoas</strong>. Confira se nao falta
             ninguem: quem nao abriu o link ate agora vai ficar de fora.`;
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
        ? "Desistiu do amigo secreto? Voce pode apagar a sala. Ela some para todo mundo."
        : podeDesfazer
          ? `Esqueceu de esperar alguem? Como <strong>ninguem abriu o resultado ainda</strong>,
             da para desfazer o sorteio, esperar o pessoal que falta e sortear de novo.`
          : `Alguem ja abriu o resultado, entao nao da mais para desfazer o sorteio
             &mdash; seria injusto com quem ja viu. Se precisar recomecar, apague a
             sala e crie outra.`;
    }

    mostrar("btn-sair", Boolean(eu && !travada && !eu.eh_admin));

    /* o link pessoal tem que estar sempre a mao, nao so na hora de entrar:
       quem ja esta na sala e vai trocar de celular precisa pegar o dele */
    mostrar("btn-meu-acesso", Boolean(eu));
  }

  /* ------------------------------------------- lista de quem ja entrou */
  function desenharParticipantes(travada) {
    const lista = $("lista-participantes");

    if (!pessoas.length) {
      lista.innerHTML = `
        <li style="display:block">
          <div class="vazio">
            <span class="icone">&#127876;</span>
            Ninguem entrou ainda.<br>Mande o link no grupo para o pessoal comecar.
          </div>
        </li>`;
      return;
    }

    lista.innerHTML = pessoas
      .map((p) => {
        const souEu = eu && eu.id === p.id;
        const selos = [];
        if (p.eh_admin) selos.push('<span class="selo">organizador</span>');
        if (p.liberado) selos.push('<span class="selo cinza">aguardando</span>');
        if (travada && p.viu_resultado) selos.push('<span class="selo menta">ja viu</span>');

        return `
          <li class="${souEu ? "eu" : ""}">
            <span class="bolinha">${escapar(inicial(p.nome))}</span>
            <span class="nome">${escapar(p.nome)}${souEu ? " <span style='opacity:.6;font-weight:400'>(voce)</span>" : ""}</span>
            ${selos.join("")}
          </li>`;
      })
      .join("");
  }

  /* -------------------------- nomes que o organizador liberou (recuperar) */
  function desenharLiberados(travada) {
    const liberados = pessoas.filter((p) => p.liberado);

    if (eu || !liberados.length) {
      mostrar("aviso-liberado", false);
      return;
    }

    $("texto-liberado").innerHTML =
      `<strong>Perdeu o acesso?</strong> O organizador liberou
       ${liberados.length === 1 ? "este nome" : "estes nomes"}. Se for voce, toque para
       reassumir neste celular: ` +
      liberados
        .map((p) => `<button class="btn btn-fantasma btn-pequeno" style="margin:6px 6px 0 0"
                       data-recuperar="${p.id}">${escapar(p.nome)}</button>`)
        .join("");

    mostrar("aviso-liberado", true);

    /* continua valendo depois do sorteio: e o unico jeito de a pessoa
       ver o resultado dela num celular novo */
    $("aviso-liberado").querySelectorAll("[data-recuperar]").forEach((botao) => {
      botao.addEventListener("click", () => recuperar(botao.dataset.recuperar));
    });
  }

  /* -------------------------------------------- painel do organizador -- */
  function desenharAdmin(travada) {
    const lista = $("lista-admin");

    $("ajuda-admin").innerHTML = travada
      ? `Voce ve quem ja abriu o resultado, mas nunca quem tirou quem. Nem voce
         consegue espiar &mdash; isso fica guardado no servidor. Se alguem perdeu
         o celular, use o <strong>&#8634;</strong> para liberar o nome dela.`
      : `Se alguem entrou com o nome errado, ou perdeu o acesso, use os botoes
         ao lado. O <strong>&times;</strong> tira da lista, o <strong>&#8634;</strong>
         libera o nome para a pessoa reassumir noutro celular.`;

    if (!pessoas.length) {
      lista.innerHTML = '<li style="display:block"><div class="vazio">Ninguem entrou ainda.</div></li>';
      return;
    }

    lista.innerHTML = pessoas
      .map((p) => {
        const estado = travada
          ? p.viu_resultado
            ? '<span class="selo menta">ja viu</span>'
            : '<span class="selo cinza">nao viu</span>'
          : p.liberado
            ? '<span class="selo cinza">liberado</span>'
            : '<span class="selo menta">entrou</span>';

        const liberar = p.liberado
          ? ""
          : `<button class="remover" data-liberar="${p.id}"
               title="Liberar o nome de ${escapar(p.nome)} para outro celular"
               aria-label="Liberar o nome de ${escapar(p.nome)}">&#8634;</button>`;

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
            ${liberar}
            ${tirar}
          </li>`;
      })
      .join("");

    lista.querySelectorAll("[data-liberar]").forEach((b) => {
      b.addEventListener("click", () => liberar(b.dataset.liberar));
    });
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

  /* --------------------------------------------- entrar com meu nome -- */
  $("minha-dica").addEventListener("input", () => {
    $("conta-entrar").textContent = $("minha-dica").value.length;
  });

  $("form-entrar").addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const campo = $("meu-nome");
    const botao = $("btn-entrar");
    const nome = campo.value.trim().replace(/\s+/g, " ");

    if (nome.length < 2) {
      aviso("Escreva o seu nome com pelo menos 2 letras.", "erro");
      campo.focus();
      return;
    }

    ocupado(botao, true);

    const { data: res, error } = await db.rpc("entrar_na_sala", {
      p_codigo: codigo,
      p_nome: nome
    });

    if (error) {
      ocupado(botao, false);
      aviso(recado(error), "erro");
      if (String(error.message || "").includes("NOME_REPETIDO")) {
        campo.focus();
        campo.select();
      }
      return;
    }

    Memoria.gravar(codigo, { pid: res.participante_id, token: res.token, nome });

    /* a dica e opcional, e so e salva se a pessoa escreveu algo */
    const dica = $("minha-dica").value.trim();
    if (dica) {
      await db.rpc("definir_dica", {
        p_participante_id: res.participante_id,
        p_token: res.token,
        p_dica: dica
      });
    }

    ocupado(botao, false);
    campo.value = "";
    $("minha-dica").value = "";
    $("conta-entrar").textContent = "0";

    aviso("Pronto, voce esta na lista!", "certo");
    carregar();

    /* logo depois de entrar e a melhor hora para ela guardar o acesso */
    setTimeout(() => mostrarMeuLink(null), 600);
  });

  /* ------------------------------------- guardar o link pessoal -- */
  $("btn-link-whatsapp").addEventListener("click", () => {
    const link = meuLink();
    if (!link) return;

    const texto = [
      "🔑 Meu acesso ao amigo secreto (sala " + codigo + ")",
      "",
      "Se eu trocar de celular, volto por aqui:",
      link,
      "",
      "Este link e so meu, nao mandar para ninguem."
    ].join("\n");

    window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
  });

  $("btn-link-copiar").addEventListener("click", async () => {
    const link = meuLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      aviso("Link copiado. Guarde num lugar so seu.", "certo");
    } catch (e) {
      aviso("Nao deu para copiar. Use o botao do WhatsApp.", "erro");
    }
  });

  $("btn-link-guardei").addEventListener("click", () => mostrar("secao-meu-link", false));

  $("btn-meu-acesso").addEventListener("click", () => {
    mostrarMeuLink(
      "Mande este link para voce mesmo no WhatsApp. E por ele que voce abre esta " +
      "sala em outro celular, em outro navegador ou numa aba anonima, continuando " +
      "sendo voce."
    );
  });

  /* ------------------------------------------------- sair da sala -- */
  $("btn-sair").addEventListener("click", async () => {
    const guardado = mem();

    const { error } = await db.rpc("sair_da_sala", {
      p_participante_id: guardado.pid,
      p_token: guardado.token
    });

    if (error) {
      aviso(recado(error), "erro");
      return;
    }

    Memoria.gravar(codigo, { pid: null, token: null });
    aviso("Voce saiu da sala. Pode entrar de novo quando quiser.", "certo");
    carregar();
  });

  /* ------------------------------ organizador tira alguem da lista -- */
  async function remover(id) {
    const pessoa = pessoas.find((p) => p.id === id);

    const { error } = await db.rpc("remover_participante", {
      p_sala_id: sala.id,
      p_admin_token: mem().admin,
      p_participante_id: id
    });

    if (error) {
      aviso(recado(error), "erro");
      return;
    }

    aviso((pessoa ? pessoa.nome : "A pessoa") + " saiu da lista.", "certo");
    carregar();
  }

  /* ------------------------- organizador libera um nome (celular novo) */
  async function liberar(id) {
    const pessoa = pessoas.find((p) => p.id === id);

    const { error } = await db.rpc("liberar_nome", {
      p_sala_id: sala.id,
      p_admin_token: mem().admin,
      p_participante_id: id
    });

    if (error) {
      aviso(recado(error), "erro");
      return;
    }

    aviso(
      "Nome de " + (pessoa ? pessoa.nome : "participante") +
        " liberado. Peca para ela abrir o link e tocar no proprio nome.",
      "certo"
    );
    carregar();
  }

  /* ----------------------------- a pessoa reassume o nome liberado -- */
  async function recuperar(id) {
    const { data: res, error } = await db.rpc("recuperar_nome", {
      p_participante_id: id
    });

    if (error) {
      aviso(recado(error), "erro");
      carregar();
      return;
    }

    Memoria.gravar(codigo, { pid: res.participante_id, token: res.token });
    aviso("Boas-vindas de volta!", "certo");
    carregar();
  }

  /* ------------------------------------------------- minha dica -- */
  async function carregarMinhaDica() {
    const guardado = mem();

    const { data: res, error } = await db.rpc("minha_dica", {
      p_participante_id: guardado.pid,
      p_token: guardado.token
    });

    if (error) return;

    const temDica = Boolean(res && res.dica);
    $("dica-atual").classList.toggle("escondido", !temDica);
    if (temDica) {
      $("dica-atual").innerHTML =
        "<strong>Sua dica de agora</strong>" + escapar(res.dica);
      $("dica-editar").value = res.dica;
      $("conta-dica-editar").textContent = res.dica.length;
    }
  }

  $("dica-editar").addEventListener("input", () => {
    $("conta-dica-editar").textContent = $("dica-editar").value.length;
  });

  $("btn-editar-dica").addEventListener("click", () => abrirModal("modal-dica"));

  $("btn-salvar-dica").addEventListener("click", async () => {
    const botao = $("btn-salvar-dica");
    const guardado = mem();

    ocupado(botao, true);

    const { error } = await db.rpc("definir_dica", {
      p_participante_id: guardado.pid,
      p_token: guardado.token,
      p_dica: $("dica-editar").value.trim() || null
    });

    ocupado(botao, false);

    if (error) {
      aviso(recado(error), "erro");
      return;
    }

    fecharModal("modal-dica");
    aviso("Dica salva! So quem te tirar vai ler.", "certo");
    carregarMinhaDica();
  });

  /* ---------------------------------------------------- o sorteio -- */
  $("btn-sortear").addEventListener("click", () => {
    $("resumo-sortear").innerHTML =
      `Vou sortear entre as <strong>${pessoas.length} pessoas</strong> que ja entraram.`;
    abrirModal("modal-sortear");
  });

  $("btn-confirmar-sorteio").addEventListener("click", async () => {
    const botao = $("btn-confirmar-sorteio");
    ocupado(botao, true);

    const { error } = await db.rpc("realizar_sorteio", {
      p_sala_id: sala.id,
      p_admin_token: mem().admin
    });

    ocupado(botao, false);
    fecharModal("modal-sortear");

    if (error) {
      aviso(recado(error), "erro");
      carregar();
      return;
    }

    aviso("Sorteio feito! Avise o grupo para abrirem o link.", "certo");
    carregar();
  });

  /* -------------------------------------------- ver quem eu tirei -- */
  function pedirRevelacao() {
    if (!eu) return;
    abrirModal("modal-aviso");
  }

  $("btn-revelar").addEventListener("click", pedirRevelacao);
  $("presente").addEventListener("click", pedirRevelacao);
  $("presente").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      pedirRevelacao();
    }
  });

  $("btn-estou-sozinho").addEventListener("click", async () => {
    const botao = $("btn-estou-sozinho");
    const guardado = mem();

    ocupado(botao, true);

    const { data: res, error } = await db.rpc("ver_resultado", {
      p_participante_id: guardado.pid,
      p_token: guardado.token
    });

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

    /* Guardar o resultado no proprio WhatsApp e o que de fato resolve o
       problema de perder o acesso: com ele salvo, a pessoa nem precisa
       voltar ao site. */
    ultimoResultado = res;

    abrirModal("modal-resultado");
    carregar();
  });

  let ultimoResultado = null;

  $("btn-resultado-whatsapp").addEventListener("click", () => {
    if (!ultimoResultado) return;

    const partes = [
      "🎁 Amigo secreto (sala " + codigo + ")",
      "",
      "Eu tirei: " + ultimoResultado.nome
    ];
    if (ultimoResultado.dica) partes.push("", "A dica dela: " + ultimoResultado.dica);
    if (sala && sala.data_festa) partes.push("", "Festa em " + dataBonita(sala.data_festa));
    partes.push("", "Segredo! Nao contar para ninguem.");

    window.open("https://wa.me/?text=" + encodeURIComponent(partes.join("\n")), "_blank", "noopener");
  });

  /* ------------------------------------------- desfazer o sorteio -- */
  $("btn-reabrir").addEventListener("click", () => abrirModal("modal-reabrir"));

  $("btn-confirmar-reabrir").addEventListener("click", async () => {
    const botao = $("btn-confirmar-reabrir");
    ocupado(botao, true);

    const { error } = await db.rpc("reabrir_sala", {
      p_sala_id: sala.id,
      p_admin_token: mem().admin
    });

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
  });

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

  $("btn-confirmar-apagar").addEventListener("click", async () => {
    const botao = $("btn-confirmar-apagar");

    if ($("confirma-codigo").value !== codigo) return;

    ocupado(botao, true);

    const { error } = await db.rpc("apagar_sala", {
      p_sala_id: sala.id,
      p_admin_token: mem().admin
    });

    if (error) {
      ocupado(botao, false);
      aviso(recado(error), "erro");
      return;
    }

    Memoria.esquecer(codigo);
    location.href = "index.html?apagada=" + encodeURIComponent(codigo);
  });

  /* ---------------------------------------------------- compartilhar -- */
  function textoConvite() {
    const partes = [
      "🎄 Amigo Secreto!",
      "",
      "Abre este link no seu celular e coloca o seu nome para participar:",
      linkSala,
      "",
      "Ou entre pelo codigo: " + codigo,
      "",
      "Quem nao entrar pelo link fica de fora do sorteio."
    ];
    if (sala && sala.data_festa) partes.push("Data da festa: " + dataBonita(sala.data_festa));
    return partes.join("\n");
  }

  $("btn-whatsapp").addEventListener("click", () => {
    window.open("https://wa.me/?text=" + encodeURIComponent(textoConvite()), "_blank", "noopener");
  });

  $("btn-copiar").addEventListener("click", async () => {
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
        aviso("Nao deu para copiar. O link e: " + linkSala, "erro");
      }
      campo.remove();
    }
  });

  /* ------------------------------------------------ fechar modais -- */
  document.querySelectorAll("[data-fechar]").forEach((botao) => {
    botao.addEventListener("click", () => fecharModal(botao.dataset.fechar));
  });

  /* ----------------------------------------------------- comecar -- */
  carregar();
})();
