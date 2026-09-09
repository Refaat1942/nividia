#!/bin/bash
# Fratelanza Office Manager — one-command VPS install
# Access ONLY via https://nividia.fratelanza.com (no public ports)
set -e

INSTALL_DIR="/opt/fratelanza-office"
DOMAIN="nividia.fratelanza.com"
REPO_URL="https://github.com/Refaat1942/nividia.git"

echo "=== Fratelanza Office Manager ==="
echo "Domain: https://$DOMAIN"

# Clone or update
if [ -d "$INSTALL_DIR/.git" ]; then
  cd "$INSTALL_DIR" && git pull origin main
else
  rm -rf "$INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

# Fix Windows line endings (caused .env: \r: command not found)
find "$INSTALL_DIR" -type f \( -name "*.sh" -o -name ".env*" -o -name "*.yml" -o -name "*.conf" \) \
  -exec sed -i 's/\r$//' {} + 2>/dev/null || true

cd "$INSTALL_DIR/deploy"

# Generate .env (never copy CRLF file)
SECRET=$(openssl rand -hex 32)
DBPASS=$(openssl rand -hex 16)
ADMIN_PASS="${ADMIN_PASSWORD:-Office$(openssl rand -hex 4)!}"

cat > .env <<EOF
POSTGRES_USER=office
POSTGRES_PASSWORD=${DBPASS}
POSTGRES_DB=fratelanza_office
SECRET_KEY=${SECRET}
ADMIN_EMAIL=admin@fratelanza.local
ADMIN_PASSWORD=${ADMIN_PASS}
ADMIN_NAME=مدير النظام
FRONTEND_PORT=127.0.0.1:16360
BACKEND_PORT=127.0.0.1:16361
CORS_ORIGINS=https://${DOMAIN},http://${DOMAIN}
NEXT_PUBLIC_API_URL=https://${DOMAIN}
SEED_DEMO_DATA=false
EOF

chmod +x backup-db.sh restore-db.sh 2>/dev/null || true

export FRONTEND_PORT=127.0.0.1:16360
export BACKEND_PORT=127.0.0.1:16361

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

# Nginx — subdomain only (port 80/443), NEW file only
cat > /etc/nginx/sites-available/nividia.fratelanza.com <<'NGINX'
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
NGINX

ln -sf /etc/nginx/sites-available/nividia.fratelanza.com /etc/nginx/sites-enabled/nividia.fratelanza.com
nginx -t && systemctl reload nginx

# SSL
if command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    -m "${CERTBOT_EMAIL:-admin@fratelanza.com}" --redirect 2>/dev/null || true
fi

echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETE"
echo "  URL:      https://$DOMAIN/login"
echo "  Email:    admin@fratelanza.local"
echo "  Password: $ADMIN_PASS"
echo "============================================"
docker compose -f docker-compose.yml ps
