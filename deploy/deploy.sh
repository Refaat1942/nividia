#!/bin/bash
set -e

INSTALL_DIR="/opt/fratelanza-office"
REPO_URL="${REPO_URL:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Fratelanza Office Manager Deployment ==="

if [ "$(id -u)" -ne 0 ] && ! groups | grep -q docker; then
  echo "Run as root or a user in the docker group"
fi

bash "$SCRIPT_DIR/pre-deploy-check.sh" | tee /tmp/office-deploy-ports.txt
FRONTEND_PORT=$(grep "^FRONTEND_PORT=" /tmp/office-deploy-ports.txt | cut -d= -f2)
BACKEND_PORT=$(grep "^BACKEND_PORT=" /tmp/office-deploy-ports.txt | cut -d= -f2)

mkdir -p "$INSTALL_DIR"

if [ -d "$PROJECT_ROOT/.git" ] || [ -f "$PROJECT_ROOT/deploy/docker-compose.yml" ]; then
  echo "Copying from local project..."
  rsync -a --exclude node_modules --exclude .next --exclude __pycache__ --exclude .git \
    "$PROJECT_ROOT/" "$INSTALL_DIR/"
else
  echo "ERROR: Project files not found. Clone or copy project to $INSTALL_DIR"
  exit 1
fi

cd "$INSTALL_DIR/deploy"

if [ ! -f .env ]; then
  cp .env.example .env
  SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
  sed -i "s/change_this_to_a_long_random_secret_key/$SECRET/" .env
  sed -i "s/change_this_strong_password/$(openssl rand -hex 16 2>/dev/null || echo "OfficeDB$(date +%s)")/" .env
  echo ""
  echo "IMPORTANT: Edit $INSTALL_DIR/deploy/.env and set ADMIN_PASSWORD"
  echo ""
fi

echo "FRONTEND_PORT=${FRONTEND_PORT}" >> .env.local 2>/dev/null || true
export FRONTEND_PORT="${FRONTEND_PORT}"
export BACKEND_PORT="${BACKEND_PORT}"

set -a
source .env
set +a

docker compose --env-file .env -f docker-compose.yml down 2>/dev/null || true
docker compose --env-file .env -f docker-compose.yml build --no-cache
docker compose --env-file .env -f docker-compose.yml up -d

echo "Waiting for health check..."
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${BACKEND_PORT#127.0.0.1:}/health" >/dev/null 2>&1; then
    echo "Backend healthy!"
    break
  fi
  sleep 2
done

BACKEND_PORT_NUM="${BACKEND_PORT#127.0.0.1:}"
FRONTEND_PORT_NUM="${FRONTEND_PORT#127.0.0.1:}"

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Frontend: http://127.0.0.1:${FRONTEND_PORT_NUM}"
echo "Backend:  http://127.0.0.1:${BACKEND_PORT_NUM}/health"
echo "Login:    http://127.0.0.1:${FRONTEND_PORT_NUM}/login"
echo ""
echo "Nginx: cp deploy/nginx-office.fratelanza.com.conf to /etc/nginx/sites-available/"
echo "       Update ports if different from 16360/16361"
echo "SSL:   certbot --nginx -d office.fratelanza.com"
echo ""
echo "Backup: docker compose -f deploy/docker-compose.yml exec backup sh /backup-db.sh"
