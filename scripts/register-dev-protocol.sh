#!/bin/bash
# Register the dbdesk:// protocol handler for Linux dev environment.
# Usage: bash scripts/register-dev-protocol.sh
#
# This creates a .desktop file that calls a relay script to forward
# deep link URLs to the running Electron dev process via a Unix socket.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RELAY_SCRIPT="$SCRIPT_DIR/dbdesk-deeplink-relay.sh"

DESKTOP_FILE="$HOME/.local/share/applications/dbdesk-dev.desktop"

mkdir -p "$(dirname "$DESKTOP_FILE")"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=DBDesk (Dev)
Exec=$RELAY_SCRIPT %u
Type=Application
Terminal=false
MimeType=x-scheme-handler/dbdesk;
NoDisplay=true
EOF

# Register as the handler for dbdesk:// scheme
xdg-mime default dbdesk-dev.desktop x-scheme-handler/dbdesk

echo "✓ Registered dbdesk:// protocol handler for dev environment"
echo "  Desktop file: $DESKTOP_FILE"
echo "  Relay script: $RELAY_SCRIPT"
