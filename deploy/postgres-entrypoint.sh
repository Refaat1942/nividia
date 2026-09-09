#!/bin/sh
# Sync POSTGRES_PASSWORD from env on every start (fixes volume/password drift).
# Password sync runs in background; postgres stays PID 1 for reliable health checks.

(
  i=0
  until pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB:-postgres}" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge 120 ]; then
      echo "postgres-entrypoint: password sync timed out waiting for postgres" >&2
      exit 0
    fi
    sleep 1
  done
  if [ -n "${POSTGRES_PASSWORD:-}" ]; then
    escaped=$(printf '%s' "$POSTGRES_PASSWORD" | sed "s/'/''/g")
    psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 \
      -c "ALTER USER \"${POSTGRES_USER}\" WITH PASSWORD '${escaped}';" \
      || true
  fi
) &

exec /docker-entrypoint.sh postgres
