# 🎄 Amigo Secreto Online

Site para organizar o amigo secreto do seu grupo pelo celular. Cada um entra
com a sua conta, participa pelo link da sala, e o sorteio sai na hora — sem
baixar aplicativo.

Feito para aquele grupo da família ou do trabalho em que sempre falta alguém,
alguém esquece quem tirou, e o organizador vira secretário do Natal.

---

## Como funciona

Você cria uma conta rapidinha (nome, email e um PIN de 6 números). Essa conta
serve para **qualquer sala** e funciona em **qualquer aparelho** — é só entrar
de novo com o email e o PIN.

Uma pessoa cria a sala e recebe um código de 6 letras e um link. Manda no grupo.

Cada um abre o link, entra com a sua conta e participa. A lista cresce na tela
de todo mundo ao mesmo tempo, então dá para ver quem já entrou e quem falta.

Quando não falta ninguém, o organizador clica em sortear. A sala tranca.

Aí cada um vê só quem tirou — junto com a dica de presente que a pessoa deixou,
se deixou. Dá para **copiar** o resultado ou **mandar para você mesmo no
WhatsApp**, para guardar.

---

## A conta

- **Criar conta:** nome + email + PIN de 6 números.
- **Entrar:** email + PIN. Dá para marcar "salvar meu login por 5 dias".
- **Esqueci meu PIN:** você põe o email e recebe um link para criar um PIN novo.

Como a identidade é a conta (e não o aparelho), você entra no celular, no PC,
onde quiser, e continua sendo você — com o mesmo resultado.

---

## As regras

**Mínimo de 3 pessoas.** Com 2 todo mundo já sabe.

**O sorteio é livre.** Qualquer um pode tirar qualquer um. A única regra é que
ninguém tira a si mesmo — se acontecer no embaralhamento, o sistema refaz.

**Depois de sortear, acabou.** A lista tranca, ninguém mais entra ou sai, e não
dá para refazer o sorteio depois que alguém já olhou o resultado.

**O resultado não muda.** Pode fechar, voltar daqui a um mês, trocar de
aparelho: é sempre a mesma pessoa.

---

## O que o organizador pode e não pode

**Pode** tirar alguém da lista antes do sorteio, desfazer o sorteio enquanto
ninguém tiver olhado, e apagar a sala.

**Não pode** ver quem tirou quem. Nem ele. O painel dele mostra só quem já
abriu o resultado.

---

## Rodando na sua máquina

Precisa do [Node](https://nodejs.org). Nenhuma biblioteca, nenhum `npm install`.

```bash
git clone https://github.com/Brunoverly77/amigo-secreto-online.git
cd amigo-secreto-online
```

Depois, um banco (é de graça):

1. Crie uma conta no [supabase.com](https://supabase.com) e um projeto novo.
2. No **SQL Editor**, cole o `sql/01-schema.sql` inteiro e rode. Ele monta as
   tabelas e toda a lógica do sorteio.
3. Em **Settings → API Keys**, copie a *Project URL*, a *publishable key* e a
   *secret key*.
4. Copie `js/config.example.js` para `js/config.js` e cole a *Project URL* e a
   *publishable key*.
5. Copie `js/servidor.secreto.example.js` para `js/servidor.secreto.js` e cole
   a *Project URL* e a *secret key* (é ela que o cadastro usa, pelo servidor).

Aí: `npm run dev` e abra `http://localhost:8099`.

> A *publishable key* e a URL são públicas de propósito — vão no navegador de
> quem acessa. Quem protege os dados são as regras do banco. Já a *secret key*
> fica só no servidor: nunca no navegador, nunca no git (o `.gitignore` já
> segura o `js/config.js` e o `js/servidor.secreto.js`).

---

## Publicando

É site estático + uma função de servidor. Na Vercel: importe o repositório e
cadastre nas variáveis de ambiente:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` — a *publishable key*
- `SUPABASE_SERVICE_ROLE_KEY` — a *secret key*

O resto já está no `vercel.json`.

---

## Por dentro

HTML, CSS e JavaScript na mão, sem framework. O banco é o **Supabase** (Postgres
+ login + tempo real), que entra por CDN. O cenário de Natal — a neve, o
vilarejo, o Papai Noel jogando presente nas chaminés — é tudo SVG desenhado no
código, nenhuma imagem.

O sorteio roda dentro do banco, não no navegador de quem clicou. As tabelas com
o resultado e as dicas não têm permissão nenhuma para quem acessa pelo site —
só as funções do servidor chegam nelas.

```
index.html          entrar e listar suas salas
login.html          criar conta e entrar
sala.html           a sala
api/criar-conta.js  cria a conta no cadastro (servidor)
css/natal.css       o visual
js/                 a lógica
sql/                o banco
```

---

MIT. Pode usar, mudar e publicar à vontade.
