/* =====================================================================
   COMUM — coisas que as duas paginas usam: conexao, neve, avisos, PIN.
   ===================================================================== */

/* ------------------------------------------------------- conexao ---- */
const CFG = window.CONFIG || {};
const CONFIGURADO = Boolean(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);

const db = CONFIGURADO
  ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 5 } }
    })
  : null;

/* Se as chaves nao estiverem preenchidas, avisa na tela em vez de
   deixar a pagina quebrada sem explicacao. */
function exigirConfig() {
  if (CONFIGURADO) return true;
  const alvo = document.querySelector("[data-conteudo]") || document.body;
  alvo.innerHTML = `
    <div class="cartao escuro">
      <h2>Falta configurar o banco</h2>
      <p class="ajuda">
        Abra o arquivo <strong>js/config.js</strong> e cole a
        <strong>Project URL</strong> e a chave <strong>anon public</strong>
        do seu projeto no Supabase. Elas ficam em
        Settings &rsaquo; API, no painel do Supabase.
      </p>
      <div class="aviso ouro">
        <span class="icone">&#128161;</span>
        <span>Antes disso, rode o arquivo <strong>sql/01-schema.sql</strong>
        no SQL Editor do Supabase para criar as tabelas.</span>
      </div>
    </div>`;
  return false;
}

/* ---------------------------------------------------------- neve ---- */
function cairNeve(quantidade) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const caixa = document.createElement("div");
  caixa.className = "neve";
  caixa.setAttribute("aria-hidden", "true");

  const formas = ["❄", "❅", "❆", "·"];

  for (let i = 0; i < quantidade; i++) {
    const floco = document.createElement("span");
    floco.className = "floco";
    floco.textContent = formas[Math.floor(Math.random() * formas.length)];
    floco.style.left = Math.random() * 100 + "vw";
    floco.style.fontSize = 7 + Math.random() * 14 + "px";
    floco.style.animationDuration = 9 + Math.random() * 13 + "s";
    floco.style.animationDelay = -Math.random() * 18 + "s";
    floco.style.setProperty("--desvio", (Math.random() * 90 - 45).toFixed(0) + "px");
    floco.style.setProperty("--op", (0.35 + Math.random() * 0.5).toFixed(2));
    caixa.appendChild(floco);
  }

  document.body.appendChild(caixa);
}

/* ------------------------------------------------- vilarejo ---------- */
/* Casinhas com janela acesa, fumaca saindo da chamine e pinheiros, no pe
   da pagina. Tudo desenhado em SVG, sem imagem. */
