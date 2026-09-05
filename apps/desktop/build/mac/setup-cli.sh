#!/bin/bash
# DBDesk CLI setup — manual fallback if the in-app prompt doesn't work.
# Run: sudo bash /Applications/DBDesk.app/Contents/Resources/cli/dbdesk.sh --install
# Or:   sudo ln -sf "/Applications/DBDesk.app/Contents/Resources/cli/dbdesk.sh" /usr/local/bin/dbdesk

set -e

CLI_SH="/Applications/DBDesk.app/Contents/Resources/cli/dbdesk.sh"
BIN_PATH="/usr/local/bin/dbdesk"

if [ ! -f "$CLI_SH" ]; then
  echo "Error: DBDesk CLI shell script not found."
  echo "Make sure DBDesk is installed in /Applications."
  exit 1
fi

mkdir -p "$(dirname "$BIN_PATH")"
ln -sf "$CLI_SH" "$BIN_PATH"
chmod +x "$CLI_SH"

echo "DBDesk CLI installed at $BIN_PATH"
echo "Try: dbdesk connection list"
