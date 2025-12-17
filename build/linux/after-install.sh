#!/bin/bash
set -e

# App paths
APP_NAME="dbdesk"
APP_DIR="/opt/dbdesk"
BIN_PATH="/usr/bin/dbdesk"

########################################
# 1. Fix chrome-sandbox permissions
########################################
if [ -f "$APP_DIR/chrome-sandbox" ]; then
  chown root:root "$APP_DIR/chrome-sandbox"
  chmod 4755 "$APP_DIR/chrome-sandbox"
fi

########################################
# 2. Create dbdesk CLI command
########################################
# Remove old command if it exists
rm -f "$BIN_PATH"

# Ensure Electron binary exists
if [ -f "$APP_DIR/$APP_NAME" ]; then
  ln -s "$APP_DIR/$APP_NAME" "$BIN_PATH"
  chmod +x "$BIN_PATH"
else
  echo "WARNING: $APP_DIR/$APP_NAME not found, CLI not created"
fi