function montarVilarejo() {
  const C = {
    parede: "#17293f",
    telhado: "#22364f",
    neve: "#dde8f6",
    janela: "#ffcf7a",
    porta: "#2a1a12",
    pinheiro: "#13342a",
    chao: "#141f31"
  };

  /* uma casa: corpo, telhado nevado, chamine, janelas acesas e porta */
  const casa = (x, base, larg, alt, atraso) => {
    const metade = larg / 2;
    const picoY = -alt * 0.55;
    return `
    <g transform="translate(${x} ${base})">
      <rect x="0" y="${-alt}" width="${larg}" height="${alt}" fill="${C.parede}"/>
      <path d="M${-larg * 0.12} ${-alt} L${metade} ${-alt + picoY} L${larg * 1.12} ${-alt} Z"
            fill="${C.telhado}"/>
      <path d="M${-larg * 0.12} ${-alt} L${metade} ${-alt + picoY} L${larg * 1.12} ${-alt}
               L${larg * 1.0} ${-alt} Q${metade + larg * 0.18} ${-alt + picoY * 0.45} ${metade} ${-alt + picoY * 0.82}
               Q${metade - larg * 0.18} ${-alt + picoY * 0.45} ${larg * 0.0} ${-alt} Z"
            fill="${C.neve}" opacity=".92"/>
      <rect x="${larg * 0.66}" y="${-alt + picoY * 0.5}" width="${larg * 0.14}" height="${alt * 0.42}" fill="${C.parede}"/>
      <rect x="${larg * 0.63}" y="${-alt + picoY * 0.5 - 5}" width="${larg * 0.2}" height="6" rx="2" fill="${C.neve}"/>
      <g class="fumaca" style="--atraso:${atraso}s">
        <circle cx="${larg * 0.73}" cy="${-alt + picoY * 0.5 - 8}" r="5" fill="#cdd9ea" opacity="0"/>
        <circle cx="${larg * 0.73}" cy="${-alt + picoY * 0.5 - 8}" r="6" fill="#cdd9ea" opacity="0"/>
        <circle cx="${larg * 0.73}" cy="${-alt + picoY * 0.5 - 8}" r="4" fill="#cdd9ea" opacity="0"/>
      </g>
      <g class="janela" style="--atraso:${atraso * 1.7}s">
        <rect x="${larg * 0.12}" y="${-alt * 0.72}" width="${larg * 0.22}" height="${alt * 0.3}" rx="2" fill="${C.janela}"/>
        <rect x="${larg * 0.56}" y="${-alt * 0.72}" width="${larg * 0.22}" height="${alt * 0.3}" rx="2" fill="${C.janela}"/>
      </g>
      <rect x="${larg * 0.38}" y="${-alt * 0.46}" width="${larg * 0.24}" height="${alt * 0.46}" rx="2" fill="${C.porta}"/>
      <circle cx="${larg * 0.5}" cy="${-alt * 0.52}" r="3.5" fill="#c0252f" opacity=".85"/>
    </g>`;
  };

  /* pinheiro nevado */
  const pinheiro = (x, base, h) => `
    <g transform="translate(${x} ${base})">
      <rect x="-3" y="${-h * 0.16}" width="6" height="${h * 0.16}" fill="#2a1a12"/>
      <path d="M0 ${-h} L${h * 0.3} ${-h * 0.52} L${-h * 0.3} ${-h * 0.52} Z" fill="${C.pinheiro}"/>
      <path d="M0 ${-h * 0.78} L${h * 0.38} ${-h * 0.16} L${-h * 0.38} ${-h * 0.16} Z" fill="${C.pinheiro}"/>
      <path d="M0 ${-h} L${h * 0.14} ${-h * 0.73} L${-h * 0.14} ${-h * 0.73} Z" fill="${C.neve}" opacity=".75"/>
      <path d="M0 ${-h * 0.78} L${h * 0.2} ${-h * 0.45} L${-h * 0.2} ${-h * 0.45} Z" fill="${C.neve}" opacity=".55"/>
    </g>`;

  const caixa = document.createElement("div");
  caixa.className = "vilarejo";
  caixa.setAttribute("aria-hidden", "true");

  /* A viewBox e mais larga que qualquer tela (1900) para o desenho nunca
     ser ampliado: assim as casas ficam no tamanho certo e o que sobra e
     cortado nas laterais, como um vilarejo que continua alem da tela. */
  caixa.innerHTML = `
    <svg viewBox="0 0 1900 200" preserveAspectRatio="xMidYMax slice">
      <!-- lombada de neve no chao -->
      <path d="M0 166 Q210 154 420 162 Q660 171 900 156 Q1150 142 1390 160
               Q1600 172 1900 158 L1900 200 L0 200 Z" fill="${C.chao}"/>
      <path d="M0 166 Q210 154 420 162 Q660 171 900 156 Q1150 142 1390 160
               Q1600 172 1900 158"
            stroke="#93abcb" stroke-width="2.5" fill="none" opacity=".3"/>

      ${pinheiro(58, 164, 62)}
      ${casa(116, 163, 88, 54, 0)}
      ${pinheiro(238, 162, 46)}
      ${casa(288, 161, 106, 66, 1.3)}
      ${pinheiro(428, 160, 54)}
      ${casa(484, 159, 80, 50, 2.6)}
      ${casa(598, 161, 116, 72, 0.7)}
      ${pinheiro(748, 158, 68)}
      ${casa(804, 159, 94, 58, 1.9)}
      ${pinheiro(928, 157, 50)}
      ${casa(978, 158, 100, 62, 2.2)}
      ${pinheiro(1108, 160, 64)}
      ${casa(1166, 159, 86, 52, 1.1)}
      ${pinheiro(1286, 161, 48)}
      ${casa(1336, 160, 110, 68, 2.9)}
      ${pinheiro(1478, 158, 58)}
      ${casa(1536, 158, 92, 56, 0.4)}
      ${pinheiro(1676, 159, 52)}
      ${casa(1726, 159, 98, 60, 1.6)}
    </svg>`;

  document.body.appendChild(caixa);
}

