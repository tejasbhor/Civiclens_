# 🚀 CivicLens Workflow - Quick Start Guide

## 📋 **Prerequisites**

- PostgreSQL 14+ running
- Redis running
- Python 3.9+ with virtual environment
- Node.js 18+ (for frontend)

---

## ⚡ **Quick Setup (5 Minutes)**

### 1. Run Database Migration

```bash
cd civiclens-backend
psql -U postgres -d civiclens -f migrations/add_workflow_enhancements.sql
```

**Expected Output:**
```
ALTER TYPE
ALTER TABLE
ALTER TABLE
...
GRANT
```

### 2. Verify Database Changes

```bash
psql -U postgres -d civiclens -c "\d notifications"
psql -U postgres -d civiclens -c "\d officer_metrics"
psql -U postgres -d civiclens -c "\d+ reports" | grep assignment_rejection
```

### 3. Start Backend Workers

Open 3 separate terminals:

**Terminal 1: AI Worker**
```bash
cd civiclens-backend
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
python -m app.workers.ai_worker
```

**Terminal 2: SLA Monitor**
```bash
cd civiclens-backend
source .venv/bin/activate
python -m app.workers.sla_monitor
```

**Terminal 3: Stale Task Detector**
```bash
cd civiclens-backend
source .venv/bin/activate
python -m app.workers.stale_task_detector
```

### 4. Start API Server

**Terminal 4:**
```bash
cd civiclens-backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Verify System Health

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/reports?limit=1
```

---

## 🧪 **Test the Complete Workflow**

### Scenario 1: Officer Rejects Assignment

```bash
# 1. Create a report (as citizen)
curl -X POST http://localhost:8000/api/v1/reports \
  -H "Authorization: Bearer <citizen_token>" \
  -F "title=Pothole on Main Street" \
  -F "description=Large pothole causing traffic issues" \
  -F "latitude=23.3441" \
  -F "longitude=85.3096" \
  -F "severity=high"

# 2. AI processes and assigns to officer (automatic)
# Wait 2-5 seconds

# 3. Officer rejects assignment
curl -X POST http://localhost:8000/api/v1/reports/1/reject-assignment \
  -H "Authorization: Bearer <officer_token>" \
  -F "rejection_reason=This is not in my area of expertise"

# 4. Admin reviews rejection and reassigns
curl -X POST http://localhost:8000/api/v1/reports/1/review-rejection \
  -H "Authorization: Bearer <admin_token>" \
  -F "action=reassign" \
  -F "new_officer_id=5" \
  -F "notes=Reassigned to water department officer"
```

### Scenario 2: SLA Monitoring

```bash
# 1. Check SLA status of a task
curl http://localhost:8000/api/v1/tasks/1 \
  -H "Authorization: Bearer <admin_token>"

# Look for:
# - sla_deadline: "2025-11-06T14:30:00Z"
# - sla_violated: 0 (compliant), 1 (warning), or 2 (violated)
# - sla_violation_count: 0

# 2. Wait for SLA monitor to run (hourly)
# Or manually trigger (for testing):
cd civiclens-backend
python -c "from app.workers.sla_monitor import check_sla_compliance; import asyncio; asyncio.run(check_sla_compliance())"
```

### Scenario 3: Stale Task Detection

```bash
# Manually trigger stale task detection (for testing):
cd civiclens-backend
python -c "from app.workers.stale_task_detector import detect_stale_tasks; import asyncio; asyncio.run(detect_stale_tasks())"

# Check escalations created:
curl http://localhost:8000/api/v1/escalations \
  -H "Authorization: Bearer <admin_token>"
```

### Scenario 4: Notifications

```bash
# Get user notifications
curl http://localhost:8000/api/v1/notifications \
  -H "Authorization: Bearer <user_token>"

# Get unread count
curl http://localhost:8000/api/v1/notifications/unread-count \
  -H "Authorization: Bearer <user_token>"

# Mark as read
curl -X POST http://localhost:8000/api/v1/notifications/1/read \
  -H "Authorization: Bearer <user_token>"

# Mark all as read
curl -X POST http://localhost:8000/api/v1/notifications/mark-all-read \
  -H "Authorization: Bearer <user_token>"
```

---

## 📊 **Monitor System Health**

### Check Background Workers

```bash
# Check if workers are running
ps aux | grep "ai_worker\|sla_monitor\|stale_task"

# Check worker logs
tail -f logs/ai_worker.log
tail -f logs/sla_monitor.log
tail -f logs/stale_task_detector.log
```

### Check Database Stats

