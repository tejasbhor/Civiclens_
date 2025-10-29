# 🚀 CivicLens - Next Phase Implementation Plan

## 📊 **Current Status Summary**

### ✅ **COMPLETED (Phases 1-5):**
```
Phase 1: Citizen Submission          ✅ 100% DONE
Phase 2: Admin Classification        ✅ 100% DONE
Phase 3: Officer Assignment          ✅ 100% DONE
Phase 4: Officer Views Tasks         ✅ 100% DONE
Phase 5: Officer Acknowledges        ✅ 100% DONE
```

### 🔄 **CURRENT POSITION:**
```
You are here: Officer has acknowledged the task
Next step: Officer starts work and completes resolution
```

---

## 🎯 **NEXT PHASES TO IMPLEMENT**

### **Phase 6: Officer Work Completion** ⚠️ PARTIAL (50%)
```
[NODAL OFFICER] Marks task as "STARTED"
↓
Takes before photos
↓
Updates checklist
↓
[SYSTEM] Sets status to "IN_PROGRESS"
↓
[NODAL OFFICER] Works on resolving the issue
↓
Takes after photos
↓
Completes final checklist
↓
[NODAL OFFICER] Marks task as "RESOLVED"
↓
Submits proof of resolution
```

**Current Status:**
- ✅ Officer can start work (status → IN_PROGRESS)
- ✅ Officer can mark as complete (status → PENDING_VERIFICATION)
- ❌ NO before/after photos upload
- ❌ NO checklist system
- ❌ NO proof of resolution

**What Needs to be Built:**
1. Before photos upload page
2. After photos upload page
3. Checklist system
4. Completion form with proof

---

### **Phase 7: Admin Verification** ❌ NOT IMPLEMENTED (0%)
```
[ADMIN] Reviews submitted proof and checklist
↓
DECISION: Is resolution satisfactory?
├─ NO → [ADMIN] Sends back to officer with feedback
└─ YES → [ADMIN] Approves closure
↓
[SYSTEM] Sets status to "RESOLVED"
```

**What Needs to be Built:**
1. Admin verification page
2. View before/after photos
3. Review checklist
4. Approve/Reject buttons
5. Feedback form (if rejecting)
6. Status transition logic

---

### **Phase 8: Citizen Feedback** ❌ NOT IMPLEMENTED (0%)
```
[CITIZEN] Receives resolution notification
↓
DECISION: Is citizen satisfied?
├─ YES → [CITIZEN] Provides positive feedback
└─ NO → [CITIZEN] Files appeal
```

**What Needs to be Built:**
1. Citizen feedback form
2. Rating system (1-5 stars)
3. Comments field
4. Satisfaction survey
5. Appeal button

---

### **Phase 9: Additional Features** ❌ NOT IMPLEMENTED (0%)

#### **9a. Task Reassignment**
```
DECISION: Is assignment correct?
├─ NO → [OFFICER] Requests reassignment
       → [ADMIN] Reassigns to different officer
└─ YES → Continue
```

#### **9b. On Hold Status**
```
[OFFICER] Can update status to "ON HOLD"
↓
Mandatory reason required
↓
[ADMIN] Reviews and can resume
```

#### **9c. Comments System**
```
[ADMIN] Can add comments/instructions
↓
[OFFICER] Sees comments
↓
[OFFICER] Can reply
```

#### **9d. Notifications**
```
SMS/Email/Push notifications at each status change
```

---

## 📋 **DETAILED IMPLEMENTATION ROADMAP**

### **WEEK 1: Officer Work Completion (Phase 6)**

#### **Day 1-2: Before Photos Upload**
**Create:** `civiclens-client/src/pages/officer/StartWork.tsx`

**Features:**
- Photo upload component (max 5 photos)
- Photo preview
- Caption for each photo
- GPS location capture
- "Start Work" button
- Transitions status to IN_PROGRESS

**Backend:**
- Store photos with type: "before"
- Link to task_id
- Timestamp capture

#### **Day 3-4: Checklist System**
**Create:** 
- `civiclens-backend/app/models/checklist.py`
- `civiclens-backend/app/models/checklist_item.py`

**Database Tables:**
```sql
CREATE TABLE checklists (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id),
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE checklist_items (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER REFERENCES checklists(id),
    item_text VARCHAR(500),
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    notes TEXT
);
```

**Features:**
- Predefined checklist items by category
- Officer can check off items
- Mandatory items before completion
- Notes field for each item

#### **Day 5-7: After Photos & Completion**
**Create:** `civiclens-client/src/pages/officer/CompleteTask.tsx`

**Features:**
- After photos upload (max 5)
- Before/after comparison view
- Checklist review (must be complete)
- Completion notes
- Resolution summary
- Submit button
- Transitions to PENDING_VERIFICATION

---

### **WEEK 2: Admin Verification (Phase 7)**

#### **Day 1-3: Verification Interface**
**Create:** `civiclens-admin/src/app/dashboard/verification/page.tsx`

**Features:**
- List of tasks pending verification
- Filter by officer, date, category
- Quick stats (pending count)

**Create:** `civiclens-admin/src/app/dashboard/verification/[id]/page.tsx`

**Features:**
- View report details
- View before/after photos side-by-side
- View completed checklist
- View completion notes
- Officer information
- Timeline of work

#### **Day 4-5: Approve/Reject Actions**
**Backend Endpoints:**
```python
POST /api/v1/tasks/{task_id}/approve
POST /api/v1/tasks/{task_id}/reject
```

**Frontend:**
- Approve button (green)
- Reject button (red)
- Feedback form (if rejecting)
- Confirmation dialogs
- Status transitions

