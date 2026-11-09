/* =====================================================================
   AUTH — login, sessao e a regra dos 5 dias.
   Usa o cliente `db` criado no comum.js. O Supabase ja guarda a sessao
   no navegador sozinho; aqui a gente so decide ATE QUANDO ela vale.
   ===================================================================== */

const CINCO_DIAS = 5 * 24 * 60 * 60 * 1000;
const PREF = "amigo-secreto-natal:login";

const Auth = {
  /* guarda a preferencia do "salvar meu login" no momento do login */
  guardarPreferencia(lembrar) {
    try {
      localStorage.setItem(PREF, JSON.stringify({ lembrar: !!lembrar, ts: Date.now() }));
      /* marca a sessao como viva ja no login: sem isso, quem desmarca o
         "salvar 5 dias" cairia fora na primeira pagina depois de entrar */
      sessionStorage.setItem("sessao_viva", "1");
    } catch (e) { /* navegador privado */ }
  },

  lerPreferencia() {
    try {
      return JSON.parse(localStorage.getItem(PREF)) || { lembrar: true, ts: Date.now() };
    } catch (e) {
      return { lembrar: true, ts: Date.now() };
    }
  },

  limparPreferencia() {
    try { localStorage.removeItem(PREF); } catch (e) {}
  },

  /* Devolve o usuario logado, ou null. De quebra aplica a regra do tempo:
     - "salvar 5 dias" marcado  -> derruba depois de 5 dias
     - desmarcado               -> derruba quando fecha o navegador      */
  async usuario() {
    const { data } = await db.auth.getSession();
    const sessao = data ? data.session : null;
    if (!sessao) return null;

    const pref = this.lerPreferencia();

    let vivo = false;
    try { vivo = Boolean(sessionStorage.getItem("sessao_viva")); } catch (e) {}

    if (pref.lembrar === false) {
      /* sessao-only: se o navegador foi fechado, a marca some -> cai fora */
      if (!vivo) { await this.sair(false); return null; }
    } else if (Date.now() - (pref.ts || 0) > CINCO_DIAS) {
      await this.sair(false);
      return null;
    }

    try { sessionStorage.setItem("sessao_viva", "1"); } catch (e) {}
    return sessao.user;
  },

  async sair(redirecionar = true) {
    try { await db.auth.signOut(); } catch (e) {}
    this.limparPreferencia();
    try { sessionStorage.removeItem("sessao_viva"); } catch (e) {}
    if (redirecionar) location.replace("login.html");
  },

  /* Usado pelas paginas que exigem login (index e sala). Se nao estiver
     logado, manda pro login guardando pra onde a pessoa queria ir. */
  async exigir(proxima) {
    if (!CONFIGURADO) return null;  /* comum.js ja mostra o aviso */
    const user = await this.usuario();
    if (!user) {
      const destino = proxima || (location.pathname.split("/").pop() + location.search);
      location.replace("login.html?proxima=" + encodeURIComponent(destino));
      return null;
    }
    return user;
  }
};

window.Auth = Auth;
