# Loja e personalização do Rift Rumble

Tudo é **só visual**: nenhum item deixa o lutador mais forte.

## Onde fica
- **Menu inicial → 🛒 LOJA**. No topo há duas abas: **LOJA** (comprar) e **MEUS ITENS** (o que você tem, para equipar).
- **Escolher lutador → 🎨 SKINS** (no canto da vitrine) abre direto as skins do lutador escolhido.
- A vitrine da esquerda mostra o item em ação: skin andando e atacando, comemoração, nocaute, emote ou como fica no ranking.

## Os 5 lugares de personalização
| Aba | O que muda | Onde aparece |
|---|---|---|
| 🎨 Skins | visual do lutador | luta, seleção, resultado, placar |
| 🏆 Vitória | efeito na cena de vitória | fim da luta |
| 💥 Nocaute | efeito quando você derruba alguém | na luta |
| 😀 Emotes | balão com emoji (até 4 levados para a luta) | botão 😀 na luta (no PC, teclas 1 a 4) |
| 🪪 Perfil | ícone, moldura e título | ranking da Ranqueada (para todos verem) |

Os bots também aparecem às vezes com itens da loja (skins, efeitos, emotes), como vitrine.

## Moedas 🪙 e gemas 💎
- **Moedas por luta:** 10, mais 20 se vencer e 5 por nocaute. Cada missão completa dá 50 e cada nível novo dá 100.
- **Gemas:** 20 a cada 5 níveis, mais os prêmios da temporada da Ranqueada.
- **Presente de abertura:** na primeira vez que abre a loja, o jogador ganha 500 🪙 e 50 💎.
- **Ofertas do dia:** 3 itens com 25% de desconto que mudam à meia-noite, sempre com uma skin entre eles.
- **Exclusivos (não se compram):**
  - Moldura e título "Lenda do Zodíaco": chegar à liga máxima.
  - Título "Top 10": terminar uma temporada no Top 10.
- **Pacotes de gemas com dinheiro:** aparecem como "EM BREVE". Entram com o Google Play Billing numa próxima etapa.

## Itens de exemplo (já no jogo)
- **Skins:**
  - Solkar Eclipse (💎300)
  - Lunara Abismo Coral (🪙1.500)
  - Bront Coração de Lava (💎300)
  - Astrael Caçador do Gelo (🪙1.500)
  - Noxara Neon Cyber (💎600)
  - Vex Gêmeos de Ouro (💎300)
- **Vitória:** Chuva de Confete, Anel de Fogo, Coroa de Estrelas, Tempestade.
- **Nocaute:** Estrelas, Pétalas, Fogos de Artifício, Relâmpago, Buraco Negro.
- **Emotes:** 👋 😂 grátis; 🤝GG 🔥 😴 😎 💪 🤡 👑 à venda.
- **Perfil:**
  - Ícones: rostos grátis e ⚡💀🌌🐉👑 à venda.
  - Molduras: Prata, Ouro, Neon, Arco-íris e Lenda.
  - Títulos.

As skins de exemplo são **recoloridas** a partir dos quadros originais. Quando chegarem os vídeos, cada uma ganha quadros próprios.

## Como trocar uma skin de exemplo pela versão em vídeo
1. **Grave os vídeos da skin** no Grok, no mesmo esquema dos vídeos do lutador: parado, corrida, pulo, recuperação, golpes 1 a 3, especial, ultimate e vitória.
2. **Mande os vídeos** dizendo o nome da skin. Eu extraio os quadros para a pasta `web/img/<lutador>-<skin>/`.
3. **No catálogo** (`web/js/cosmetics.js`), troco o `filter:` da skin por `dir: '<lutador>-<skin>'`.

Só a comemoração de vitória de um lutador também pode virar vídeo próprio (1 vídeo por lutador).

## Banco (Supabase)
Para o perfil (ícone, moldura, título) aparecer no ranking para os outros jogadores, rode de novo o `supabase/ranking.sql` no SQL Editor:
- ele cria a coluna `cosm`;
- o resto continua igual.

Sem isso, o jogo funciona normalmente: só o perfil dos outros jogadores reais aparece com o visual padrão.
