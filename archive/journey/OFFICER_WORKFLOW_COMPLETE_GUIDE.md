# 🎯 Officer Workflow - Complete Implementation Guide

## ✅ **Backend Analysis Complete!**

I've analyzed the complete backend structure and updated the frontend accordingly.

---

## 🏗️ **Backend Architecture:**

### **Data Model:**

```
User (Officer)
  ↓ has many
Task (assigned_to → User.id)
  ↓ belongs to
Report
  ↓ has many
Media, StatusHistory
```

### **Key Relationships:**

```python
# Task Model
class Task(BaseModel):
    report_id = ForeignKey("reports.id")  # One-to-one with Report
    assigned_to = ForeignKey("users.id")   # Officer assigned
    assigned_by = ForeignKey("users.id")   # Who assigned it
    
    status = TaskStatus  # assigned, acknowledged, in_progress, resolved
    
    assigned_at = DateTime
    acknowledged_at = DateTime
    started_at = DateTime
    resolved_at = DateTime
    
    # Relationships
    report = relationship("Report")
    officer = relationship("User", foreign_keys=[assigned_to])
```

```python
# Report Model
class Report(BaseModel):
    user_id = ForeignKey("users.id")  # Citizen who reported
    department_id = ForeignKey("departments.id")
    
    status = ReportStatus  # received, classified, assigned_to_officer, 
                          # acknowledged, in_progress, pending_verification, 
                          # resolved, closed
    
    # Relationships
    task = relationship("Task", back_populates="report")  # One-to-one
    media = relationship("Media")
    status_history = relationship("ReportStatusHistory")
```

---

## 📡 **Available Backend Endpoints:**

### **1. Get Officer's Tasks**
```
GET /api/v1/reports/
Query params:
  - page: 1
  - per_page: 100
  - status: optional
  - department_id: optional

Response: {
  data: [
    {
      id: 1,
      report_number: "CL-2025-RNC-00016",
      title: "Water logging",
      status: "assigned_to_officer",
      task: {
        id: 10,
        assigned_to: 123,  // Officer ID
        status: "assigned",
        acknowledged_at: null,
        started_at: null
      }
    }
  ],
  total: 50,
  page: 1,
  per_page: 100
}
```

**Frontend filters reports where `task.assigned_to === current_officer_id`**

### **2. Get Task Details**
```
GET /api/v1/reports/{report_id}

Response: {
  id: 1,
  report_number: "CL-2025-RNC-00016",
  title: "Water logging on the road",
  description: "Severe water logging...",
  status: "assigned_to_officer",
  severity: "critical",
  category: "roads",
  latitude: 23.3441,
  longitude: 85.3096,
  address: "Sector 4, Main Road",
  landmark: "Near City Mall",
  user: {
    id: 5,
    full_name: "Anil Kumar",
    phone: "+91-9876543210"
  },
  department: {
    id: 1,
    name: "Public Works Department"
  },
  task: {
    id: 10,
    assigned_to: 123,
    assigned_by: 1,
    status: "assigned",
    priority: 5,
    notes: null,
    assigned_at: "2025-10-25T15:20:00Z",
    acknowledged_at: null,
    started_at: null
  },
  media: [
    {
      id: 1,
      file_url: "/media/reports/photo1.jpg",
      file_type: "image",
      file_size: 1024000
    }
  ],
  created_at: "2025-10-25T15:20:00Z",
  updated_at: "2025-10-25T15:20:00Z"
}
```

### **3. Acknowledge Task**
```
POST /api/v1/reports/{report_id}/acknowledge
Body: {
  notes: "Will visit site today afternoon"  // Optional
}

Effect:
- Report status: assigned_to_officer → acknowledged
- Task status: assigned → acknowledged
- Task.acknowledged_at = now()
- Adds status history entry
- Notifies citizen via SMS

Response: Updated report object
```

### **4. Start Work**
```
POST /api/v1/reports/{report_id}/start-work
Body: {
  notes: "Started work, clearing water logging"  // Optional
}

Effect:
- Report status: acknowledged → in_progress
- Task status: acknowledged → in_progress
- Task.started_at = now()
- Adds status history entry
- Notifies citizen

Response: Updated report object
```

### **5. Complete Task**
```
PUT /api/v1/reports/{report_id}
Body: {
  status: "pending_verification",  // or "resolved"
  notes: "Work completed successfully"
}

Effect:
- Report status: in_progress → pending_verification
- Task status: in_progress → resolved
- Task.resolved_at = now()
- Adds status history entry
- Notifies admin for verification
- Notifies citizen

Response: Updated report object
```

