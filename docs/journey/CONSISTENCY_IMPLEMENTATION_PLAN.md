# 🎯 Consistency Implementation Plan

**Goal:** Follow the existing reports section patterns for manage section and add comprehensive audit logging

---

## 📊 **Analysis: Existing vs New**

### **Existing Reports Section (GOOD - Follow This)**

#### **Frontend Structure:**
```
src/app/dashboard/reports/
├── page.tsx                    # Main reports list (WELL IMPLEMENTED)
├── [id]/page.tsx              # Report detail view
└── manage/
    ├── page.tsx               # Manage reports hub (NEW - needs consistency)
    └── [id]/page.tsx          # Manage report detail (NEW - needs consistency)
```

#### **Backend Structure:**
```
app/api/v1/
├── reports.py                 # Main reports API (MISSING audit logging)
├── appeals.py                 # Appeals API (MISSING audit logging)
└── escalations.py             # Escalations API (HAS audit logging ✅)
```

---

## ✅ **What's GOOD in Existing Reports Section**

### **1. Frontend (`reports/page.tsx`):**
- ✅ Clean component structure
- ✅ Proper state management
- ✅ Good filtering system
- ✅ Reusable components (`ReportDetail`, `Badge`, etc.)
- ✅ Bulk actions with password confirmation
- ✅ Map preview
- ✅ Export functionality

### **2. Backend (`reports.py`):**
- ✅ Uses `ReportService` for business logic
- ✅ Proper permission checks
- ✅ Good error handling
- ✅ Async/await patterns
- ❌ **MISSING:** Audit logging

---

## 🔧 **Implementation Tasks**

### **PHASE 1: Add Audit Logging to Reports API** (HIGH PRIORITY)

#### **File:** `app/api/v1/reports.py`

**Add imports:**
```python
from fastapi import Request  # Add to existing imports
from app.core.audit_logger import audit_logger
from app.models.audit_log import AuditAction, AuditStatus
```

**Update endpoints to add audit logging:**

##### **1. Create Report:**
```python
@router.post("/", response_model=ReportResponse)
async def create_report(
    report_data: ReportCreate,
    request: Request,  # ADD THIS
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    # ... existing code ...
    
    report = await report_crud.create(db, ReportCreateInternal(**report_dict))
    
    # ADD AUDIT LOGGING
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_CREATED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Created report: {report.title}",
        metadata={
            "report_id": report.id,
            "category": report_dict.get('category'),
            "severity": report_dict.get('severity'),
            "location": f"{report_dict.get('latitude')},{report_dict.get('longitude')}"
        },
        resource_type="report",
        resource_id=str(report.id)
    )
    
    # ... rest of existing code ...
```

##### **2. Update Report:**
```python
@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int,
    report_update: ReportUpdate,
    request: Request,  # ADD THIS
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ... existing code ...
    
    updated_report = await report_crud.update(db, report_id, report_update)
    
    # ADD AUDIT LOGGING
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_UPDATED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Updated report #{report_id}",
        metadata={
            "report_id": report_id,
            "updated_fields": list(report_update.model_dump(exclude_unset=True).keys())
        },
        resource_type="report",
        resource_id=str(report_id)
    )
    
    return updated_report
```

##### **3. Classify Report:**
```python
@router.put("/{report_id}/classify")
async def classify_report(
    report_id: int,
    req: ClassifyReportRequest,
    request: Request,  # ADD THIS
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    # ... existing code ...
    
    report = await report_service.classify_report(...)
    
    # ADD AUDIT LOGGING
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_CLASSIFIED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Classified report #{report_id} as {req.category}",
        metadata={
            "report_id": report_id,
            "category": req.category,
            "severity": req.severity,
            "notes": req.notes
        },
        resource_type="report",
        resource_id=str(report_id)
    )
    
    return report
```

##### **4. Assign Department:**
```python
@router.put("/{report_id}/assign-department")
async def assign_department(
    report_id: int,
    req: AssignDepartmentRequest,
    request: Request,  # ADD THIS
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    # ... existing code ...
    
    report = await report_service.assign_to_department(...)
    
    # ADD AUDIT LOGGING
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_ASSIGNED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Assigned report #{report_id} to department #{req.department_id}",
        metadata={
            "report_id": report_id,
            "department_id": req.department_id,
            "notes": req.notes
        },
        resource_type="report",
        resource_id=str(report_id)
    )
    
    return report
```

