#!/bin/bash
set -e

INSTALL_DIR="/opt/fratelanza-office"
DOMAIN="nividia.fratelanza.com"
REPO_URL="https://github.com/Refaat1942/nividia.git"
DEPLOY_DIR="${INSTALL_DIR}/deploy"
SECRETS_FILE="${DEPLOY_DIR}/.secrets"

echo "=== Fratelanza Office Manager ==="
echo "Domain: https://${DOMAIN}"

if [ -d "${INSTALL_DIR}/.git" ]; then
  cd "${INSTALL_DIR}" && git fetch origin main && git reset --hard origin/main
else
  rm -rf "${INSTALL_DIR}"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

cd "${DEPLOY_DIR}"
source hostinger/write-env.sh

if [ -f "${SECRETS_FILE}" ]; then
  echo "Using saved credentials from .secrets"
  load_or_create_secrets "${SECRETS_FILE}"
else
  echo "First install — generating new credentials"
  generate_secrets
  save_secrets "${SECRETS_FILE}"
fi

write_deploy_env "${DEPLOY_DIR}"

chmod +x backup-db.sh restore-db.sh hostinger/*.sh 2>/dev/null || true

docker compose -f docker-compose.yml down 2>/dev/null || true

if [ "${FORCE_REBUILD}" = "1" ]; then
  docker compose -f docker-compose.yml build --no-cache
else
  docker compose -f docker-compose.yml build
fi

docker compose -f docker-compose.yml up -d

echo "Waiting for backend..."
OK=0
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:16361/health >/dev/null 2>&1; then
    OK=1
    break
  fi
  sleep 3
done

if [ "$OK" != "1" ]; then
  echo "Backend not healthy — running repair..."
  bash hostinger/repair.sh || true
  sleep 10
fi

if ! curl -sf http://127.0.0.1:16361/health >/dev/null 2>&1; then
  echo "ERROR: Backend still not healthy. Logs:"
  docker compose -f docker-compose.yml logs --tail=40 backend
  echo ""
  echo "Try: bash ${DEPLOY_DIR}/hostinger/repair.sh"
  exit 1
fi

cat > /etc/nginx/sites-available/nividia.fratelanza.com << 'NGINXEOF'
upstream nividia_frontend { server 127.0.0.1:16360; }
upstream nividia_backend  { server 127.0.0.1:16361; }

server {
    listen 80;
    listen [::]:80;
    server_name nividia.fratelanza.com;
    client_max_body_size 25M;

    location /api/ {
        proxy_pass http://nividia_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /health {
        proxy_pass http://nividia_backend;
    }

    location / {
        proxy_pass http://nividia_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/nividia.fratelanza.com /etc/nginx/sites-enabled/nividia.fratelanza.com
nginx -t && systemctl reload nginx

if command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m admin@fratelanza.com --redirect 2>/dev/null || true
fi

echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETE"
echo "  URL:      https://${DOMAIN}/login"
echo "  Username: ${ADMIN_USERNAME}"
echo "  Password: ${ADMIN_PASSWORD}"
echo "============================================"
docker compose -f docker-compose.yml ps