/* ------------------------------------------- papai noel no treno ---- */
/* Desenhado a mao em SVG: tres renas, as redeas, o treno e o Papai Noel.
   Atravessa o ceu a cada ~58 segundos, atras de todo o conteudo. */
function soltarPapaiNoel() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const COR = {
    pelo: "#8a5a34",
    peloClaro: "#a06f44",
    galhada: "#63401f",
    vermelho: "#c0252f",
    vermelhoClaro: "#d9353f",
    ouro: "#e3bd66",
    ouroClaro: "#f6dca2",
    neve: "#f7f2e8",
    pele: "#f0d2ab",
    couro: "#2e1c12",
    verde: "#1f6b4d"
  };

  /* Rena de perfil, olhando para a direita (o lado para onde o treno vai).
     O grupo de fora so posiciona; o de dentro recebe a animacao do pulo,
     porque uma animacao CSS substituiria o transform de posicao. */
  const rena = (x, y, lider, atraso, fundo) => `
    <g transform="translate(${x} ${y})${fundo ? " scale(.9)" : ""}"${fundo ? ' opacity=".7"' : ""}>
    <g class="rena-pula" style="animation-delay:${atraso}s">
      <!-- pernas de tras -->
      <path d="M-17 6 L-24 22 L-19 28" stroke="${COR.galhada}" stroke-width="3.2"
            stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M-12 7 L-7 23 L-13 28" stroke="${COR.pelo}" stroke-width="3.2"
            stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <!-- rabo -->
      <path d="M-22 -4 L-28 -9" stroke="${COR.pelo}" stroke-width="3.6" stroke-linecap="round"/>
      <!-- corpo -->
      <ellipse cx="-7" cy="1" rx="17" ry="9" fill="${COR.pelo}"/>
      <!-- pernas da frente -->
      <path d="M3 7 L9 23 L4 29" stroke="${COR.galhada}" stroke-width="3.2"
            stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M8 5 L15 20 L21 25" stroke="${COR.pelo}" stroke-width="3.2"
            stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <!-- pescoco e cabeca -->
      <path d="M6 -5 L17 -17 L28 -19 L33 -13 L29 -6 L15 2 Z" fill="${COR.pelo}"/>
      <ellipse cx="31" cy="-12" rx="5.4" ry="4.4" fill="${COR.peloClaro}"/>
      <!-- orelha -->
      <path d="M20 -18 L15 -25 L23 -22 Z" fill="${COR.galhada}"/>
      <!-- galhada -->
      <path d="M22 -20 L19 -32 M19 -32 L12 -36 M19 -32 L21 -40
               M27 -20 L31 -33 M31 -33 L39 -36 M31 -33 L29 -41"
            stroke="${COR.galhada}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <!-- olho -->
      <circle cx="26" cy="-14" r="1.3" fill="${COR.couro}"/>
      <!-- arreio com guizo -->
      <path d="M9 -7 Q13 2 18 -1" stroke="${COR.vermelho}" stroke-width="3.6" fill="none"/>
      <circle cx="17" cy="0" r="2.8" fill="${COR.ouro}"/>
      ${lider ? `<circle class="nariz" cx="35" cy="-12" r="3.6" fill="#ff4242"/>` : ""}
    </g>
    </g>`;

  const caixa = document.createElement("div");
  caixa.className = "ceu-treno";
  caixa.setAttribute("aria-hidden", "true");

  caixa.innerHTML = `
    <div class="treno">
      <div class="treno-balanco">
        <svg viewBox="0 0 380 130" width="380" height="130" fill="none"
             style="filter:drop-shadow(0 4px 18px rgba(227,189,102,.35))">

          <!-- rastro de poeira magica, ficando para tras -->
          <g class="rastro" fill="${COR.ouroClaro}">
            <circle cx="6" cy="78" r="2" opacity=".9"/>
            <circle cx="-4" cy="70" r="1.4" opacity=".7"/>
            <circle cx="1" cy="88" r="1.2" opacity=".6"/>
            <circle cx="-12" cy="81" r="1.7" opacity=".5"/>
            <circle cx="14" cy="86" r="1.3" opacity=".7"/>
          </g>

          <!-- ================================================= TRENO -->
          <g transform="translate(14 44)">
            <!-- patim, enrolando no bico da frente -->
            <path d="M2 48 L74 48 Q88 48 90 36"
                  stroke="${COR.ouro}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
            <path d="M2 48 Q-8 48 -6 38"
                  stroke="${COR.ouro}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
            <path d="M16 36 L16 48 M54 36 L54 48"
                  stroke="${COR.ouro}" stroke-width="2.6" stroke-linecap="round"/>

            <!-- espaldar enrolado, atras -->
            <path d="M6 20 Q-8 14 -4 0 Q0 -10 13 -5"
                  stroke="${COR.vermelho}" stroke-width="7" stroke-linecap="round" fill="none"/>
            <path d="M6 20 Q-8 14 -4 0 Q0 -10 13 -5"
                  stroke="${COR.ouro}" stroke-width="2.2" stroke-linecap="round" fill="none"/>

            <!-- presentes empilhados atras do Papai Noel -->
            <rect x="10" y="6" width="15" height="13" rx="2" fill="${COR.verde}"/>
            <path d="M17.5 6 L17.5 19 M10 12 L25 12" stroke="${COR.ouroClaro}" stroke-width="1.6"/>
            <rect x="22" y="12" width="12" height="11" rx="2" fill="${COR.ouro}"/>
            <path d="M28 12 L28 23 M22 17 L34 17" stroke="${COR.vermelho}" stroke-width="1.4"/>

            <!-- corpo do treno -->
            <path d="M4 36 L4 20 Q4 12 18 12 L66 12 Q82 12 84 28 L84 36 Z"
                  fill="${COR.vermelho}"/>
            <path d="M4 26 Q44 29 84 31" stroke="${COR.ouro}" stroke-width="2.2" fill="none"/>
            <!-- volutas douradas na lateral -->
            <path d="M14 33 Q22 22 30 33 Q38 22 46 33 Q54 22 62 33"
                  stroke="${COR.ouroClaro}" stroke-width="1.5" fill="none" opacity=".85"/>
          </g>

          <!-- ============================================ PAPAI NOEL -->
          <g transform="translate(62 34)">
            <!-- corpo -->
            <path d="M-11 30 Q-16 8 -2 3 L10 3 Q24 8 19 30 Z" fill="${COR.vermelhoClaro}"/>
            <!-- cinto -->
            <path d="M-12 19 L19 19" stroke="${COR.couro}" stroke-width="5.5"/>
            <rect x="-1" y="15.8" width="8" height="6.6" rx="1.2" fill="${COR.ouro}"/>
            <!-- o braco que arremessa fica fora deste grupo, logo abaixo -->

            <!-- braco segurando as redeas -->
            <path d="M8 14 L24 18" stroke="${COR.vermelho}" stroke-width="6" stroke-linecap="round"/>
            <circle cx="26" cy="19" r="3.6" fill="${COR.neve}"/>
            <!-- cabeca -->
            <circle cx="4" cy="-7" r="10" fill="${COR.pele}"/>
            <circle cx="1" cy="-9" r="1.4" fill="${COR.couro}"/>
            <circle cx="9" cy="-9" r="1.4" fill="${COR.couro}"/>
            <circle cx="5" cy="-5" r="2.2" fill="#e08a7a"/>
            <!-- barba -->
            <path d="M-6 -7 Q-8 10 5 11 Q18 10 15 -7 Q11 0 5 0 Q-2 0 -6 -7 Z" fill="${COR.neve}"/>
            <path d="M-2 -4 Q5 1 12 -4 Q5 -2 -2 -4 Z" fill="${COR.neve}"/>
            <!-- gorro -->
            <path d="M-7 -13 Q-7 -27 6 -27 Q18 -26 19 -16 Q7 -21 -7 -13 Z" fill="${COR.vermelhoClaro}"/>
            <path d="M-8 -12 Q5 -19 20 -15" stroke="${COR.neve}" stroke-width="5"
                  stroke-linecap="round" fill="none"/>
            <path d="M19 -18 Q26 -22 27 -27" stroke="${COR.vermelhoClaro}" stroke-width="4"
                  stroke-linecap="round" fill="none"/>
            <circle cx="28" cy="-29" r="4.4" fill="${COR.neve}"/>
          </g>

          <!-- ============================ BRACO QUE ARREMESSA ======= -->
          <!-- Fica solto na raiz do desenho, em coordenadas absolutas, para
               o ponto de giro (o ombro, em 75 43) bater exatamente. Dentro
               do grupo do Papai Noel o deslocamento dele somava junto e o
               braco saia voando. -->
          <g class="braco-joga">
            <path d="M75 43 L89 30" stroke="${COR.vermelhoClaro}" stroke-width="7" stroke-linecap="round"/>
            <path d="M86 33 L90 29" stroke="${COR.neve}" stroke-width="7" stroke-linecap="round"/>
            <circle cx="92" cy="27" r="4.2" fill="${COR.pele}"/>
            <!-- ponto invisivel na mao: e dali que o presente sai -->
            <circle class="ponto-solta" cx="93" cy="26" r="0.1" fill="none"/>
          </g>

          <!-- ================================================= RENAS -->
          <!-- redeas da mao do Papai Noel ate as renas -->
          <path d="M94 32 Q140 50 200 50 Q280 50 352 46"
                stroke="${COR.couro}" stroke-width="1.3" opacity=".55" fill="none"/>

          <!-- 8 renas atreladas em 4 duplas, como no treno de verdade.
               A de tras de cada dupla vai menor e mais apagada, para dar
               a sensacao de profundidade. -->
          ${rena(144, 42, false, -0.05, true)}
          ${rena(150, 54, false, 0, false)}

          ${rena(202, 42, false, -0.22, true)}
          ${rena(208, 54, false, -0.14, false)}

          ${rena(260, 42, false, -0.38, true)}
          ${rena(266, 54, false, -0.30, false)}

          ${rena(318, 42, false, -0.52, true)}
          ${rena(324, 54, true, -0.45, false)}
        </svg>
      </div>
    </div>`;

  document.body.appendChild(caixa);
  jogarPresentes();
}

