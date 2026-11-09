/* =====================================================================
   NOVA SENHA — tela aberta pelo link de recuperação do email.
   O Supabase, ao abrir esta pagina com o link, cria uma sessao temporaria
   de recuperacao. Com ela a gente deixa a pessoa gravar um PIN novo.
   ===================================================================== */

(function () {
  if (!exigirConfig()) return;

  const $ = (id) => document.getElementById(id);
  const mostrar = (id, sim) => $(id).classList.toggle("escondido", !sim);

  let pronto = false;

  function liberarForm() {
    if (pronto) return;
    pronto = true;
    mostrar("tela-carregando", false);
    mostrar("painel-novo", true);
    $("novo-pin").focus();
  }

  function linkInvalido() {
    if (pronto) return;
    mostrar("tela-carregando", false);
    mostrar("painel-invalido", true);
  }

  /* o link de recuperacao dispara este evento ao ser processado */
  db.auth.onAuthStateChange((evento) => {
    if (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN") liberarForm();
  });

  /* caso o evento ja tenha passado antes do nosso listener entrar */
  (async () => {
    const { data } = await db.auth.getSession();
    if (data && data.session) liberarForm();
    else setTimeout(() => { if (!pronto) linkInvalido(); }, 2500);
  })();

  $("novo-pin").addEventListener("input", () => {
    $("novo-pin").value = $("novo-pin").value.replace(/\D/g, "").slice(0, 6);
  });

  $("form-novo").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const botao = $("btn-salvar-pin");
    const pin = $("novo-pin").value;

    if (!/^\d{6}$/.test(pin)) { aviso("O PIN tem que ter 6 números.", "erro"); return; }

    ocupado(botao, true);
    const { error } = await db.auth.updateUser({ password: pin });
    if (error) {
      ocupado(botao, false);
      aviso("Não deu pra salvar. Tente de novo ou peça um link novo.", "erro");
      return;
    }

    Auth.guardarPreferencia(true);
    aviso("PIN trocado! Entrando...", "certo");
    setTimeout(() => location.replace("index.html"), 600);
  });
})();
