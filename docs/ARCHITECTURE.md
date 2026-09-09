# Architecture

## Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2, Alembic-ready (create_all on startup), Pydantic v2
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Recharts
- **Database:** PostgreSQL 16
- **Auth:** JWT (access + refresh), bcrypt passwords
- **Files:** Docker volume `fratelanza_office_uploads`
- **Contracts:** docxtpl for DOCX placeholder replacement

## Isolation

| Resource | Name |
|----------|------|
| Install path | `/opt/fratelanza-office` |
| Compose project | `fratelanza-office` |
| Network | `fratelanza_office_net` |
| DB volume | `fratelanza_office_postgres_data` |
| Uploads volume | `fratelanza_office_uploads` |

Does NOT touch other `/opt/*` projects, containers, or nginx sites.

## API Structure

```
/api/v1/auth          Login, refresh, me
/api/v1/dashboard     Stats, charts
/api/v1/customers     CRUD, hours, profile
/api/v1/packages      CRUD, subscriptions
/api/v1/rooms         CRUD
/api/v1/offices       CRUD, assignments
/api/v1/bookings      CRUD, conflict check
/api/v1/contracts     Templates, generate, download
/api/v1/documents     Upload, download (private)
/api/v1/payments      CRUD
/api/v1/reports       Reports + Excel export
/api/v1/users         Users, roles, permissions
/api/v1/settings      System settings
/api/v1/audit         Audit log search
/api/v1/search        Global search
/api/v1/import        Excel import
/api/v1/notifications Alerts
```

## Hours Model

Balance = SUM(hours_transactions.amount). Never overwrite silently.

Transaction types: package, bonus, usage, adjustment, correction, refund.

## RBAC

Permissions stored in DB. Roles: super_admin, manager, reception, accountant, sales, viewer.

Superuser bypasses permission checks.
