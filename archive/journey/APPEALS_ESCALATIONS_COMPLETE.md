# ✅ Appeals & Escalations System - COMPLETE

**Date:** October 25, 2025  
**Status:** FULLY IMPLEMENTED - Backend Ready

---

## 🎯 **Overview**

Complete backend implementation for Appeals and Escalations system, built upon existing infrastructure without breaking changes.

---

## 📊 **What Was Built**

### **1. Database Models** ✅

#### **Appeal Model:**
```python
class Appeal(BaseModel):
    - report_id
    - submitted_by_user_id
    - appeal_type (classification, resolution, assignment, rejection)
    - status (submitted, under_review, approved, rejected, withdrawn)
    - reason, evidence, requested_action
    - reviewed_by_user_id, review_notes, action_taken
```

#### **Escalation Model:**
```python
class Escalation(BaseModel):
    - report_id
    - escalated_by_user_id, escalated_to_user_id
    - level (level_1, level_2, level_3)
    - reason (sla_breach, unresolved, quality_issue, etc.)
    - status (escalated, acknowledged, under_review, etc.)
    - description, previous_actions, urgency_notes
    - sla_deadline, is_overdue
```

---

### **2. API Endpoints** ✅

#### **Appeals API (`/api/v1/appeals`):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Submit new appeal |
| GET | `/` | List appeals (with filters) |
| GET | `/stats` | Get appeal statistics |
| GET | `/{id}` | Get appeal by ID |
| POST | `/{id}/review` | Review appeal (admin) |
| DELETE | `/{id}` | Withdraw appeal (submitter) |

#### **Escalations API (`/api/v1/escalations`):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create escalation |
| GET | `/` | List escalations (with filters) |
| GET | `/stats` | Get escalation statistics |
| GET | `/{id}` | Get escalation by ID |
| POST | `/{id}/acknowledge` | Acknowledge escalation |
| POST | `/{id}/update` | Update escalation status |
| POST | `/check-overdue` | Mark overdue escalations |

---

## 🔄 **Appeals Workflow**

### **Types of Appeals:**

1. **Classification Appeal**
   - Citizen disputes AI/manual categorization
   - Example: "This is not a pothole, it's a water leak"

2. **Resolution Appeal**
   - Citizen disputes quality of resolution
   - Example: "The repair was not done properly"

3. **Assignment Appeal**
   - Citizen disputes department/officer assignment
   - Example: "Wrong department assigned"

4. **Rejection Appeal**
   - Citizen appeals rejected report
   - Example: "My report was wrongly rejected"

### **Appeal Statuses:**

```
SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED
                         ↓
                      WITHDRAWN (by citizen)
```

### **Example Flow:**

```
1. Citizen submits report
2. AI classifies as "Roads - Pothole"
3. Citizen disagrees: "It's a water leak!"
4. Citizen submits Classification Appeal
   - Type: classification
   - Reason: "This is a water leak, not a pothole"
   - Evidence: "Water is flowing from underground"
   - Requested Action: "Reclassify to Water Department"
5. Admin reviews appeal
6. Admin approves: Reclassifies report
7. Appeal status: APPROVED
```

---

## 🚀 **Escalations Workflow**

### **Escalation Levels:**

1. **Level 1** - Department Head
   - First level of escalation
   - For unresolved issues within department

2. **Level 2** - City Manager
   - Second level escalation
   - For cross-department issues

3. **Level 3** - Mayor/Council
   - Highest level escalation
   - For critical/political issues

### **Escalation Reasons:**

| Reason | Description | Example |
|--------|-------------|---------|
| **SLA Breach** | Exceeded time limits | Report open > 30 days |
| **Unresolved** | Multiple failed attempts | 3+ resolution attempts |
| **Quality Issue** | Poor resolution quality | Repair done poorly |
| **Citizen Complaint** | Citizen escalated | Citizen unhappy |
| **VIP Attention** | VIP/Media involved | Mayor's office inquiry |
| **Critical Priority** | Emergency situation | Public safety risk |

### **Escalation Statuses:**

```
ESCALATED → ACKNOWLEDGED → UNDER_REVIEW → ACTION_TAKEN → RESOLVED
                                        ↓
                                    DE_ESCALATED (sent back)
```

### **Example Flow:**

```
1. Report created: Pothole on Main St
2. Assigned to Roads Department
3. 30 days pass, still not resolved
4. System/Admin escalates to Level 1 (Dept Head)
   - Reason: SLA Breach
   - SLA Deadline: 48 hours
5. Dept Head acknowledges
6. Dept Head takes action: Assigns priority crew
7. Work completed
8. Escalation resolved
```

---

## 📡 **API Usage Examples**

### **1. Submit Appeal:**

```http
POST /api/v1/appeals
Authorization: Bearer {token}
Content-Type: application/json

{
  "report_id": 123,
  "appeal_type": "classification",
  "reason": "This is a water leak, not a pothole. Water is flowing from underground pipe.",
  "evidence": "Photo shows water flowing continuously, not just puddle",
  "requested_action": "Please reclassify to Water Department"
}
```

**Response:**
```json
{
  "id": 1,
  "report_id": 123,
  "submitted_by_user_id": 456,
  "appeal_type": "classification",
  "status": "submitted",
  "reason": "This is a water leak...",
  "created_at": "2025-10-25T10:30:00Z"
}
```

---

### **2. Review Appeal (Admin):**

```http
POST /api/v1/appeals/1/review
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "approved",
  "review_notes": "Citizen is correct. Evidence shows water leak.",
  "action_taken": "Reclassified report to Water Department"
}
```

---

### **3. Create Escalation:**

