#!/bin/bash
# Fix postgres password mismatch — sync DB password with deploy/.env
set -e

INSTALL_DIR="/opt/fratelanza-office"
DEPLOY_DIR="${INSTALL_DIR}/deploy"
SECRETS_FILE="${DEPLOY_DIR}/.secrets"

cd "${INSTALL_DIR}"
git pull origin main 2>/dev/null || true
cd "${DEPLOY_DIR}"

source hostinger/write-env.sh

echo "=== Repair: sync database password ==="

load_or_create_secrets "${SECRETS_FILE}"
save_secrets "${SECRETS_FILE}"
write_deploy_env "${DEPLOY_DIR}"

chmod +x postgres-entrypoint.sh backup-db.sh restore-db.sh hostinger/*.sh 2>/dev/null || true
sed -i 's/\r$//' postgres-entrypoint.sh backup-db.sh restore-db.sh hostinger/*.sh 2>/dev/null || true

echo "Recreating postgres (password sync on startup)..."
docker compose -f docker-compose.yml up -d --force-recreate postgres

echo "Waiting for postgres..."
for i in $(seq 1 30); do
  if docker compose -f docker-compose.yml exec -T postgres pg_isready -U office -d fratelanza_office >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Recreating backend..."
docker compose -f docker-compose.yml up -d --force-recreate backend

echo "Waiting for backend..."
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:16361/health >/dev/null 2>&1; then
    echo ""
    echo "============================================"
    echo "  FIXED!"
    echo "  URL:      https://nividia.fratelanza.com/login"
    echo "  Username: ${ADMIN_USERNAME}"
    echo "  Password: ${ADMIN_PASSWORD}"
    echo "============================================"
    exit 0
  fi
  sleep 2
done

echo "Still failing. Try fresh start:"
echo "  curl -fsSL https://raw.githubusercontent.com/Refaat1942/nividia/main/deploy/hostinger/fresh-start.sh | bash"
docker compose -f docker-compose.yml logs --tail=30 backend
exit 1
