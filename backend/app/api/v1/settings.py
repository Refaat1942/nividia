import os
import uuid

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel
from sqlalchemy import select

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession
from app.models.entities import Setting

router = APIRouter(prefix="/settings", tags=["الإعدادات"])
settings = get_settings()


class SettingUpdate(BaseModel):
    key: str
    value: str | None = None


@router.get("")
def get_settings_all(db: DbSession, user: CurrentUser):
    items = db.scalars(select(Setting)).all()
    return {s.key: s.value for s in items}


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


@router.post("/logo")
async def upload_logo(db: DbSession, user: CurrentUser, file: UploadFile = File(...)):
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "settings"), exist_ok=True)
    path = os.path.join(settings.UPLOAD_DIR, "settings", "logo.png")
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    s = db.scalar(select(Setting).where(Setting.key == "logo_path"))
    if s:
        s.value = path
    else:
        db.add(Setting(key="logo_path", value=path))
    db.commit()
    return {"message": "تم رفع الشعار"}
