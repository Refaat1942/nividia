#!/bin/bash
set -e

INSTALL_DIR="/opt/fratelanza-office"
DOMAIN="nividia.fratelanza.com"
REPO_URL="https://github.com/Refaat1942/nividia.git"
SECRETS_FILE="${INSTALL_DIR}/deploy/.secrets"

echo "=== Fratelanza Office Manager ==="
echo "Domain: https://${DOMAIN}"

if [ -d "${INSTALL_DIR}/.git" ]; then
  cd "${INSTALL_DIR}" && git fetch origin main && git reset --hard origin/main
else
  rm -rf "${INSTALL_DIR}"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

cd "${INSTALL_DIR}/deploy"

# Load existing secrets OR generate new ones (never rotate DB password on existing volume)
if [ -f "${SECRETS_FILE}" ]; then
  echo "Using saved credentials from .secrets"
  POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "${SECRETS_FILE}" | cut -d= -f2-)
  SECRET_KEY=$(grep '^SECRET_KEY=' "${SECRETS_FILE}" | cut -d= -f2-)
  ADMIN_PASS=$(grep '^ADMIN_PASSWORD=' "${SECRETS_FILE}" | cut -d= -f2-)
  ADMIN_USER=$(grep '^ADMIN_USERNAME=' "${SECRETS_FILE}" | cut -d= -f2-)
  ADMIN_USER="${ADMIN_USER:-admin}"
else
  echo "First install — generating new credentials"
  SECRET_KEY=$(openssl rand -hex 32)
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  ADMIN_USER="${ADMIN_USERNAME:-admin}"
  if [ -n "${ADMIN_PASSWORD}" ]; then
    ADMIN_PASS="${ADMIN_PASSWORD}"
  else
    ADMIN_PASS="Office$(openssl rand -hex 4)"
  fi
  mkdir -p "$(dirname "${SECRETS_FILE}")"
  cat > "${SECRETS_FILE}" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
SECRET_KEY=${SECRET_KEY}
ADMIN_PASSWORD=${ADMIN_PASS}
ADMIN_USERNAME=${ADMIN_USER}
EOF
  chmod 600 "${SECRETS_FILE}"
fi

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
export CORS_ORIGINS="https://${DOMAIN},http://${DOMAIN}"
export NEXT_PUBLIC_API_URL="https://${DOMAIN}"
export SEED_DEMO_DATA=false

chmod +x backup-db.sh restore-db.sh hostinger/repair.sh 2>/dev/null || true

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
  echo "Try: bash ${INSTALL_DIR}/deploy/hostinger/repair.sh"
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
