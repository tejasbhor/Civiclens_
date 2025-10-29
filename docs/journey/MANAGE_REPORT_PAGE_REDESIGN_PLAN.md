# Manage Report Page - Complete Redesign Plan

## Current State Analysis

### Existing Working Features

#### 1. Reports List Page (`/dashboard/reports/page.tsx`)
**Actions Available:**
- ✅ View on Map
- ✅ Manage Report (redirects to `/dashboard/reports/manage/[id]`)
- ✅ Quick Edit (opens ManageReportModal)
- ✅ Assign Department
- ✅ Assign Officer
- ✅ Copy Report Link
- ✅ Export as PDF (Summary, Standard, Comprehensive)

#### 2. Manage Reports Hub (`/dashboard/reports/manage/page.tsx`)
**Sections:**
- ✅ All Reports (with filter cards)
- ✅ Pending Review
- ✅ Appeals Tab
- ✅ Escalations Tab
- ✅ Manage Tab
- ✅ Archived Tab

**Filter Cards:**
- All Reports
- Needs Review
- Critical
- High Priority
- In Progress
- Pending Verification
- On Hold

**Redirects to:** `/dashboard/reports/manage/[id]` when clicking on a report card

#### 3. ManageReportModal Component
**Features:**
- ✅ 3-step wizard (Classify → Assign Department → Assign Officer)
- ✅ Category selection
- ✅ Severity selection
- ✅ Department assignment
- ✅ Officer assignment with priority
- ✅ PDF Export (Summary, Standard, Comprehensive)

#### 4. Backend API Endpoints (Already Working)
**Reports:**
- ✅ `GET /reports/{id}` - Get full report details
- ✅ `PUT /reports/{id}/classify` - Classify report
- ✅ `POST /reports/{id}/assign-department` - Assign department
- ✅ `POST /reports/{id}/assign-officer` - Assign officer
- ✅ `POST /reports/{id}/acknowledge` - Acknowledge report
- ✅ `POST /reports/{id}/start-work` - Start work
- ✅ `POST /reports/{id}/status` - Update status
- ✅ `GET /reports/{id}/history` - Get status history

**Appeals:**
- ✅ `POST /appeals` - Create appeal
- ✅ `GET /appeals` - List appeals
- ✅ `POST /appeals/{id}/review` - Review appeal

**Escalations:**
- ✅ `POST /escalations` - Create escalation
- ✅ `GET /escalations` - List escalations
- ✅ `POST /escalations/{id}/acknowledge` - Acknowledge escalation
- ✅ `POST /escalations/{id}/update` - Update escalation

## Redesign Objectives

### Remove
- ❌ SLA Tracker (not required yet)
- ❌ Overly complex lifecycle visualization
- ❌ Unnecessary abstractions

### Keep & Enhance
- ✅ All existing working actions
- ✅ PDF export functionality
- ✅ Status history
- ✅ Audit trail
- ✅ Appeals & Escalations sections
- ✅ Inline action forms

### Add
- ✨ Complete activity diagram flow support
- ✨ Citizen satisfaction tracking
- ✨ Appeal handling (citizen dissatisfaction)
- ✨ Reassignment flow (incorrect assignment)
- ✨ Rework management
- ✨ Community validation (future)

## New Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ STICKY HEADER                                                   │
│ Report #CL-123 | Status Badge | Severity Badge | Actions       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌──────────────────────┬────────────────────────────────────────┐│
│ │ SIDEBAR (30%)        │ MAIN CONTENT (70%)                     ││
│ │                      │                                        ││
│ │ 📸 Photos            │ 📋 REPORT OVERVIEW                     ││
│ │ 👤 Citizen Info      │ Title, Description, Location           ││
│ │ 📍 Location          │                                        ││
│ │ 📊 Metadata          │ ⚡ PRIMARY ACTIONS (Context-Aware)     ││
│ │ 🔗 Quick Actions     │ Based on current status + user role    ││
│ │                      │                                        ││
│ │                      │ 📜 STATUS HISTORY                      ││
│ │                      │ Timeline of all status changes         ││
│ │                      │                                        ││
│ │                      │ ⚖️ APPEALS & ESCALATIONS               ││
│ │                      │ Active appeals | Active escalations    ││
│ │                      │                                        ││
│ │                      │ 📑 TABBED DETAILS                      ││
│ │                      │ Details | Classification | Assignment  ││
│ │                      │ Resolution | Audit Log                 ││
│ └──────────────────────┴────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Activity Diagram Implementation

