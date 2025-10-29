# Manage Report Page - Comprehensive Design

## Design Philosophy

**Goal**: Create a single-page command center for managing the entire report lifecycle with minimal context switching, maximum visibility, and intuitive workflows.

**Principles**:
1. **Progressive Disclosure**: Show what's relevant now, hide what's not
2. **Action-Oriented**: Every section should enable immediate action
3. **Status-Aware**: UI adapts based on current report state
4. **Accountability**: Clear visibility of who did what and when
5. **Urgency-Aware**: Visual cues for time-sensitive items

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ STICKY HEADER: Report Number | Status | Severity | Actions     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────────────────────────────┬───────────────────────────┐ │
│ │ MAIN CONTENT (70%)              │ SIDEBAR (30%)             │ │
│ │                                 │                           │ │
│ │ ┌─────────────────────────────┐ │ ┌───────────────────────┐ │ │
│ │ │ SLA ALERT BANNER (if urgent)│ │ │ CITIZEN INFO          │ │ │
│ │ └─────────────────────────────┘ │ │ • Name, Phone         │ │ │
│ │                                 │ │ • Contact Button      │ │ │
│ │ ┌─────────────────────────────┐ │ └───────────────────────┘ │ │
│ │ │ LIFECYCLE PROGRESS          │ │                           │ │
│ │ │ • Visual timeline           │ │ ┌───────────────────────┐ │ │
│ │ │ • Current stage highlighted │ │ │ LOCATION              │ │ │
│ │ │ • Next action indicator     │ │ │ • Address             │ │ │
│ │ └─────────────────────────────┘ │ │ • Coordinates         │ │ │
│ │                                 │ │ • Map (optional)      │ │ │
│ │ ┌─────────────────────────────┐ │ └───────────────────────┘ │ │
│ │ │ PRIMARY ACTIONS             │ │                           │ │
│ │ │ • Context-aware buttons     │ │ ┌───────────────────────┐ │ │
│ │ │ • Inline forms (expandable) │ │ │ METADATA              │ │ │
│ │ └─────────────────────────────┘ │ │ • Created             │ │ │
│ │                                 │ │ • Updated             │ │ │
│ │ ┌─────────────────────────────┐ │ │ • Age                 │ │ │
│ │ │ APPEALS & ESCALATIONS       │ │ │ • Report Number       │ │ │
│ │ │ • Active appeals list       │ │ └───────────────────────┘ │ │
│ │ │ • Active escalations list   │ │                           │ │
│ │ │ • Create new buttons        │ │ ┌───────────────────────┐ │ │
│ │ └─────────────────────────────┘ │ │ QUICK ACTIONS         │ │ │
│ │                                 │ │ • Export PDF          │ │ │
│ │ ┌─────────────────────────────┐ │ │ • Mark as Spam        │ │ │
│ │ │ TABBED DETAILS              │ │ │ • Mark as Duplicate   │ │ │
│ │ │ [Details|Classification|    │ │ └───────────────────────┘ │ │
│ │ │  Assignment|Resolution|     │ │                           │ │
│ │ │  History|Audit]             │ │ ┌───────────────────────┐ │ │
│ │ └─────────────────────────────┘ │ │ PHOTOS (if any)       │ │ │
│ │                                 │ │ • Gallery             │ │ │
│ └─────────────────────────────────┘ └───────────────────────┘ │ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Sticky Header
**Purpose**: Always-visible context and quick actions

**Elements**:
- Back button
- Report number (large, bold)
- Status badge (color-coded)
- Severity badge (color-coded)
- Export PDF dropdown
- Actions dropdown (administrative actions)

**Behavior**:
- Stays fixed at top on scroll
- Badges update in real-time when status changes

### 2. SLA Alert Banner
**Purpose**: Urgent visibility for time-sensitive reports

**Conditions**:
- Show if SLA is breached or within 20% of deadline
- Show if escalation is overdue

**Design**:
- Red background for breached
- Yellow background for warning
- Includes countdown timer
- Dismissible but reappears on refresh if still urgent

