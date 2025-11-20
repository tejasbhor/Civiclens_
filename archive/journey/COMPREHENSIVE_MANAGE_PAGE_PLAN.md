# Comprehensive Manage Report Page - Implementation Plan

## Overview
Create `/dashboard/reports/manage/[id]` - A complete, production-ready page for managing every aspect of a single report from start to finish.

## Based on Existing Working Implementation

### ✅ Already Working Features (From `/dashboard/reports/page.tsx`)
1. **Actions Dropdown** with:
   - View on Map
   - Manage Report (redirects to manage page)
   - Quick Edit (ManageReportModal)
   - Assign Department
   - Assign Officer
   - Copy Report Link
   - Export as PDF (3 levels)

2. **Status Transitions** - Validated transitions
3. **Bulk Operations** - With password confirmation
4. **Filters** - Status, category, severity, department, search
5. **Pagination** - 20 per page
6. **Real-time Stats** - Total, pending, resolved, critical, etc.

### 📋 Page Structure (60/40 Split)

```
┌────────────────────────────────────────────────────────────┐
│ [← Back] Report #CL-2025-RNC-00016        [Edit] [Actions] │
├────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┬───────────────────────────────┐  │
│ │ LEFT (60%)           │ RIGHT (40%)                   │  │
│ │                      │                               │  │
│ │ Report Details       │ Quick Actions                 │  │
│ │ Photos               │ Workflow Progress             │  │
│ │ Location             │ Timeline                      │  │
│ │ Citizen Info         │ Related Items                 │  │
│ │                      │ Internal Notes                │  │
│ │ Tabbed Interface:    │                               │  │
│ │ - Primary Actions    │                               │  │
│ │ - Appeals            │                               │  │
│ │ - Audit Log          │                               │  │
│ └──────────────────────┴───────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Analyze Existing Page Structure ✅
**File:** `app/dashboard/reports/manage/[id]/page.tsx` (already exists)

**Current State:**
- Has basic structure with sidebar + main content
- Uses existing components: LifecycleTracker, PrimaryActionsPanel, AppealsEscalationsSection
- Missing: Comprehensive details, better layout, all features

### Step 2: Create Enhanced Layout Components

#### A. Header Component
```tsx
<ReportHeader 
  report={report}
  onEdit={() => setShowEditModal(true)}
  onExport={handleExport}
  onBack={() => router.back()}
/>
```

**Features:**
- Report number + badges (status, severity)
- Quick actions dropdown
- Back button
- Edit button

#### B. Left Panel - Report Details
```tsx
<ReportDetailsPanel report={report}>
  <ReportOverview />
  <PhotoGallery photos={report.photos} />
  <LocationCard location={report.location} />
  <CitizenInfo citizen={report.user} />
  <TabbedInterface>
    <PrimaryActionsTab />
    <AppealsTab />
    <AuditLogTab />
  </TabbedInterface>
</ReportDetailsPanel>
```

#### C. Right Panel - Action Center
```tsx
<ActionCenterPanel report={report}>
  <QuickActionsCard />
  <WorkflowProgress status={report.status} history={history} />
  <ActivityTimeline events={history} />
  <RelatedItems reportId={report.id} />
  <InternalNotes reportId={report.id} />
</ActionCenterPanel>
```

### Step 3: Integrate Existing Working Features

#### From Reports Page (`page.tsx`)
1. **ManageReportModal** - 3-step wizard (Classify → Assign Dept → Assign Officer)
2. **Status Transitions** - Validated status changes
3. **Assignment Dialogs** - Department & Officer assignment
4. **PDF Export** - 3 levels (Summary, Standard, Comprehensive)
5. **Map Preview** - Location visualization

#### From Manage Components (Already Created)
1. **PrimaryActionsPanel** - Context-aware actions
2. **AppealsEscalationsSection** - Appeals & escalations management
3. **LifecycleTracker** - Status history timeline
4. **InlineActionForms** - Classify, Assign Dept, Assign Officer, Add Update
5. **AdditionalActionForms** - Request Rework, Flag Incorrect, Citizen Feedback

### Step 4: New Components to Create

#### 1. ReportOverview Component
```tsx
<ReportOverview report={report}>
  - Title (editable inline)
  - Description (expandable)
  - Category + Sub-category
  - AI Classification info (confidence, suggestions)
  - Manual override indicator
  - Tags/Labels
