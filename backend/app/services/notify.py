import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Notification, Role, User, UserRole


def notify_admins(
    db: Session,
    *,
    title: str,
    message: str,
    notification_type: str,
    reference_type: str | None = None,
    reference_id: uuid.UUID | None = None,
) -> list[Notification]:
    created: list[Notification] = []
    global_note = Notification(
        title=title,
        message=message,
        notification_type=notification_type,
        reference_type=reference_type,
        reference_id=reference_id,
    )
    db.add(global_note)
    created.append(global_note)

    admin_roles = db.scalars(
        select(Role).where(Role.name.in_(["super_admin", "manager"]))
    ).all()
    if not admin_roles:
        return created

    role_ids = [r.id for r in admin_roles]
    admin_users = db.scalars(
        select(User).join(UserRole).where(
            UserRole.role_id.in_(role_ids),
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        )
    ).all()
    seen = set()
    for admin in admin_users:
        if admin.id in seen:
            continue
        seen.add(admin.id)
        note = Notification(
            user_id=admin.id,
            title=title,
            message=message,
            notification_type=notification_type,
            reference_type=reference_type,
            reference_id=reference_id,
        )
        db.add(note)
        created.append(note)
    return created
