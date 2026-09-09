# Deployment Guide

## VPS: 187.124.15.14 (Hostinger Ubuntu 24.04)

### Pre-requisites

- Docker + Docker Compose
- Nginx on host (ports 80/443)
- Git or rsync for code transfer

### Step 1: Port Check

```bash
bash deploy/pre-deploy-check.sh
```

Preferred: 16360 (frontend), 16361 (backend). Auto-selects alternatives if occupied.

### Step 2: Deploy

```bash
cd /opt/fratelanza-office/deploy
cp .env.example .env
# Edit ADMIN_PASSWORD, SECRET_KEY
bash deploy.sh
```

### Step 3: Nginx (NEW file only)

```bash
sudo cp deploy/nginx-office.fratelanza.com.conf /etc/nginx/sites-available/office.fratelanza.com
# Update upstream ports if pre-deploy-check selected different ports
sudo ln -sf /etc/nginx/sites-available/office.fratelanza.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Step 4: DNS

Cloudflare A record: `nividia` → `187.124.15.14` (DNS only initially)

### Step 5: SSL

```bash
sudo certbot --nginx -d nividia.fratelanza.com
```

Update `.env` CORS_ORIGINS to include `https://nividia.fratelanza.com`

### Verify

```bash
curl http://127.0.0.1:16361/health
curl -I http://127.0.0.1:16360/login
docker ps --filter name=fratelanza-office
```

### Containers

- `fratelanza-office-postgres`
- `fratelanza-office-backend`
- `fratelanza-office-frontend`
- `fratelanza-office-backup`
