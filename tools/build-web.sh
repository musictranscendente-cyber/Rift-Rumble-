#!/usr/bin/env bash
# Gera o pacote do jogo para sites de jogos no navegador.
#   ./tools/build-web.sh crazygames  -> release/RiftRumble-crazygames.zip (com o SDK de anúncios do CrazyGames)
#   ./tools/build-web.sh             -> release/RiftRumble-web.zip (navegador comum, sem SDK)
# O .zip tem o index.html na raiz, como os sites pedem.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-web}"
BUILD="$ROOT/build/web-$TARGET"
OUT="$ROOT/release/RiftRumble-$TARGET.zip"
VERSION_CODE="${VERSION_CODE:-$(git -C "$ROOT" rev-list --count HEAD 2>/dev/null || echo 1)}"

rm -rf "$BUILD"
mkdir -p "$BUILD" "$ROOT/release"
cp -r "$ROOT/web/." "$BUILD/"
echo "window.RR = window.RR || {}; RR.VERSION = { code: $VERSION_CODE, name: '1.0.$VERSION_CODE' };" > "$BUILD/js/version.js"

if [ "$TARGET" = "crazygames" ]; then
  # SDK deles carregado antes do jogo (js/platform.js inicializa e chama os anúncios entre partidas)
  sed -i 's#<script src="js/version.js"></script>#<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n  <script src="js/version.js"></script>#' "$BUILD/index.html"
  grep -q crazygames-sdk-v3 "$BUILD/index.html"
fi

rm -f "$OUT"
(cd "$BUILD" && zip -q -r -9 "$OUT" .)
FILES=$(find "$BUILD" -type f | wc -l)
SIZE=$(du -sh "$BUILD" | cut -f1)
echo "> $OUT ($FILES arquivos, $SIZE)"
