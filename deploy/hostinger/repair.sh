#!/bin/bash
# Fix postgres password mismatch — sync DB password with deploy/.env
set -e

INSTALL_DIR="/opt/fratelanza-office"
DEPLOY_DIR="${INSTALL_DIR}/deploy"
SECRETS_FILE="${DEPLOY_DIR}/.secrets"

cd "${INSTALL_DIR}"
git fetch origin main 2>/dev/null || true
git reset --hard origin/main 2>/dev/null || true
cd "${DEPLOY_DIR}"

source hostinger/write-env.sh

echo "=== Repair: sync database password ==="

load_or_create_secrets "${SECRETS_FILE}"
save_secrets "${SECRETS_FILE}"
write_deploy_env "${DEPLOY_DIR}"

chmod +x backup-db.sh restore-db.sh fix-admin.sh hostinger/*.sh 2>/dev/null || true
sed -i 's/\r$//' backup-db.sh restore-db.sh fix-admin.sh hostinger/*.sh 2>/dev/null || true

echo "Recreating postgres..."
docker compose -f docker-compose.yml up -d --force-recreate postgres

echo "Waiting for postgres (up to 2 min)..."
postgres_ok=0
for i in $(seq 1 60); do
  if docker compose -f docker-compose.yml exec -T postgres pg_isready -U office -d fratelanza_office >/dev/null 2>&1; then
    postgres_ok=1
    break
  fi
  sleep 2
done

if [ "$postgres_ok" -ne 1 ]; then
  echo ""
  echo "Postgres still not ready. Last logs:"
  docker logs fratelanza-office-postgres --tail 40 2>&1 || true
  echo ""
  echo "If logs show data directory errors, run fresh start:"
  echo "  curl -fsSL https://raw.githubusercontent.com/Refaat1942/nividia/main/deploy/hostinger/fresh-start.sh | bash"
  exit 1
fi

echo "Syncing password inside postgres..."
escaped_pw=$(printf '%s' "${POSTGRES_PASSWORD}" | sed "s/'/''/g")
docker compose -f docker-compose.yml exec -T postgres \
  psql -U office -d postgres -v ON_ERROR_STOP=1 \
  -c "ALTER USER office WITH PASSWORD '${escaped_pw}';" \
  || true

echo "Starting full stack..."
docker compose -f docker-compose.yml up -d

echo "Seeding Nividia packages and settings..."
docker compose -f docker-compose.yml exec -T backend python -c "from app.scripts.seed import run_seed; run_seed()" || true

echo "Ensuring admin superuser access..."
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
docker compose -f docker-compose.yml exec -T postgres psql -U office -d fratelanza_office <<SQL || true
UPDATE users SET is_superuser = true, is_active = true
WHERE lower(username) = lower('${ADMIN_USERNAME}')
   OR full_name = 'System Admin'
   OR is_superuser = true;

INSERT INTO user_roles (id, user_id, role_id)
SELECT gen_random_uuid(), u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE r.name = 'super_admin'
  AND u.deleted_at IS NULL
  AND (lower(u.username) = lower('${ADMIN_USERNAME}') OR u.is_superuser = true)
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
  );
SQL

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

echo "Backend still failing. Logs:"
docker compose -f docker-compose.yml logs --tail=30 backend
exit 1
