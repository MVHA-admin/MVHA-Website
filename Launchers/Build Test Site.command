#!/bin/bash
# ==========================================================================
# Build a test copy of the site
# --------------------------------------------------------------------------
# Same as Rebuild Website, but marks every page "do not index" so a test
# copy — for example at dougnorris.com/mvhistory/ — cannot turn up in Google
# above the real site.
#
# Upload the whole folder afterwards. It works in a subfolder as it stands;
# nothing needs changing.
#
# When you are ready to publish for real, run Rebuild Website instead, which
# removes the no-index markers and writes a proper sitemap.
# ==========================================================================

cd "$(dirname "$0")/.." || exit 1

[ -t 1 ] && clear
echo
echo "  ────────────────────────────────────────────────────────────"
echo "   Building a TEST copy (hidden from search engines)"
echo "  ────────────────────────────────────────────────────────────"
echo

. "$(dirname "$0")/find-node.sh"

if [ -z "$NODE" ]; then
  echo "  Node.js was not found on this Mac, so the pages cannot be built."
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

"$NODE" tools/build.js --test-site
BUILD_STATUS=$?

echo
echo "  ────────────────────────────────────────────────────────────"
echo "   Checking the site"
echo "  ────────────────────────────────────────────────────────────"
echo

"$NODE" tools/check.js
CHECK_STATUS=$?

echo
if [ $BUILD_STATUS -eq 0 ] && [ $CHECK_STATUS -eq 0 ]; then
  echo "  Ready to upload as a test site."
  echo
  echo "  Remember: run Rebuild Website before publishing for real, so the"
  echo "  pages stop telling search engines to ignore them."
else
  echo "  Something above needs attention. Read the FAIL lines — each one"
  echo "  names the file and the problem."
fi

echo
echo "  Press any key to close this window."
read -r -n 1
