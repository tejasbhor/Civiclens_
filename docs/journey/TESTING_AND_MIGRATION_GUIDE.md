# 🧪 Testing & Migration Guide

**Date:** October 25, 2025  
**Complete guide for testing and running migrations**

---

## 📋 **Table of Contents**

1. [Alembic Migration Setup](#alembic-migration-setup)
2. [Running Migrations](#running-migrations)
3. [Testing Backend APIs](#testing-backend-apis)
4. [Testing Frontend](#testing-frontend)
5. [End-to-End Testing](#end-to-end-testing)

---

## 🗄️ **Part 1: Alembic Migration Setup**

### **Step 1: Install Alembic**

```bash
cd civiclens-backend
pip install alembic
```

### **Step 2: Initialize Alembic (Already Done)**

The `alembic.ini` file has been created. Now create the alembic directory:

```bash
# Create alembic directory structure
alembic init alembic
```

### **Step 3: Configure Alembic Environment**

Edit `alembic/env.py`:

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import your models
from app.models.base import Base
from app.models.user import User
from app.models.report import Report
from app.models.department import Department
from app.models.task import Task
from app.models.media import Media
from app.models.report_status_history import ReportStatusHistory
from app.models.appeal import Appeal  # NEW
from app.models.escalation import Escalation  # NEW
from app.config import settings

# this is the Alembic Config object
config = context.config

# Override sqlalchemy.url with settings
config.set_main_option('sqlalchemy.url', settings.DATABASE_URL)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### **Step 4: Create Migration**

```bash
# Auto-generate migration from models
alembic revision --autogenerate -m "add_appeals_and_escalations"

# This will create a file like: alembic/versions/xxxx_add_appeals_and_escalations.py
```

### **Step 5: Review Migration**

Open the generated file and verify it includes:
- `appeals` table creation
- `escalations` table creation
- All enums (appeal_type, appeal_status, etc.)
- All indexes

### **Step 6: Run Migration**

```bash
# Apply migration
alembic upgrade head

# Check current version
alembic current

# View migration history
alembic history
```

---

## 🔄 **Part 2: Running Migrations**

### **Method 1: Using Alembic (Recommended)**

```bash
cd civiclens-backend

# 1. Check current database version
alembic current

# 2. View pending migrations
alembic history

# 3. Apply all pending migrations
alembic upgrade head

# 4. Verify
alembic current
```

### **Method 2: Using SQL Script (Alternative)**

```bash
cd civiclens-backend

# Run the SQL migration directly
psql -U postgres -d civiclens -f app/db/migrations/create_appeals_escalations.sql

# Verify tables created
psql -U postgres -d civiclens -c "\dt"
```

### **Rollback (If Needed)**

```bash
# Rollback one migration
alembic downgrade -1

# Rollback to specific version
alembic downgrade <revision_id>

# Rollback all
alembic downgrade base
```

---

## 🧪 **Part 3: Testing Backend APIs**

### **Step 1: Start Backend**

```bash
cd civiclens-backend
uvicorn app.main:app --reload
```

### **Step 2: Get Authentication Token**

```bash
# Login to get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "password": "your_password"
  }'

# Save the token
export TOKEN="your_access_token_here"
```

### **Step 3: Test Appeals API**

#### **Test 1: Get Appeals Stats**

```bash
curl -X GET http://localhost:8000/api/v1/appeals/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "total": 0,
  "by_status": {},
  "by_type": {}
}
```

#### **Test 2: Create Citizen Appeal (Classification)**

```bash
curl -X POST http://localhost:8000/api/v1/appeals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_id": 1,
    "appeal_type": "classification",
    "reason": "This is a water leak, not a pothole. Water is flowing from underground pipe.",
    "evidence": "Photo shows continuous water flow",
    "requested_action": "Please reclassify to Water Department"
  }'
```

#### **Test 3: Create Officer Appeal (Incorrect Assignment)**

```bash
curl -X POST http://localhost:8000/api/v1/appeals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_id": 2,
    "appeal_type": "incorrect_assignment",
    "reason": "I am from Roads Department. This is a water leak issue.",
    "requested_action": "Please reassign to Water Department"
  }'
```

#### **Test 4: List Appeals**

```bash
curl -X GET "http://localhost:8000/api/v1/appeals?status=submitted" \
  -H "Authorization: Bearer $TOKEN"
```

#### **Test 5: Review Appeal (Admin)**

```bash
curl -X POST http://localhost:8000/api/v1/appeals/1/review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "review_notes": "Appeal is valid. Reclassifying report.",
    "action_taken": "Reclassified to Water Department"
  }'
```

#### **Test 6: Review with Reassignment**

```bash
curl -X POST http://localhost:8000/api/v1/appeals/2/review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "review_notes": "Officer is correct. Reassigning.",
    "action_taken": "Reassigned to Water Department",
    "reassigned_to_department_id": 5,
    "reassigned_to_user_id": 42,
    "reassignment_reason": "Incorrect initial routing"
  }'
```

#### **Test 7: Review with Rework**

```bash
curl -X POST http://localhost:8000/api/v1/appeals/3/review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "review_notes": "Work quality is poor. Requiring rework.",
    "action_taken": "Rework required",
    "requires_rework": true,
    "rework_assigned_to_user_id": 25,
    "rework_notes": "Use proper materials. Previous repair was substandard."
  }'
```

### **Step 4: Test Escalations API**

#### **Test 1: Get Escalations Stats**

```bash
curl -X GET http://localhost:8000/api/v1/escalations/stats \
  -H "Authorization: Bearer $TOKEN"
```

#### **Test 2: Create Escalation**

```bash
curl -X POST http://localhost:8000/api/v1/escalations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_id": 1,
    "level": "level_1",
    "reason": "sla_breach",
    "description": "Report has been open for 35 days without resolution",
    "previous_actions": "Assigned to officer, acknowledged, but no progress",
    "urgency_notes": "Main street pothole causing accidents",
    "sla_hours": 48
  }'
```

#### **Test 3: List Escalations**

```bash
curl -X GET "http://localhost:8000/api/v1/escalations?level=level_1" \
  -H "Authorization: Bearer $TOKEN"
```

#### **Test 4: Acknowledge Escalation**

```bash
curl -X POST http://localhost:8000/api/v1/escalations/1/acknowledge \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎨 **Part 4: Testing Frontend**

### **Step 1: Start Frontend**

```bash
cd civiclens-admin
npm run dev
```

### **Step 2: Test Appeals Tab**

1. **Navigate to Management Hub:**
   ```
   http://localhost:3000/dashboard/reports/manage
   ```

2. **Click "Appeals" Tab**
   - Should see placeholder UI
   - Should show stats (once backend connected)

3. **Submit Appeal (Citizen):**
   - Open a resolved report
   - Click "Appeal Resolution"
   - Fill form:
     - Type: Resolution
     - Reason: "Work not done properly"
     - Evidence: "Photos show issues"
   - Submit

4. **Submit Appeal (Officer):**
   - Open assigned report
   - Click "Flag Incorrect Assignment"
   - Fill form:
     - Type: Incorrect Assignment
     - Reason: "Wrong department"
   - Submit

### **Step 3: Test Escalations Tab**

1. **Click "Escalations" Tab**
   - Should see placeholder UI
   - Should show stats

2. **Create Escalation:**
   - Open overdue report
   - Click "Escalate"
   - Fill form:
     - Level: Level 1
     - Reason: SLA Breach
     - Description: "30 days overdue"
   - Submit

### **Step 4: Test Admin Review**

1. **Navigate to Appeals Tab**
2. **Click on pending appeal**
3. **Review:**
   - Add review notes
   - Select action (Approve/Reject)
   - If reassignment: Select new officer/dept
   - If rework: Check "Requires Rework" + add notes
4. **Submit Review**

---

## 🔄 **Part 5: End-to-End Testing**

### **Scenario 1: Citizen Appeal → Rework**

```bash
# 1. Citizen submits resolution appeal
POST /appeals
{
  "report_id": 123,
  "appeal_type": "resolution",
  "reason": "Pothole repair is poor quality"
}

# 2. Admin reviews and requires rework
POST /appeals/1/review
{
  "status": "approved",
  "requires_rework": true,
  "rework_assigned_to_user_id": 25,
  "rework_notes": "Use proper materials"
}

# 3. Officer completes rework
POST /appeals/1/complete-rework

# 4. Verify report status
GET /reports/123
# Should show: status = "pending_verification"
```

### **Scenario 2: Officer Appeal → Reassignment**

```bash
# 1. Officer flags incorrect assignment
POST /appeals
{
  "report_id": 456,
  "appeal_type": "incorrect_assignment",
  "reason": "Wrong department"
}

# 2. Admin reviews and reassigns
POST /appeals/2/review
{
  "status": "approved",
  "reassigned_to_department_id": 5,
  "reassigned_to_user_id": 42
}

# 3. Verify reassignment
GET /reports/456
# Should show: department_id = 5

GET /reports/456/task
# Should show: assigned_to = 42
```

### **Scenario 3: SLA Breach → Escalation**

```bash
# 1. Create escalation
POST /escalations
{
  "report_id": 789,
  "level": "level_1",
  "reason": "sla_breach",
  "description": "35 days overdue"
}

# 2. Department head acknowledges
POST /escalations/1/acknowledge

# 3. Take action
POST /escalations/1/update
{
  "status": "action_taken",
  "action_taken": "Assigned priority crew"
}

# 4. Resolve
POST /escalations/1/update
{
  "status": "resolved"
}
```

---

## ✅ **Verification Checklist**

### **Database:**
- [ ] Appeals table exists
- [ ] Escalations table exists
- [ ] All enums created
- [ ] All indexes created
- [ ] Foreign keys working

### **Backend:**
- [ ] Appeals endpoints respond
- [ ] Escalations endpoints respond
- [ ] Authentication working
- [ ] Validation working
- [ ] Reassignment working
- [ ] Rework workflow working

### **Frontend:**
- [ ] Appeals tab visible
- [ ] Escalations tab visible
- [ ] Can submit appeals
- [ ] Can review appeals
- [ ] Can create escalations
- [ ] Stats display correctly

---

## 🐛 **Troubleshooting**

### **Issue: "Not authenticated" error**

**Solution:**
```bash
# Get token first
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "password": "password"}' \
  | jq -r '.access_token')

# Use token in requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/appeals/stats
```

### **Issue: Alembic can't find models**

**Solution:**
```python
# In alembic/env.py, make sure all models are imported:
from app.models.appeal import Appeal
from app.models.escalation import Escalation
```

### **Issue: Migration fails**

**Solution:**
```bash
# Check database connection
psql -U postgres -d civiclens -c "SELECT 1"

# Check current version
alembic current

# Try manual SQL
psql -U postgres -d civiclens -f app/db/migrations/create_appeals_escalations.sql
```

---

## 📊 **Success Criteria**

✅ **Migrations:**
- Alembic runs without errors
- Tables created successfully
- Can rollback and re-apply

✅ **Backend:**
- All endpoints return 200/201
- Authentication works
- Data persists correctly
- Workflows execute properly

✅ **Frontend:**
- Tabs render correctly
- Forms submit successfully
- Data displays accurately
- No console errors

---

## 🎉 **Summary**

**Complete testing flow:**
1. ✅ Run Alembic migrations
2. ✅ Start backend
3. ✅ Test APIs with curl
4. ✅ Start frontend
5. ✅ Test UI workflows
6. ✅ Verify end-to-end scenarios

**Your system is now ready for production!** 🚀
