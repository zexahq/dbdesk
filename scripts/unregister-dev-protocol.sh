#!/bin/bash
# Unregister the dev dbdesk:// protocol handler on Linux.
# Run this when you want the installed/built app to handle deep links instead.

set -euo pipefail

DESKTOP_FILE="$HOME/.local/share/applications/dbdesk-dev.desktop"
SOCKET="/tmp/dbdesk-dev-deeplink.sock"

# Remove the .desktop file
if [ -f "$DESKTOP_FILE" ]; then
  rm "$DESKTOP_FILE"
  echo "✓ Removed $DESKTOP_FILE"
else
  echo "  No dev .desktop file found"
fi

# Remove stale socket
if [ -S "$SOCKET" ]; then
  rm "$SOCKET"
  echo "✓ Removed $SOCKET"
fi

# Update the desktop database so the system forgets the handler
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true

echo "✓ Dev protocol handler unregistered. The installed app will handle dbdesk:// links."