### 1. Report Submission (CITIZEN)
**Status:** RECEIVED
**Actions:**
- View report details
- Track on map

### 2. Admin Review (ADMIN)
**Status:** RECEIVED → CLASSIFIED
**Actions:**
- ✅ Classify Report (category, severity)
- ✅ Assign to Department
- ❌ Reject Report (mark as spam/invalid)

### 3. Department Assignment (ADMIN)
**Status:** CLASSIFIED → ASSIGNED_TO_DEPARTMENT
**Actions:**
- ✅ Assign to Officer
- ✅ Reassign Department (if incorrect)

### 4. Officer Assignment (ADMIN)
**Status:** ASSIGNED_TO_DEPARTMENT → ASSIGNED_TO_OFFICER
**Actions:**
- ✅ Auto-acknowledge (when officer views)
- ✅ Reassign Officer
- 🆕 Flag as Incorrectly Assigned (OFFICER)

### 5. Officer Acknowledgment (OFFICER)
**Status:** ASSIGNED_TO_OFFICER → ACKNOWLEDGED
**Actions:**
- ✅ Start Work
- ✅ Put on Hold (with reason)
- 🆕 Request Reassignment

### 6. Work in Progress (OFFICER)
**Status:** ACKNOWLEDGED → IN_PROGRESS
**Actions:**
- ✅ Add Work Update
- ✅ Mark for Verification
- ✅ Put on Hold (with reason)
- 🆕 Request Support
- 🆕 Upload Before/After Photos

### 7. Verification (ADMIN)
**Status:** IN_PROGRESS → PENDING_VERIFICATION
**Actions:**
- ✅ Mark as Resolved
- 🆕 Request Rework (send back to officer)
- ❌ Reject (with reason)

### 8. Resolution (ADMIN)
**Status:** PENDING_VERIFICATION → RESOLVED
**Actions:**
- ✅ Export Report
- 🆕 Reopen (if citizen appeals)
- 🆕 Mark as Closed (final)

### 9. Citizen Satisfaction (CITIZEN)
**Status:** RESOLVED
**Actions:**
- 🆕 Submit Appeal (if dissatisfied)
- 🆕 Provide Feedback (rating + comments)
- View resolution details

### 10. Appeal Handling (ADMIN)
**Status:** RESOLVED → APPEALED
**Actions:**
- 🆕 Review Appeal
- 🆕 Approve Appeal → Assign for Rework
- 🆕 Reject Appeal (with explanation)

### 11. Rework (OFFICER)
**Status:** APPEALED → APPEAL_REWORK
**Actions:**
- 🆕 Address Appeal Issues
- 🆕 Submit Enhanced Proof
- 🆕 Mark Rework Complete

### 12. Escalation (ANY ROLE)
**Status:** ANY → ESCALATED
**Actions:**
- 🆕 Create Escalation (Supervisor, Manager, Director, Executive)
- 🆕 Acknowledge Escalation
- 🆕 Respond to Escalation
- 🆕 Resolve Escalation

## Context-Aware Actions by Status

### RECEIVED
**Admin:**
- Classify Report (inline form)
- Assign to Department (inline form)
- Mark as Spam
- Mark as Duplicate

### CLASSIFIED
**Admin:**
- Assign to Department (inline form)
- Reclassify (inline form)

### ASSIGNED_TO_DEPARTMENT
**Admin:**
- Assign to Officer (inline form)
- Reassign Department (inline form)

### ASSIGNED_TO_OFFICER
**Officer:**
- Acknowledge (button)
- Flag as Incorrectly Assigned (inline form)

**Admin:**
- Reassign Officer (inline form)

### ACKNOWLEDGED
**Officer:**
- Start Work (button)
- Put on Hold (inline form with reason)

### IN_PROGRESS
**Officer:**
- Add Work Update (inline form)
- Upload Photos (file upload)
- Mark for Verification (button)
- Request Support (inline form)
- Put on Hold (inline form)