</ReportOverview>
```

#### 2. PhotoGallery Component
```tsx
<PhotoGallery photos={photos}>
  - Thumbnail grid
  - Lightbox view
  - Download all button
  - Upload more (if allowed)
  - Before/After comparison
</PhotoGallery>
```

#### 3. LocationCard Component
```tsx
<LocationCard location={location}>
  - Coordinates
  - Address
  - Ward/District
  - View on Map button
  - Nearby reports
</LocationCard>
```

#### 4. CitizenInfo Component
```tsx
<CitizenInfo citizen={user}>
  - Name, Phone, Email
  - Reputation score
  - Previous reports count
  - Contact button
  - View profile link
</CitizenInfo>
```

#### 5. WorkflowProgress Component
```tsx
<WorkflowProgress status={status} history={history}>
  - Visual step indicator
  - Completed steps (✅)
  - Current step (⏳)
  - Future steps (○)
  - Skip to step dropdown
  - Time spent per step
</WorkflowProgress>
```

#### 6. ActivityTimeline Component
```tsx
<ActivityTimeline events={history}>
  - Chronological list
  - User avatars
  - Action descriptions
  - Timestamps
  - Load more button
</ActivityTimeline>
```

#### 7. RelatedItems Component
```tsx
<RelatedItems reportId={id}>
  - Similar reports (nearby)
  - Same category reports
  - Department info
  - Assigned officer info
  - Related tasks
</RelatedItems>
```

#### 8. InternalNotes Component
```tsx
<InternalNotes reportId={id}>
  - Add note textarea
  - Save button
  - Previous notes list
  - Admin-only visibility indicator
</InternalNotes>
```

#### 9. QuickActionsCard Component
```tsx
<QuickActionsCard report={report}>
  - Edit Report
  - View on Map
  - Assign Officer
  - Change Department
  - Send Update to Citizen
  - Create Task
  - Copy Link
  - Export PDF
  - Delete Report
</QuickActionsCard>
```

### Step 5: Tabbed Interface Implementation

#### Tab 1: Primary Actions
**Content:**
- Classification section (category, severity, AI info)
- Department assignment (current, available, change)
- Officer assignment (list with workload, auto-assign)
- Task management (status, timeline)
- Quick actions (duplicate, flag, escalate, close)

**Uses:**
- `PrimaryActionsPanel` (already created)
- `ClassifyReportForm` (already created)
- `AssignDepartmentForm` (already created)
- `AssignOfficerForm` (already created)

#### Tab 2: Appeals & Escalations
**Content:**
- Appeals status (count, last appeal)
- Appeal history (list of all appeals)
- Escalation settings (auto-escalate triggers)
- Manual escalation buttons
- Notes & comments (internal + citizen-visible)

**Uses:**
- `AppealsEscalationsSection` (already created)

#### Tab 3: Audit Log
**Content:**
- Complete activity log (all actions, changes, updates)
- System metadata (IDs, timestamps, versions)
- Raw JSON view
- Export log button

**Uses:**
- `ActivityHistory` component (already exists)
- Backend: `GET /audit/resource/report/{id}`

### Step 6: API Integration

#### Endpoints to Use
```typescript
// Reports
GET /reports/{id} - Get full report details
PUT /reports/{id} - Update report
PUT /reports/{id}/classify - Classify report
POST /reports/{id}/assign-department - Assign department
POST /reports/{id}/assign-officer - Assign officer
POST /reports/{id}/status - Update status
POST /reports/{id}/acknowledge - Acknowledge
POST /reports/{id}/start-work - Start work
GET /reports/{id}/status-history - Get history

// Appeals
GET /appeals?limit=100 - Get all appeals (filter on frontend)
POST /appeals - Create appeal
POST /appeals/{id}/review - Review appeal

// Escalations
GET /escalations?limit=100 - Get all escalations (filter on frontend)
POST /escalations - Create escalation
POST /escalations/{id}/acknowledge - Acknowledge
POST /escalations/{id}/update - Update

// Audit
GET /audit/resource/report/{id} - Get audit logs

