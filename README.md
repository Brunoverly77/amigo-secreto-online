# 🎄 Amigo Secreto de Natal

Site para organizar o amigo secreto de um grupo pelo celular. Sem app, sem
cadastro, sem senha: uma pessoa cria a sala, manda o link no WhatsApp, e
**cada um entra com o próprio nome, no próprio celular**.

Custo: **R$ 0**. Roda nos planos gratuitos do Supabase e da Vercel.

---

## A regra que define o projeto

**Ninguém adiciona ninguém.** Quem não abriu o link e não digitou o próprio
nome, não está na lista — e por isso não entra no sorteio.

Isso evita o problema clássico desse tipo de site: alguém adiciona um nome
"para não esquecer", a pessoa nunca aparece, e o sorteio nasce quebrado, com
um participante fantasma que ninguém vai presentear.

---

## Como funciona, do começo ao fim

1. Alguém cria a sala e recebe um código de 6 caracteres e um link.
2. Manda no grupo do WhatsApp.
3. Cada pessoa abre o link, escreve o próprio nome e (se quiser) uma dica de
   presente. A lista cresce ao vivo na tela de todo mundo.
4. Quando não falta ninguém, o organizador clica em **Realizar sorteio**.
   A sala trava: ninguém mais entra nem sai.
5. Cada um abre o link no próprio celular e vê só quem tirou, junto com a
   dica que essa pessoa deixou.

O resultado fica salvo na nuvem. Pode voltar no dia da festa: é a mesma
pessoa.

---

## Rodando na sua máquina

