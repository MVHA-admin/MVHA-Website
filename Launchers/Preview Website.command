#!/bin/bash
# ==========================================================================
# Preview the MVHA website
# --------------------------------------------------------------------------
# Double-click this file in Finder. It starts a small web server on your own
# computer and opens the site in your browser.
#
# Leave the black Terminal window open while you are looking at the site.
# When you are finished, close that window (or press Ctrl+C in it).
#
# Nothing is published to the internet. Nothing is installed. This only runs
# on your machine.
# ==========================================================================

# The site itself lives in the folder above this one.
cd "$(dirname "$0")/.." || exit 1

# ---- Find a Python we can use -------------------------------------------

PY=""
for candidate in python3 /usr/bin/python3 /opt/homebrew/bin/python3 /usr/local/bin/python3; do
  if command -v "$candidate" >/dev/null 2>&1; then PY="$candidate"; break; fi
done

if [ -z "$PY" ]; then
  [ -t 1 ] && clear
  echo
  echo "  Could not find Python on this Mac."
  echo
  echo "  Python normally comes with macOS. To install it, open Terminal"
  echo "  and run:   xcode-select --install"
  echo
  echo "  Press any key to close this window."
  read -r -n 1
  exit 1
fi

# ---- Find a free port ----------------------------------------------------

PORT=8000
while [ "$PORT" -lt 8050 ]; do
  if ! nc -z 127.0.0.1 "$PORT" >/dev/null 2>&1; then break; fi
  PORT=$((PORT + 1))
done

URL="http://localhost:$PORT"

# ---- Tidy up when the window is closed -----------------------------------

cleanup() {
  echo
  echo "  Stopping the preview server."
  kill "$SERVER_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM HUP EXIT

# ---- Start the server ----------------------------------------------------

[ -t 1 ] && clear
cat <<BANNER

  ────────────────────────────────────────────────────────────
   Mountain View Historical Association — website preview
  ────────────────────────────────────────────────────────────

   The site is now running at:

       $URL

   Your browser should open by itself in a moment. If it does
   not, copy the address above into your browser.

   • Edit anything in the data folder, then refresh the browser
     to see the change immediately.
   • Edit the wording in tools/content, then run Rebuild Website
     (next to this file), then refresh.

   KEEP THIS WINDOW OPEN while you are using the site.
   Close it (or press Ctrl+C) when you are finished.

  ────────────────────────────────────────────────────────────

BANNER

"$PY" -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER_PID=$!

# Give the server a moment, then open the browser.
sleep 1
open "$URL" 2>/dev/null

# Keep this window alive until the user closes it.
wait "$SERVER_PID"
