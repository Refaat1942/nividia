#!/bin/bash
# Fix DB password mismatch between backend and existing postgres volume
set -e

INSTALL_DIR="/opt/fratelanza-office"
SECRETS_FILE="${INSTALL_DIR}/deploy/.secrets"
cd "${INSTALL_DIR}/deploy"

echo "=== Repair: sync database password ==="

# Read password postgres was actually initialized with
if docker ps --format '{{.Names}}' | grep -q fratelanza-office-postgres; then
  LIVE_PG_PASS=$(docker exec fratelanza-office-postgres printenv POSTGRES_PASSWORD 2>/dev/null || true)
fi

if [ -f "${SECRETS_FILE}" ]; then
  SAVED_PG_PASS=$(grep '^POSTGRES_PASSWORD=' "${SECRETS_FILE}" | cut -d= -f2-)
  SECRET_KEY=$(grep '^SECRET_KEY=' "${SECRETS_FILE}" | cut -d= -f2-)
  ADMIN_PASS=$(grep '^ADMIN_PASSWORD=' "${SECRETS_FILE}" | cut -d= -f2-)
  ADMIN_USER=$(grep '^ADMIN_USERNAME=' "${SECRETS_FILE}" | cut -d= -f2-)
else
  SAVED_PG_PASS=""
  SECRET_KEY=$(openssl rand -hex 32)
  ADMIN_USER="admin"
  ADMIN_PASS="Office$(openssl rand -hex 4)"
fi

# Use live postgres password if secrets don't match
if [ -n "${LIVE_PG_PASS}" ]; then
  POSTGRES_PASSWORD="${LIVE_PG_PASS}"
  echo "Using password from running postgres container"
elif [ -n "${SAVED_PG_PASS}" ]; then
  POSTGRES_PASSWORD="${SAVED_PG_PASS}"
  echo "Using password from .secrets file"
else
  echo "ERROR: Cannot determine postgres password."
  echo "Run fresh install: docker volume rm fratelanza_office_postgres_data && reinstall"
  exit 1
fi

# Update secrets file to match
cat > "${SECRETS_FILE}" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
SECRET_KEY=${SECRET_KEY}
ADMIN_PASSWORD=${ADMIN_PASS}
ADMIN_USERNAME=${ADMIN_USER:-admin}
EOF
chmod 600 "${SECRETS_FILE}"

export POSTGRES_USER=office
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
export POSTGRES_DB=fratelanza_office
export SECRET_KEY="${SECRET_KEY}"
export ADMIN_USERNAME="${ADMIN_USER:-admin}"
export ADMIN_PASSWORD="${ADMIN_PASS}"
export ADMIN_NAME="System Admin"
export ADMIN_EMAIL=""
export FRONTEND_PORT="127.0.0.1:16360"
export BACKEND_PORT="127.0.0.1:16361"
export CORS_ORIGINS="https://nividia.fratelanza.com,http://nividia.fratelanza.com"
export NEXT_PUBLIC_API_URL="https://nividia.fratelanza.com"
export SEED_DEMO_DATA=false

docker compose -f docker-compose.yml up -d --force-recreate backend

echo "Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:16361/health >/dev/null 2>&1; then
    echo "Backend healthy!"
    curl -s http://127.0.0.1:16361/health
    echo ""
    echo "Login: https://nividia.fratelanza.com/login"
    echo "Username: ${ADMIN_USER:-admin}"
    echo "Password: ${ADMIN_PASS}"
    exit 0
  fi
  sleep 2
done

echo "Still failing. Logs:"
docker compose -f docker-compose.yml logs --tail=30 backend
exit 1
