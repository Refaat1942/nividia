#!/bin/bash
# Full production update — run on VPS: cd /opt/fratelanza-office/deploy && bash update.sh
set -e

INSTALL_DIR="/opt/fratelanza-office"
DEPLOY_DIR="${INSTALL_DIR}/deploy"
SECRETS_FILE="${DEPLOY_DIR}/.secrets"

cd "${INSTALL_DIR}"
echo "=== Pull latest code ==="
git fetch origin main
git reset --hard origin/main

cd "${DEPLOY_DIR}"
source hostinger/write-env.sh
load_or_create_secrets "${SECRETS_FILE}" 2>/dev/null || true
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"

chmod +x update.sh fix-admin.sh repair.sh backup-db.sh restore-db.sh hostinger/*.sh 2>/dev/null || true
sed -i 's/\r$//' update.sh fix-admin.sh repair.sh backup-db.sh restore-db.sh hostinger/*.sh 2>/dev/null || true

echo "=== Rebuild backend + frontend (no cache) ==="
docker compose --env-file .env build --no-cache backend frontend
docker compose --env-file .env up -d

echo "=== Wait for backend ==="
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:16361/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "=== Backend version ==="
curl -s http://127.0.0.1:16361/health || true

echo "=== Fix admin user ==="
docker compose --env-file .env exec -T postgres psql -U office -d fratelanza_office <<SQL
UPDATE users SET is_superuser = true, is_active = true
WHERE lower(username) = lower('${ADMIN_USERNAME}')
   OR lower(username) = 'admin'
   OR full_name = 'System Admin';

INSERT INTO user_roles (id, user_id, role_id)
SELECT gen_random_uuid(), u.id, r.id
FROM users u CROSS JOIN roles r
WHERE r.name = 'super_admin' AND u.deleted_at IS NULL
  AND (lower(u.username) = lower('${ADMIN_USERNAME}') OR lower(u.username) = 'admin' OR u.is_superuser = true)
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);
SQL

docker compose --env-file .env exec -T backend python -c "from app.scripts.seed import run_seed; run_seed()" || true

echo ""
echo "============================================"
echo "  DONE"
echo "  URL:      https://nividia.fratelanza.com/login"
echo "  Username: ${ADMIN_USERNAME}"
echo "  Password: $(grep '^ADMIN_PASSWORD=' "${SECRETS_FILE}" | cut -d= -f2-)"
echo "  Log out and log in again."
echo "============================================"
