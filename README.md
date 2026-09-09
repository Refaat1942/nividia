# Fratelanza Office Manager

نظام إدارة المكاتب الإدارية وغرف الاجتماعات — إنتاج جاهز مع Docker.

## المميزات

- إدارة العملاء (تحقق الرقم القومي والهاتف المصري)
- الباقات (قاعدة بيانات — بدون hardcode)
- محفظة الساعات (ledger معاملات)
- المكاتب وغرف الاجتماعات
- الحجوزات (منع التعارض)
- العقود (DOCX templates + placeholders)
- المستندات (تخزين خاص)
- المدفوعات والتقارير
- Excel import/export
- RBAC + Audit log
- واجهة عربية RTL

## البنية

```
backend/     FastAPI + SQLAlchemy + PostgreSQL
frontend/    Next.js 14 + Tailwind (RTL)
deploy/      Docker Compose + Nginx + Backup scripts
docs/        Architecture, database, deployment, security
```

## التثبيت السريع (VPS)

```bash
# 1. نسخ المشروع
sudo mkdir -p /opt/fratelanza-office
sudo rsync -a ./ /opt/fratelanza-office/

# 2. فحص المنافذ
cd /opt/fratelanza-office/deploy
bash pre-deploy-check.sh

# 3. إعداد البيئة
cp .env.example .env
nano .env   # Set ADMIN_PASSWORD, SECRET_KEY, POSTGRES_PASSWORD

# 4. النشر
bash deploy.sh

# 5. Nginx (جديد فقط — لا يعدّل مواقع أخرى)
sudo cp nginx-office.fratelanza.com.conf /etc/nginx/sites-available/office.fratelanza.com
sudo ln -sf /etc/nginx/sites-available/office.fratelanza.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. SSL (بعد DNS)
sudo certbot --nginx -d office.fratelanza.com
```

## DNS

| Type | Name | Content |
|------|------|---------|
| A | nividia | 187.124.15.14 |

## المنافذ

| Service | Default | Binding |
|---------|---------|---------|
| Frontend | 16360 | 127.0.0.1 only |
| Backend API | 16361 | 127.0.0.1 only |
| PostgreSQL | 5432 | internal only |

## تسجيل الدخول

- URL: `https://nividia.fratelanza.com/login` (أو `http://127.0.0.1:16360/login`)
- Email: من `ADMIN_EMAIL` في `.env`
- Password: من `ADMIN_PASSWORD` في `.env`

## النسخ الاحتياطي

```bash
cd /opt/fratelanza-office/deploy
docker compose exec backup sh /backup-db.sh
```

## الاستعادة

```bash
docker compose exec -T postgres sh /deploy/restore-db.sh /backups/fratelanza_office_YYYYMMDD.sql.gz
```

## الاختبارات

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

## Docker

```bash
cd deploy
docker compose --env-file .env up -d --build
docker compose ps
curl http://127.0.0.1:16361/health
```
