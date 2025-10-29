# 🎯 Report Interfaces Standardization Plan

**Date:** October 25, 2025  
**Objective:** Standardize, rationalize, and make consistent all report viewing/editing interfaces

---

## 📊 **Current State Analysis**

### **Three Different Interfaces:**

#### **1. `/dashboard/reports/manage` Page** (Full Page)
**Purpose:** Comprehensive report management dashboard  
**File:** `src/app/dashboard/reports/manage/page.tsx`  
**Features:**
- Dashboard overview with stats
- Multiple tabs (All, Pending Review, Appeals, Escalations, Manage, Archived)
- Section filters (All, Needs Review, Critical, High, In Progress, etc.)
- Recent activity feed
- Create new report button

**Issues:**
- ❌ Different layout from other interfaces
- ❌ No direct report details view
- ❌ Redirects to `/dashboard/reports/manage/[id]` for details
- ❌ Inconsistent with modal-based workflows

---

#### **2. "Report Details" Modal** (from Reports Page)
**Purpose:** Quick view of report details  
**File:** `src/components/reports/ReportDetail.tsx`  
**Features:**
- Full report information display
- Status badges
- Location details
- Assignment information
- Export PDF button (now with 3 levels)
- Admin actions (if admin)

**Issues:**
- ❌ Read-only view, limited editing
- ❌ Different structure from ManageReportModal
- ❌ Inconsistent action buttons

---

#### **3. "Manage Report" Modal** (Quick Edit from Three-Dot Menu)
**Purpose:** Quick edit/manage report  
**File:** `src/components/reports/ManageReportModal.tsx`  
**Features:**
- 3-step wizard (Categorize → Assign Department → Assign Officer)
- Category and severity selection
- Department assignment
- Officer assignment with priority
- Notes for each step

**Issues:**
- ❌ Different UI from ReportDetail
- ❌ Wizard-based vs single-page
- ❌ Limited information display
- ❌ No export functionality

---

## 🎯 **Standardization Goals**

### **1. Consistent Layout**
- ✅ Same header structure across all interfaces
- ✅ Same section organization
- ✅ Same badge styling
- ✅ Same action button placement

### **2. Reusable Components**
- ✅ Shared report header component
- ✅ Shared report info sections
- ✅ Shared action buttons
- ✅ Shared export functionality

### **3. Consistent Functionality**
- ✅ All interfaces should have export PDF (3 levels)
- ✅ All interfaces should show activity history
- ✅ All interfaces should have consistent actions
- ✅ All interfaces should follow same data flow

### **4. Professional Design**
- ✅ Consistent spacing and typography
- ✅ Same color scheme
- ✅ Same icon usage
- ✅ Same loading states

---

## 📋 **Proposed Structure**

### **Shared Components to Create:**

#### **1. `ReportHeader` Component**
```tsx
interface ReportHeaderProps {
  report: Report;
  showExportButton?: boolean;
  showActionsButton?: boolean;
  onExport?: (level: 'summary' | 'standard' | 'comprehensive') => void;
  onAction?: (action: string) => void;
}

export function ReportHeader({ report, showExportButton, showActionsButton, onExport, onAction }: ReportHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-gray-900">
            {report.report_number || `CL-${report.id}`}
          </h2>
          <Badge status={report.status} size="md" />
          <Badge status={report.severity} size="md" />
        </div>
        <p className="text-sm text-gray-500">
          Reported on {formatDate(report.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {showExportButton && <ExportPDFButton onExport={onExport} />}
        {showActionsButton && <ActionsButton onAction={onAction} />}
      </div>
    </div>
  );
}
```

#### **2. `ReportInfoSection` Component**
```tsx
interface ReportInfoSectionProps {
  report: Report;
  showFullDetails?: boolean;
}

export function ReportInfoSection({ report, showFullDetails }: ReportInfoSectionProps) {
  return (
    <div className="space-y-6">
      <BasicInfo report={report} />
      <LocationInfo report={report} />
      {showFullDetails && (
        <>
          <ClassificationInfo report={report} />
          <AssignmentInfo report={report} />
        </>
      )}
    </div>
  );
}
```

#### **3. `ReportActions` Component**
```tsx
interface ReportActionsProps {
  report: Report;
  onUpdate: () => void;
  compact?: boolean;
}

export function ReportActions({ report, onUpdate, compact }: ReportActionsProps) {
  return (
    <div className={compact ? "flex gap-2" : "grid grid-cols-2 gap-3"}>
      <ActionButton icon={<Edit />} label="Edit Details" onClick={() => {}} />
      <ActionButton icon={<Status />} label="Change Status" onClick={() => {}} />
      <ActionButton icon={<Department />} label="Assign Department" onClick={() => {}} />
      <ActionButton icon={<Officer />} label="Assign Officer" onClick={() => {}} />
      <ActionButton icon={<Escalate />} label="Escalate" onClick={() => {}} />
    </div>
  );
}
```

