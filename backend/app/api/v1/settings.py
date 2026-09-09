import base64
import os

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession
from app.models.entities import Setting

router = APIRouter(prefix="/settings", tags=["الإعدادات"])
settings = get_settings()

LOGO_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
LOGO_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


class SettingUpdate(BaseModel):
    key: str
    value: str | None = None


def _settings_dir() -> str:
    return os.path.join(settings.UPLOAD_DIR, "settings")


def _resolve_logo_path(db: Session) -> str | None:
    s = db.scalar(select(Setting).where(Setting.key == "logo_path"))
    if s and s.value and os.path.isfile(s.value):
        return s.value
    settings_dir = _settings_dir()
    if not os.path.isdir(settings_dir):
        return None
    for name in sorted(os.listdir(settings_dir)):
        if name.startswith("logo.") and os.path.splitext(name)[1].lower() in LOGO_EXTENSIONS:
            return os.path.join(settings_dir, name)
    return None


@router.get("")
def get_settings_all(db: DbSession, user: CurrentUser):
    items = db.scalars(select(Setting)).all()
    data = {s.key: s.value for s in items}
    data["has_logo"] = "true" if _resolve_logo_path(db) else "false"
    return data


@router.post("")
def update_setting(data: SettingUpdate, db: DbSession, user: CurrentUser):
    s = db.scalar(select(Setting).where(Setting.key == data.key))
    if s:
        s.value = data.value
    else:
        s = Setting(key=data.key, value=data.value)
        db.add(s)
    db.commit()
    return {"key": data.key, "value": data.value}


@router.get("/logo")
def get_logo(db: DbSession, user: CurrentUser):
    return _logo_file_response(db)


@router.get("/public/logo")
def get_logo_public(db: DbSession):
    return _logo_file_response(db)


def _logo_file_response(db: Session) -> FileResponse:
    path = _resolve_logo_path(db)
    if not path:
        raise HTTPException(status_code=404, detail="لا يوجد شعار")
    ext = os.path.splitext(path)[1].lower()
    media_type = LOGO_MEDIA_TYPES.get(ext, "application/octet-stream")
    return FileResponse(path, media_type=media_type)


@router.post("/logo")
async def upload_logo(db: DbSession, user: CurrentUser, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="لم يتم اختيار ملف")
    ext = os.path.splitext(file.filename)[1].lower()
    if not ext:
        ext = ".png"
    if ext == ".jfif":
        ext = ".jpg"
    if ext not in LOGO_EXTENSIONS:
        raise HTTPException(status_code=400, detail="نوع الصورة غير مدعوم (PNG, JPG, WEBP, GIF)")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="الملف فارغ")
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم الملف كبير جداً")

    os.makedirs(_settings_dir(), exist_ok=True)
    for name in os.listdir(_settings_dir()):
        if name.startswith("logo."):
            try:
                os.remove(os.path.join(_settings_dir(), name))
            except OSError:
                pass

    path = os.path.join(_settings_dir(), f"logo{ext}")
    with open(path, "wb") as f:
        f.write(content)

    s = db.scalar(select(Setting).where(Setting.key == "logo_path"))
    if s:
        s.value = path
    else:
        db.add(Setting(key="logo_path", value=path))
    db.commit()
    media_type = LOGO_MEDIA_TYPES.get(ext, "image/png")
    encoded = base64.b64encode(content).decode("ascii")
    return {
        "message": "تم رفع الشعار",
        "has_logo": True,
        "logo_data_url": f"data:{media_type};base64,{encoded}",
    }
