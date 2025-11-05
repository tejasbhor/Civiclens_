# 🔄 CivicLens Report Lifecycle Analysis

**Date:** November 5, 2025  
**Status:** ⚠️ PARTIALLY IMPLEMENTED - Missing Key Features

---

## 📊 **Current Implementation Status**

### ✅ **IMPLEMENTED Features**

#### **1. Core Status Transitions**
- ✅ RECEIVED → PENDING_CLASSIFICATION → CLASSIFIED
- ✅ CLASSIFIED → ASSIGNED_TO_DEPARTMENT
- ✅ ASSIGNED_TO_DEPARTMENT → ASSIGNED_TO_OFFICER
- ✅ ASSIGNED_TO_OFFICER → ACKNOWLEDGED → IN_PROGRESS
- ✅ IN_PROGRESS → PENDING_VERIFICATION
- ✅ PENDING_VERIFICATION → RESOLVED / REJECTED
- ✅ RESOLVED → CLOSED
- ✅ ON_HOLD transitions (bidirectional)

**File:** `app/services/report_service.py` (lines 30-44)

#### **2. AI Pipeline Integration**
- ✅ Duplicate detection
- ✅ Category classification
- ✅ Severity scoring
- ✅ Department routing
- ✅ Auto-assignment (department + officer)

**Files:** `app/services/ai_pipeline_service.py`, `app/services/ai/`

#### **3. Appeal System (COMPLETE!)**
- ✅ Appeal creation endpoint
- ✅ Appeal types:
  - Classification disputes
  - Resolution quality disputes
  - Rejection appeals
  - Incorrect assignment
  - Workload concerns
  - Resource lack
- ✅ Appeal review workflow
- ✅ Reassignment logic (officer/department)
- ✅ Rework mechanism
- ✅ Appeal statistics

**Files:** `app/api/v1/appeals.py`, `app/models/appeal.py`

#### **4. Admin Rework Flow**
- ✅ Admin can reject officer's work
- ✅ Transitions: PENDING_VERIFICATION → IN_PROGRESS
- ✅ Mandatory rejection reason
- ✅ Task notes updated

**File:** `app/api/v1/reports.py` (lines 1050-1096)

#### **5. Task Management**
- ✅ Task creation and assignment
- ✅ Task status tracking
- ✅ Progress updates
- ✅ Officer notes

---

## ❌ **MISSING Features (From Activity Diagram)**

### **1. REOPENED Status** ⚠️ **CRITICAL GAP**

**Current Issue:**
- No `REOPENED` status in `ReportStatus` enum
- No way to reopen CLOSED reports after citizen dissatisfaction
- Appeal system sends back to IN_PROGRESS, but doesn't track "reopened" state

**Required:**
```python
class ReportStatus(str, enum.Enum):
    # ... existing statuses ...
    REOPENED = "reopened"  # ❌ MISSING!
```

**Workflow Gap:**
```
RESOLVED → CLOSED → [Citizen dissatisfied] → ❌ NO REOPENED STATUS
Currently: RESOLVED → CLOSED → [Appeal] → IN_PROGRESS (loses context)
Should be: RESOLVED → CLOSED → [Appeal] → REOPENED → IN_PROGRESS
```

---

### **2. Citizen Feedback/Rating System** ⚠️ **CRITICAL GAP**

**Current Issue:**
- No feedback model or table
- No rating system (1-5 stars)
- No satisfaction tracking
- No way for citizens to rate resolution quality

**Missing:**
- `Feedback` model
- Feedback submission endpoint
- Rating aggregation
- Officer performance metrics based on feedback

**Required Schema:**
```python
class Feedback(BaseModel):
    report_id: int
    user_id: int  # Citizen who submitted
    rating: int  # 1-5 stars
    comment: Optional[str]
    satisfaction_level: Enum  # satisfied, neutral, dissatisfied
    would_recommend: bool
    resolution_time_acceptable: bool
```

