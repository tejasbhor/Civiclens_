# Manage Report Page - Backend Endpoint Analysis

## Available Backend Endpoints

### Reports API (`/api/v1/reports`)

#### Core CRUD Operations
- `POST /` - Create report
- `GET /` - List reports (paginated, filtered)
- `GET /my-reports` - Get current user's reports
- `GET /{report_id}` - Get report with full details
- `PUT /{report_id}` - Update report
- `DELETE /{report_id}` - Delete report

#### Classification & Assignment
- `PUT /{report_id}/classify` - Manually classify report (category, severity, notes)
- `POST /{report_id}/assign-department` - Assign to department
- `POST /{report_id}/assign-officer` - Assign to officer (creates Task)

#### Status Management
- `POST /{report_id}/status` - Update report status with validation
- `POST /{report_id}/acknowledge` - Auto-acknowledge (ASSIGNED_TO_OFFICER → ACKNOWLEDGED)
- `POST /{report_id}/start-work` - Start work (ACKNOWLEDGED → IN_PROGRESS)
- `GET /{report_id}/history` - Get status history with user details

#### Bulk Operations
- `POST /bulk/status` - Bulk update status
- `POST /bulk/assign-department` - Bulk assign department
- `POST /bulk/assign-officer` - Bulk assign officer
- `POST /bulk/update-severity` - Bulk update severity

### Appeals API (`/api/v1/appeals`)

#### Core Operations
- `POST /` - Create appeal (types: INCORRECT_ASSIGNMENT, RESOLUTION, STATUS_CHANGE, DEPARTMENT_CHANGE, OFFICER_CHANGE)
- `GET /` - List appeals (filtered by status, type)
- `GET /stats` - Get appeal statistics
- `GET /{appeal_id}` - Get appeal by ID

#### Review & Actions
- `POST /{appeal_id}/review` - Review appeal (approve/reject)
  - Handles reassignment (user/department)
  - Handles rework requirements
  - Updates report status accordingly
- `POST /{appeal_id}/complete-rework` - Mark rework as complete
- `DELETE /{appeal_id}` - Withdraw appeal (submitter only)

### Escalations API (`/api/v1/escalations`)

#### Core Operations
- `POST /` - Create escalation (levels: SUPERVISOR, MANAGER, DIRECTOR, EXECUTIVE)
- `GET /` - List escalations (filtered by status, level, overdue)
- `GET /stats` - Get escalation statistics
- `GET /{escalation_id}` - Get escalation by ID

#### Management
- `POST /{escalation_id}/acknowledge` - Acknowledge escalation
- `POST /{escalation_id}/update` - Update escalation status (with response notes, action taken)
- `POST /check-overdue` - Check and mark overdue escalations

## Current Page Structure Issues

### Problems Identified
1. **Layout**: Two-column card layout doesn't effectively utilize space
2. **Workflow Visibility**: Lifecycle stages are visible but actions are scattered
3. **Context Switching**: Users need to open multiple modals for related actions
4. **Information Hierarchy**: Important information (SLA, urgency) not prominent enough
5. **Appeal/Escalation Integration**: No visibility or quick access to appeals/escalations for this report

## Proposed Improvements

### 1. Unified Action Panel
- Context-aware action buttons based on report status
- Inline forms for quick actions (no modal for simple operations)
- Grouped actions by category (Status, Assignment, Communication, Administrative)

### 2. Appeals & Escalations Section
- Show active appeals for this report
- Show active escalations for this report
- Quick create buttons with inline forms
- Status indicators and timelines

### 3. Enhanced Information Architecture
- **Hero Section**: Report overview with key metrics (SLA status, age, severity)
- **Lifecycle Tracker**: Visual progress with next actions
- **Action Center**: Context-aware primary actions
- **Details Tabs**: Organized information (Details, Classification, Assignment, Resolution, Appeals, Escalations, Audit)
- **Sidebar**: Citizen info, location, metadata

### 4. Inline Action Components Needed
- **ClassifyReportForm**: Inline classification (category, severity, notes)
- **AssignDepartmentForm**: Department selector with notes
- **AssignOfficerForm**: Officer selector with priority
- **StatusUpdateForm**: Status selector with validation and notes
- **CreateAppealForm**: Appeal type, reason, evidence
- **CreateEscalationForm**: Level, reason, description, urgency
- **AppealReviewForm**: Approve/reject with reassignment options
- **EscalationResponseForm**: Status update with action taken

### 5. Real-time Indicators
- SLA countdown timer
- Overdue escalation badges
- Pending appeal notifications
- Unread status changes

## Implementation Strategy

### Phase 1: Core Workflow Enhancement
1. Redesign layout (single column with sidebar)
2. Implement inline action forms
3. Add appeals/escalations sections
4. Enhance lifecycle tracker with actions

### Phase 2: Advanced Features
1. Real-time updates (WebSocket/polling)
2. Bulk action support from detail page
3. Quick reassignment workflows
4. Enhanced audit trail with filters

### Phase 3: Polish
1. Keyboard shortcuts
2. Action history undo/redo
3. Collaborative features (who's viewing)
4. Export enhancements