// Departments
GET /departments - List all departments

// Users
GET /users?per_page=100 - List all users (for officer selection)
```

### Step 7: State Management

```typescript
// Main state
const [report, setReport] = useState<Report | null>(null);
const [history, setHistory] = useState<StatusHistoryResponse | null>(null);
const [appeals, setAppeals] = useState<Appeal[]>([]);
const [escalations, setEscalations] = useState<Escalation[]>([]);
const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
const [loading, setLoading] = useState(true);

// UI state
const [activeTab, setActiveTab] = useState<'actions' | 'appeals' | 'audit'>('actions');
const [showEditModal, setShowEditModal] = useState(false);
const [showMapPreview, setShowMapPreview] = useState(false);
const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

// Load functions
const loadReport = async () => { ... };
const loadHistory = async () => { ... };
const loadAppeals = async () => { ... };
const loadEscalations = async () => { ... };
const loadAuditLogs = async () => { ... };
```

### Step 8: Responsive Design

#### Desktop (>= 1024px)
- 60/40 split (left/right panels)
- All features visible
- Sidebar sticky

#### Tablet (768px - 1023px)
- 50/50 split
- Collapsible sidebar
- Tabs for mobile

#### Mobile (< 768px)
- Single column
- Stacked layout
- Bottom navigation
- Swipeable tabs

## File Structure

```
app/dashboard/reports/manage/[id]/
├── page.tsx (main page - ENHANCE EXISTING)
│
components/reports/manage/
├── index.ts (exports)
├── ReportHeader.tsx (NEW)
├── ReportDetailsPanel.tsx (NEW)
├── ActionCenterPanel.tsx (NEW)
├── ReportOverview.tsx (NEW)
├── PhotoGallery.tsx (NEW)
├── LocationCard.tsx (NEW)
├── CitizenInfo.tsx (NEW)
├── WorkflowProgress.tsx (NEW)
├── ActivityTimeline.tsx (NEW)
├── RelatedItems.tsx (NEW)
├── InternalNotes.tsx (NEW)
├── QuickActionsCard.tsx (NEW)
├── TabbedInterface.tsx (NEW)
│
├── LifecycleTracker.tsx (✅ EXISTS)
├── PrimaryActionsPanel.tsx (✅ EXISTS)
├── AppealsEscalationsSection.tsx (✅ EXISTS)
├── InlineActionForms.tsx (✅ EXISTS)
└── AdditionalActionForms.tsx (✅ EXISTS)
```

## Implementation Priority

### Phase 1: Core Structure (Immediate)
1. ✅ Enhance existing page layout (60/40 split)
2. ✅ Add ReportHeader component
3. ✅ Add ReportOverview component
4. ✅ Add LocationCard component
5. ✅ Add CitizenInfo component

### Phase 2: Action Center (Next)
1. ✅ Add QuickActionsCard component
2. ✅ Add WorkflowProgress component
3. ✅ Add ActivityTimeline component
4. ✅ Integrate existing PrimaryActionsPanel

### Phase 3: Advanced Features (Then)
1. ✅ Add PhotoGallery component
2. ✅ Add RelatedItems component
3. ✅ Add InternalNotes component
4. ✅ Add TabbedInterface component

### Phase 4: Polish (Finally)
1. ✅ Responsive design
2. ✅ Loading states
3. ✅ Error handling
4. ✅ Accessibility
5. ✅ Performance optimization

## Success Criteria

### Functional
- ✅ All existing features work
- ✅ All status transitions validated
- ✅ All actions integrated with backend
- ✅ Real-time updates
- ✅ No data loss

### UX
- ✅ Intuitive layout
- ✅ Fast load times (< 2s)
- ✅ Smooth transitions
- ✅ Clear visual hierarchy
- ✅ Responsive on all devices

### Code Quality
- ✅ TypeScript typed
- ✅ Reusable components
- ✅ Proper error handling
- ✅ Loading states
- ✅ Clean code

## Next Steps

1. **Review this plan** - Confirm approach
2. **Start Phase 1** - Enhance existing page
3. **Test incrementally** - After each component
4. **Deploy progressively** - Phase by phase

**Estimated Time:** 4-6 hours for complete implementation

**Status:** Ready to begin! 🚀