##### **5. Update Status:**
```python
@router.put("/{report_id}/status")
async def update_status(
    report_id: int,
    status_update: StatusUpdateRequest,
    request: Request,  # ADD THIS
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    # ... existing code ...
    
    report = await report_service.update_status(...)
    
    # ADD AUDIT LOGGING
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_STATUS_CHANGED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Changed report #{report_id} status to {status_update.status}",
        metadata={
            "report_id": report_id,
            "old_status": old_status,  # Get from report before update
            "new_status": status_update.status,
            "notes": status_update.notes
        },
        resource_type="report",
        resource_id=str(report_id)
    )
    
    # If status is RESOLVED
    if status_update.status == ReportStatus.RESOLVED:
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_RESOLVED,
            status=AuditStatus.SUCCESS,
            user=current_user,
            request=request,
            description=f"Resolved report #{report_id}",
            metadata={"report_id": report_id},
            resource_type="report",
            resource_id=str(report_id)
        )
    
    return report
```

---

### **PHASE 2: Add Audit Logging to Appeals API**

#### **File:** `app/api/v1/appeals.py`

**Follow same pattern as escalations.py:**

```python
# Add imports
from fastapi import Request
from app.core.audit_logger import audit_logger
from app.models.audit_log import AuditAction, AuditStatus

# In create_appeal:
await audit_logger.log(
    db=db,
    action=AuditAction.APPEAL_CREATED,
    status=AuditStatus.SUCCESS,
    user=current_user,
    request=request,
    description=f"Created {appeal.appeal_type} appeal for report #{report.id}",
    metadata={
        "appeal_id": appeal.id,
        "report_id": report.id,
        "appeal_type": appeal.appeal_type.value,
        "reason": appeal.reason
    },
    resource_type="appeal",
    resource_id=str(appeal.id)
)

# In review_appeal:
await audit_logger.log(
    db=db,
    action=AuditAction.APPEAL_REVIEWED,
    status=AuditStatus.SUCCESS,
    user=current_user,
    request=request,
    description=f"Reviewed appeal #{appeal_id}: {review_data.status}",
    metadata={
        "appeal_id": appeal_id,
        "decision": review_data.status,
        "review_notes": review_data.review_notes
    },
    resource_type="appeal",
    resource_id=str(appeal_id)
)
```

---

### **PHASE 3: Consolidate Frontend Components**

#### **Problem:** Duplicate implementations between `reports/` and `manage/`

#### **Solution:** Extract shared components

##### **1. Create Shared PDF Export Utility**

**File:** `src/lib/utils/pdf-export.ts`

```typescript
import { Report } from '@/types';

export function exportReportToPDF(report: Report, options?: {
  includeAuditTrail?: boolean;
  includeMedia?: boolean;
}) {
  // Use the GOOD implementation from ReportDetail.tsx
  const timestamp = new Date().toISOString().split('T')[0];
  const reportNum = report.report_number || `CL-${report.id}`;
  const filename = `CivicLens_Report_${reportNum}_${timestamp}`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(generatePDFHTML(report, options));
    printWindow.document.close();
  }
}

function generatePDFHTML(report: Report, options?: any): string {
  // Extract from ReportDetail.tsx
  return `<!DOCTYPE html>...`;
}
```

##### **2. Update Both Locations to Use Shared Utility**

**In `reports/page.tsx` and `manage/[id]/page.tsx`:**
```typescript
import { exportReportToPDF } from '@/lib/utils/pdf-export';

const handleExportPDF = () => {
  if (report) {
    exportReportToPDF(report, {
      includeAuditTrail: true,
      includeMedia: true
    });
  }
};
```

---

### **PHASE 4: Add Audit Trail Display**

#### **1. Create Audit API Endpoint**

