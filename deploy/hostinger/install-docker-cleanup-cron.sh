#!/bin/bash
# Install a daily safe Docker cleanup cron job (root).
# Does not modify any project — only schedules the cleanup script.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEANUP_SCRIPT="${SCRIPT_DIR}/safe-docker-cleanup.sh"
LOG_FILE="/var/log/docker-safe-cleanup.log"
CRON_SCHEDULE="0 3 * * *"   # every day at 03:00 server time

if [[ ! -f "$CLEANUP_SCRIPT" ]]; then
  echo "Missing: $CLEANUP_SCRIPT"
  exit 1
fi

chmod +x "$CLEANUP_SCRIPT"
sed -i 's/\r$//' "$CLEANUP_SCRIPT" 2>/dev/null || true

CRON_LINE="${CRON_SCHEDULE} EXTRA_CACHE=1 ${CLEANUP_SCRIPT} >> ${LOG_FILE} 2>&1"
MARKER="# nividia-safe-docker-cleanup"

TMP="$(mktemp)"
crontab -l 2>/dev/null | grep -v "$MARKER" | grep -v "safe-docker-cleanup.sh" > "$TMP" || true
{
  cat "$TMP"
  echo "${MARKER}"
  echo "${CRON_LINE}"
} | crontab -
rm -f "$TMP"

echo "Installed daily cron:"
echo "  ${CRON_LINE}"
echo "Log: ${LOG_FILE}"
echo ""
echo "Test now (dry run):"
echo "  DRY_RUN=1 bash ${CLEANUP_SCRIPT}"
echo ""
echo "Test now (real run):"
echo "  bash ${CLEANUP_SCRIPT}"