/* ------------------------------- presentes jogados do treno em voo ---- */
/* De tempos em tempos pega a posicao real do treno na tela e solta um
   presente dali, que cai girando e some. */
function jogarPresentes() {
  const ceu = document.createElement("div");
  ceu.className = "presentes-caindo";
  ceu.setAttribute("aria-hidden", "true");
  document.body.appendChild(ceu);

  const MAXIMO_NA_NEVE = 14;

  const PARES = [
    ["#c0252f", "#e3bd66"],
    ["#1f6b4d", "#f6dca2"],
    ["#e3bd66", "#c0252f"],
    ["#2f6fb0", "#f7f2e8"],
    ["#f7f2e8", "#c0252f"]
  ];

  function soltar() {
    const ponto = document.querySelector(".treno .ponto-solta");
    if (!ponto) return;

    const caixa = ponto.getBoundingClientRect();

    /* so joga enquanto o treno estiver visivel na tela */
    if (caixa.left < 40 || caixa.left > window.innerWidth - 40) return;

    const [papel, fita] = PARES[Math.floor(Math.random() * PARES.length)];
    const tamanho = 30 + Math.random() * 18;

    /* Pousa com a base do presente na linha da neve (uns 36px do pe da
       pagina), com uma variacao para nao ficarem todos numa regua. */
    const chao = window.innerHeight - 36 - tamanho + (Math.random() * 36 - 12);
    const queda = Math.max(60, chao - caixa.top);

    const presente = document.createElement("div");
    presente.className = "presente-caindo";
    presente.style.left = caixa.left - tamanho / 2 + "px";
    presente.style.top = caixa.top + "px";
    presente.style.setProperty("--desvio", (Math.random() * 120 - 50).toFixed(0) + "px");
    presente.style.setProperty("--queda", queda.toFixed(0) + "px");
    presente.style.setProperty("--giro", (Math.random() * 720 - 360).toFixed(0) + "deg");
    presente.style.setProperty("--tempo", (2.6 + Math.random() * 1.4).toFixed(1) + "s");

    presente.innerHTML = `
      <svg viewBox="0 0 24 24" width="${tamanho}" height="${tamanho}">
        <path d="M12 9 Q5 2 2.5 5.5 Q4 9 12 9 Z" fill="${fita}"/>
        <path d="M12 9 Q19 2 21.5 5.5 Q20 9 12 9 Z" fill="${fita}"/>
        <rect x="2" y="9" width="20" height="13" rx="2" fill="${papel}"/>
        <rect x="2" y="12.5" width="20" height="3" fill="${fita}"/>
        <rect x="10" y="9" width="4" height="13" fill="${fita}"/>
      </svg>`;

    ceu.appendChild(presente);

    /* Os presentes ficam na neve em vez de sumir. Para a pagina nao ir
       acumulando elementos para sempre, a pilha tem teto: ao passar do
       limite, o mais antigo se apaga devagar e sai. */
    const pilha = ceu.querySelectorAll(".presente-caindo:not(.sumindo)");
    if (pilha.length > MAXIMO_NA_NEVE) {
      const velho = pilha[0];
      velho.classList.add("sumindo");
      setTimeout(() => velho.remove(), 1000);
    }
  }

  /* se a janela mudar de tamanho, a linha da neve muda de lugar e os
     presentes ficariam boiando no ar: limpa a pilha */
  let redimensionando = null;
  window.addEventListener("resize", () => {
    clearTimeout(redimensionando);
    redimensionando = setTimeout(() => {
      ceu.querySelectorAll(".presente-caindo").forEach((p) => p.remove());
    }, 250);
  });

  /* Amarra a soltura ao braco: a cada volta da animacao do arremesso,
     espera chegar no instante em que a mao se abre (58% do ciclo) e solta
     o presente dali. Assim o presente sai da mao, nao do nada. */
  const braco = document.querySelector(".treno .braco-joga");
  if (!braco) return;

  const CICLO = 2600;    /* mesma duracao da animacao braco-joga, no CSS */
  const SOLTURA = 0.58;  /* fracao do ciclo em que ele abre a mao */

  function marcarProximoArremesso() {
    setTimeout(soltar, CICLO * SOLTURA);
  }

  braco.addEventListener("animationiteration", marcarProximoArremesso);
  marcarProximoArremesso();
}

