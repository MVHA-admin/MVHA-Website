#!/usr/bin/env bash
# ==========================================================================
# Bring the images onto your own site.
# --------------------------------------------------------------------------
# Right now the site loads photographs from the old WordPress server
# (www.mountainviewhistorical.org/wp-content/uploads/...). That works, but it
# means the new site still depends on the old one. Run this once and every
# image will be downloaded into assets/images/ and the site will point at
# your own copies instead.
#
# Run it from the project folder:
#
#     bash tools/localise-images.sh
#
# It is safe to run more than once. A backup of every file it edits is kept
# with a .bak extension until you delete them.
# ==========================================================================

set -euo pipefail

cd "$(dirname "$0")/.."
DEST="assets/images"
BASE="https://www.mountainviewhistorical.org/wp-content/uploads/"

mkdir -p "$DEST"

echo "Finding image addresses..."
URLS=$(grep -rhoE "https://www\.mountainviewhistorical\.org/wp-content/uploads/[^\"')[:space:]]+" \
        --include="*.html" --include="*.json" . | sort -u)

COUNT=$(echo "$URLS" | grep -c . || true)
echo "Found $COUNT unique images."
echo

DOWNLOADED=0
SKIPPED=0

for url in $URLS; do
  filename="${url##*/}"
  target="$DEST/$filename"
  if [ -f "$target" ]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  if curl -fsSL --retry 2 -o "$target" "$url"; then
    echo "  downloaded  $filename"
    DOWNLOADED=$((DOWNLOADED + 1))
  else
    echo "  FAILED      $filename  ($url)"
    rm -f "$target"
  fi
done

echo
echo "Downloaded $DOWNLOADED, already had $SKIPPED."
echo
echo "Rewriting the site to use the local copies..."

# Rewrite every uploads URL to assets/images/<filename>, in both the built
# pages, the source fragments, and the JSON data files.
find . -type f \( -name "*.html" -o -name "*.json" \) \
     -not -path "./assets/images/*" -not -path "./node_modules/*" \
     -print0 |
while IFS= read -r -d '' file; do
  if grep -q "$BASE" "$file"; then
    perl -i.bak -pe 's{https://www\.mountainviewhistorical\.org/wp-content/uploads/[^"'"'"')\s]*/([^/"'"'"')\s]+)}{assets/images/$1}g' "$file"
    echo "  rewrote  $file"
  fi
done

echo
echo "Done."
echo
echo "Next steps:"
echo "  1. Open the site and check the images still appear."
echo "  2. If everything looks right, remove the backups:  find . -name '*.bak' -delete"
echo "  3. If something went wrong, restore them:          for f in \$(find . -name '*.bak'); do mv \"\$f\" \"\${f%.bak}\"; done"