### **6. Get Task History**
```
GET /api/v1/reports/{report_id}/history

Response: {
  report_id: 1,
  history: [
    {
      old_status: "assigned_to_officer",
      new_status: "acknowledged",
      changed_by_user_id: 123,
      changed_by_user: {
        id: 123,
        full_name: "Priya Singh",
        email: "priya@Navi Mumbai.gov.in"
      },
      notes: "Will visit site today",
      changed_at: "2025-10-25T17:30:00Z"
    },
    {
      old_status: "acknowledged",
      new_status: "in_progress",
      changed_by_user_id: 123,
      notes: "Started work",
      changed_at: "2025-10-26T14:00:00Z"
    }
  ]
}
```

### **7. Get Officer Stats**
```
GET /api/v1/users/{user_id}/stats

Response: {
  user_id: 123,
  full_name: "Priya Singh",
  email: "priya@Navi Mumbai.gov.in",
  phone: "+91-9876543210",
  employee_id: "OFF-007",
  department_id: 1,
  department_name: "Public Works Department",
  total_reports: 20,
  resolved_reports: 15,
  in_progress_reports: 3,
  active_reports: 5,
  avg_resolution_time_days: 2.4,
  workload_score: 0.6,
  capacity_level: "moderate"
}
```

---

## 🎨 **Frontend Implementation:**

### **Updated `officerService.ts`:**

```typescript
export const officerService = {
  // Get officer stats
  async getOfficerStats(userId: number): Promise<OfficerStats>
  
  // Get officer's assigned tasks
  async getMyTasks(params?: {
    status?: string;
    limit?: number;
  }): Promise<any[]>
  
  // Get current officer details
  async getCurrentOfficer(): Promise<any>
  
  // Get task/report details
  async getTaskDetails(reportId: number): Promise<any>
  
  // Get task history/timeline
  async getTaskHistory(reportId: number): Promise<any>
  
  // Acknowledge a task
  async acknowledgeTask(reportId: number, notes?: string): Promise<any>
  
  // Start work on a task
  async startWork(reportId: number, notes?: string): Promise<any>
  
  // Complete a task
  async completeTask(reportId: number, data: {
    status: string;
    notes?: string;
  }): Promise<any>
}
```

### **Task Filtering Logic:**

```typescript
// In Dashboard.tsx and Tasks.tsx
const response = await officerService.getMyTasks({ limit: 100 });

// Backend returns paginated response
const allReports = response.data || response.items || response;

// Filter for current officer's tasks
const myTasks = allReports.filter((report: any) => {
  return report.task && report.task.assigned_to === user.id;
});
```

---

## 🔄 **Officer Workflow States:**

### **Task Status Flow:**

```
1. ASSIGNED
   ↓ (Officer acknowledges)
2. ACKNOWLEDGED
   ↓ (Officer starts work)
3. IN_PROGRESS
   ↓ (Officer completes)
4. RESOLVED
```

### **Report Status Flow:**

```
1. ASSIGNED_TO_OFFICER
   ↓ (Officer acknowledges)
2. ACKNOWLEDGED
   ↓ (Officer starts work)
3. IN_PROGRESS
   ↓ (Officer completes)
4. PENDING_VERIFICATION
   ↓ (Admin verifies)
5. RESOLVED
   ↓ (Admin closes)
6. CLOSED
```

---

## 📱 **Required Pages:**

### **✅ Already Implemented:**

1. **Officer Login** (`/officer/login`)
   - Phone/Employee ID + Password
   - JWT authentication
   - Redirect to dashboard

2. **Officer Dashboard** (`/officer/dashboard`)
   - Stats cards (Active, Completed, Critical, This Month)
   - Top 5 tasks list
   - Performance metrics sidebar
   - Workload capacity indicator

3. **Tasks List** (`/officer/tasks`)
   - All assigned tasks
   - Filtering by status
   - Sorting options
   - Task cards with actions

### **🔨 Need to Implement:**

4. **Task Details** (`/officer/task/:id`)
   - Full report information
   - Citizen details
   - Location map
   - Photos gallery
   - Status timeline
   - Action buttons (Acknowledge, Start, Complete)

5. **Acknowledge Modal**
   - Add notes (optional)
   - Expected completion date
   - Confirm acknowledgment

6. **Start Work Page** (`/officer/task/:id/start`)
   - GPS check-in
   - Before photos upload
   - Work notes
   - Estimated time

