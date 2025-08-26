#!/usr/bin/env bash
# Batch convert SVG files text->paths using Inkscape
# Usage: ./run.sh ./assets/logos ./converted

set -euo pipefail
SRC_DIR="${1:-./assets/logos}"
OUT_DIR="${2:-./converted}"
mkdir -p "$OUT_DIR"
for f in "$SRC_DIR"/*.svg; do
  base=$(basename "$f")
  echo "Converting $base..."
  inkscape "$f" --export-plain-svg="$OUT_DIR/$base" --export-text-to-path
done

echo "Done. Converted files are in $OUT_DIR"
