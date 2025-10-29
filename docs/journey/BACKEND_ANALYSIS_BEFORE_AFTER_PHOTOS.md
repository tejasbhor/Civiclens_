# 🔍 Backend Analysis: Before/After Photos System

## ✅ **GOOD NEWS: Backend is 80% Ready!**

The backend already has most of the infrastructure needed for before/after photos!

---

## ✅ **WHAT'S ALREADY THERE**

### **1. Media Model** ✅ COMPLETE
**File:** `app/models/media.py`

**Features:**
```python
class UploadSource(str, enum.Enum):
    CITIZEN_SUBMISSION = "citizen_submission"
    OFFICER_BEFORE_PHOTO = "officer_before_photo"  ✅ Already defined!
    OFFICER_AFTER_PHOTO = "officer_after_photo"    ✅ Already defined!

class Media(BaseModel):
    report_id = Column(Integer, ForeignKey("reports.id"))
    file_url = Column(String(500))
    file_type = Column(SQLEnum(MediaType))  # IMAGE, VIDEO, AUDIO
    file_size = Column(Integer)
    mime_type = Column(String(100))
    is_primary = Column(Boolean, default=False)
    is_proof_of_work = Column(Boolean, default=False)  ✅ For verification!
    sequence_order = Column(Integer)
    caption = Column(String(500))
    meta = Column(JSONB)  # Can store additional data
    upload_source = Column(SQLEnum(UploadSource))  ✅ Already supports before/after!
```

**Status:** ✅ **PERFECT! No changes needed!**

---

### **2. Media Upload API** ✅ EXISTS
**File:** `app/api/v1/media.py`

**Endpoints:**
```python
POST /api/v1/media/upload/{report_id}
- Upload single file
- Supports images (JPEG, PNG, WebP)
- Max 10MB per image
- Max 5 images per report
- Validates file type and size
- Returns media object with ID
```

**Status:** ✅ **Working, but needs enhancement**

---

### **3. File Upload Service** ✅ EXISTS
**File:** `app/services/file_upload_service.py`

**Features:**
- File validation (type, size, format)
- Image processing (resize, optimize)
- Storage integration
- Hash generation
- Metadata tracking

**Current Limitation:**
```python
# Line 333: Hardcoded to CITIZEN_SUBMISSION
upload_source=UploadSource.CITIZEN_SUBMISSION
```

**Status:** ⚠️ **Needs modification to accept upload_source parameter**

---

### **4. Task Model** ✅ COMPLETE
**File:** `app/models/task.py`

**Features:**
```python
class Task(BaseModel):
    report_id = Column(Integer, ForeignKey("reports.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"))
    status = Column(SQLEnum(TaskStatus))
    priority = Column(Integer)
    notes = Column(Text)
    resolution_notes = Column(Text)  ✅ For completion notes
    
    # Timestamps
    assigned_at = Column(DateTime)
    acknowledged_at = Column(DateTime)
    started_at = Column(DateTime)  ✅ When officer starts work
    resolved_at = Column(DateTime)  ✅ When officer completes
```

**Status:** ✅ **Perfect! No changes needed!**

---

## ⚠️ **WHAT NEEDS TO BE ADDED**

### **1. Enhance File Upload Service** 🔧 REQUIRED
**File:** `app/services/file_upload_service.py`

**Change Needed:**
```python
# BEFORE (Line 265):
async def upload_file(
    self,
    file: UploadFile,
    report_id: int,
    user_id: int,
    file_type: str,
    caption: Optional[str] = None,
    is_primary: bool = False
) -> Media:

# AFTER:
async def upload_file(
    self,
    file: UploadFile,
    report_id: int,
    user_id: int,
    file_type: str,
    caption: Optional[str] = None,
    is_primary: bool = False,
    upload_source: Optional[UploadSource] = None,  # ← ADD THIS
    is_proof_of_work: bool = False  # ← ADD THIS
) -> Media:
    # ... existing code ...
    
    media = Media(
        report_id=report_id,
        file_url=file_url,
        file_type=media_type,
        file_size=validation_result['size'],
        mime_type=validation_result['mime_type'],
        is_primary=is_primary,
        caption=caption,
        upload_source=upload_source or UploadSource.CITIZEN_SUBMISSION,  # ← CHANGE THIS
        is_proof_of_work=is_proof_of_work,  # ← ADD THIS
        meta={...}
    )
```

**Estimated Time:** 15 minutes

---

### **2. Enhance Media Upload API** 🔧 REQUIRED
**File:** `app/api/v1/media.py`

**Change Needed:**
```python
# BEFORE (Line 42):
@router.post("/upload/{report_id}", response_model=MediaResponse)
async def upload_single_file(
    report_id: int,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    is_primary: bool = Form(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    upload_service: FileUploadService = Depends(get_file_upload_service)
):

# AFTER:
@router.post("/upload/{report_id}", response_model=MediaResponse)
async def upload_single_file(
    report_id: int,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    is_primary: bool = Form(False),
    upload_source: Optional[str] = Form(None),  # ← ADD THIS
    is_proof_of_work: bool = Form(False),  # ← ADD THIS
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    upload_service: FileUploadService = Depends(get_file_upload_service)
):
    # ... existing validation ...
    
    # Convert string to enum
    source_enum = None
    if upload_source:
        try:
            source_enum = UploadSource(upload_source)
        except ValueError:
            raise ValidationException(f"Invalid upload_source: {upload_source}")
    
    # Upload file
    media = await upload_service.upload_file(
        file=file,
        report_id=report_id,
        user_id=current_user.id,
        file_type=file_type,
        caption=caption,
        is_primary=is_primary,
        upload_source=source_enum,  # ← ADD THIS
        is_proof_of_work=is_proof_of_work  # ← ADD THIS
    )
```

