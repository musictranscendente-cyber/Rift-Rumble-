# Ranqueada do Rift Rumble

## Como funciona a pontuação

| Situação | Pontos |
|---|---|
| Vitória | **+20** |
| Adversário com mais pontos que você | **+1 a cada 20 pontos** de diferença (no máximo +10) |
| 3ª vitória seguida em diante | **+5** por vitória |
| Derrota, desistência ou abandono | **−12** |
| Empate | +3 (a Ranqueada é por 3 vidas, então quase nunca acontece) |

**Ligas** (temas do zodíaco):

| Liga | A partir de |
|---|---|
| 🌑 Poeira Estelar (Stardust) | 0 |
| ☄️ Cometa (Comet) | 300 |
| 🌙 Lua Crescente (Crescent Moon) | 700 |
| ☀️ Sol Nascente (Rising Sun) | 1.200 |
| ✨ Constelação (Constellation) | 1.800 |
| 👑 Lenda do Zodíaco (Zodiac Legend) | 2.500 |

**Proteção de liga:** quem chega numa liga não cai abaixo do piso dela até o fim da temporada.

**Temporadas:** uma por mês, viram à meia-noite UTC do dia 1 (21h de Brasília do último dia). A temporada 1 é novembro de 2026.
Na virada: os pontos caem pela metade, você ganha moedas (e gemas a partir do Sol Nascente) pela maior liga alcançada,
e quem termina no **Top 10** ganha um troféu 🏆 e um bônus. O prêmio aparece numa janela que só fecha no OK.

**Os 100 jogadores simulados:** apelidos variados, cada um com um personagem favorito. Os pontos deles são calculados
a partir da data (sem servidor), então todo aparelho vê o mesmo ranking. Eles começam a temporada com metade da meta,
cada um sobe num ritmo, e oscilam de hora em hora e de dia em dia. No fim do mês o 1º fica perto de 2.800 e o 100º perto de 700.
Abaixo deles existe uma "multidão" de ~1.400 jogadores (cresce um pouco por dia): quem começa com 0 aparece lá pelo #1.400.
Quando houver mais de 20 jogadores reais na temporada, cada jogador real a mais tira um simulado do ranking.

**Adversário:** longe do Top 100, alguém da multidão com pontos parecidos com os seus; perto do Top 100, um dos 6 simulados
com pontos mais próximos. A IA fica mais difícil nas ligas altas (e na liga máxima o adversário já começa com metade do ultimate).

**Cuidados:** enquanto existirem jogadores simulados, os prêmios são só itens do jogo (moedas, gemas, troféus), nunca dinheiro
ou prêmio com valor real. O jogo não diz "jogue contra pessoas reais".

---

## Ligar a nuvem (jogadores reais no ranking)

Sem esta parte a Ranqueada já funciona no **modo local** (você contra os simulados, salvo só no aparelho).
Para ter jogadores reais, contas e ranking online, use o Supabase (grátis):

### 1. Criar o projeto
1. Entre em **https://supabase.com** e crie uma conta.
2. **New project** → nome `rift-rumble` → crie uma senha do banco (guarde) → região **South America (São Paulo)** → **Create**.
3. Espere uns 2 minutos o projeto ficar pronto.

### 2. Criar a tabela e as regras
1. No menu da esquerda: **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/ranking.sql` deste repositório, copie **tudo** e cole.
3. Clique em **Run**. Deve aparecer "Success. No rows returned".

### 3. Login por e-mail
1. Menu **Authentication** → **Sign In / Providers** → **Email**: deixe ligado.
2. Recomendado para começar: desligue **Confirm email** (assim a pessoa cria a conta e já joga).
   Se deixar ligado, ela recebe um e-mail e precisa clicar no link antes de entrar.

### 4. Me passar os dados do projeto
1. Menu **Project Settings** → **API** (ou **Data API**).
2. Copie o **Project URL** (algo como `https://abcdxyz.supabase.co`) e a chave **anon public**.
3. Me mande os dois. A chave "anon public" é feita para ficar dentro do app (as regras do banco é que protegem os dados).
   **Nunca** mande a chave `service_role`.

Com eles eu preencho `web/js/rank-config.js`, adiciono a permissão de internet na versão da Google Play
e gero uma versão nova. Também será preciso atualizar na Play Console a **Segurança dos dados** (e-mail e apelido passam a ser coletados)
e a **política de privacidade** — eu preparo os textos.

### 5. Testar
1. Abra o jogo → **🏆 RANKED** → **SIGN IN** → crie uma conta com e-mail, senha e apelido.
2. Toque em **PLAY RANKED** e jogue uma partida.
3. No Supabase, menu **Table Editor** → `ranked_players`: sua linha aparece com os pontos.
4. Num segundo aparelho (ou aba anônima), abra o ranking sem entrar: seu apelido aparece na lista.
5. Proteção: tente editar os pontos de outra pessoa pelo app — não dá (cada um só grava a própria linha),
   e subir pontos demais de uma vez é recusado pelo banco.

## Testes automáticos (para quem mexer no código)
- `node tools/rank-test.js` — regras: pontos, ligas, proteção, virada de temporada, simulados, multidão, adversário.
- `NODE_PATH=$(npm root -g) node tools/rank-browser-test.js <pasta>` — o jogo no navegador com uma nuvem simulada:
  ranking sem conta, criar conta, procurar adversário, VS, vitória, envio recusado pelo banco e reenviado depois,
  sem internet, desistência, partida abandonada e virada de temporada. Tira capturas de tela na pasta.
