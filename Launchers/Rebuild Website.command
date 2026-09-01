#!/bin/bash
# ==========================================================================
# Rebuild the MVHA website
# --------------------------------------------------------------------------
# Double-click this after you have edited anything in the tools/content
# folder, or the navigation menu in tools/build.js.
#
# You do NOT need this for everyday changes. Editing events, photographs,
# the timeline or board members in the data folder takes effect straight
# away — just refresh your browser.
# ==========================================================================

# The site itself lives in the folder above this one.
cd "$(dirname "$0")/.." || exit 1

[ -t 1 ] && clear
echo
echo "  ────────────────────────────────────────────────────────────"
echo "   Rebuilding the Mountain View Historical Association site"
echo "  ────────────────────────────────────────────────────────────"
echo

# Finder starts scripts with a bare-bones PATH that leaves out Homebrew and
# nvm, so Node can look "missing" even when it works fine in Terminal.
. "$(dirname "$0")/find-node.sh"

if [ -z "$NODE" ]; then
  echo "  Node.js was not found on this Mac, so the pages cannot be"
  echo "  rebuilt here."
  echo
  echo "  You only need Node if you want to change page wording or the"
  echo "  navigation menu. Everyday content — events, photographs, the"
  echo "  timeline, board members — lives in the data folder and needs"
  echo "  no rebuild at all."
  echo
  echo "  To install Node, download the LTS version from nodejs.org."
  echo
  echo "  Press any key to close this window."
  read -r -n 1
  exit 1
fi

echo "  Using Node $("$NODE" --version) at $NODE"
echo

"$NODE" tools/build.js
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
  echo "  All good. Run Preview Website (next to this file) to see the result."
else
  echo "  Something above needs attention. Read the FAIL lines — each one"
  echo "  names the file and the problem."
fi

echo
echo "  Press any key to close this window."
read -r -n 1