#### **Day 6-7: Feedback & Resubmission**
**Features:**
- Admin can send feedback to officer
- Officer receives notification
- Officer can view feedback
- Officer can resubmit with corrections
- Track resubmission history

---

### **WEEK 3: Citizen Feedback & Appeals (Phase 8)**

#### **Day 1-3: Citizen Feedback Form**
**Create:** `civiclens-client/src/pages/citizen/ProvideFeedback.tsx`

**Features:**
- Star rating (1-5)
- Satisfaction questions
- Comments field
- Photo upload (optional)
- Submit feedback

**Backend:**
```sql
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    user_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    is_satisfied BOOLEAN,
    created_at TIMESTAMP
);
```

#### **Day 4-7: Appeals System**
**Create:** `civiclens-client/src/pages/citizen/FileAppeal.tsx`

**Features:**
- Appeal reason (dropdown)
- Detailed explanation
- Photo evidence (optional)
- Submit appeal

**Backend:**
```sql
CREATE TABLE appeals (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    user_id INTEGER REFERENCES users(id),
    reason VARCHAR(100),
    explanation TEXT,
    status VARCHAR(50), -- pending, under_review, accepted, rejected
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP
);
```

**Admin Interface:**
- View appeals
- Review appeal details
- Accept/Reject appeal
- Reopen task if accepted

---

### **WEEK 4: Additional Features (Phase 9)**

#### **Day 1-2: Task Reassignment**
**Officer Side:**
- "Request Reassignment" button
- Reason field (mandatory)
- Submit request

**Admin Side:**
- View reassignment requests
- Approve/Reject
- Select new officer
- Notify both officers

#### **Day 3-4: On Hold Status**
**Officer Side:**
- "Put On Hold" button
- Reason field (mandatory)
- Estimated resume date

**Admin Side:**
- View on-hold tasks
- Resume task
- Add admin notes

#### **Day 5-6: Comments System**
**Backend:**
```sql
CREATE TABLE task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id),
    user_id INTEGER REFERENCES users(id),
    comment TEXT,
    is_internal BOOLEAN, -- admin-only or visible to officer
    created_at TIMESTAMP
);
```

**Features:**
- Admin can add comments
- Officer can see comments
- Officer can reply
- Comment history
- Real-time updates

#### **Day 7: Notifications**
**Backend:**
- SMS integration (Twilio)
- Email integration (SendGrid)
- Push notifications (Firebase)

**Triggers:**
- Status changes
- New assignments
- Comments added
- Deadlines approaching

---

## 🎯 **IMMEDIATE NEXT STEPS (This Week)**

### **Priority 1: Before/After Photos** 🔴 CRITICAL

**Why First?**
- Core proof of work
- Required for verification
- Citizen expectation

**Implementation:**
1. Create photo upload component
2. Add to start work flow
3. Add to complete work flow
4. Store in media table with type
5. Display in verification interface

**Estimated Time:** 2-3 days

---

### **Priority 2: Checklist System** 🟡 HIGH

**Why Second?**
- Structured verification
- Quality control
- Standardized process

**Implementation:**
1. Design checklist schema
2. Create database tables
3. Build checklist component
4. Integrate with task flow
5. Make mandatory before completion

**Estimated Time:** 2-3 days

---

### **Priority 3: Admin Verification** 🟡 HIGH

**Why Third?**
- Completes the loop
- Quality assurance
- Prevents premature closure

**Implementation:**
1. Create verification page
2. Display photos and checklist
3. Add approve/reject actions
4. Implement feedback mechanism
5. Handle status transitions

**Estimated Time:** 3-4 days

---

## 📊 **Implementation Phases Summary**

```
CURRENT STATUS: 60% Complete

Phase 1-5: ✅✅✅✅✅ (100% Done)
Phase 6:   ⚠️⚠️⚠️⚠️⚠️ (50% Done)
Phase 7:   ❌❌❌❌❌ (0% Done)
Phase 8:   ❌❌❌❌❌ (0% Done)
Phase 9:   ❌❌❌❌❌ (0% Done)

NEXT 4 WEEKS:
Week 1: Phase 6 → 100% ✅
Week 2: Phase 7 → 100% ✅
Week 3: Phase 8 → 100% ✅
Week 4: Phase 9 → 100% ✅

FINAL STATUS: 100% Complete 🎉
```

---

## 🚀 **Let's Start Implementation!**

### **What Should We Build First?**

**Option 1: Before/After Photos** (Recommended)
- Most critical feature
- Visible impact
- Citizen-facing
- 2-3 days

**Option 2: Checklist System**
- Quality control
- Standardization
- Backend-heavy
- 2-3 days

**Option 3: Admin Verification**
- Completes workflow
- Admin-facing
- Depends on photos/checklist
- 3-4 days

---

## 📝 **Decision Time!**

**Which feature should we implement first?**

1. **Before/After Photos Upload** ← I recommend this
2. **Checklist System**
3. **Admin Verification Interface**
4. **All three in sequence**

**Let me know and I'll start building immediately!** 🚀

---

## 📋 **Quick Reference: What's Done vs What's Next**

### **✅ DONE:**
- Citizen can submit reports
- Admin can classify and assign
- Officer can view tasks
- Officer can acknowledge
- Officer can start work
- Officer can mark complete (basic)

### **🔄 IN PROGRESS:**
- Officer work completion (50%)

### **❌ TODO:**
- Before/after photos
- Checklist system
- Admin verification
- Citizen feedback
- Appeals system
- Task reassignment
- On hold status
- Comments system
- Notifications

**Total Remaining: ~4 weeks of work**

**Ready to continue? Let's build the next phase!** 💪
