#!/bin/bash
# Install VPS-wide daily safe Docker cleanup (any Hostinger/Ubuntu server).
# Copies script to /usr/local/sbin — not tied to any project directory.
#
# Run as root:
#   curl -fsSL https://raw.githubusercontent.com/Refaat1942/nividia/main/deploy/hostinger/safe-docker-cleanup.sh -o /tmp/safe-docker-cleanup.sh
#   curl -fsSL https://raw.githubusercontent.com/Refaat1942/nividia/main/deploy/hostinger/install-docker-cleanup-cron.sh -o /tmp/install-docker-cleanup-cron.sh
#   bash /tmp/install-docker-cleanup-cron.sh /tmp/safe-docker-cleanup.sh
#
# Or from this repo folder:
#   bash install-docker-cleanup-cron.sh

set -euo pipefail

SOURCE_SCRIPT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/safe-docker-cleanup.sh}"
INSTALL_PATH="/usr/local/sbin/docker-safe-cleanup.sh"
LOG_FILE="/var/log/docker-safe-cleanup.log"
CRON_SCHEDULE="0 3 * * *"
MARKER="# vps-safe-docker-cleanup"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo bash $0)"
  exit 1
fi

if [[ ! -f "$SOURCE_SCRIPT" ]]; then
  echo "Missing cleanup script: $SOURCE_SCRIPT"
  exit 1
fi

sed 's/\r$//' "$SOURCE_SCRIPT" > "$INSTALL_PATH"
chmod 755 "$INSTALL_PATH"

CRON_LINE="${CRON_SCHEDULE} EXTRA_CACHE=1 ${INSTALL_PATH} >> ${LOG_FILE} 2>&1"

TMP="$(mktemp)"
crontab -l 2>/dev/null \
  | grep -v "$MARKER" \
  | grep -v "nividia-safe-docker-cleanup" \
  | grep -v "safe-docker-cleanup.sh" \
  | grep -v "docker-safe-cleanup.sh" \
  > "$TMP" || true
{
  cat "$TMP"
  echo "${MARKER}"
  echo "${CRON_LINE}"
} | crontab -
rm -f "$TMP"

echo "VPS-wide cleanup installed."
echo "  Script: ${INSTALL_PATH}"
echo "  Cron:   ${CRON_LINE}"
echo "  Log:    ${LOG_FILE}"
echo ""
echo "Preview:  DRY_RUN=1 ${INSTALL_PATH}"
echo "Run now:  ${INSTALL_PATH}"
echo "Uninstall: bash $(dirname "$SOURCE_SCRIPT")/uninstall-docker-cleanup-cron.sh"
