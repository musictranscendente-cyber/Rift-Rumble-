#!/usr/bin/env bash
# Gera release/RiftRumble.aab para a Google Play (precisa do Gradle e do Android SDK; roda no GitHub Actions).
# Assina com a chave de upload se KEYSTORE_FILE e KEYSTORE_PASSWORD estiverem definidos.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION_CODE="${VERSION_CODE:-$(git -C "$ROOT" rev-list --count HEAD 2>/dev/null || echo 1)}"
export VERSION_CODE
ASSETS="$ROOT/build/play-assets"

rm -rf "$ASSETS"
mkdir -p "$ASSETS" "$ROOT/release"
cp -r "$ROOT/web/." "$ASSETS/"
# store: 'play' desliga o aviso de atualização pelo GitHub (a Play cuida disso)
echo "window.RR = window.RR || {}; RR.VERSION = { code: $VERSION_CODE, name: '1.0.$VERSION_CODE', store: 'play' };" > "$ASSETS/js/version.js"

gradle -p "$ROOT/android/play" --no-daemon -q bundleRelease
cp "$ROOT/android/play/build/outputs/bundle/release/"*.aab "$ROOT/release/RiftRumble.aab"
# confere a assinatura: com a chave configurada, um .aab sem assinatura é erro (a Play recusaria)
if [ -n "${KEYSTORE_FILE:-}" ]; then
  jarsigner -verify "$ROOT/release/RiftRumble.aab" | grep -q "jar verified" || { echo "AAB sem assinatura válida"; exit 1; }
  echo "> Assinado com a chave de upload"
fi
echo "> Pronto: release/RiftRumble.aab (versão 1.0.$VERSION_CODE)"
