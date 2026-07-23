#!/usr/bin/env bash
#
# Refresh the tastytrade Deck Builder assets hosted in this repo, then push.
# The claude.ai Deck Builder project fetches these from raw.githubusercontent.com
# at build time, so pushing here is all it takes to update every future deck.
#
# Usage:
#   ./update-deck-assets.sh template [PPTX_PATH]   # default: ~/Desktop/Tastytrade Template.pptx
#   ./update-deck-assets.sh icons  [SVG_SRC_DIR]   # default: web-based-2.0 icons-2.0/SVG
#   ./update-deck-assets.sh both                   # both, using defaults
#
# Nothing is pushed unless a file actually changed.
set -euo pipefail
cd "$(dirname "$0")"

DEST="deck-builder"
DEFAULT_PPTX="$HOME/Desktop/Tastytrade Template.pptx"
DEFAULT_SVG="$HOME/Repositories/web-based-2.0/packages/icons-2.0/SVG"
mkdir -p "$DEST"

do_template() {
  local src="${1:-$DEFAULT_PPTX}"
  [ -f "$src" ] || { echo "✗ template not found: $src"; exit 1; }
  cp "$src" "$DEST/tastytrade-template.pptx"
  echo "✓ template updated from: $src"
}

do_icons() {
  local svg="${1:-$DEFAULT_SVG}"
  [ -d "$svg" ] || { echo "✗ SVG source dir not found: $svg"; exit 1; }
  command -v node >/dev/null || { echo "✗ node is required to rebuild icons"; exit 1; }
  ( cd "$DEST/tools" && [ -d node_modules ] || npm install --silent )
  local tmp; tmp="$(mktemp -d)"
  node "$DEST/tools/build-icons.js" "$svg" "$tmp"
  ( cd "$tmp" && rm -f icons.zip && zip -rq icons.zip icons )   # icons/ at archive root
  mv "$tmp/icons.zip" "$DEST/icons.zip"
  rm -rf "$tmp"
  echo "✓ icons.zip rebuilt from: $svg"
}

case "${1:-both}" in
  template) do_template "${2:-}";;
  icons)    do_icons "${2:-}";;
  both)     do_template ""; do_icons "";;
  *) echo "Usage: $0 {template|icons|both} [path]"; exit 1;;
esac

if git diff --quiet -- "$DEST" && git diff --cached --quiet -- "$DEST"; then
  echo "• No changes — nothing to push."
  exit 0
fi

git add "$DEST"
git commit -q -m "Update Deck Builder assets ($(date +%Y-%m-%d))"
git push -q origin main
echo "✓ Pushed. Raw URLs are unchanged; the Deck Builder project will fetch the new files."
