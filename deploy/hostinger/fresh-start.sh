#!/bin/bash
# Wipe ONLY fratelanza-office database and redeploy (does NOT touch other projects)
set -e

INSTALL_DIR="/opt/fratelanza-office"
echo "=== Fresh start (fratelanza-office only) ==="

cd "${INSTALL_DIR}/deploy" 2>/dev/null || true
docker compose -f docker-compose.yml down 2>/dev/null || true

echo "Removing only fratelanza-office postgres volume..."
docker volume rm fratelanza_office_postgres_data 2>/dev/null || true

rm -f "${INSTALL_DIR}/deploy/.secrets" "${INSTALL_DIR}/deploy/.env"

echo "Reinstalling..."
curl -fsSL https://raw.githubusercontent.com/Refaat1942/nividia/main/deploy/hostinger/install.sh | bash
