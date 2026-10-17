# Rift Rumble

Jogo de luta de plataforma estilo Smash Bros para celular (Android), feito em HTML5 Canvas + JavaScript e empacotado num app Android nativo (WebView).

**APK pronto:** [`release/RiftRumble.apk`](release/RiftRumble.apk)

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
| Seta | Pular (pulo duplo; Zyra tem pulo triplo) |
| Escudo | Defender. Escudo + lado: rolar. Escudo + ↓: esquiva. No ar: esquiva aérea |
| Estrela | **Ultimate** (a barra enche causando e recebendo dano) |

Tamanho e opacidade dos controles, som, música e vibração ficam em **Opções**.

No PC (para testar): A/D/W/S ou setas, Espaço (pulo), J (ataque), K (especial), L (escudo), U (ultimate), Esc (pausa).

## Personagens

| Lutador | Estilo | A | B | ↑B | Ultimate |
|---|---|---|---|---|---|
| **Kael** | Equilibrado (fogo) | Lâmina Ígnea | Bola de Fogo | Ascensão Flamejante | Inferno |
| **Zyra** | Rápida, leve (vento) | Lâminas Gêmeas | Corte do Vento | Tornado | Tempestade de Lâminas |
| **Gorak** | Pesado, forte (pedra) | Punhos de Rocha | Tremor (blindado) | Salto Rochoso | Meteoro |
| **Lumi** | À distância (gelo) | Cajado Cristal | Estilhaço de Gelo | Teleporte | Raio Prismático |

Arenas: **Ruínas Celestes** (3 plataformas) e **Fenda Vulcânica** (larga, 2 plataformas).

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

### Criar um personagem novo

Copie um bloco em `web/js/characters.js` (por exemplo `C.kael`), mude atributos e golpes e adicione o id em `C.list`.

## Build

```bash
# Dependências (Ubuntu/Debian)
sudo apt-get install android-sdk-platform-23 aapt apksigner zipalign dalvik-exchange openjdk-17-jdk
./tools/build-apk.sh                      # gera release/RiftRumble.apk

node tools/sim.js 20                      # simula partidas bot x bot + tabela de % para KO
NODE_PATH=$(npm root -g) node tools/browser-test.js /tmp   # teste no Chromium com capturas
```

> A chave `android/riftrumble-dev.keystore` (senha `riftrumble`) é **só para testes**: ela mantém a mesma assinatura entre versões para que o APK atualize sem desinstalar. Para publicar na Play Store, gere uma chave privada e não a coloque no repositório.
