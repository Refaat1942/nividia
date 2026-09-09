#!/bin/bash
set -e

INSTALL_DIR="/opt/fratelanza-office"
DOMAIN="nividia.fratelanza.com"
REPO_URL="https://github.com/Refaat1942/nividia.git"

echo "=== Fratelanza Office Manager ==="
echo "Domain: https://${DOMAIN}"

if [ -d "${INSTALL_DIR}/.git" ]; then
  cd "${INSTALL_DIR}" && git pull origin main
else
  rm -rf "${INSTALL_DIR}"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

find "${INSTALL_DIR}" -type f -name "*.sh" -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find "${INSTALL_DIR}" -type f -name "*.yml" -exec sed -i 's/\r$//' {} + 2>/dev/null || true

cd "${INSTALL_DIR}/deploy"

SECRET=$(openssl rand -hex 32)
DBPASS=$(openssl rand -hex 16)
if [ -n "${ADMIN_PASSWORD}" ]; then
  ADMIN_PASS="${ADMIN_PASSWORD}"
else
  ADMIN_PASS="Office$(openssl rand -hex 4)"
fi

{
  echo "POSTGRES_USER=office"
  echo "POSTGRES_PASSWORD=${DBPASS}"
  echo "POSTGRES_DB=fratelanza_office"
  echo "SECRET_KEY=${SECRET}"
  echo "ADMIN_EMAIL=admin@fratelanza.local"
  echo "ADMIN_PASSWORD=${ADMIN_PASS}"
  echo "ADMIN_NAME=System Admin"
  echo "FRONTEND_PORT=127.0.0.1:16360"
  echo "BACKEND_PORT=127.0.0.1:16361"
  echo "CORS_ORIGINS=https://${DOMAIN},http://${DOMAIN}"
  echo "NEXT_PUBLIC_API_URL=https://${DOMAIN}"
  echo "SEED_DEMO_DATA=false"
} > .env

chmod +x backup-db.sh restore-db.sh 2>/dev/null || true

docker compose --env-file .env -f docker-compose.yml down 2>/dev/null || true
docker compose --env-file .env -f docker-compose.yml build
docker compose --env-file .env -f docker-compose.yml up -d

echo "Waiting for services..."
for i in $(seq 1 90); do
  if curl -sf http://127.0.0.1:16361/health >/dev/null 2>&1; then
    echo "Backend ready."
    break
  fi
  sleep 2
done

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
echo "  Email:    admin@fratelanza.local"
echo "  Password: ${ADMIN_PASS}"
echo "============================================"
docker compose -f docker-compose.yml ps
