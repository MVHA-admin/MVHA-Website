#!/bin/bash
# ==========================================================================
# Locate Node.js and npm.
# --------------------------------------------------------------------------
# This is a helper used by the other launchers. You do not run it yourself.
#
# Why it exists: when you double-click a .command file, Finder runs it with a
# very short PATH — /usr/bin, /bin, /usr/sbin, /sbin and nothing else. Node is
# normally installed somewhere else (Homebrew, nvm, or the nodejs.org
# installer), so a plain "command -v node" comes up empty even though Node
# works perfectly well when you type it in Terminal.
#
# Sets NODE and NPM to full paths, or leaves them empty if nothing was found.
# ==========================================================================

NODE=""
NPM=""

# Pick up a login shell's PATH if we can — this catches Homebrew and anything
# else the user has set up in their profile.
if [ -z "$MVHA_PATH_LOADED" ]; then
  LOGIN_PATH="$(/bin/bash -lc 'echo $PATH' 2>/dev/null)"
  if [ -n "$LOGIN_PATH" ]; then
    PATH="$LOGIN_PATH:$PATH"
    export PATH
  fi
  MVHA_PATH_LOADED=1
fi

# Common install locations, most likely first.
CANDIDATES="
/opt/homebrew/bin/node
/usr/local/bin/node
/usr/bin/node
/opt/local/bin/node
$HOME/.local/bin/node
"

# nvm and similar version managers keep Node under a version folder. Take the
# most recently modified one, which is normally the version in use.
for base in "$HOME/.nvm/versions/node" "$HOME/.volta/bin" "$HOME/.asdf/shims" "$HOME/n/bin" "$HOME/Library/pnpm"; do
  [ -d "$base" ] || continue
  if [ -x "$base/node" ]; then
    CANDIDATES="$CANDIDATES
$base/node"
  else
    newest="$(ls -td "$base"/*/bin/node 2>/dev/null | head -1)"
    [ -n "$newest" ] && CANDIDATES="$CANDIDATES
$newest"
  fi
done

# Whatever PATH gives us, if anything.
FROM_PATH="$(command -v node 2>/dev/null)"
[ -n "$FROM_PATH" ] && CANDIDATES="$FROM_PATH
$CANDIDATES"

for candidate in $CANDIDATES; do
  [ -n "$candidate" ] || continue
  if [ -x "$candidate" ] && "$candidate" --version >/dev/null 2>&1; then
    NODE="$candidate"
    break
  fi
done

# npm normally sits next to node.
if [ -n "$NODE" ]; then
  maybe="$(dirname "$NODE")/npm"
  if [ -x "$maybe" ]; then
    NPM="$maybe"
  else
    NPM="$(command -v npm 2>/dev/null)"
  fi
fi

export NODE NPM