/* ----------------------------------------------------- guirlanda ---- */
function pendurarGuirlanda(quantidade) {
  const fio = document.createElement("div");
  fio.className = "guirlanda";
  fio.setAttribute("aria-hidden", "true");
  for (let i = 0; i < quantidade; i++) {
    const luz = document.createElement("span");
    luz.className = "luz";
    fio.appendChild(luz);
  }
  document.body.appendChild(fio);
}

/* ------------------------------------------------- avisos na tela ---- */
function aviso(texto, tipo) {
  let pilha = document.querySelector(".avisos");
  if (!pilha) {
    pilha = document.createElement("div");
    pilha.className = "avisos";
    pilha.setAttribute("role", "status");
    pilha.setAttribute("aria-live", "polite");
    document.body.appendChild(pilha);
  }

  const bolha = document.createElement("div");
  bolha.className = "bolha" + (tipo ? " " + tipo : "");
  bolha.textContent = texto;
  pilha.appendChild(bolha);

  setTimeout(() => {
    bolha.classList.add("saindo");
    setTimeout(() => bolha.remove(), 260);
  }, 3600);
}

/* --------------------------------------- mensagens de erro humanas ---- */
const RECADOS = {
  NOME_CURTO: "Escreva um nome com pelo menos 2 letras.",
  NOME_REPETIDO: "Ja tem alguem com esse nome na sala. Coloque o sobrenome para diferenciar.",
  CHAVE_INVALIDA: "Este celular perdeu o acesso a esse nome. Peca para o organizador liberar o seu nome.",
  NOME_NAO_LIBERADO: "Esse nome ainda nao foi liberado. Peca para o organizador liberar.",
  ADMIN_NAO_SAI: "Quem criou a sala nao pode sair dela.",
  ALGUEM_JA_VIU: "Alguem ja abriu o resultado, entao o sorteio nao pode mais ser desfeito.",
  MINIMO_3: "O sorteio precisa de pelo menos 3 pessoas.",
  JA_SORTEADA: "O sorteio desta sala ja foi feito.",
  SEM_PERMISSAO: "Só quem criou a sala pode fazer isso.",
  SORTEIO_NAO_REALIZADO: "O sorteio ainda nao foi feito.",
  SALA_NAO_ENCONTRADA: "Sala nao encontrada.",
  PARTICIPANTE_NAO_ENCONTRADO: "Esse participante nao esta mais na sala.",
  SORTEIO_FALHOU: "Nao deu para embaralhar. Tente novamente."
};

