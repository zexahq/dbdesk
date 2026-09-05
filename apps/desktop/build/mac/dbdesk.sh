#!/bin/bash
# DBDesk CLI wrapper — cross-platform. Resolves .app bundle or install dir.
# Uses ELECTRON_RUN_AS_NODE=1 to run Electron as a plain Node.js process.
# No external Node.js installation needed.
set -e

function realpath_portable() {
  local SOURCE=$1
  while [ -h "$SOURCE" ]; do
    local DIR
    DIR="$(cd -P "$(dirname "$SOURCE")" 2>/dev/null && pwd)"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
  done
  cd -P "$(dirname "$SOURCE")" 2>/dev/null && pwd
}

# This script lives at: {app}/resources/cli/dbdesk.sh
SCRIPT_DIR="$(realpath_portable "$0")"
CLI="$SCRIPT_DIR/dist/index.js"

# Bundled production dependencies live beside the bundle.
export NODE_PATH="$SCRIPT_DIR/node_modules${NODE_PATH:+:$NODE_PATH}"

if [ ! -f "$CLI" ]; then
  echo "Error: DBDesk CLI bundle not found at $CLI" >&2
  echo "Please reinstall DBDesk." >&2
  exit 1
fi

# Find the Electron binary
if [ "$(uname)" = "Darwin" ]; then
  # macOS: DBDesk.app/Contents/Resources/cli/dbdesk.sh → walk up to MacOS/
  CONTENTS_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
  ELECTRON="$CONTENTS_DIR/MacOS/dbdesk"
elif [ "$(uname)" = "Linux" ] && [ -f "/opt/dbdesk/dbdesk" ]; then
  ELECTRON="/opt/dbdesk/dbdesk"
else
  # Fallback: try to find node, then run CLI directly
  if command -v node &>/dev/null; then
    exec node "$CLI" "$@"
  fi
  echo "Error: Cannot find Electron binary to run CLI." >&2
  exit 1
fi

ELECTRON_RUN_AS_NODE=1 exec "$ELECTRON" "$CLI" "$@"
