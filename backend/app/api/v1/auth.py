import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession, get_client_ip, get_user_permissions
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.entities import Role, User, UserRole
from app.schemas.auth import ChangePasswordRequest, LoginRequest, RefreshRequest, TokenResponse, UserResponse
from app.services.admin_access import ensure_super_admin
from app.services.audit import log_audit

router = APIRouter(prefix="/auth", tags=["المصادقة"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: DbSession):
    username = data.username.strip().lower()
    user = db.scalar(
        select(User).where(func.lower(User.username) == username, User.deleted_at.is_(None))
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="بيانات الدخول غير صحيحة")
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="بيانات الدخول غير صحيحة")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="الحساب معطل")
    ensure_super_admin(db, user)
    log_audit(db, user_id=user.id, action="login", module="auth", ip_address=get_client_ip(request))
    db.commit()
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: DbSession):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="رمز غير صالح")
    user = db.get(User, uuid.UUID(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="المستخدم غير نشط")
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.get("/me", response_model=UserResponse)
def me(db: DbSession, user: CurrentUser):
    ensure_super_admin(db, user)
    perms = list(get_user_permissions(db, user))
    roles = db.scalars(
        select(Role.name).join(UserRole).where(UserRole.user_id == user.id)
    ).all()
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        must_change_password=user.must_change_password,
        permissions=perms,
        roles=list(roles),
    )


@router.post("/change-password")
def change_password(data: ChangePasswordRequest, user: CurrentUser, db: DbSession):
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")
    user.hashed_password = hash_password(data.new_password)
    user.must_change_password = False
    db.commit()
    return {"message": "تم تغيير كلمة المرور بنجاح"}