#### **4. `ExportPDFButton` Component**
```tsx
interface ExportPDFButtonProps {
  onExport: (level: 'summary' | 'standard' | 'comprehensive') => void;
}

export function ExportPDFButton({ onExport }: ExportPDFButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <div className="relative">
      <button onClick={() => setShowMenu(!showMenu)}>
        <Download /> Export PDF <ChevronDown />
      </button>
      {showMenu && (
        <div className="dropdown-menu">
          <button onClick={() => { onExport('summary'); setShowMenu(false); }}>
            Summary - Citizen-facing
          </button>
          <button onClick={() => { onExport('standard'); setShowMenu(false); }}>
            Standard - Internal use
          </button>
          <button onClick={() => { onExport('comprehensive'); setShowMenu(false); }}>
            Comprehensive - Audit/compliance
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 **Refactoring Plan**

### **Phase 1: Create Shared Components** ✅
1. Create `src/components/reports/shared/ReportHeader.tsx`
2. Create `src/components/reports/shared/ReportInfoSection.tsx`
3. Create `src/components/reports/shared/ReportActions.tsx`
4. Create `src/components/reports/shared/ExportPDFButton.tsx`
5. Create `src/components/reports/shared/index.ts` for exports

### **Phase 2: Update ReportDetail Component** ✅
1. Replace custom header with `ReportHeader`
2. Replace custom sections with `ReportInfoSection`
3. Replace export button with `ExportPDFButton`
4. Add `ReportActions` for admin users
5. Add Activity History tab

### **Phase 3: Update ManageReportModal** ✅
1. Add `ReportHeader` at top
2. Keep wizard steps but add info display
3. Add `ExportPDFButton`
4. Add Activity History section
5. Standardize button styles

### **Phase 4: Update Manage Page** ✅
1. Add quick view modal using `ReportDetail`
2. Standardize table row actions
3. Add consistent export functionality
4. Improve navigation flow

---

## 📐 **Standardized Layout**

### **All Interfaces Should Have:**

```
┌─────────────────────────────────────────────────────┐
│ Report Header (Number, Badges, Actions)            │
│ ┌─────────────────────────────────────────────────┐ │
│ │ CL-2025-RNC-00016  [Status] [Severity]         │ │
│ │ Reported on Oct 25, 2025                        │ │
│ │                           [Export PDF ▼] [⚙️]   │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Tabs / Sections                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Details] [Classification] [Assignment]         │ │
│ │ [Resolution] [Activity History]                 │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Content Area                                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Report Information                              │ │
│ │ • Title                                         │ │
│ │ • Description                                   │ │
│ │ • Category                                      │ │
│ │                                                 │ │
│ │ Location Details                                │ │
│ │ • Address                                       │ │
│ │ • Coordinates                                   │ │
│ │                                                 │ │
│ │ Assignment Details                              │ │
│ │ • Department                                    │ │
│ │ • Officer                                       │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Actions (if applicable)                             │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Edit] [Change Status] [Assign] [Escalate]     │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## ✅ **Benefits of Standardization**

### **1. Code Reusability**
- ✅ Shared components reduce duplication
- ✅ Easier to maintain
- ✅ Consistent bug fixes across all interfaces

### **2. User Experience**
- ✅ Predictable interface
- ✅ Faster learning curve
- ✅ Professional appearance

### **3. Development Speed**
- ✅ Faster to add new features
- ✅ Easier to test
- ✅ Better code organization

### **4. Maintainability**
- ✅ Single source of truth
- ✅ Easier refactoring
- ✅ Better documentation

---

## 📝 **Implementation Checklist**

### **Shared Components:**
- [ ] Create `ReportHeader` component
- [ ] Create `ReportInfoSection` component
- [ ] Create `ReportActions` component
- [ ] Create `ExportPDFButton` component
- [ ] Create shared utilities and types

### **Update Existing Components:**
- [ ] Refactor `ReportDetail.tsx` to use shared components
- [ ] Refactor `ManageReportModal.tsx` to use shared components
- [ ] Update `/dashboard/reports/manage` page
- [ ] Update `/dashboard/reports/manage/[id]` page

### **Testing:**
- [ ] Test all interfaces for consistency
- [ ] Test export functionality in all locations
- [ ] Test actions in all locations
- [ ] Test responsive design

### **Documentation:**
- [ ] Document shared components
- [ ] Update component usage guide
- [ ] Create migration guide

---

## 🎯 **Success Criteria**

✅ All three interfaces use the same shared components  
✅ Consistent header, badges, and action buttons  
✅ Export PDF works the same everywhere  
✅ Activity History available in all interfaces  
✅ Same visual design and spacing  
✅ Code duplication reduced by >60%  
✅ User experience is predictable and professional  

---

**Next Step:** Create shared components and begin refactoring! 🚀
