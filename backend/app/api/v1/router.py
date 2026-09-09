from fastapi import APIRouter

from app.api.v1 import (
    audit,
    auth,
    bookings,
    contracts,
    customers,
    dashboard,
    documents,
    import_export,
    notifications,
    offices,
    packages,
    payments,
    reports,
    rooms,
    search,
    sessions,
    settings,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(customers.router)
api_router.include_router(packages.router)
api_router.include_router(rooms.router)
api_router.include_router(offices.router)
api_router.include_router(bookings.router)
api_router.include_router(sessions.router)
api_router.include_router(contracts.router)
api_router.include_router(documents.router)
api_router.include_router(payments.router)
api_router.include_router(reports.router)
api_router.include_router(users.router)
api_router.include_router(settings.router)
api_router.include_router(audit.router)
api_router.include_router(search.router)
api_router.include_router(import_export.router)
api_router.include_router(notifications.router)
