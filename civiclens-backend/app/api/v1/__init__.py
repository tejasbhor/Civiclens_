from .auth import router as auth_router
from .reports import router as reports_router
from .reports_complete import router as reports_complete_router
from .analytics import router as analytics_router
from .users import router as users_router
from .departments import router as departments_router
from .appeals import router as appeals_router
from .feedbacks import router as feedbacks_router
from .escalations import router as escalations_router
from .audit import router as audit_router
from .media import router as media_router
from .tasks import router as tasks_router
from .ai_insights import router as ai_insights_router
from .notifications import router as notifications_router
from .feedback import router as feedback_router
from .hold_approvals import router as hold_approvals_router

# Expose the routers for main.py to use
auth = auth_router
reports = reports_router
reports_complete = reports_complete_router
analytics = analytics_router
users = users_router
departments = departments_router
appeals = appeals_router
feedbacks = feedbacks_router
escalations = escalations_router
audit = audit_router
media = media_router
tasks = tasks_router
ai_insights = ai_insights_router
notifications = notifications_router
feedback = feedback_router
hold_approvals = hold_approvals_router

__all__ = ["auth", "reports", "reports_complete", "analytics", "users", "departments", "appeals", "feedbacks", "escalations", "audit", "media", "tasks", "ai_insights", "notifications", "feedback", "hold_approvals"]
