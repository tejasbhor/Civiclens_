from .auth import router as auth_router
from .reports import router as reports_router
from .analytics import router as analytics_router
from .users import router as users_router
from .departments import router as departments_router
from .appeals import router as appeals_router
from .escalations import router as escalations_router
from .audit import router as audit_router
from .media import router as media_router

# Expose the routers for main.py to use
auth = auth_router
reports = reports_router
analytics = analytics_router
users = users_router
departments = departments_router
appeals = appeals_router
escalations = escalations_router
audit = audit_router
media = media_router

__all__ = ["auth", "reports", "analytics", "users", "departments", "appeals", "escalations", "audit", "media"]