Precisa só do [Node](https://nodejs.org) instalado. Nenhuma biblioteca, nenhum
`npm install`.

```bash
git clone https://github.com/Brunoverly77/amigo-secreto-online.git
cd amigo-secreto-online

# copie o modelo de configuração
copy js\config.example.js js\config.js     # Windows
cp   js/config.example.js js/config.js     # Linux / Mac

# abra js/config.js e preencha com as chaves do SEU Supabase (passos abaixo)

npm start
```

Depois abra **http://localhost:8099**.

> As páginas usam `fetch`, que não funciona abrindo o arquivo com duplo
> clique. Por isso o `npm start`, que sobe um servidorzinho local.

---

## Como ligar o projeto (3 passos)

### 1. Criar o banco no Supabase

1. Entre em [supabase.com](https://supabase.com) e crie uma conta.
2. **New project** → nome, senha de banco, região **South America (São Paulo)**.
3. Espere uns 2 minutos até ficar pronto.
4. Menu da esquerda → **SQL Editor** → **New query**.
5. Abra `sql/01-schema.sql`, copie **tudo**, cole lá e clique em **Run**.
6. Vai aparecer um aviso *"Potential issue detected"*, porque o script tem
   `drop table`. É esperado: ele apaga e recria só as cinco tabelas do amigo
   secreto, listadas uma a uma. Clique em **Run query**.

> ⚠️ Rodar esse arquivo de novo **zera todas as salas**. Use só na instalação.

Dá para instalar num projeto Supabase que você já usa para outra coisa. Os
nomes das tabelas (`salas`, `participantes`, `sorteios`, `segredos`,
`salas_admin`) e das funções não colidem com nada comum. Para conferir antes,
rode isto e veja se volta alguma linha:

```sql
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in ('salas','participantes','sorteios','segredos','salas_admin');
```

### 2. Colar as chaves no `js/config.js`

1. No Supabase: **Settings** → **API Keys** → aba **Legacy anon, service_role**.
2. Copie o **Project URL** e a chave **anon public**.
3. Cole em `js/config.js` (o arquivo que você copiou do `config.example.js`):

```js
window.CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi..."
};
```

### 3. Rodar

```bash
npm start
```

---

## Sobre as chaves, para não haver engano

**A chave `anon` não é secreta.** Ela vai dentro do site, no navegador de
quem acessa — qualquer visitante consegue lê-la apertando F12. É assim que o
Supabase foi desenhado. Quem protege os dados são as regras RLS e as funções
de `sql/01-schema.sql`, nunca o sigilo dessa chave.

Ainda assim, `js/config.js` fica fora do repositório (veja o `.gitignore`).
Não é para esconder a chave, e sim para o projeto ficar genérico para quem
clonar, e para você poder trocar a chave num lugar só.

**A `service_role` é outra coisa.** Ela ignora todas as regras de segurança.
Nunca coloque no front-end, nem em repositório, nem em conversa. O `build.js`
tem uma trava que recusa publicar se detectar que a chave informada é uma
`service_role`.

---

## Publicar na internet (Vercel)

O site é estático, mas tem um passo de build de uma linha: o `build.js` gera
o `js/config.js` a partir das variáveis de ambiente, já que esse arquivo não
está no repositório.

1. Entre em [vercel.com](https://vercel.com) e faça login com o GitHub.
2. **Add New** → **Project** → importe este repositório.
3. Em **Environment Variables**, cadastre as duas:

   | Nome | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://xxxxxxxx.supabase.co` |
   | `SUPABASE_ANON_KEY` | `eyJhbGciOi...` (a **anon public**) |

4. O resto já vem pronto no `vercel.json`: comando de build `node build.js`,
   sem framework. Clique em **Deploy**.

Em menos de um minuto sai o link, algo como
`https://amigo-secreto-online.vercel.app`. Esse é o link que vai para o grupo.

A partir daí, todo `git push` republica o site sozinho.

---

## Como o sigilo funciona

Sem login e sem senha, o que impede alguém de ver o resultado de outra
pessoa? Quatro camadas.

**1. Tabelas separadas.** O navegador roda com a chave pública, e o recurso
de tempo real do Supabase transmite a linha inteira para todos os celulares
da sala. Por isso nada secreto mora nas tabelas públicas:

| Público (o celular lê) | Secreto (só as funções leem)              |
|------------------------|-------------------------------------------|
| `salas`                | `salas_admin` — token do organizador      |
| `participantes`        | `segredos` — chave e dica de cada pessoa  |
|                        | `sorteios` — quem tirou quem              |

As três tabelas secretas não têm **nenhuma** permissão para a chave pública.
Testado contra a API real: elas respondem **HTTP 401**.

**2. A chave do celular.** Ao entrar na sala, a pessoa recebe um `uuid`
aleatório que fica guardado no navegador dela. É ele que prova quem ela é.
Nunca aparece na tela, nunca passa pelas tabelas públicas, e nem o
organizador consegue ver.

**3. O sorteio roda no servidor.** A função `realizar_sorteio` embaralha
dentro do PostgreSQL e grava o resultado lá. O celular de quem clicou não
decide nada, e a linha da sala é travada durante a operação — dois cliques
ao mesmo tempo não geram dois sorteios.

**4. A trava da sala.** Depois do sorteio, o próprio banco recusa qualquer
tentativa de entrar ou sair, venha de onde vier.

Nem o organizador consegue espiar: o painel dele mostra apenas quem já abriu
o resultado, nunca quem tirou quem.

---

## Se alguém perder o acesso

A chave fica no navegador. Se a pessoa limpar os dados do navegador ou trocar
de celular, perde o acesso ao próprio nome. A recuperação é assim:

1. Ela avisa o organizador.
2. No **Painel do organizador**, ele clica no `↺` ao lado do nome dela.
3. Ela abre o link no celular novo e toca no próprio nome, que agora aparece
   como disponível para reassumir.
4. Ela recebe uma chave nova e vê **o mesmo resultado de antes**.

O organizador nunca recebe a chave nessa operação — ele só destrava o nome.

---

## Cancelar ou refazer

No cartão **Cancelar a sala**, visível só para o organizador:

**↺ Desfazer o sorteio.** Para quando você sorteou e percebeu que faltou
gente. Joga o resultado fora, a sala reabre, o pessoal que falta entra, e
você sorteia de novo.

Só funciona **enquanto ninguém tiver aberto o resultado**. Depois que a
primeira pessoa olha, o botão some e o banco recusa a operação: refazer
seria injusto com quem já viu, e vazaria informação.

**🗑 Apagar a sala.** Remove tudo — lista, dicas, sorteio, código — para todo
mundo. Para evitar acidente, o botão de confirmar só destrava depois que você
digitar o código da sala. Não tem como desfazer.

---

## Regras do sorteio

- Totalmente aleatório e livre: qualquer um pode tirar qualquer um.
- A única proibição é tirar a si mesmo. O método é embaralhar e refazer se
  alguém cair no próprio nome — com poucas pessoas o banco repete em
  milissegundos, e qualquer combinação válida pode sair.
- Mínimo de 3 participantes (com 2 o resultado é óbvio).
- Resultado fixo: a pessoa pode voltar dias depois e vê sempre o mesmo nome.

---

## Os arquivos

```
amigo-secreto-online/
├── index.html             criar sala ou entrar com código
├── sala.html              a sala: entrada, lista ao vivo, sorteio, revelação
├── css/
│   └── natal.css          todo o visual (neve, guirlanda, trenó, cartões)
├── js/
│   ├── config.example.js  modelo — copie para config.js
│   ├── config.js          suas chaves (fora do repositório)
│   ├── comum.js           conexão, cenário de Natal, avisos, memória
│   ├── index.js           tela inicial
│   └── sala.js            a sala
├── sql/
│   └── 01-schema.sql      tabelas, permissões e funções do banco
├── build.js               gera o config.js na Vercel, a partir das env vars
├── servidor.js            servidor local para desenvolvimento
└── vercel.json            configuração da publicação
```

Sem dependências: o `package.json` não tem um único pacote. Tudo roda com
Node puro, e o Supabase entra por CDN direto no HTML.

---

## Ideias para depois

- Lista de desejos com 2 ou 3 sugestões por pessoa.
- Botão "confirmo que está tudo certo", liberando o sorteio só quando todos
  confirmarem.
- Transferir o papel de organizador, para o caso de quem criou sumir — hoje,
  se o organizador perde o celular, a sala fica sem quem sorteie.
- Restrição de casais, opcional e desligada por padrão.
- Limpeza automática: apagar salas com alguns meses de idade.
- Outros jogos na mesma base: sorteio de times, papéis secretos, ordem de
  tarefas. Todos reusam sala com código + sorteio no servidor.
