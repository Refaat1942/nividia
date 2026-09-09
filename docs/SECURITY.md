# Security

## Authentication

- bcrypt password hashing
- JWT access tokens (60 min) + refresh tokens (7 days)
- Rate limiting on login (slowapi)
- First admin via `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars

## Authorization

- RBAC with database-stored permissions
- Superuser bypass for admin
- Permission checks on all API endpoints via `CurrentUser` dependency

## Data Validation

- Egyptian phone: 11 digits, prefixes 010/011/012/015
- National ID: exactly 14 digits, unique
- Pydantic validation on all inputs
- SQLAlchemy ORM (parameterized queries)

## File Uploads

- Extension whitelist: .pdf, .jpg, .jpeg, .png, .doc, .docx, .xls, .xlsx
- Max size: 20MB (configurable)
- Private storage in Docker volume
- Download requires authentication

## Network

- PostgreSQL: no host port exposure
- Backend/Frontend: localhost binding only
- Nginx handles public HTTPS

## Secrets

- All secrets in `.env` — never in source code
- `.env` excluded from git
- `SECRET_KEY` generated on first deploy

## Audit

- All mutations logged with user, action, module, IP
- Immutable hours transaction ledger
