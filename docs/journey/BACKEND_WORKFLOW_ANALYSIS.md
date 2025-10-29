# 🔍 Backend Workflow Analysis - Complete Officer Flow

## 📋 **ANALYSIS COMPLETE!**

I've analyzed the backend for the complete officer workflow from assignment to resolution.

---

## ✅ **WHAT'S ALREADY CONFIGURED:**

### **1. Report Status Flow** ✅
```
RECEIVED
  ↓
PENDING_CLASSIFICATION
  ↓
CLASSIFIED
  ↓
ASSIGNED_TO_DEPARTMENT
  ↓
ASSIGNED_TO_OFFICER
  ↓
ACKNOWLEDGED (Officer acknowledges)
  ↓
IN_PROGRESS (Officer starts work + before photos)
  ↓
PENDING_VERIFICATION (Officer submits + after photos) ← WE ARE HERE
  ↓
RESOLVED (Admin approves) ← NEED TO ADD
  ↓
CLOSED
```

### **2. Task Status Flow** ✅
```
ASSIGNED
  ↓
ACKNOWLEDGED
  ↓
IN_PROGRESS
  ↓
PENDING_VERIFICATION ← NEW (Added by us)
  ↓
RESOLVED
  ↓
REJECTED
  ↓
ON_HOLD
```

### **3. Existing Endpoints** ✅

**Officer Endpoints:**
- ✅ `POST /reports/{id}/acknowledge` - Officer acknowledges task
- ✅ `POST /reports/{id}/start-work` - Officer starts work
- ✅ `POST /reports/{id}/add-update` - Officer adds progress note
- ✅ `POST /reports/{id}/on-hold` - Officer puts task on hold
- ✅ `POST /reports/{id}/submit-for-verification` - Officer submits for verification

**Media Endpoints:**
- ✅ `POST /media/upload/{id}` - Upload photos with upload_source
- ✅ `GET /media/report/{id}` - Get all media for report

**Status Endpoints:**
- ✅ `POST /reports/{id}/status` - Update report status (Admin only)
- ✅ `GET /reports/{id}/history` - Get status history

---

## ⚠️ **WHAT'S MISSING:**

### **1. Admin Approval Endpoint** ❌ MISSING
```python
# NEED TO ADD:
POST /reports/{id}/approve-resolution
POST /reports/{id}/reject-resolution
```

**Purpose:** Admin reviews officer's work and approves/rejects

**Flow:**
```
Officer submits for verification
  ↓
Status: PENDING_VERIFICATION
  ↓
Admin reviews:
  - Before photos
  - After photos
  - Resolution notes
  ↓
Admin decision:
  ├─ Approve → Status: RESOLVED
  └─ Reject → Status: IN_PROGRESS (with feedback)
```

---

## 📊 **CURRENT WORKFLOW STATUS:**

### **✅ WORKING:**
```
1. Citizen submits report
2. Admin classifies report
3. Admin assigns to department
4. Admin assigns to officer
5. Officer acknowledges task
6. Officer starts work (with before photos)
7. Officer adds progress updates
8. Officer puts on hold (if needed)
9. Officer submits for verification (with after photos)
```

### **❌ MISSING:**
```
10. Admin reviews submission
11. Admin approves/rejects work
12. System notifies citizen
13. Citizen provides feedback
```

---

## 🔧 **WHAT NEEDS TO BE ADDED:**

### **Backend Endpoints:**

#### **1. Approve Resolution**
```python
@router.post("/{report_id}/approve-resolution", response_model=ReportResponse)
async def approve_resolution(
    report_id: int,
    approval_notes: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Admin approves officer's work
    Transitions: PENDING_VERIFICATION → RESOLVED
    """
    # Check admin permission
    if not current_user.can_access_admin_portal():
        raise ForbiddenException("Admin access required")
    
    report = await report_crud.get(db, report_id)
    if not report:
        raise NotFoundException("Report not found")
    
    # Only allow if currently PENDING_VERIFICATION
    if report.status != ReportStatus.PENDING_VERIFICATION:
        raise ValidationException(
            f"Cannot approve from status: {report.status}"
        )
    
    # Update report status
    updated = await report_service.update_status(
        report_id=report_id,
        new_status=ReportStatus.RESOLVED,
        user_id=current_user.id,
        notes=f"Work approved by admin. {approval_notes or ''}",
        skip_validation=False
    )
    
    # Update task
    task = await task_crud.get_by_report(db, report_id)
    if task:
        task.status = TaskStatus.RESOLVED
    
    await db.commit()
    await db.refresh(updated)
    
    return updated
```

