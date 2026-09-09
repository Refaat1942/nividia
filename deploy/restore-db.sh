#!/bin/sh
set -e
if [ -z "$1" ]; then
  echo "Usage: ./restore-db.sh <backup_file.sql.gz>"
  exit 1
fi
echo "WARNING: This overwrites the database. Type YES to continue:"
read -r CONFIRM
[ "$CONFIRM" = "YES" ] || exit 1
gunzip -c "$1" | psql -h "${PGHOST:-postgres}" -U "${PGUSER:-office}" -d "${PGDATABASE:-fratelanza_office}"
