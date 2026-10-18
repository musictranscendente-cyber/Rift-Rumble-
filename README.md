# Rift Rumble

Jogo de luta de plataforma estilo Smash Bros para celular (Android), feito em HTML5 Canvas + JavaScript e empacotado num app Android nativo (WebView).

**Baixar o APK:** [último Release](https://github.com/musictranscendente-cyber/Rift-Rumble-/releases/latest) → `RiftRumble.apk`

### Atualização automática

A cada push que muda o jogo, o GitHub Actions (`.github/workflows/apk.yml`) compila o APK e publica um Release novo (`v<número>`). Ao abrir, o app consulta o último Release e, se houver versão mais nova, mostra **NOVA VERSÃO → ATUALIZAR**, que baixa o APK pelo navegador; é só tocar no arquivo para instalar por cima (a assinatura é sempre a mesma). A versão instalada aparece no canto da tela inicial.

## Como jogar

- Sem barra de vida: cada golpe soma **% de dano**. Quanto maior a %, mais longe o lutador voa.
- Jogue os oponentes para fora da arena (blast zones).
- Modos: **3 Vidas** ou **Tempo (2 min)**, contra 1 a 3 bots (Fácil, Médio ou Difícil).
- **Respawn:** você reaparece numa plataforma no alto com 0%. A plataforma some quando você se move ou depois de 3 s, e você fica 2 s invencível (piscando).

### Controles de toque

| Controle | Ação |
|---|---|
| Joystick (metade esquerda da tela) | Mover. Para baixo numa plataforma fina: descer. Para baixo no ar: queda rápida |
| **A** | Ataque básico (combo de 3). Com joystick ↑/↓: golpe alto/baixo/meteoro |
| **B** | Skill especial. **↑ + B**: skill de recuperação |
| Seta | Pular (pulo duplo) |
| Escudo | Defender. Escudo + lado: rolar. Escudo + ↓: esquiva. No ar: esquiva aérea |
| Estrela | **Ultimate** (a barra enche causando e recebendo dano) |

Tamanho e opacidade dos controles, som, música e vibração ficam em **Opções**.

No PC (para testar): A/D/W/S ou setas, Espaço (pulo), J (ataque), K (especial), L (escudo), U (ultimate), Esc (pausa).

## Personagens (elenco do zodíaco)

| Lutador | Estilo | A | B | ↑B | Ultimate |
|---|---|---|---|---|---|
| **Lunara** ♋ | Tanque: lenta, forte e muito pesada | Garras da Maré | Orbe Abissal | Jato Lunar | Imperatriz do Oceano |
| **Solkar** ♌ | Rei guerreiro: forte e pesado | Garras Solares | Rugido Solar (com armadura) | Ascensão do Leão | Coroa da Estrela |
| **Astrael** ♐ | Arqueiro estelar (alcance 5) | Combo Celeste | Flecha Cometa (atravessa todos) | Ascensão Estelar | Chuva de Constelações |
| **Noxara** ♏ | Assassina ágil (veneno) | Combo Ferrão | Lâmina Venenosa (envenena) | Espiral do Escorpião | Eclipse Venenoso |
| **Vex** ♊ | Gêmeos de luz e sombra | Combo Gêmeo | Orbe Dual (alterna luz/sombra) | Espiral Gêmea | Dragões Gêmeos |

Arenas: **Trono Solar** (Solkar: escadarias, ilhas flutuantes no meio e plataformas altas), **Observatório Celeste** (Astrael: passarelas inclinadas), **Abismo do Escorpião** (Noxara) e **Santuário dos Gêmeos** (Vex).

Todos os lutadores e arenas usam a arte enviada (`art/source/`).

## Estrutura

```
web/            o jogo (abre direto no navegador: web/index.html)
  js/characters.js  personagens, skills e golpes (dados fáceis de editar)
  js/stages.js      arenas
  js/fighter.js     física, estados, escudo, esquivas, borda
  js/game.js        regras, knockback, KO, respawn, câmera, efeitos
  js/ai.js          bots
  js/render.js      desenho dos personagens, cenário e HUD
  js/input.js       joystick e botões de toque
  js/ui.js          menus
android/        projeto Android (Activity com WebView, manifesto, ícones)
tools/          build do APK, simulação de balanceamento e teste no navegador
release/        APK gerado
```

### Arte em sprites (personagens do zodíaco)

As folhas de personagem ficam em `art/source/` (fundo verde). `python3 tools/extract-vex.py` remove o verde, recorta cada quadro (`web/img/vex/`), calcula o ponto de apoio dos pés e gera `web/js/sprites-vex.js`. Em `web/js/sprites.js` fica qual quadro usar em cada estado/golpe e a escala de cada linha da folha. Plataformas com `y2` em `stages.js` são rampas (altura `y` na esquerda e `y2` na direita). A logo (`art/source/logo-icone.png`) gera os ícones do app inteira, sem cortar. A arena vira `web/img/arena-gemeos.webp`; a colisão das plataformas está em `web/js/stages.js` (1 px da imagem = 0,8 unidade do mundo).

Personagens novos seguem o modelo da Noxara: folha em grade (`tools/extract-noxara.py` + `tools/sprite_tools.py`) e uma entrada em `SETS` no `sprites.js` dizendo qual quadro usar em cada estado e golpe.

### Animações a partir de vídeo

A Lunara usa quadros extraídos de vídeos curtos (fundo verde, câmera parada, personagem no lugar): `tools/extract-lunara.py` tira os quadros com ffmpeg, remove o verde, usa o mesmo recorte e ponto de apoio para o vídeo inteiro e salva em WebP. Em `sprites.js`, `{ track: [...] }` toca a sequência ao longo do golpe inteiro.

### Criar um personagem novo

Copie um bloco em `web/js/characters.js` (por exemplo `C.solkar`), mude atributos e golpes e adicione o id em `C.list`.

## Build

```bash
# Dependências (Ubuntu/Debian)
sudo apt-get install android-sdk-platform-23 aapt apksigner zipalign dalvik-exchange openjdk-17-jdk
./tools/build-apk.sh                      # gera release/RiftRumble.apk (versão = nº de commits)

node tools/sim.js 20                      # simula partidas bot x bot + tabela de % para KO
NODE_PATH=$(npm root -g) node tools/browser-test.js /tmp   # teste no Chromium com capturas
```

> A chave `android/riftrumble-dev.keystore` (senha `riftrumble`) é **só para testes**: ela mantém a mesma assinatura entre versões para que o APK atualize sem desinstalar. Para publicar na Play Store, gere uma chave privada e não a coloque no repositório.
