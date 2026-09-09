#!/bin/sh
set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore-db.sh <backup_file.sql.gz>"
  echo "Example: ./restore-db.sh /backups/fratelanza_office_20260909_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Backup file: $BACKUP_FILE"
read -p "Type YES to continue: " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
  echo "Aborted."
  exit 1
fi

gunzip -c "$BACKUP_FILE" | psql -h "${PGHOST:-postgres}" -U "${PGUSER:-office}" -d "${PGDATABASE:-fratelanza_office}"
echo "Restore completed."
