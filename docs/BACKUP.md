# Backup & Restore

## Automatic

The `backup` container runs `backup-db.sh` daily.

Backups stored in Docker volume `fratelanza_office_backups`.

Retention: 30 days (configurable via `BACKUP_RETENTION_DAYS`).

## Manual Backup

```bash
cd /opt/fratelanza-office/deploy
docker compose exec backup sh /backup-db.sh
```

Or from host:

```bash
docker compose exec -T postgres pg_dump -U office fratelanza_office | gzip > backup_$(date +%Y%m%d).sql.gz
```

## Uploads Backup

```bash
docker run --rm -v fratelanza_office_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

## Restore Database

```bash
# WARNING: Overwrites current data
gunzip -c backup_file.sql.gz | docker compose exec -T postgres psql -U office fratelanza_office
```

Or use `deploy/restore-db.sh` inside the backup container.

## Weekly Upload Backup (cron)

```bash
0 3 * * 0 cd /opt/fratelanza-office/deploy && docker compose exec backup sh /backup-db.sh
0 4 * * 0 docker run --rm -v fratelanza_office_uploads:/data -v /opt/fratelanza-office/backups:/backup alpine tar czf /backup/uploads_$(date +\%Y\%m\%d).tar.gz -C /data .
```
