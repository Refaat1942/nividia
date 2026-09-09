import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import Base, engine
from app.core.database import SessionLocal
from app.scripts.seed import run_seed
from app.services.admin_access import repair_admin_accounts

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.BACKUP_DIR, exist_ok=True)
    for attempt in range(1, 16):
        try:
            Base.metadata.create_all(bind=engine)
            run_seed()
            with SessionLocal() as db:
                repair_admin_accounts(db)
            break
        except Exception as exc:
            logger.warning("DB not ready (attempt %s/15): %s", attempt, exc)
            if attempt == 15:
                logger.exception("Could not connect to database after 15 attempts")
            else:
                import time
                time.sleep(2)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "خطأ في الخادم"})


@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "features": ["public_logo", "admin_auto_repair", "open_users_api"],
    }
