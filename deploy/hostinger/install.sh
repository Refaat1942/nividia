#!/bin/bash
# Fratelanza Office Manager — Hostinger VPS one-shot install
# Safe: isolated /opt/fratelanza-office, does NOT touch other projects
#
# Run on VPS as root:
#   curl -fsSL https://raw.githubusercontent.com/Refaat1942/Nividia/main/deploy/hostinger/install.sh | bash
#
# Or after uploading project:
#   cd /opt/fratelanza-office && bash deploy/hostinger/install.sh

set -e

INSTALL_DIR="/opt/fratelanza-office"
DOMAIN="nividia.fratelanza.com"
REPO_URL="${REPO_URL:-https://github.com/Refaat1942/Nividia.git}"
FRONTEND_PORT_PREFERRED=16360
BACKEND_PORT_PREFERRED=16361

echo "=== Fratelanza Office Manager — Install ==="
echo "Domain: $DOMAIN"
echo "Install: $INSTALL_DIR"

find_free_port() {
  local p=$1
  if ! ss -tlnp 2>/dev/null | grep -q ":${p} "; then
    echo "$p"
    return
  fi
  for port in $(seq 16362 16399); do
    if ! ss -tlnp 2>/dev/null | grep -q ":${port} "; then
      echo "$port"
      return
    fi
  done
  echo "ERROR: no free port" >&2
  exit 1
}

FRONTEND_PORT=$(find_free_port $FRONTEND_PORT_PREFERRED)
BACKEND_PORT=$(find_free_port $BACKEND_PORT_PREFERRED)
echo "Ports: frontend=$FRONTEND_PORT backend=$BACKEND_PORT"

if [ ! -f "$INSTALL_DIR/deploy/docker-compose.yml" ]; then
  echo "Cloning repository..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR" && git pull origin main || git pull origin master
  else
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
fi

cd "$INSTALL_DIR/deploy"

if [ ! -f .env ]; then
  cp .env.example .env
  SECRET=$(openssl rand -hex 32)
  DBPASS=$(openssl rand -hex 16)
  ADMIN_PASS="${ADMIN_PASSWORD:-OfficeAdmin$(date +%s | tail -c 6)!}"
  sed -i "s/change_this_to_a_long_random_secret_key/$SECRET/" .env
  sed -i "s/change_this_strong_password/$DBPASS/" .env
  sed -i "s/change_this_admin_password/$ADMIN_PASS/" .env
  sed -i "s|http://127.0.0.1:16360|https://$DOMAIN|" .env
  sed -i "s|http://127.0.0.1:16361|https://$DOMAIN|" .env
  sed -i "s|office.fratelanza.com|$DOMAIN|g" .env
  echo ""
  echo "=== ADMIN CREDENTIALS (save these) ==="
  grep ADMIN_EMAIL .env
  echo "ADMIN_PASSWORD=$ADMIN_PASS"
  echo "===================================="
fi

export FRONTEND_PORT="127.0.0.1:${FRONTEND_PORT}"
export BACKEND_PORT="127.0.0.1:${BACKEND_PORT}"

set -a
source .env
set +a

chmod +x backup-db.sh restore-db.sh 2>/dev/null || true

docker compose --env-file .env -f docker-compose.yml down 2>/dev/null || true
docker compose --env-file .env -f docker-compose.yml build
docker compose --env-file .env -f docker-compose.yml up -d

echo "Waiting for backend..."
for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null 2>&1; then
    echo "Backend OK"
    break
  fi
  sleep 3
done

# Nginx — NEW file only
NGINX_CONF="/etc/nginx/sites-available/nividia.fratelanza.com"
if [ -f "$INSTALL_DIR/deploy/nginx-nividia.fratelanza.com.conf" ]; then
  sed "s/127.0.0.1:16360/127.0.0.1:${FRONTEND_PORT}/g; s/127.0.0.1:16361/127.0.0.1:${BACKEND_PORT}/g" \
    "$INSTALL_DIR/deploy/nginx-nividia.fratelanza.com.conf" > /tmp/nividia.nginx.conf
  cp /tmp/nividia.nginx.conf "$NGINX_CONF"
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/nividia.fratelanza.com
  nginx -t && systemctl reload nginx
  echo "Nginx configured for $DOMAIN"
fi

# SSL if certbot available and DNS resolves
if command -v certbot >/dev/null 2>&1; then
  if getent hosts "$DOMAIN" >/dev/null 2>&1; then
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "${CERTBOT_EMAIL:-admin@fratelanza.com}" 2>/dev/null || \
      echo "SSL: run manually: certbot --nginx -d $DOMAIN"
  else
    echo "DNS not ready for $DOMAIN — skip SSL for now"
  fi
fi

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "URL:      http://$DOMAIN/login"
echo "Health:   http://127.0.0.1:${BACKEND_PORT}/health"
echo "Frontend: http://127.0.0.1:${FRONTEND_PORT}"
docker compose -f docker-compose.yml ps