---

### **3. Automatic Closure After Citizen Approval** ⚠️ **MISSING**

**Current Flow:**
```
RESOLVED → [Admin approves] → CLOSED
```

**Missing Flow:**
```
RESOLVED → [Notify citizen] → [Citizen provides feedback]
  ├─ Satisfied → AUTO-CLOSE after 7 days (or immediate)
  └─ Dissatisfied → APPEAL → REOPENED
```

**Gap:** No automatic closure mechanism based on citizen feedback or timeout.

---

### **4. Escalation Mechanism** ⚠️ **PARTIALLY MISSING**

**Current:**
- ✅ Appeals exist
- ✅ Reassignment works
- ❌ No automatic escalation rules
- ❌ No SLA tracking
- ❌ No auto-escalation to senior officers/admin

**Missing:**
- SLA definitions per category/severity
- Auto-escalation after SLA breach
- Escalation levels (L1 → L2 → L3)
- Escalation notifications

---

### **5. Citizen Notification Triggers** ⚠️ **UNCLEAR**

**Required Notifications (from diagram):**
- ✅ Report received
- ✅ Report acknowledged
- ✅ Status changed to IN_PROGRESS
- ✅ Report resolved
- ❌ Officer assigned (unclear if implemented)
- ❌ Work started (unclear)
- ❌ On hold (unclear)
- ❌ Rework required (unclear)
- ❌ Appeal reviewed (unclear)

**Gap:** Notification system exists but unclear if all triggers are implemented.

---

### **6. Officer Rejection of Assignment** ⚠️ **PARTIALLY IMPLEMENTED**

**Current:**
- ✅ Officer can appeal incorrect assignment
- ❌ No direct "reject assignment" action
- ❌ Must go through appeal process (slow)

**Missing:**
- Quick "reject assignment" button for officers
- Immediate reassignment workflow
- Rejection reason tracking

---

### **7. Workload Balancing** ⚠️ **IMPLEMENTED BUT UNCLEAR**

**Current:**
- ✅ `WorkloadBalancer` class exists in `report_service.py`
- ❌ Not clear if it's actively used
- ❌ No workload dashboard for admins

**Gap:** Need to verify if workload balancing is actually working in production.

---

### **8. Report Lifecycle Audit Trail** ⚠️ **PARTIALLY IMPLEMENTED**

**Current:**
- ✅ `report_status_history` table exists
- ✅ Status changes logged
- ❌ Not clear if ALL actions are logged (appeals, rework, etc.)

**Gap:** Need comprehensive audit trail for:
- All status transitions
- All appeals
- All reassignments
- All rework requests
- All feedback submissions

---

## 🔧 **Required Fixes & Enhancements**

### **Priority 1: CRITICAL (Must Have)**

#### **1. Add REOPENED Status**
```python
# app/models/report.py
class ReportStatus(str, enum.Enum):
    # ... existing ...
    REOPENED = "reopened"  # After appeal approved

# app/services/report_service.py
ALLOWED_TRANSITIONS = {
    # ... existing ...
    ReportStatus.CLOSED: {ReportStatus.REOPENED},  # Allow reopening
    ReportStatus.REOPENED: {ReportStatus.IN_PROGRESS},
}
```

#### **2. Implement Citizen Feedback System**
```python
# app/models/feedback.py
class Feedback(BaseModel):
    __tablename__ = "feedbacks"
    
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    satisfaction_level = Column(Enum, nullable=False)
    resolution_time_acceptable = Column(Boolean, default=True)
    would_recommend = Column(Boolean, default=True)

# app/api/v1/feedbacks.py
@router.post("/{report_id}/feedback")
async def submit_feedback(...):
    """Citizen submits feedback after resolution"""
    pass
```

#### **3. Update Appeal Flow to Use REOPENED**
```python
# app/api/v1/appeals.py - Line 267
# CHANGE:
report.status = ReportStatus.IN_PROGRESS
# TO:
report.status = ReportStatus.REOPENED
```

