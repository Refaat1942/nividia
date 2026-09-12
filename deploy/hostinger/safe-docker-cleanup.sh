#!/bin/bash
# Safe Docker disk cleanup — does NOT touch:
#   - running or stopped containers
#   - volumes (databases, uploads, backups)
#   - networks
#   - images used by any container
#
# Removes only:
#   - unused build cache (optionally older than N hours)
#   - dangling (untagged) images
#
# Usage:
#   bash safe-docker-cleanup.sh              # default safe mode
#   DRY_RUN=1 bash safe-docker-cleanup.sh    # preview only
#   EXTRA_CACHE=1 bash safe-docker-cleanup.sh  # also prune all unused build cache
#
# Install daily cron:
#   bash install-docker-cleanup-cron.sh

set -euo pipefail

LOG_TAG="[docker-safe-cleanup]"
DRY_RUN="${DRY_RUN:-0}"
EXTRA_CACHE="${EXTRA_CACHE:-1}"
CACHE_UNTIL_HOURS="${CACHE_UNTIL_HOURS:-24}"

log() {
  echo "$(date -Is) ${LOG_TAG} $*"
}

run_docker() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN: docker $*"
    return 0
  fi
  docker "$@"
}

if ! command -v docker >/dev/null 2>&1; then
  log "docker not found — exit"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  log "docker daemon not reachable — exit"
  exit 1
fi

log "start (hostname=$(hostname), dry_run=${DRY_RUN}, extra_cache=${EXTRA_CACHE})"
log "disk before:"
docker system df 2>/dev/null | sed "s/^/${LOG_TAG} /" || true

# 1) Dangling build cache (safest)
log "prune dangling build cache"
run_docker builder prune -f

# 2) Unused build cache older than CACHE_UNTIL_HOURS (still safe for running apps)
if [[ "$EXTRA_CACHE" == "1" ]]; then
  log "prune unused build cache older than ${CACHE_UNTIL_HOURS}h"
  run_docker builder prune -af --filter "until=${CACHE_UNTIL_HOURS}h"
fi

# 3) Dangling images only (untagged layers) — never removes tagged images in use
log "prune dangling images"
run_docker image prune -f

log "disk after:"
docker system df 2>/dev/null | sed "s/^/${LOG_TAG} /" || true
log "done"