### 3. Lifecycle Progress
**Purpose**: Visual representation of report journey

**Elements**:
- Horizontal timeline with stages
- Completed stages (green checkmark)
- Current stage (blue, pulsing)
- Future stages (gray)
- Status history below (collapsible)

**Interactions**:
- Click stage to see details
- Hover to see timestamp and user

### 4. Primary Actions Panel
**Purpose**: Context-aware action center

**Behavior**:
- Shows 2-4 primary actions based on current status
- Expandable inline forms for quick actions
- Success/error feedback inline

**Action Categories**:

#### Status: RECEIVED
- **Classify Report** (inline form)
- **Assign to Department** (inline form)

#### Status: CLASSIFIED
- **Assign to Department** (inline form)
- **Reclassify** (inline form)

#### Status: ASSIGNED_TO_DEPARTMENT
- **Assign to Officer** (inline form)
- **Reassign Department** (inline form)

#### Status: ASSIGNED_TO_OFFICER
- **Acknowledge** (button - auto-transitions)
- **Reassign Officer** (inline form)

#### Status: ACKNOWLEDGED
- **Start Work** (button - auto-transitions)
- **Request Support** (inline form)
- **Put on Hold** (inline form)

#### Status: IN_PROGRESS
- **Mark for Verification** (button)
- **Add Update** (inline form)
- **Request Support** (inline form)
- **Put on Hold** (inline form)

#### Status: PENDING_VERIFICATION
- **Mark as Resolved** (inline form)
- **Request Rework** (inline form)
- **Reject** (inline form)

#### Status: ON_HOLD
- **Resume Work** (button)
- **Reassign** (inline form)

#### Status: RESOLVED
- **Reopen** (inline form)
- **Export Report** (button)

### 5. Appeals & Escalations Section
**Purpose**: Manage appeals and escalations for this report

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Appeals & Escalations                                   │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────────┐ │
│ │ APPEALS (2)         │ │ ESCALATIONS (1)             │ │
│ │                     │ │                             │ │
│ │ • Appeal #123       │ │ • ESC-001 [OVERDUE]         │ │
│ │   Type: Resolution  │ │   Level: Manager            │ │
│ │   Status: Submitted │ │   Status: Acknowledged      │ │
│ │   [Review]          │ │   [Respond]                 │ │
│ │                     │ │                             │ │
│ │ • Appeal #122       │ │ [+ Create Escalation]       │ │
│ │   Type: Assignment  │ │                             │ │
│ │   Status: Approved  │ │                             │ │
│ │                     │ │                             │ │
│ │ [+ Create Appeal]   │ │                             │ │
│ └─────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Inline create forms (expandable)
- Quick review/response actions
- Status indicators with colors
- Overdue badges for escalations

### 6. Tabbed Details
**Purpose**: Organized information display

**Tabs**:
1. **Details**: Title, description, category, sub-category
2. **Classification**: Category, severity, classification notes
3. **Assignment**: Department, officer, task details
4. **Resolution**: Resolution notes, verification status
5. **History**: Status change timeline with users
6. **Audit**: Full audit log with filters

## Inline Action Components

### ClassifyReportForm
```tsx
<form>
  <select name="category">
    <option>Infrastructure</option>
    <option>Public Safety</option>
    ...
  </select>
  <select name="severity">
    <option>Low</option>
    <option>Medium</option>
    <option>High</option>
    <option>Critical</option>
  </select>
  <textarea name="notes" placeholder="Classification notes..."></textarea>
  <button type="submit">Classify</button>
  <button type="button">Cancel</button>
</form>
```

### AssignDepartmentForm
```tsx
<form>
  <select name="department_id">
    <option>Public Works</option>
    <option>Sanitation</option>
    ...
  </select>
  <textarea name="notes" placeholder="Assignment notes..."></textarea>
  <button type="submit">Assign</button>
  <button type="button">Cancel</button>
</form>
```

