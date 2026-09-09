# Database Schema

PostgreSQL 16 — database name: `fratelanza_office`

## Core Tables

| Table | Purpose |
|-------|---------|
| users | System users |
| roles | Customizable roles |
| permissions | Granular permissions |
| user_roles | User-role mapping |
| role_permissions | Role-permission mapping |
| customers | Customer records |
| packages | Database-driven packages |
| customer_subscriptions | Package assignments |
| hours_transactions | Immutable hours ledger |
| offices | Administrative offices |
| office_assignments | Office rentals |
| rooms | Meeting rooms |
| room_bookings | Room bookings |
| contract_templates | DOCX templates |
| contract_template_variables | Placeholder registry |
| contracts | Generated contracts |
| documents | Customer documents |
| payments | Payment records |
| notifications | System alerts |
| audit_logs | Audit trail |
| settings | Key-value settings |
| import_jobs | Excel import tracking |
| import_rows | Per-row validation |

## Constraints

- `customers.national_id` UNIQUE (14 digits)
- `customers.phone` UNIQUE (11 digits, Egyptian)
- Booking overlap prevented at application level
- Soft delete via `deleted_at` on key entities

## Indexes

- customers: national_id, phone, status, full_name
- hours_transactions: customer_id + created_at
- room_bookings: room_id + booking_date
- audit_logs: module + action + created_at
- contracts: contract_number, end_date
