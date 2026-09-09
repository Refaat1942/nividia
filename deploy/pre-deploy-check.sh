#!/bin/bash
set -e

echo "=== Fratelanza Office Manager - Pre-Deploy Check ==="

PREFERRED_FRONTEND=16360
PREFERRED_BACKEND=16361
FORBIDDEN_PORTS="80 443 3000 5000 5432 6379 8000 8080 10000 11000 13000 15432 16310 16320 16346 16350 16379 17800 18000"

find_free_port() {
  local preferred=$1
  if ! ss -tlnp | grep -q ":${preferred} "; then
    echo "$preferred"
    return
  fi
  for port in $(seq 16362 16399); do
    if ! ss -tlnp | grep -q ":${port} "; then
      echo "$port"
      return
    fi
  done
  echo "ERROR: No free port found" >&2
  exit 1
}

echo "--- Checking forbidden ports ---"
for port in $FORBIDDEN_PORTS; do
  if ss -tlnp | grep -q ":${port} "; then
    echo "  Port $port: IN USE (documented - OK if expected)"
  fi
done

FRONTEND_PORT=$(find_free_port $PREFERRED_FRONTEND)
BACKEND_PORT=$(find_free_port $PREFERRED_BACKEND)

if [ "$FRONTEND_PORT" != "$PREFERRED_FRONTEND" ]; then
  echo "WARNING: Port $PREFERRED_FRONTEND occupied, using $FRONTEND_PORT"
fi
if [ "$BACKEND_PORT" != "$PREFERRED_BACKEND" ]; then
  echo "WARNING: Port $PREFERRED_BACKEND occupied, using $BACKEND_PORT"
fi

echo ""
echo "Selected ports:"
echo "  Frontend: 127.0.0.1:${FRONTEND_PORT}"
echo "  Backend:  127.0.0.1:${BACKEND_PORT}"

if [ -d "/opt/fratelanza-office" ]; then
  echo "  Install dir exists: /opt/fratelanza-office"
else
  echo "  Install dir will be created: /opt/fratelanza-office"
fi

echo ""
echo "=== SAFE TO DEPLOY ==="
echo "FRONTEND_PORT=127.0.0.1:${FRONTEND_PORT}"
echo "BACKEND_PORT=127.0.0.1:${BACKEND_PORT}"