---

### **Priority 2: HIGH (Should Have)**

#### **4. Automatic Closure Logic**
```python
# app/services/report_service.py
async def auto_close_resolved_reports():
    """
    Auto-close reports that have been RESOLVED for 7+ days
    with no citizen feedback or appeal
    """
    pass
```

#### **5. Officer Quick Reject Assignment**
```python
# app/api/v1/tasks.py
@router.post("/{task_id}/reject-assignment")
async def reject_assignment(
    task_id: int,
    reason: str,
    suggested_officer_id: Optional[int] = None
):
    """Officer rejects incorrect assignment"""
    pass
```

#### **6. SLA Tracking & Escalation**
```python
# app/models/report.py
class Report(BaseModel):
    sla_due_date = Column(DateTime, nullable=True)
    sla_breached = Column(Boolean, default=False)
    escalation_level = Column(Integer, default=0)  # 0, 1, 2, 3

# app/services/sla_service.py
async def check_sla_breaches():
    """Check for SLA breaches and auto-escalate"""
    pass
```

---

### **Priority 3: MEDIUM (Nice to Have)**

#### **7. Comprehensive Notification System**
- Ensure ALL status transitions trigger notifications
- Add notification preferences for users
- Implement push notifications for mobile app

#### **8. Workload Dashboard**
- Admin dashboard showing officer workloads
- Real-time task distribution
- Performance metrics

#### **9. Enhanced Audit Trail**
- Log ALL actions (not just status changes)
- Include user actions, timestamps, reasons
- Exportable audit logs

---

## 📋 **Complete Workflow (With Fixes)**

### **Main Flow: Issue Lifecycle (COMPLETE)**

```
START
↓
[CITIZEN] Submits report
↓
[SYSTEM] Auto-generates ID, AI processes
↓
DECISION: Duplicate?
├─ YES → Cluster → Notify → END
└─ NO → Continue
↓
[SYSTEM] Status: RECEIVED → Notify citizen
↓
[ADMIN] Reviews report
↓
DECISION: Valid?
├─ NO → REJECTED → Notify → END
└─ YES → Continue
↓
[ADMIN] Assigns to officer
↓
[SYSTEM] Status: ASSIGNED_TO_OFFICER → Notify citizen & officer
↓
[OFFICER] Reviews task
↓
DECISION: Correct assignment?
├─ NO → REJECT ASSIGNMENT → Reassign → Return
└─ YES → Continue
↓
[OFFICER] Status: ACKNOWLEDGED → STARTED
↓
[SYSTEM] Status: IN_PROGRESS → Notify citizen
↓
[OFFICER] Works on issue (can set ON_HOLD)
↓
[OFFICER] Completes work → Status: PENDING_VERIFICATION
↓
[ADMIN] Reviews proof
↓
DECISION: Satisfactory?
├─ NO → REJECT → Status: IN_PROGRESS → Return to work
└─ YES → Continue
↓
[ADMIN] Approves → Status: RESOLVED → Notify citizen
↓
[CITIZEN] Receives notification
↓
DECISION: Satisfied?
├─ YES → [CITIZEN] Submits positive feedback → AUTO-CLOSE after 7 days
└─ NO → Go to APPEAL FLOW
```

### **Appeal Flow (COMPLETE)**

```
[CITIZEN] Submits appeal (RESOLUTION type)
↓
[SYSTEM] Creates appeal record → Status: SUBMITTED
↓
[ADMIN] Reviews appeal
↓
DECISION: Valid complaint?
├─ NO → REJECTED → Notify citizen → END
└─ YES → APPROVED → Continue
↓
[ADMIN] Marks requires_rework = True
↓
[SYSTEM] Status: RESOLVED → REOPENED → IN_PROGRESS  ✅ FIXED!
↓
[OFFICER] Receives rework notification
↓
[OFFICER] Completes rework → Status: PENDING_VERIFICATION
↓
[ADMIN] Reviews again
↓
DECISION: Satisfactory?
├─ NO → Repeat rework
└─ YES → Status: RESOLVED → Notify citizen
↓
[CITIZEN] Provides feedback
↓
DECISION: Satisfied now?
├─ YES → Status: CLOSED → END
└─ NO → Can appeal again (max 2 appeals)
```

