#!/bin/bash
# ==========================================================================
# Package the site for upload
# --------------------------------------------------------------------------
# Builds the site and puts everything a web host needs into a single .zip in
# the project folder, ready to upload to GoDaddy.
#
# Ask for the TEST version when you are putting it somewhere temporary such
# as dougnorris.com/mvhistory/ — that copy tells search engines to ignore it,
# so it can never turn up in Google above the real site.
# ==========================================================================

cd "$(dirname "$0")/.." || exit 1

[ -t 1 ] && clear
echo
echo "  ────────────────────────────────────────────────────────────"
echo "   Package the site for upload"
echo "  ────────────────────────────────────────────────────────────"
echo

. "$(dirname "$0")/find-node.sh"

if [ -z "$NODE" ]; then
  echo "  Node.js was not found on this Mac, so the site cannot be packaged."
  echo
  echo "  Download the LTS version from nodejs.org, install it, then run"
  echo "  this again."
  echo
  echo "  Press any key to close this window."
  read -r -n 1
  exit 1
fi

echo "  Using Node $("$NODE" --version) at $NODE"
echo

echo "  Which copy do you want?"
echo
echo "    1) Test copy   — hidden from search engines."
echo "                     For dougnorris.com/mvhistory/ or similar."
echo
echo "    2) Real site   — for mountainviewhistorical.org."
echo "                     Includes the redirects from the old WordPress"
echo "                     addresses, and a sitemap for Google."
echo
printf "  Type 1 or 2, then press return: "
read -r CHOICE
echo

case "$CHOICE" in
  2) FLAG="" ;;
  *) FLAG="--test-site" ;;
esac

"$NODE" tools/build.js $FLAG || { echo; echo "  Build failed."; read -r -n 1; exit 1; }
echo
"$NODE" tools/check.js
echo
"$NODE" tools/package.js $FLAG

echo "  The .zip is in the same folder as this launcher's parent —"
echo "  the folder with index.html in it."
echo
echo "  Press any key to close this window."
read -r -n 1
