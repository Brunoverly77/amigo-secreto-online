# 🎄 Amigo Secreto Online

Site para organizar o amigo secreto do seu grupo pelo celular. Manda um link
no WhatsApp e pronto — ninguém baixa aplicativo, ninguém faz cadastro,
ninguém cria senha.

Feito para aquele grupo da família ou do trabalho em que sempre falta alguém,
alguém esquece quem tirou, e o organizador vira secretário do Natal.

---

## Como funciona

Uma pessoa cria a sala e recebe um código de 6 letras e um link. Manda no
grupo.

Cada um abre o link **no próprio celular** e escreve o próprio nome. A lista
cresce na tela de todo mundo ao mesmo tempo, então dá para ver quem já entrou
e quem está faltando.

Quando não falta ninguém, o organizador clica em sortear. A sala tranca.

Aí cada um abre o link de novo e vê só quem tirou — junto com a dica de
presente que a pessoa deixou, se deixou.

---

## As regras

**Só entra quem abrir o link.** Ninguém adiciona ninguém. Isso parece um
detalhe, mas é o que evita o problema clássico: alguém coloca um nome "pra não
esquecer", a pessoa nunca aparece, e no dia da festa falta presente.

**Mínimo de 3 pessoas.** Com 2 todo mundo já sabe.

**O sorteio é livre.** Qualquer um pode tirar qualquer um. A única regra é que
ninguém tira a si mesmo — se acontecer no embaralhamento, o sistema refaz.

**Depois de sortear, acabou.** A lista tranca, ninguém mais entra ou sai, e
não dá para refazer o sorteio depois que alguém já olhou o resultado.

**O resultado não muda.** Pode fechar, voltar daqui a um mês, trocar de
aparelho: é sempre a mesma pessoa.

---

## Como você vê quem tirou, sem senha

Ninguém quer decorar senha para um amigo secreto de família. Então funciona
assim: quando você entra na sala, o seu navegador guarda uma chave invisível.
É ela que diz ao site que você é você.

Como chave guardada no navegador some se você trocar de celular ou limpar os
dados, o site te dá um **link pessoal** logo que você entra, com um botão para
mandar para você mesmo no WhatsApp. Guardou, está resolvido: abre esse link em
qualquer aparelho e você volta a ser você.

Esse link é só seu. Quem abrir ele entra como você. Por isso ele é de uso
único: assim que alguém usa, ele morre e nasce um novo. Se vazar no grupo e um
curioso clicar, o seu acesso cai na hora e você percebe — em vez de ser
espionado caladinho.

E na hora de revelar tem um botão para mandar o resultado para você mesmo no
WhatsApp. Com ele salvo lá, você nem precisa voltar ao site.

Se perder tudo, o organizador tem um botão para liberar o seu nome e você
reassume num aparelho novo, com o mesmo resultado de antes.

---

## O que o organizador pode e não pode

**Pode** tirar alguém da lista antes do sorteio, liberar o nome de quem perdeu
o acesso, desfazer o sorteio enquanto ninguém tiver olhado, e apagar a sala.

**Não pode** ver quem tirou quem. Nem ele. O painel dele mostra só quem já
abriu o resultado.

---

## Rodando na sua máquina

Precisa do [Node](https://nodejs.org). Nenhuma biblioteca, nenhum
`npm install`.

```bash
git clone https://github.com/Brunoverly77/amigo-secreto-online.git
cd amigo-secreto-online

copy js\config.example.js js\config.js     # Windows
cp   js/config.example.js js/config.js     # Linux / Mac

npm start
```

Antes de abrir, você precisa de um banco. É de graça:

1. Crie uma conta no [supabase.com](https://supabase.com) e um projeto novo.
2. No **SQL Editor**, cole o `sql/01-schema.sql` inteiro e rode. Ele monta as
   tabelas e toda a lógica do sorteio.
3. Em **Settings → API Keys**, copie a *Project URL* e a chave *anon public*.
4. Cole as duas no `js/config.js`.

Aí sim: `npm start` e abra `http://localhost:8099`.

> A chave *anon* é pública de propósito — ela vai no navegador de quem acessa.
> Quem protege os dados são as regras do banco, não o sigilo dela. A chave
> *service_role*, essa sim é secreta, e não é usada em lugar nenhum aqui.

---

## Publicando

É site estático, vai em qualquer lugar. Na Vercel: importe o repositório,
cadastre `SUPABASE_URL` e `SUPABASE_ANON_KEY` nas variáveis de ambiente, e
pronto. O resto já está no `vercel.json`.

---

## Por dentro

HTML, CSS e JavaScript na mão, sem framework e sem nenhuma dependência. O
Supabase entra por CDN. O cenário de Natal — a neve, o vilarejo, o Papai Noel
jogando presente nas chaminés — é tudo SVG desenhado no código, nenhuma
imagem.

O sorteio roda dentro do banco, não no navegador de quem clicou. As tabelas
com o resultado, as chaves das pessoas e as dicas não têm permissão nenhuma
para quem acessa pelo site — só as funções do servidor chegam nelas.

```
index.html      criar sala ou entrar com código
sala.html       a sala
css/natal.css   o visual
js/             a lógica
sql/            o banco
```

---

MIT. Pode usar, mudar e publicar à vontade.