function recado(erro) {
  const bruto = (erro && (erro.message || erro.hint || erro.details)) || "";
  for (const chave in RECADOS) {
    if (bruto.includes(chave)) return RECADOS[chave];
  }
  if (bruto.includes("Failed to fetch") || bruto.includes("NetworkError")) {
    return "Sem conexao com o banco. Confira sua internet e se o projeto do Supabase nao esta pausado.";
  }
  if (bruto.includes("row-level security") || bruto.includes("permission denied")) {
    return "O banco recusou a operacao. Confira se o arquivo sql/01-schema.sql foi rodado inteiro.";
  }
  console.error(erro);
  return "Algo deu errado. Tente de novo.";
}

/* --------------------------------------------------- memoria local ---- */
const Memoria = {
  chave(codigo) {
    return "amigo-secreto-natal:" + String(codigo).toUpperCase();
  },
  ler(codigo) {
    try {
      return JSON.parse(localStorage.getItem(this.chave(codigo))) || {};
    } catch (e) {
      return {};
    }
  },
  esquecer(codigo) {
    try {
      localStorage.removeItem(this.chave(codigo));
    } catch (e) {
      /* navegador em modo privado */
    }
  },
  gravar(codigo, dados) {
    try {
      const atual = this.ler(codigo);
      localStorage.setItem(this.chave(codigo), JSON.stringify({ ...atual, ...dados }));
    } catch (e) {
      /* navegador em modo privado: segue sem lembrar */
    }
  }
};

