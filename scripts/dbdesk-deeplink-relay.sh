#!/bin/bash
# Relay a deep link URL to the running DBDesk Electron dev process.
# Called by the dbdesk-dev.desktop file when a dbdesk:// link is opened.
#
# Sends the URL to a Unix domain socket that the Electron main process
# is listening on. No second Electron instance is launched.

SOCKET="/tmp/dbdesk-dev-deeplink.sock"
URL="$1"

if [ -z "$URL" ]; then
  exit 0
fi

if [ ! -S "$SOCKET" ]; then
  echo "[dbdesk-relay] Socket not found: $SOCKET (is dev server running?)" >&2
  exit 1
fi

# Send the URL to the running Electron process via the Unix socket
node -e "
  const net = require('net');
  const client = net.connect('$SOCKET', () => {
    client.end('$URL');
  });
  client.on('error', (err) => {
    console.error('[dbdesk-relay] Failed to connect:', err.message);
    process.exit(1);
  });
"
