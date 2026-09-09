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


def _promote_user(db: Session, user) -> bool:
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
    return changed


def ensure_super_admin(db: Session, user) -> None:
    """Ensure deploy admin account always has full access (fixes permission drift)."""
    admin_username = (settings.ADMIN_USERNAME or "admin").strip().lower()

    if user.username.lower() == admin_username or _name_matches_admin(user.full_name):
        _promote_user(db, user)
        return

    if user.is_superuser:
        _promote_user(db, user)
        return

    has_any_superuser = db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.deleted_at.is_(None), User.is_superuser.is_(True))
    ) or 0
    if has_any_superuser == 0:
        _promote_user(db, user)


def repair_admin_accounts(db: Session) -> None:
    """Run on startup: fix configured admin + first user if RBAC is broken."""
    admin_username = (settings.ADMIN_USERNAME or "admin").strip().lower()
    admin = db.scalar(
        select(User).where(func.lower(User.username) == admin_username, User.deleted_at.is_(None))
    )
    if admin:
        ensure_super_admin(db, admin)
        return

    first_user = db.scalar(
        select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.asc()).limit(1)
    )
    if first_user:
        ensure_super_admin(db, first_user)