**Estimated Time:** 20 minutes

---

### **3. Add Officer-Specific Endpoints** 🔧 OPTIONAL (Nice to have)
**File:** `app/api/v1/media.py` or create `app/api/v1/officer.py`

**New Endpoints:**
```python
@router.post("/tasks/{task_id}/before-photos", response_model=MediaResponse)
async def upload_before_photo(
    task_id: int,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload before photo when starting work"""
    # Verify task belongs to officer
    # Upload with upload_source=OFFICER_BEFORE_PHOTO
    # Update task.started_at if not set
    pass

@router.post("/tasks/{task_id}/after-photos", response_model=MediaResponse)
async def upload_after_photo(
    task_id: int,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload after photo when completing work"""
    # Verify task belongs to officer
    # Upload with upload_source=OFFICER_AFTER_PHOTO
    # Mark as is_proof_of_work=True
    pass

@router.get("/tasks/{task_id}/photos", response_model=MediaListResponse)
async def get_task_photos(
    task_id: int,
    photo_type: Optional[str] = Query(None),  # before, after, all
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all photos for a task, filtered by type"""
    pass
```

**Estimated Time:** 1-2 hours

---

### **4. Add Checklist Model** 🔧 REQUIRED (For later)
**File:** `app/models/checklist.py` (NEW FILE)

**Schema:**
```python
class Checklist(BaseModel):
    __tablename__ = "checklists"
    
    task_id = Column(Integer, ForeignKey("tasks.id"), unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationship
    task = relationship("Task", back_populates="checklist")
    items = relationship("ChecklistItem", back_populates="checklist")

class ChecklistItem(BaseModel):
    __tablename__ = "checklist_items"
    
    checklist_id = Column(Integer, ForeignKey("checklists.id"))
    item_text = Column(String(500))
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    sequence_order = Column(Integer)
    
    # Relationship
    checklist = relationship("Checklist", back_populates="items")
```

**Status:** ❌ **Not needed immediately, can add later**

---

## 📊 **BACKEND READINESS SUMMARY**

### **Current Status:**
```
Media Model:           ✅ 100% Ready
Task Model:            ✅ 100% Ready
Storage Service:       ✅ 100% Ready
Upload API:            ⚠️  80% Ready (needs upload_source param)
File Service:          ⚠️  80% Ready (needs upload_source param)
Officer Endpoints:     ❌ 0% Ready (optional, can use generic upload)
Checklist System:      ❌ 0% Ready (for later phase)

OVERALL: 80% Ready
```

---

## 🎯 **IMPLEMENTATION PLAN**

### **Phase 1: Minimal Changes (1-2 hours)** ⭐ RECOMMENDED

**What to Do:**
1. ✅ Modify `FileUploadService.upload_file()` to accept `upload_source` parameter
2. ✅ Modify media upload API to accept `upload_source` parameter
3. ✅ Test with existing endpoint

**Result:**
- Officers can upload photos using existing `/media/upload/{report_id}` endpoint
- Just pass `upload_source=officer_before_photo` or `officer_after_photo`
- No new endpoints needed
- Minimal backend changes

**Frontend Can:**
```typescript
// Upload before photo
await mediaApi.uploadFile(reportId, file, {
  caption: "Before work started",
  upload_source: "officer_before_photo",
  is_proof_of_work: false
});

// Upload after photo
await mediaApi.uploadFile(reportId, file, {
  caption: "After work completed",
  upload_source: "officer_after_photo",
  is_proof_of_work: true
});
```

---

### **Phase 2: Officer-Specific Endpoints (2-3 hours)** 🔵 OPTIONAL

**What to Do:**
1. Create `/tasks/{task_id}/before-photos` endpoint
2. Create `/tasks/{task_id}/after-photos` endpoint
3. Create `/tasks/{task_id}/photos` endpoint
4. Add task ownership validation
5. Auto-update task timestamps

**Result:**
- Cleaner API for officers
- Better validation
- Automatic timestamp updates
- Task-centric instead of report-centric

---

### **Phase 3: Checklist System (3-4 hours)** 🟡 LATER

**What to Do:**
1. Create checklist models
2. Create checklist API
3. Integrate with task flow
4. Make mandatory before completion

**Result:**
- Structured verification
- Quality control
- Standardized process

---

## ✅ **RECOMMENDATION: Phase 1 (Minimal Changes)**

**Why?**
- Fastest to implement (1-2 hours)
- Minimal backend changes
- Uses existing infrastructure
- Can start frontend development immediately
- Can add Phase 2 later if needed

**What Needs to Change:**
1. Add `upload_source` parameter to `FileUploadService.upload_file()`
2. Add `upload_source` parameter to media upload API
3. Add `is_proof_of_work` parameter (optional)
4. Test with Postman/curl

**Then Frontend Can:**
- Upload before photos with `upload_source=officer_before_photo`
- Upload after photos with `upload_source=officer_after_photo`
- Filter photos by upload_source
- Display before/after comparison

---

## 🚀 **READY TO PROCEED?**

**Backend Status:** ✅ 80% Ready

**What I'll Do:**
1. Modify `FileUploadService` (15 min)
2. Modify media upload API (20 min)
3. Test with curl (10 min)
4. Document new parameters (15 min)

**Total Time:** ~1 hour

**Then you can:**
- Start building frontend photo upload
- Use existing media upload endpoint
- Pass upload_source parameter
- Everything will work!

**Shall I make these backend changes now?** 🔧
