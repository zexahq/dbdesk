#!/bin/bash
set -e

APP_NAME="dbdesk"
APP_DIR="/opt/dbdesk"
BIN_PATH="/usr/bin/dbdesk"
CLI_SH="$APP_DIR/resources/cli/dbdesk.sh"

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
rm -f "$BIN_PATH"

if [ -f "$CLI_SH" ]; then
  ln -s "$CLI_SH" "$BIN_PATH"
  chmod +x "$CLI_SH"
  echo "dbdesk CLI installed at $BIN_PATH"
elif [ -f "$APP_DIR/$APP_NAME" ]; then
  # Fallback: point to the Electron binary directly
  ln -s "$APP_DIR/$APP_NAME" "$BIN_PATH"
  chmod +x "$BIN_PATH"
  echo "dbdesk launcher installed at $BIN_PATH (CLI bundle not found)"
else
  echo "WARNING: $APP_DIR/$APP_NAME not found, CLI not created"
fi
