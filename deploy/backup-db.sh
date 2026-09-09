#!/bin/sh
set -e
BACKUP_DIR="/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="${BACKUP_DIR}/fratelanza_office_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"
pg_dump -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" | gzip > "$FILE"
echo "[$(date)] Backup created: $FILE"

find "$BACKUP_DIR" -name "fratelanza_office_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
