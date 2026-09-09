#!/bin/sh
# Sync POSTGRES_PASSWORD from env on every start (fixes volume/password drift).
set -e

/docker-entrypoint.sh postgres &
child=$!

until pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB:-postgres}" >/dev/null 2>&1; do
  sleep 1
done

if [ -n "${POSTGRES_PASSWORD:-}" ]; then
  escaped=$(printf '%s' "$POSTGRES_PASSWORD" | sed "s/'/''/g")
  psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 \
    -c "ALTER USER \"${POSTGRES_USER}\" WITH PASSWORD '${escaped}';" \
    || true
fi

wait "$child"
