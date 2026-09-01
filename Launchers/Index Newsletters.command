#!/bin/bash
# ==========================================================================
# Index the newsletters
# --------------------------------------------------------------------------
# Reads every issue of The Mountain ReView listed in data/newsletters.json,
# pulls the text out of each PDF, and makes it findable through the site's
# search box.
#
# Run this once now, and again whenever you add a new issue.
#
# It uses Python, which is already on your Mac. The first run sets up a small
# PDF-reading library in a private folder inside this project (.venv) and may
# take a minute. Nothing is installed system-wide.
# ==========================================================================

# The site itself lives in the folder above this one.
cd "$(dirname "$0")/.." || exit 1

[ -t 1 ] && clear
echo
echo "  ────────────────────────────────────────────────────────────"
echo "   Making the newsletters searchable"
echo "  ────────────────────────────────────────────────────────────"
echo

# ---- Find Python ---------------------------------------------------------
# Finder runs scripts with a short PATH, so check the usual places too.

PY=""
for candidate in \
    "$(command -v python3 2>/dev/null)" \
    /usr/bin/python3 \
    /opt/homebrew/bin/python3 \
    /usr/local/bin/python3 \
    /Library/Frameworks/Python.framework/Versions/Current/bin/python3
do
  if [ -n "$candidate" ] && [ -x "$candidate" ] && "$candidate" --version >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done

if [ -z "$PY" ]; then
  echo "  Python 3 was not found on this Mac."
  echo
  echo "  Python normally comes with macOS. To install the developer tools"
  echo "  that provide it, open Terminal and run:"
  echo
  echo "      xcode-select --install"
  echo
  echo "  Press any key to close this window."
  read -r -n 1
  exit 1
fi

echo "  Using $("$PY" --version 2>&1) at $PY"
echo

# ---- Set up the PDF reader, once ----------------------------------------

VENV_PY=".venv/bin/python"

if [ ! -x "$VENV_PY" ]; then
  echo "  Setting up the PDF reader (first run only, this may take a minute)..."
  echo
  if ! "$PY" -m venv .venv; then
    echo
    echo "  Could not create the .venv folder."
    echo "  If Python was only just installed, try opening Terminal once and"
    echo "  running 'python3 --version', then run this again."
    echo
    echo "  Press any key to close this window."
    read -r -n 1
    exit 1
  fi
fi

if ! "$VENV_PY" -c "import pypdf" >/dev/null 2>&1; then
  echo "  Downloading the PDF reader..."
  echo
  if ! .venv/bin/pip install --quiet --disable-pip-version-check pypdf; then
    echo
    echo "  The download failed. Check that you are online and try again."
    echo
    echo "  Press any key to close this window."
    read -r -n 1
    exit 1
  fi
  echo
fi

# ---- Index ---------------------------------------------------------------
# --discover asks the old WordPress site for any issues not yet listed.

"$VENV_PY" tools/index_newsletters.py --discover
STATUS=$?

echo
if [ $STATUS -eq 0 ]; then
  echo "  Done. Open Preview Website and try searching for a name or a street"
  echo "  that appears in one of the newsletters."
else
  echo "  Something went wrong above. The site still works — the newsletters"
  echo "  just will not turn up in search results yet."
fi

echo
echo "  Press any key to close this window."
read -r -n 1