### **Incorrect Assignment Flow (COMPLETE)**

```
[OFFICER] Receives task
↓
DECISION: Correct assignment?
├─ YES → Continue with work
└─ NO → Continue below
↓
[OFFICER] Clicks "Reject Assignment" (quick action)  ✅ NEW!
↓
[OFFICER] Provides reason + suggests correct officer/dept
↓
[SYSTEM] Creates appeal (INCORRECT_ASSIGNMENT type)
↓
[ADMIN] Reviews appeal
↓
DECISION: Valid?
├─ NO → REJECTED → Officer must proceed
└─ YES → APPROVED → Continue
↓
[ADMIN] Reassigns to correct officer/department
↓
[SYSTEM] Updates task.assigned_to
↓
[NEW OFFICER] Receives notification
↓
Continue with main flow
```

---

## 🎯 **Implementation Checklist**

### **Phase 1: Critical Fixes (Week 1)**
- [ ] Add REOPENED status to ReportStatus enum
- [ ] Update ALLOWED_TRANSITIONS to include REOPENED
- [ ] Create Feedback model and table
- [ ] Implement feedback submission endpoint
- [ ] Update appeal flow to use REOPENED status
- [ ] Add migration script

### **Phase 2: Enhanced Features (Week 2)**
- [ ] Implement auto-closure logic (7-day timeout)
- [ ] Add officer "reject assignment" quick action
- [ ] Implement SLA tracking fields
- [ ] Add escalation level tracking
- [ ] Create SLA breach checker service

### **Phase 3: Polish (Week 3)**
- [ ] Comprehensive notification system
- [ ] Workload dashboard for admins
- [ ] Enhanced audit trail
- [ ] Performance metrics
- [ ] Officer rating system based on feedback

---

## 📝 **Database Migrations Required**

```sql
-- 1. Add REOPENED status
ALTER TYPE reportstatus ADD VALUE 'reopened';

-- 2. Add SLA fields to reports
ALTER TABLE reports ADD COLUMN sla_due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE reports ADD COLUMN sla_breached BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN escalation_level INTEGER DEFAULT 0;

-- 3. Create feedbacks table
CREATE TABLE feedbacks (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    satisfaction_level VARCHAR(20) NOT NULL,
    resolution_time_acceptable BOOLEAN DEFAULT TRUE,
    would_recommend BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feedback_report ON feedbacks(report_id);
CREATE INDEX idx_feedback_user ON feedbacks(user_id);
CREATE INDEX idx_feedback_rating ON feedbacks(rating);
```

---

## ✅ **Summary**

### **What's Working:**
- ✅ Core status transitions
- ✅ AI pipeline integration
- ✅ Appeal system (comprehensive!)
- ✅ Admin rework flow
- ✅ Task management

### **What's Missing:**
- ❌ REOPENED status
- ❌ Citizen feedback system
- ❌ Auto-closure logic
- ❌ SLA tracking & escalation
- ❌ Officer quick reject
- ❌ Complete notification system

### **Next Steps:**
1. **Add REOPENED status** (highest priority)
2. **Implement feedback system** (critical for citizen satisfaction)
3. **Add auto-closure logic** (reduces admin workload)
4. **Implement SLA tracking** (ensures timely resolution)
5. **Add officer quick reject** (improves UX)

**Estimated effort:** 2-3 weeks for full implementation.

---

**The appeal system is actually very well implemented! The main gaps are around citizen feedback and the REOPENED status. Once these are added, the lifecycle will be complete.** 🎯
