import uuid

from fastapi import APIRouter, HTTPException, Request
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


@router.get("")
def list_users(db: DbSession, user: CurrentUser):
    items = db.scalars(select(User).where(User.deleted_at.is_(None))).all()
    result = []
    for u in items:
        roles = db.scalars(select(Role.name).join(UserRole).where(UserRole.user_id == u.id)).all()
        result.append({"id": str(u.id), "username": u.username, "email": u.email, "full_name": u.full_name, "is_active": u.is_active, "roles": list(roles)})
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
    )
    db.add(new_user)
    db.flush()
    for rid in data.role_ids:
        db.add(UserRole(user_id=new_user.id, role_id=rid))
    log_audit(db, user_id=user.id, action="create", module="users", record_id=str(new_user.id),
              ip_address=get_client_ip(request))
    db.commit()
    return {"id": str(new_user.id), "username": new_user.username}


@router.get("/roles")
def list_roles(db: DbSession, user: CurrentUser):
    roles = db.scalars(select(Role)).all()
    result = []
    for r in roles:
        perms = db.scalars(
            select(Permission.code).join(RolePermission).where(RolePermission.role_id == r.id)
        ).all()
        result.append({"id": str(r.id), "name": r.name, "name_ar": r.name_ar, "permissions": list(perms)})
    return {"items": result}


@router.get("/permissions")
def list_permissions(db: DbSession, user: CurrentUser):
    return {"items": db.scalars(select(Permission).order_by(Permission.module, Permission.code)).all()}
