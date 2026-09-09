from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import Role, User, UserRole

settings = get_settings()


def _name_matches_admin(full_name: str | None) -> bool:
    if not full_name:
        return False
    admin_name = (settings.ADMIN_NAME or "System Admin").strip().casefold()
    return full_name.strip().casefold() == admin_name


def ensure_super_admin(db: Session, user) -> None:
    """Ensure deploy admin account always has full access (fixes permission drift)."""
    admin_username = (settings.ADMIN_USERNAME or "admin").strip().lower()
    has_any_superuser = db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.deleted_at.is_(None), User.is_superuser.is_(True))
    ) or 0

    should_promote = (
        user.is_superuser
        or user.username.lower() == admin_username
        or _name_matches_admin(user.full_name)
        or has_any_superuser == 0
    )
    if not should_promote:
        user_count = db.scalar(select(func.count()).select_from(User).where(User.deleted_at.is_(None))) or 0
        if user_count == 1:
            should_promote = True

    if not should_promote:
        return

    changed = False
    if not user.is_superuser:
        user.is_superuser = True
        changed = True
    if not user.is_active:
        user.is_active = True
        changed = True

    super_role = db.scalar(select(Role).where(Role.name == "super_admin"))
    if super_role and not db.scalar(
        select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == super_role.id)
    ):
        db.add(UserRole(user_id=user.id, role_id=super_role.id))
        changed = True

    if changed:
        db.commit()
        db.refresh(user)