### AssignOfficerForm
```tsx
<form>
  <select name="officer_user_id">
    <option>John Doe (john@example.com)</option>
    <option>Jane Smith (jane@example.com)</option>
    ...
  </select>
  <select name="priority">
    <option>1 - Lowest</option>
    ...
    <option>10 - Highest</option>
  </select>
  <textarea name="notes" placeholder="Assignment notes..."></textarea>
  <button type="submit">Assign</button>
  <button type="button">Cancel</button>
</form>
```

### CreateAppealForm
```tsx
<form>
  <select name="appeal_type">
    <option>Incorrect Assignment</option>
    <option>Resolution Quality</option>
    <option>Status Change</option>
    <option>Department Change</option>
    <option>Officer Change</option>
  </select>
  <textarea name="reason" placeholder="Reason for appeal..." required></textarea>
  <textarea name="evidence" placeholder="Supporting evidence (optional)"></textarea>
  <input name="requested_action" placeholder="Requested action (optional)"></input>
  <button type="submit">Submit Appeal</button>
  <button type="button">Cancel</button>
</form>
```

### CreateEscalationForm
```tsx
<form>
  <select name="level">
    <option>Supervisor</option>
    <option>Manager</option>
    <option>Director</option>
    <option>Executive</option>
  </select>
  <select name="reason">
    <option>SLA Breach</option>
    <option>Resource Constraint</option>
    <option>Technical Issue</option>
    <option>Policy Clarification</option>
    <option>Citizen Complaint</option>
  </select>
  <textarea name="description" placeholder="Describe the issue..." required></textarea>
  <textarea name="previous_actions" placeholder="Actions taken so far..."></textarea>
  <textarea name="urgency_notes" placeholder="Urgency notes..."></textarea>
  <select name="escalated_to_user_id">
    <option>Auto-assign</option>
    <option>Manager 1</option>
    <option>Manager 2</option>
  </select>
  <input type="number" name="sla_hours" placeholder="SLA hours" value="24"></input>
  <button type="submit">Escalate</button>
  <button type="button">Cancel</button>
</form>
```

## Color Scheme & Visual Indicators

### Status Colors
- **Received**: Gray (#6B7280)
- **Classified**: Blue (#3B82F6)
- **Assigned**: Purple (#8B5CF6)
- **Acknowledged**: Cyan (#06B6D4)
- **In Progress**: Yellow (#F59E0B)
- **Pending Verification**: Orange (#F97316)
- **Resolved**: Green (#10B981)
- **Rejected**: Red (#EF4444)
- **On Hold**: Gray (#9CA3AF)

### Severity Colors
- **Low**: Green (#10B981)
- **Medium**: Yellow (#F59E0B)
- **High**: Orange (#F97316)
- **Critical**: Red (#EF4444)

### Alert Colors
- **SLA Warning**: Yellow background (#FEF3C7)
- **SLA Breach**: Red background (#FEE2E2)
- **Success**: Green background (#D1FAE5)
- **Info**: Blue background (#DBEAFE)

## Responsive Behavior

### Desktop (>1024px)
- Full layout as designed
- Sidebar visible
- Inline forms expand in place

### Tablet (768px - 1024px)
- Sidebar moves below main content
- Reduced padding
- Forms still inline

### Mobile (<768px)
- Single column layout
- Sidebar sections as cards
- Forms open as bottom sheets
- Sticky header collapses to minimal view

## Accessibility

- **Keyboard Navigation**: All actions accessible via keyboard
- **Screen Readers**: Proper ARIA labels and roles
- **Color Contrast**: WCAG AA compliant
- **Focus Indicators**: Clear focus states
- **Error Messages**: Descriptive and actionable

## Performance Considerations

- **Lazy Loading**: Load appeals/escalations on demand
- **Optimistic Updates**: Show changes immediately, rollback on error
- **Debounced Saves**: For inline edits
- **Cached Data**: Cache department/officer lists
- **Progressive Enhancement**: Core functionality works without JS
