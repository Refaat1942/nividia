#!/bin/bash
# Run from deploy/: bash fix-admin.sh
set -e
cd "$(dirname "$0")"
source hostinger/write-env.sh
load_or_create_secrets "${PWD}/.secrets" 2>/dev/null || true
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"

docker compose -f docker-compose.yml exec -T postgres psql -U office -d fratelanza_office <<SQL
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

docker compose -f docker-compose.yml exec -T backend python -c "from app.scripts.seed import run_seed; run_seed()"
echo "Done. Log out and log in again."
