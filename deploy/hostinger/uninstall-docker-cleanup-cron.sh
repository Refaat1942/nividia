#!/bin/bash
# Remove VPS-wide Docker cleanup cron (does not delete the script file).

set -euo pipefail

INSTALL_PATH="/usr/local/sbin/docker-safe-cleanup.sh"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root"
  exit 1
fi

TMP="$(mktemp)"
crontab -l 2>/dev/null \
  | grep -v "vps-safe-docker-cleanup" \
  | grep -v "nividia-safe-docker-cleanup" \
  | grep -v "docker-safe-cleanup" \
  | grep -v "safe-docker-cleanup" \
  > "$TMP" || true
crontab "$TMP" 2>/dev/null || true
rm -f "$TMP"

echo "Cron removed. Script left at ${INSTALL_PATH} (delete manually if you want)."
