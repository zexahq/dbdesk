#!/bin/bash
# Path where electron-builder installs your app
APP_PATH="/opt/dbdesk"

# Fix chrome-sandbox permissions
if [ -f "$APP_PATH/chrome-sandbox" ]; then
  chown root:root "$APP_PATH/chrome-sandbox"
  chmod 4755 "$APP_PATH/chrome-sandbox"
fi
