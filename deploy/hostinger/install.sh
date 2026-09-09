#!/bin/bash
set -e

INSTALL_DIR="/opt/fratelanza-office"
DOMAIN="nividia.fratelanza.com"
REPO_URL="https://github.com/Refaat1942/nividia.git"

echo "=== Fratelanza Office Manager ==="
echo "Domain: https://${DOMAIN}"

if [ -d "${INSTALL_DIR}/.git" ]; then
  cd "${INSTALL_DIR}" && git fetch origin main && git reset --hard origin/main
else
  rm -rf "${INSTALL_DIR}"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

cd "${INSTALL_DIR}/deploy"
rm -f .env .env.local

SECRET=$(openssl rand -hex 32)
DBPASS=$(openssl rand -hex 16)
ADMIN_USER="${ADMIN_USERNAME:-admin}"
if [ -n "${ADMIN_PASSWORD}" ]; then
  ADMIN_PASS="${ADMIN_PASSWORD}"
else
  ADMIN_PASS="Office$(openssl rand -hex 4)"
fi

export POSTGRES_USER=office
export POSTGRES_PASSWORD="${DBPASS}"
export POSTGRES_DB=fratelanza_office
export SECRET_KEY="${SECRET}"
export ADMIN_USERNAME="${ADMIN_USER}"
export ADMIN_PASSWORD="${ADMIN_PASS}"
export ADMIN_NAME="System Admin"
export ADMIN_EMAIL=""
export FRONTEND_PORT="127.0.0.1:16360"
export BACKEND_PORT="127.0.0.1:16361"
export CORS_ORIGINS="https://${DOMAIN},http://${DOMAIN}"
export NEXT_PUBLIC_API_URL="https://${DOMAIN}"
export SEED_DEMO_DATA=false

chmod +x backup-db.sh restore-db.sh 2>/dev/null || true

docker compose -f docker-compose.yml down 2>/dev/null || true
docker compose -f docker-compose.yml build --no-cache
docker compose -f docker-compose.yml up -d

echo "Waiting for services..."
for i in $(seq 1 90); do
  if curl -sf http://127.0.0.1:16361/health >/dev/null 2>&1; then
    echo "Backend ready."
    break
  fi
  sleep 2
done
if ! curl -sf http://127.0.0.1:16361/health >/dev/null 2>&1; then
  echo "ERROR: Backend not healthy. Logs:"
  docker compose -f docker-compose.yml logs --tail=80 backend
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
echo "  Username: ${ADMIN_USER}"
echo "  Password: ${ADMIN_PASS}"
echo "============================================"
docker compose -f docker-compose.yml ps