7. **Complete Work Page** (`/officer/task/:id/complete`)
   - After photos upload
   - Before/After comparison
   - Completion notes
   - Work duration
   - Materials used
   - Checklist

---

## 🎯 **Implementation Priority:**

### **Phase 1: Core Workflow** (High Priority)

1. ✅ Fix task fetching (DONE)
2. ✅ Add task action methods to service (DONE)
3. 🔨 Create Task Details page
4. 🔨 Implement Acknowledge action
5. 🔨 Implement Start Work action
6. 🔨 Implement Complete action

### **Phase 2: Enhanced Features** (Medium Priority)

7. 🔨 Add GPS check-in for start work
8. 🔨 Add photo upload for before/after
9. 🔨 Add status timeline visualization
10. 🔨 Add location map integration

### **Phase 3: Polish** (Low Priority)

11. 🔨 Add notifications
12. 🔨 Add offline support
13. 🔨 Add performance analytics
14. 🔨 Add export reports

---

## 🧪 **Testing Guide:**

### **Step 1: Verify Backend**

```bash
# Check if backend is running
curl http://localhost:8000/api/v1/health

# Login as officer
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+91-9876543210", "password": "Officer@123"}'

# Get officer stats
curl http://localhost:8000/api/v1/users/16/stats \
  -H "Authorization: Bearer {token}"

# Get reports
curl http://localhost:8000/api/v1/reports/?page=1&per_page=100 \
  -H "Authorization: Bearer {token}"
```

### **Step 2: Test Frontend**

```
1. Login: http://localhost:8080/officer/login
   Phone: 9876543210
   Password: Officer@123

2. Dashboard: http://localhost:8080/officer/dashboard
   - Should show stats
   - Should show tasks assigned to you
   - Check console for debug logs

3. Tasks: http://localhost:8080/officer/tasks
   - Should show same tasks as dashboard
   - Should have action buttons
```

### **Step 3: Check Console Logs**

```
📊 Loading Dashboard Data...
   Officer ID: 16
   Officer Name: Rakesh Kumar
   ✅ Stats received: {user_id: 16, ...}
   
📋 getMyTasks response: {data: [...], total: 50}
   Total reports in response: 50
   Tasks with assignment: 5
   
✅ Dashboard loaded successfully!
```

---

## 🐛 **Common Issues & Solutions:**

### **Issue 1: "No Active Tasks"**

**Cause:** No reports assigned to your officer

**Solution:**
```sql
-- Check if tasks exist for your officer
SELECT 
  r.id, r.report_number, r.title,
  t.assigned_to, t.status,
  u.full_name as officer_name
FROM reports r
JOIN tasks t ON t.report_id = r.id
JOIN users u ON u.id = t.assigned_to
WHERE t.assigned_to = 16;  -- Your officer ID

-- If no results, assign some reports via admin panel
```

### **Issue 2: "allReports.filter is not a function"**

**Cause:** Backend response structure mismatch

**Solution:** ✅ Already fixed in `officerService.ts`
- Now handles multiple response formats
- Checks for `data`, `items`, or direct array

### **Issue 3: Tasks show but actions don't work**

**Cause:** Action methods not implemented

**Solution:** ✅ Already added to `officerService.ts`
- `acknowledgeTask()`
- `startWork()`
- `completeTask()`

---

## 📊 **Summary:**

**Status:** ✅ **Backend Analysis Complete + Service Layer Updated**

**What's Done:**
- ✅ Analyzed complete backend structure
- ✅ Documented all available endpoints
- ✅ Fixed task fetching logic
- ✅ Added all task action methods
- ✅ Removed duplicate methods
- ✅ Added proper error handling

**What's Working:**
- ✅ Officer login
- ✅ Dashboard with stats
- ✅ Tasks list
- ✅ Task filtering
- ✅ Console debugging

**What's Next:**
- 🔨 Create Task Details page
- 🔨 Implement action buttons
- 🔨 Add photo upload
- 🔨 Add GPS check-in
- 🔨 Add timeline visualization

**The foundation is complete! Now we can build the UI pages.** 🚀

---

## 🎯 **Next Steps:**

Would you like me to:

1. **Create the Task Details page** - Full report view with all information
2. **Implement the action modals** - Acknowledge, Start Work, Complete
3. **Add photo upload functionality** - Before/After photos
4. **Create the timeline view** - Status history visualization
5. **All of the above** - Complete implementation

Let me know which you'd like me to implement first!