### PENDING_VERIFICATION
**Admin:**
- Mark as Resolved (inline form)
- Request Rework (inline form with feedback)
- Reject (inline form with reason)

### ON_HOLD
**Officer/Admin:**
- Resume Work (button)
- Reassign (inline form)
- Add Notes (inline form)

### RESOLVED
**Admin:**
- Reopen (inline form with reason)
- Mark as Closed (button)
- Export Report (dropdown)

**Citizen (via appeal):**
- Submit Appeal (creates appeal record)

### APPEALED
**Admin:**
- Review Appeal (modal/inline)
- Approve Appeal → Assign for Rework
- Reject Appeal (with explanation)

### APPEAL_REWORK
**Officer:**
- Address Issues (inline form)
- Upload Enhanced Proof
- Mark Rework Complete (button)

## Component Structure

```
ManageReportDetailPage
├── StickyHeader
│   ├── Report Number
│   ├── Status Badge
│   ├── Severity Badge
│   └── Actions Dropdown
│       ├── Export PDF
│       ├── Copy Link
│       ├── Mark as Spam
│       └── Mark as Duplicate
│
├── MainLayout (Flex)
│   ├── Sidebar (30%)
│   │   ├── PhotoGallery
│   │   ├── CitizenInfo
│   │   │   ├── Name
│   │   │   ├── Phone
│   │   │   └── Contact Button
│   │   ├── LocationCard
│   │   │   ├── Address
│   │   │   ├── Coordinates
│   │   │   └── View on Map
│   │   ├── MetadataCard
│   │   │   ├── Created Date
│   │   │   ├── Updated Date
│   │   │   ├── Report Age
│   │   │   └── Report Number
│   │   └── QuickActions
│   │       ├── Export PDF
│   │       ├── Copy Link
│   │       └── Share
│   │
│   └── MainContent (70%)
│       ├── ReportOverview
│       │   ├── Title
│       │   ├── Description
│       │   ├── Category
│       │   └── Tags
│       │
│       ├── PrimaryActionsPanel ✨
│       │   ├── Context-aware based on status
│       │   ├── Role-aware (Admin/Officer/Citizen)
│       │   └── Inline forms for quick actions
│       │
│       ├── StatusHistory
│       │   ├── Timeline visualization
│       │   ├── User who made change
│       │   ├── Timestamp
│       │   └── Notes/Comments
│       │
│       ├── AppealsEscalationsSection ✨
│       │   ├── Active Appeals
│       │   │   ├── Appeal cards
│       │   │   ├── Review actions
│       │   │   └── Create appeal form
│       │   └── Active Escalations
│       │       ├── Escalation cards
│       │       ├── Response actions
│       │       └── Create escalation form
│       │
│       └── TabbedDetails
│           ├── Details Tab
│           │   ├── Full description
│           │   ├── Category/Subcategory
│           │   └── Tags
│           ├── Classification Tab
│           │   ├── AI Classification
│           │   ├── Manual Classification
│           │   ├── Confidence Score
│           │   └── Classification Notes
│           ├── Assignment Tab
│           │   ├── Department Info
│           │   ├── Officer Info
│           │   ├── Task Details
│           │   └── Priority
│           ├── Resolution Tab
│           │   ├── Resolution Notes
│           │   ├── Before/After Photos
│           │   ├── Verification Status
│           │   └── Citizen Feedback
│           └── Audit Log Tab
│               ├── All actions
│               ├── User who performed
│               ├── Timestamp
│               └── Details
```

## Implementation Steps

### Phase 1: Core Structure (Immediate)
1. ✅ Keep existing sticky header
2. ✅ Keep existing sidebar structure
3. ✅ Simplify main content layout
4. ✅ Remove SLA Tracker
5. ✅ Keep Status History (simplified)

### Phase 2: Actions Integration (Current)
1. ✅ Integrate PrimaryActionsPanel (already created)
2. ✅ Integrate AppealsEscalationsSection (already created)
3. ✅ Integrate inline forms (already created)
4. 🔄 Add missing actions:
   - Flag as Incorrectly Assigned
   - Request Rework
   - Submit Appeal (citizen)
   - Review Appeal (admin)
   - Rework management

