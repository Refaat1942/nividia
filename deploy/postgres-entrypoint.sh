#!/bin/sh
# Deprecated: use the default postgres image entrypoint + hostinger/repair.sh for password sync.
# Kept for reference only — not mounted by docker-compose.yml.
exec /usr/local/bin/docker-entrypoint.sh postgres "$@"