/* --------------------------------------------------------- apoio ---- */
function inicial(nome) {
  const limpo = String(nome || "").trim();
  return limpo ? limpo[0].toUpperCase() : "?";
}

/* Escapa tambem as aspas, porque o nome tambem vai dentro de atributos. */
function escapar(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dataBonita(iso) {
  if (!iso) return "";
  const [a, m, d] = String(iso).split("-");
  if (!a || !m || !d) return iso;
  return `${d}/${m}/${a}`;
}

function ocupado(botao, ligado, textoOriginal) {
  if (ligado) {
    botao.dataset.texto = textoOriginal || botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = '<span class="carregando"></span> Aguarde...';
  } else {
    botao.disabled = false;
    botao.innerHTML = botao.dataset.texto || botao.innerHTML;
  }
}

/* --------------------------------------------------------- modais ---- */
function abrirModal(id) {
  const cortina = document.getElementById(id);
  if (!cortina) return;
  cortina.classList.add("aberta");
  const foco = cortina.querySelector("input, button");
  if (foco) setTimeout(() => foco.focus(), 80);
}

function fecharModal(id) {
  const cortina = document.getElementById(id);
  if (cortina) cortina.classList.remove("aberta");
}

/* fecha clicando fora e com Esc */
document.addEventListener("click", (ev) => {
  if (ev.target.classList && ev.target.classList.contains("cortina")) {
    ev.target.classList.remove("aberta");
  }
});

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    document.querySelectorAll(".cortina.aberta").forEach((c) => c.classList.remove("aberta"));
  }
});

/* ------------------------------------------------------- enfeites ---- */
montarVilarejo();
cairNeve(34);
pendurarGuirlanda(26);
soltarPapaiNoel();