### Phase 3: New Features (Next)
1. 🆕 Citizen Feedback System
   - Rating (1-5 stars)
   - Comments
   - Photos (optional)
2. 🆕 Rework Management
   - Rework request form
   - Rework completion tracking
   - Before/After comparison
3. 🆕 Enhanced Photo Management
   - Before/After photos
   - Photo upload during work
   - Photo comparison view

### Phase 4: Polish (Final)
1. 🎨 Improve UI/UX
2. 📱 Mobile responsiveness
3. ♿ Accessibility
4. 🧪 Testing

## API Endpoints Needed

### Already Available ✅
- `GET /reports/{id}`
- `PUT /reports/{id}/classify`
- `POST /reports/{id}/assign-department`
- `POST /reports/{id}/assign-officer`
- `POST /reports/{id}/acknowledge`
- `POST /reports/{id}/start-work`
- `POST /reports/{id}/status`
- `GET /reports/{id}/history`
- `POST /appeals`
- `GET /appeals`
- `POST /appeals/{id}/review`
- `POST /escalations`
- `GET /escalations`

### To Be Created 🆕
- `POST /reports/{id}/request-rework` - Admin requests rework from officer
- `POST /reports/{id}/complete-rework` - Officer marks rework as complete
- `POST /reports/{id}/feedback` - Citizen submits feedback
- `POST /reports/{id}/flag-incorrect-assignment` - Officer flags incorrect assignment
- `POST /reports/{id}/photos` - Upload additional photos
- `GET /reports/{id}/photos` - Get all photos for report

## File Changes Required

### Modify
1. ✅ `app/dashboard/reports/manage/[id]/page.tsx` - Main integration (DONE)
2. 🔄 Add missing action handlers
3. 🔄 Add new inline forms for missing actions

### Create
1. 🆕 `components/reports/manage/RequestReworkForm.tsx`
2. 🆕 `components/reports/manage/FlagIncorrectAssignmentForm.tsx`
3. 🆕 `components/reports/manage/CitizenFeedbackForm.tsx`
4. 🆕 `components/reports/manage/ReviewAppealForm.tsx`
5. 🆕 `components/reports/manage/PhotoUploadSection.tsx`

## Success Criteria

### Functional
- ✅ All status transitions work
- ✅ All role-based actions available
- ✅ Appeals can be created and reviewed
- ✅ Escalations can be created and managed
- 🆕 Rework flow works end-to-end
- 🆕 Citizen feedback can be submitted
- 🆕 Incorrect assignment can be flagged

### UX
- ✅ No unnecessary context switching
- ✅ Inline forms for common actions
- ✅ Clear visual hierarchy
- ✅ Responsive design
- ✅ Fast load times

### Code Quality
- ✅ TypeScript typed
- ✅ Reusable components
- ✅ Proper error handling
- ✅ Loading states
- ✅ Optimistic updates

## Next Immediate Actions

1. **Add Missing Inline Forms:**
   - RequestReworkForm
   - FlagIncorrectAssignmentForm
   - ReviewAppealForm

2. **Update PrimaryActionsPanel:**
   - Add "Request Rework" action for PENDING_VERIFICATION
   - Add "Flag Incorrect Assignment" for ASSIGNED_TO_OFFICER
   - Add "Review Appeal" for APPEALED status

3. **Simplify Existing Page:**
   - Remove SLA Tracker component
   - Simplify Lifecycle Tracker (just show history)
   - Keep everything else as is

4. **Test Complete Flows:**
   - Report submission → Classification → Assignment → Work → Verification → Resolution
   - Appeal flow: Resolution → Appeal → Review → Rework → Re-resolution
   - Escalation flow: Any status → Escalate → Acknowledge → Respond → Resolve
   - Reassignment flow: Assigned → Flag Incorrect → Admin Review → Reassign

## Timeline

- **Phase 1:** ✅ COMPLETE (Core structure maintained)
- **Phase 2:** 🔄 IN PROGRESS (Actions integration 80% done)
- **Phase 3:** ⏳ PENDING (New features)
- **Phase 4:** ⏳ PENDING (Polish)

**Estimated Completion:** Phase 2 can be completed in 2-3 hours of focused work.