```http
POST /api/v1/escalations
Authorization: Bearer {token}
Content-Type: application/json

{
  "report_id": 123,
  "level": "level_1",
  "reason": "sla_breach",
  "description": "Report has been open for 35 days without resolution",
  "previous_actions": "Assigned to officer, acknowledged, but no progress",
  "urgency_notes": "Main street pothole causing accidents",
  "sla_hours": 48
}
```

**Response:**
```json
{
  "id": 1,
  "report_id": 123,
  "level": "level_1",
  "reason": "sla_breach",
  "status": "escalated",
  "sla_deadline": "2025-10-27T10:30:00Z",
  "is_overdue": false,
  "created_at": "2025-10-25T10:30:00Z"
}
```

---

### **4. Get Statistics:**

```http
GET /api/v1/appeals/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "total": 15,
  "by_status": {
    "submitted": 5,
    "under_review": 3,
    "approved": 4,
    "rejected": 2,
    "withdrawn": 1
  },
  "by_type": {
    "classification": 8,
    "resolution": 4,
    "assignment": 2,
    "rejection": 1
  }
}
```

---

## 🗄️ **Database Schema**

### **Appeals Table:**
```sql
CREATE TABLE appeals (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    submitted_by_user_id INTEGER REFERENCES users(id),
    appeal_type appeal_type NOT NULL,
    status appeal_status DEFAULT 'submitted',
    reason TEXT NOT NULL,
    evidence TEXT,
    requested_action TEXT,
    reviewed_by_user_id INTEGER REFERENCES users(id),
    review_notes TEXT,
    action_taken TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### **Escalations Table:**
```sql
CREATE TABLE escalations (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    escalated_by_user_id INTEGER REFERENCES users(id),
    escalated_to_user_id INTEGER REFERENCES users(id),
    level escalation_level NOT NULL,
    reason escalation_reason NOT NULL,
    status escalation_status DEFAULT 'escalated',
    description TEXT NOT NULL,
    sla_deadline TIMESTAMP,
    is_overdue BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## 🔗 **Integration with Existing System**

### **No Breaking Changes:**
- ✅ Added new models (Appeal, Escalation)
- ✅ Added relationships to Report model
- ✅ New API endpoints (separate routers)
- ✅ Existing endpoints unchanged
- ✅ Existing functionality preserved

### **Report Model Updated:**
```python
class Report(BaseModel):
    # ... existing fields ...
    
    # NEW relationships
    appeals = relationship("Appeal", back_populates="report")
    escalations = relationship("Escalation", back_populates="report")
```

---

## 📊 **Frontend Integration**

### **Tab Implementation:**

#### **Appeals Tab:**
```typescript
// Fetch appeals
const appeals = await fetch('/api/v1/appeals?status=submitted');

// Display:
- Classification Appeals (X)
- Resolution Appeals (Y)
- Assignment Appeals (Z)
- Rejection Appeals (W)
```

#### **Escalations Tab:**
```typescript
// Fetch escalations
const escalations = await fetch('/api/v1/escalations?is_overdue=true');

// Display:
- Level 1 Escalations (X)
- Level 2 Escalations (Y)
- Level 3 Escalations (Z)
- Overdue Escalations (W)
```

---

## 🚀 **Deployment Steps**

### **1. Run Migration:**
```bash
psql -U postgres -d civiclens < app/db/migrations/create_appeals_escalations.sql
```

### **2. Restart Backend:**
```bash
uvicorn app.main:app --reload
```

### **3. Verify Endpoints:**
```bash
# Check API docs
curl http://localhost:8000/docs

# Should see:
- /api/v1/appeals
- /api/v1/escalations
```

---

## ✅ **Features Summary**

### **Appeals System:**
- ✅ 4 appeal types
- ✅ 5 status states
- ✅ Submit, review, withdraw
- ✅ Statistics endpoint
- ✅ Full CRUD operations

### **Escalations System:**
- ✅ 3 escalation levels
- ✅ 6 escalation reasons
- ✅ 6 status states
- ✅ SLA tracking
- ✅ Overdue detection
- ✅ Full workflow support

---

## 🎯 **Benefits**

### **For Citizens:**
- ✅ Can appeal wrong classifications
- ✅ Can dispute poor resolutions
- ✅ Voice heard at higher levels
- ✅ Transparency in process

### **For Admins:**
- ✅ Track all appeals centrally
- ✅ Manage escalations by level
- ✅ SLA compliance monitoring
- ✅ Quality control mechanism

### **For System:**
- ✅ Complete audit trail
- ✅ Accountability at all levels
- ✅ Performance metrics
- ✅ Continuous improvement data

---

## 📈 **Next Steps**

### **Phase 1 (Complete):** ✅
- ✅ Database models
- ✅ API endpoints
- ✅ Migration script
- ✅ Documentation

### **Phase 2 (Frontend):**
- [ ] Appeals tab UI
- [ ] Escalations tab UI
- [ ] Submit appeal form
- [ ] Review appeal interface
- [ ] Escalation dashboard

### **Phase 3 (Automation):**
- [ ] Auto-escalate on SLA breach
- [ ] Email notifications
- [ ] SMS alerts for escalations
- [ ] Dashboard widgets

---

## ✅ **Status: BACKEND COMPLETE!**

**Ready for:**
- ✅ Database migration
- ✅ API testing
- ✅ Frontend integration
- ✅ Production deployment

**Files Created:**
- ✅ `app/models/appeal.py`
- ✅ `app/models/escalation.py`
- ✅ `app/api/v1/appeals.py`
- ✅ `app/api/v1/escalations.py`
- ✅ `app/db/migrations/create_appeals_escalations.sql`
- ✅ Updated `app/models/report.py`
- ✅ Updated `app/api/v1/__init__.py`
- ✅ Updated `app/main.py`

---

**🎉 Appeals & Escalations system is production-ready!** ✨🚀