#### **2. Reject Resolution**
```python
@router.post("/{report_id}/reject-resolution", response_model=ReportResponse)
async def reject_resolution(
    report_id: int,
    rejection_reason: str = Form(..., description="Mandatory reason for rejection"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Admin rejects officer's work and sends back for rework
    Transitions: PENDING_VERIFICATION → IN_PROGRESS
    """
    # Check admin permission
    if not current_user.can_access_admin_portal():
        raise ForbiddenException("Admin access required")
    
    report = await report_crud.get(db, report_id)
    if not report:
        raise NotFoundException("Report not found")
    
    # Only allow if currently PENDING_VERIFICATION
    if report.status != ReportStatus.PENDING_VERIFICATION:
        raise ValidationException(
            f"Cannot reject from status: {report.status}"
        )
    
    # Update report status back to IN_PROGRESS
    updated = await report_service.update_status(
        report_id=report_id,
        new_status=ReportStatus.IN_PROGRESS,
        user_id=current_user.id,
        notes=f"Work rejected by admin. Reason: {rejection_reason}",
        skip_validation=False
    )
    
    # Update task
    task = await task_crud.get_by_report(db, report_id)
    if task:
        task.status = TaskStatus.IN_PROGRESS
        task.notes = f"{task.notes}\n[REJECTED] {rejection_reason}" if task.notes else f"[REJECTED] {rejection_reason}"
    
    await db.commit()
    await db.refresh(updated)
    
    return updated
```

---

## 📋 **FRONTEND PAGES NEEDED:**

### **1. CompleteTask Page (Officer)** 🔄 NEXT
**Route:** `/officer/task/{id}/complete`

**Features:**
- Show before photos (read-only)
- Upload after photos (1-5 photos)
- Add completion notes
- Submit for verification

**API Calls:**
```typescript
// 1. Upload after photos
await mediaApi.uploadFile(reportId, file, {
  upload_source: 'officer_after_photo',
  is_proof_of_work: true
});

// 2. Submit for verification
await officerService.submitForVerification(reportId, {
  resolution_notes: notes
});
```

---

### **2. Admin Verification Page** 🔄 FUTURE
**Route:** `/dashboard/reports/verify/{id}`

**Features:**
- View report details
- View before photos
- View after photos
- Side-by-side comparison
- Approve/Reject buttons
- Add approval/rejection notes

**API Calls:**
```typescript
// Approve
await adminService.approveResolution(reportId, {
  approval_notes: notes
});

// Reject
await adminService.rejectResolution(reportId, {
  rejection_reason: reason
});
```

---

## ✅ **SUMMARY:**

### **Backend Status:**
- ✅ Officer workflow endpoints (acknowledge, start, update, hold, submit)
- ✅ Media upload with upload_source
- ✅ Status transitions configured
- ✅ PENDING_VERIFICATION status exists
- ❌ Admin approval/rejection endpoints MISSING

### **Frontend Status:**
- ✅ Officer Dashboard
- ✅ Task Details page
- ✅ Start Work page (with before photos)
- ❌ Complete Task page (with after photos) MISSING
- ❌ Admin Verification page MISSING

---

## 🎯 **RECOMMENDED IMPLEMENTATION ORDER:**

### **Phase 1: Officer Complete Task** (NEXT)
1. ✅ Add backend endpoints for approve/reject
2. ✅ Create CompleteTask page
3. ✅ Test officer workflow end-to-end

### **Phase 2: Admin Verification** (LATER)
1. Create Admin Verification page
2. Add before/after photo comparison
3. Test admin approval flow

### **Phase 3: Citizen Feedback** (FUTURE)
1. Citizen notification on resolution
2. Citizen feedback form
3. Appeal system

---

## 🚀 **READY TO PROCEED:**

**Next Steps:**
1. Add backend approval/rejection endpoints
2. Create CompleteTask page for officers
3. Test complete workflow

**Shall I proceed with adding the backend endpoints first?** 🎯