```sql
-- Total reports by status
SELECT status, COUNT(*) 
FROM reports 
GROUP BY status 
ORDER BY COUNT(*) DESC;

-- SLA violations
SELECT COUNT(*) as violations
FROM tasks 
WHERE sla_violated = 2;

-- Stale tasks
SELECT status, COUNT(*) 
FROM tasks 
WHERE updated_at < NOW() - INTERVAL '7 days'
GROUP BY status;

-- Recent notifications
SELECT type, COUNT(*) 
FROM notifications 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type;

-- Officer performance
SELECT 
    u.full_name,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'resolved' THEN t.id END) as completed,
    AVG(CASE WHEN t.sla_violated = 0 THEN 1 ELSE 0 END) * 100 as sla_compliance
FROM users u
LEFT JOIN tasks t ON u.id = t.assigned_to
WHERE u.role = 'officer'
GROUP BY u.id, u.full_name;
```

---

## 🔧 **Troubleshooting**

### Issue: Workers not starting

**Solution:**
```bash
# Check Python dependencies
pip install -r requirements.txt
pip install -r requirements-ai.txt

# Check Redis connection
redis-cli ping  # Should return PONG

# Check database connection
psql -U postgres -d civiclens -c "SELECT 1"
```

### Issue: SLA deadlines not being set

**Solution:**
```bash
# Manually run SLA monitor once
python -m app.workers.sla_monitor

# Check task table
psql -U postgres -d civiclens -c "SELECT id, sla_deadline, sla_violated FROM tasks LIMIT 5"
```

### Issue: Notifications not being created

**Solution:**
```bash
# Check notification service
python -c "
from app.db.session import AsyncSessionLocal
from app.services.notification_service import NotificationService
import asyncio

async def test():
    async with AsyncSessionLocal() as db:
        service = NotificationService(db)
        admin_ids = await service.get_admin_user_ids()
        print(f'Found {len(admin_ids)} admins')

asyncio.run(test())
"
```

### Issue: Assignment rejection not working

**Solution:**
```bash
# Check if ASSIGNMENT_REJECTED status exists
psql -U postgres -d civiclens -c "SELECT unnest(enum_range(NULL::report_status))"

# Should include 'assignment_rejected'

# If not, run migration again
psql -U postgres -d civiclens -f migrations/add_workflow_enhancements.sql
```

---

## 📈 **Performance Optimization**

### Database Indexes

```sql
-- Verify indexes are created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('notifications', 'tasks', 'reports', 'officer_metrics');

-- Add missing indexes if needed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_sla_deadline 
ON tasks(sla_deadline) WHERE sla_deadline IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read);
```

### Redis Optimization

```bash
# Check Redis memory usage
redis-cli INFO memory

# Set max memory (adjust as needed)
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Worker Optimization

```bash
# Run workers with multiple processes (production)
gunicorn app.workers.ai_worker:app --workers 4 --worker-class uvicorn.workers.UvicornWorker

# Or use supervisor/systemd for automatic restart
```

---

## 🎯 **Next Steps**

1. **Test Complete Workflow**
   - Submit report as citizen
   - AI processes and assigns
   - Officer acknowledges and completes
   - Admin verifies
   - Citizen provides feedback

2. **Monitor for 24 Hours**
   - Check SLA monitor runs hourly
   - Check stale task detector runs daily
   - Verify notifications are created
   - Monitor database performance

3. **Production Deployment**
   - Set up systemd services for workers
   - Configure log rotation
   - Set up monitoring (Prometheus/Grafana)
   - Configure alerts (PagerDuty/Slack)

4. **User Training**
   - Train admins on rejection review workflow
   - Train officers on assignment rejection
   - Train citizens on feedback system

---

## 📚 **Additional Resources**

- **Full Documentation:** `COMPLETE_WORKFLOW_IMPLEMENTATION.md`
- **Implementation Summary:** `WORKFLOW_IMPLEMENTATION_SUMMARY.md`
- **API Documentation:** http://localhost:8000/docs
- **Database Schema:** `migrations/add_workflow_enhancements.sql`

---

## ✅ **Success Checklist**

- [ ] Database migration completed
- [ ] All 3 background workers running
- [ ] API server responding
- [ ] Can create reports
- [ ] AI processing works
- [ ] Officer can reject assignments
- [ ] Admin can review rejections
- [ ] SLA monitoring active
- [ ] Stale task detection active
- [ ] Notifications being created
- [ ] Performance metrics tracked

---

**Need Help?** Check the troubleshooting section or review the full documentation.

**Ready for Production?** Complete the production readiness checklist in `WORKFLOW_IMPLEMENTATION_SUMMARY.md`.
