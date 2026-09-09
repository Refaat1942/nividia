import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession, get_client_ip
from app.core.security import hash_password
from app.models.entities import Permission, Role, RolePermission, User, UserRole
from app.services.audit import log_audit

router = APIRouter(prefix="/users", tags=["المستخدمون"])


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr | None = None
    full_name: str
    password: str = Field(min_length=8)
    role_ids: list[uuid.UUID] = []


class UserUpdate(BaseModel):
    full_name: str | None = None
    is_active: bool | None = None
    role_ids: list[uuid.UUID] | None = None


class RolePermissionsUpdate(BaseModel):
    permission_codes: list[str]


def _user_dict(u: User, roles: list[str]) -> dict:
    return {
        "id": str(u.id),
        "username": u.username,
        "email": u.email,
        "full_name": u.full_name,
        "is_active": u.is_active,
        "is_superuser": u.is_superuser,
        "roles": roles,
    }


@router.get("")
def list_users(db: DbSession, user: CurrentUser):
    items = db.scalars(select(User).where(User.deleted_at.is_(None)).order_by(User.full_name)).all()
    result = []
    for u in items:
        roles = db.scalars(select(Role.name).join(UserRole).where(UserRole.user_id == u.id)).all()
        result.append(_user_dict(u, list(roles)))
    return {"items": result}


@router.post("", status_code=201)
def create_user(data: UserCreate, request: Request, db: DbSession, user: CurrentUser):
    username = data.username.strip().lower()
    if db.scalar(select(User).where(func.lower(User.username) == username)):
        raise HTTPException(400, "اسم المستخدم مسجل مسبقًا")
    new_user = User(
        username=username,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        is_active=True,
    )
    db.add(new_user)
    db.flush()
    for rid in data.role_ids:
        db.add(UserRole(user_id=new_user.id, role_id=rid))
    log_audit(db, user_id=user.id, action="create", module="users", record_id=str(new_user.id),
              new_value={"username": username, "roles": [str(r) for r in data.role_ids]},
              ip_address=get_client_ip(request))
    db.commit()
    roles = db.scalars(select(Role.name).join(UserRole).where(UserRole.user_id == new_user.id)).all()
    return _user_dict(new_user, list(roles))


@router.patch("/{user_id}")
def update_user(user_id: uuid.UUID, data: UserUpdate, request: Request, db: DbSession, user: CurrentUser):
    target = db.get(User, user_id)
    if not target or target.deleted_at:
        raise HTTPException(404, "المستخدم غير موجود")
    if target.is_superuser and data.is_active is False:
        raise HTTPException(400, "لا يمكن تعطيل مدير النظام")
    updates = data.model_dump(exclude_unset=True)
    role_ids = updates.pop("role_ids", None)
    for k, v in updates.items():
        setattr(target, k, v)
    if role_ids is not None:
        existing = db.scalars(select(UserRole).where(UserRole.user_id == user_id)).all()
        for ur in existing:
            db.delete(ur)
        for rid in role_ids:
            db.add(UserRole(user_id=user_id, role_id=rid))
    log_audit(db, user_id=user.id, action="update", module="users", record_id=str(user_id),
              new_value=updates, ip_address=get_client_ip(request))
    db.commit()
    roles = db.scalars(select(Role.name).join(UserRole).where(UserRole.user_id == user_id)).all()
    return _user_dict(target, list(roles))


@router.get("/roles")
def list_roles(db: DbSession, user: CurrentUser):
    roles = db.scalars(select(Role).order_by(Role.name_ar)).all()
    result = []
    for r in roles:
        perms = db.scalars(
            select(Permission.code, Permission.name_ar, Permission.module)
            .join(RolePermission)
            .where(RolePermission.role_id == r.id)
            .order_by(Permission.module, Permission.code)
        ).all()
        result.append({
            "id": str(r.id),
            "name": r.name,
            "name_ar": r.name_ar,
            "is_system": r.is_system,
            "permissions": [{"code": p[0], "name_ar": p[1], "module": p[2]} for p in perms],
            "permission_codes": [p[0] for p in perms],
        })
    return {"items": result}


@router.patch("/roles/{role_id}")
def update_role_permissions(
    role_id: uuid.UUID,
    data: RolePermissionsUpdate,
    request: Request,
    db: DbSession,
    user: CurrentUser,
):
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "الدور غير موجود")
    if role.name == "super_admin":
        raise HTTPException(400, "لا يمكن تعديل صلاحيات مدير النظام")

    valid_codes = set(db.scalars(select(Permission.code)).all())
    invalid = [c for c in data.permission_codes if c not in valid_codes]
    if invalid:
        raise HTTPException(400, f"صلاحيات غير معروفة: {', '.join(invalid)}")

    existing = db.scalars(select(RolePermission).where(RolePermission.role_id == role_id)).all()
    for rp in existing:
        db.delete(rp)
    for code in data.permission_codes:
        perm = db.scalar(select(Permission).where(Permission.code == code))
        if perm:
            db.add(RolePermission(role_id=role_id, permission_id=perm.id))

    log_audit(
        db, user_id=user.id, action="update_role_permissions", module="users",
        record_id=str(role_id), new_value={"permissions": data.permission_codes},
        ip_address=get_client_ip(request),
    )
    db.commit()

    perms = db.scalars(
        select(Permission.code, Permission.name_ar, Permission.module)
        .join(RolePermission)
        .where(RolePermission.role_id == role.id)
    ).all()
    return {
        "id": str(role.id),
        "name": role.name,
        "name_ar": role.name_ar,
        "permissions": [{"code": p[0], "name_ar": p[1], "module": p[2]} for p in perms],
        "permission_codes": [p[0] for p in perms],
    }


@router.get("/permissions")
def list_permissions(db: DbSession, user: CurrentUser):
    perms = db.scalars(select(Permission).order_by(Permission.module, Permission.code)).all()
    return {
        "items": [
            {"id": str(p.id), "code": p.code, "name_ar": p.name_ar, "module": p.module}
            for p in perms
        ]
    }