**File:** `app/api/v1/audit.py` (CREATE NEW)

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.audit_log import AuditLog
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/audit", tags=["Audit"])

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    user_role: Optional[str]
    action: str
    status: str
    timestamp: datetime
    ip_address: Optional[str]
    description: Optional[str]
    extra_data: Optional[dict]
    resource_type: Optional[str]
    resource_id: Optional[str]
    
    class Config:
        from_attributes = True

@router.get("/resource/{resource_type}/{resource_id}", response_model=List[AuditLogResponse])
async def get_resource_audit_trail(
    resource_type: str,
    resource_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get audit trail for a specific resource"""
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.resource_type == resource_type)
        .where(AuditLog.resource_id == resource_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return logs
```

**Register in `app/main.py`:**
```python
from app.api.v1 import audit
app.include_router(audit.router, prefix="/api/v1")
```

#### **2. Create Frontend Audit Trail Component**

**File:** `src/components/reports/AuditTrail.tsx` (CREATE NEW)

```typescript
"use client";

import React, { useEffect, useState } from 'react';
import { Clock, User, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/api/client';

interface AuditLog {
  id: number;
  action: string;
  description: string;
  timestamp: string;
  user_id?: number;
  user_role?: string;
  status: string;
  extra_data?: any;
}

interface AuditTrailProps {
  resourceType: string;
  resourceId: number;
}

export function AuditTrail({ resourceType, resourceId }: AuditTrailProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadAuditLogs();
  }, [resourceType, resourceId]);
  
  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/audit/resource/${resourceType}/${resourceId}`
      );
      setLogs(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };
  
  const getActionIcon = (action: string) => {
    if (action.includes('created')) return <FileText className="w-4 h-4 text-blue-600" />;
    if (action.includes('updated')) return <Clock className="w-4 h-4 text-yellow-600" />;
    if (action.includes('resolved')) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (action.includes('escalated')) return <AlertCircle className="w-4 h-4 text-red-600" />;
    return <FileText className="w-4 h-4 text-gray-600" />;
  };
  
  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Audit Trail
      </h3>
      
      {logs.length === 0 ? (
        <p className="text-sm text-gray-500">No audit logs found</p>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getActionIcon(log.action)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {formatAction(log.action)}
                    </p>
                    {log.description && (
                      <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                    )}
                    {log.user_role && (
                      <p className="text-xs text-gray-500 mt-1">
                        By: {log.user_role.replace('_', ' ').toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### **3. Add Audit Trail to Report Detail Views**

**In `src/components/reports/ReportDetail.tsx`:**
```typescript
import { AuditTrail } from './AuditTrail';

// In the component JSX:
<div className="mt-8">
  <AuditTrail resourceType="report" resourceId={report.id} />
</div>
```

**In `src/app/dashboard/reports/manage/[id]/page.tsx`:**
```typescript
import { AuditTrail } from '@/components/reports/AuditTrail';

// In the component JSX:
<div className="mt-8">
  <AuditTrail resourceType="report" resourceId={report.id} />
</div>
```

---

## ✅ **Implementation Checklist**

### **Backend:**
- [ ] Add `Request` parameter to all report endpoints
- [ ] Add audit logging to `create_report`
- [ ] Add audit logging to `update_report`
- [ ] Add audit logging to `classify_report`
- [ ] Add audit logging to `assign_department`
- [ ] Add audit logging to `update_status`
- [ ] Add audit logging to all appeals endpoints
- [ ] Create `audit.py` API endpoint
- [ ] Register audit router in `main.py`
- [ ] Test all audit logging

### **Frontend:**
- [ ] Create `pdf-export.ts` utility
- [ ] Update `ReportDetail.tsx` to use shared export
- [ ] Update `manage/[id]/page.tsx` to use shared export
- [ ] Create `AuditTrail.tsx` component
- [ ] Add AuditTrail to `ReportDetail.tsx`
- [ ] Add AuditTrail to `manage/[id]/page.tsx`
- [ ] Test PDF export consistency
- [ ] Test audit trail display

---

## 🎯 **Benefits**

1. **Consistency:** Same patterns everywhere
2. **Audit Trail:** Complete tracking of all actions
3. **Reusability:** Shared components reduce duplication
4. **Maintainability:** Easier to update and fix
5. **Production Ready:** Compliance and security ready

---

**This follows the existing good patterns and extends them properly!** ✅
