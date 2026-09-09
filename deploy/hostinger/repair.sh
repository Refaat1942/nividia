#!/bin/bash
# Fix postgres password mismatch — sync DB password with .secrets
set -e

INSTALL_DIR="/opt/fratelanza-office"
SECRETS_FILE="${INSTALL_DIR}/deploy/.secrets"

cd "${INSTALL_DIR}"
git pull origin main 2>/dev/null || true
cd deploy

echo "=== Repair: reset database password ==="

# Ensure postgres is running
docker compose -f docker-compose.yml up -d postgres
sleep 5

# Load or create secrets
if [ -f "${SECRETS_FILE}" ]; then
  POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "${SECRETS_FILE}" | cut -d= -f2-)
  SECRET_KEY=$(grep '^SECRET_KEY=' "${SECRETS_FILE}" | cut -d= -f2-)
  ADMIN_PASS=$(grep '^ADMIN_PASSWORD=' "${SECRETS_FILE}" | cut -d= -f2-)
  ADMIN_USER=$(grep '^ADMIN_USERNAME=' "${SECRETS_FILE}" | cut -d= -f2-)
else
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  SECRET_KEY=$(openssl rand -hex 32)
  ADMIN_USER="admin"
  ADMIN_PASS="Office$(openssl rand -hex 4)"
fi

ADMIN_USER="${ADMIN_USER:-admin}"

echo "Resetting postgres password inside container..."
docker exec fratelanza-office-postgres psql -U office -d postgres \
  -c "ALTER USER office WITH PASSWORD '${POSTGRES_PASSWORD}';" \
  || docker exec -u postgres fratelanza-office-postgres psql \
  -c "ALTER USER office WITH PASSWORD '${POSTGRES_PASSWORD}';"

# Save secrets
cat > "${SECRETS_FILE}" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
SECRET_KEY=${SECRET_KEY}
ADMIN_PASSWORD=${ADMIN_PASS}
ADMIN_USERNAME=${ADMIN_USER}
EOF
chmod 600 "${SECRETS_FILE}"

export POSTGRES_USER=office
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
export POSTGRES_DB=fratelanza_office
export SECRET_KEY="${SECRET_KEY}"
export ADMIN_USERNAME="${ADMIN_USER}"
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
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:16361/health >/dev/null 2>&1; then
    echo ""
    echo "============================================"
    echo "  FIXED!"
    echo "  URL:      https://nividia.fratelanza.com/login"
    echo "  Username: ${ADMIN_USER}"
    echo "  Password: ${ADMIN_PASS}"
    echo "============================================"
    exit 0
  fi
  sleep 2
done

echo "Still failing. Try fresh start:"
echo "  curl -fsSL https://raw.githubusercontent.com/Refaat1942/nividia/main/deploy/hostinger/fresh-start.sh | bash"
docker compose -f docker-compose.yml logs --tail=20 backend
exit 1
