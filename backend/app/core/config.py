from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Fratelanza Office Manager"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+psycopg://office:office_secret@localhost:5432/fratelanza_office"
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    ADMIN_EMAIL: str = "admin@fratelanza.local"
    ADMIN_PASSWORD: str = ""
    ADMIN_NAME: str = "مدير النظام"

    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 20
    ALLOWED_UPLOAD_EXTENSIONS: str = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:16360"
    SEED_DEMO_DATA: bool = False

    RATE_LIMIT_LOGIN: str = "10/minute"
    ALLOW_NEGATIVE_HOURS: bool = False

    BACKUP_DIR: str = "/app/backups"
    BACKUP_RETENTION_DAYS: int = 30

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_extensions(self) -> set[str]:
        return {e.strip().lower() for e in self.ALLOWED_UPLOAD_EXTENSIONS.split(",")}


@lru_cache
def get_settings() -> Settings:
    return Settings()
