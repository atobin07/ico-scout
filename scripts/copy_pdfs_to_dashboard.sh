#!/usr/bin/env bash
# copy_pdfs_to_dashboard.sh
# Copies all resume PDFs from applications/ into dashboard/public/pdfs/
# maintaining the STRONG/WEAK/folder structure.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$REPO_ROOT/applications"
DEST="$REPO_ROOT/dashboard/public/pdfs"

echo "Source:      $SRC"
echo "Destination: $DEST"
echo ""

copied=0
missing=0

for fit in STRONG WEAK; do
  fit_src="$SRC/$fit"
  fit_dest="$DEST/$fit"
  [ -d "$fit_src" ] || continue

  while IFS= read -r -d '' dir; do
    folder="$(basename "$dir")"
    pdf="$dir/resume.pdf"
    if [ -f "$pdf" ]; then
      target_dir="$fit_dest/$folder"
      mkdir -p "$target_dir"
      cp "$pdf" "$target_dir/resume.pdf"
      echo "  [COPIED] $fit/$folder/resume.pdf"
      ((copied++)) || true
    else
      echo "  [MISSING] $fit/$folder — no resume.pdf"
      ((missing++)) || true
    fi
  done < <(find "$fit_src" -mindepth 1 -maxdepth 1 -type d -print0 | sort -z)
done

echo ""
echo "Done. Copied: $copied  Missing PDFs: $missing"
