# Production-Grade Manage Report Page - Implementation Plan

## 🎯 Objective
Create a production-ready, comprehensive Manage Report Page that:
- ✅ Follows React/Next.js best practices
- ✅ Properly utilizes ALL backend endpoints
- ✅ Uses the backend's ReportService layer (atomic transactions)
- ✅ Implements proper error handling & loading states
- ✅ Follows TypeScript strict typing
- ✅ Implements accessibility standards
- ✅ Optimizes performance
- ✅ Includes comprehensive audit logging

## 📊 Backend Analysis Summary

### ✅ Available Backend Endpoints (ALL Production-Ready)

#### Reports Service Layer (`ReportService`)
**Atomic Operations with Transaction Management:**
```python
# Single Operations
- classify_report() - Atomic classification with history
- assign_department() - Atomic dept assignment with auto-status update
- assign_officer() - Atomic officer assignment with task creation
- update_status() - Atomic status update with validation
- update_severity() - Atomic severity update with task priority recalc

# Bulk Operations (Transaction-safe)
- bulk_assign_department() - Batch dept assignment
- bulk_assign_officer() - Batch officer assignment
- bulk_update_status() - Batch status updates
- bulk_update_severity() - Batch severity updates
```

#### REST API Endpoints
```typescript
// Core CRUD
POST   /reports                    - Create report
GET    /reports                    - List reports (paginated)
GET    /reports/{id}               - Get report with details
PUT    /reports/{id}               - Update report
DELETE /reports/{id}               - Delete report
GET    /reports/my-reports         - Get user's reports

// Classification & Assignment
PUT    /reports/{id}/classify              - Classify report
POST   /reports/{id}/assign-department     - Assign department
POST   /reports/{id}/assign-officer        - Assign officer

// Status Management
POST   /reports/{id}/status                - Update status
POST   /reports/{id}/acknowledge           - Auto-acknowledge
POST   /reports/{id}/start-work            - Start work
GET    /reports/{id}/history               - Get status history

// Bulk Operations
POST   /reports/bulk/status                - Bulk status update
POST   /reports/bulk/assign-department     - Bulk dept assignment
POST   /reports/bulk/assign-officer        - Bulk officer assignment
POST   /reports/bulk/update-severity       - Bulk severity update

// Appeals & Escalations
GET    /appeals                    - List appeals
POST   /appeals                    - Create appeal
POST   /appeals/{id}/review        - Review appeal
GET    /escalations                - List escalations
POST   /escalations                - Create escalation
POST   /escalations/{id}/acknowledge - Acknowledge escalation
POST   /escalations/{id}/update    - Update escalation

// Audit
GET    /audit/resource/report/{id} - Get audit logs

// Supporting
GET    /departments                - List departments
GET    /users                      - List users (for officer selection)
```

## 🏗️ Architecture & Best Practices

### 1. Component Structure (Atomic Design)

```
pages/
└── dashboard/reports/manage/[id]/
    └── page.tsx (Smart Container)

components/reports/manage/
├── atoms/
│   ├── StatusBadge.tsx
│   ├── SeverityBadge.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorAlert.tsx
│
├── molecules/
│   ├── ReportHeader.tsx
│   ├── QuickActionButton.tsx
│   ├── WorkflowStep.tsx
│   └── TimelineEvent.tsx
│
├── organisms/
│   ├── ReportDetailsPanel.tsx
│   ├── ActionCenterPanel.tsx
│   ├── ReportOverview.tsx
│   ├── PhotoGallery.tsx
│   ├── LocationCard.tsx
│   ├── CitizenInfo.tsx
│   ├── WorkflowProgress.tsx
│   ├── ActivityTimeline.tsx
│   ├── RelatedItems.tsx
│   └── InternalNotes.tsx
│
└── templates/
    └── ManageReportLayout.tsx
```

### 2. State Management Strategy

```typescript
// Use React Query for server state
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys
const reportKeys = {
  all: ['reports'] as const,
  detail: (id: number) => [...reportKeys.all, id] as const,
  history: (id: number) => [...reportKeys.detail(id), 'history'] as const,
  appeals: (id: number) => [...reportKeys.detail(id), 'appeals'] as const,
  escalations: (id: number) => [...reportKeys.detail(id), 'escalations'] as const,
  audit: (id: number) => [...reportKeys.detail(id), 'audit'] as const,
};

// Custom hooks
function useReport(id: number) {
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => reportsApi.getReportById(id),
    staleTime: 30000, // 30 seconds
    retry: 3,
  });
}

function useReportHistory(id: number) {
  return useQuery({
    queryKey: reportKeys.history(id),
    queryFn: () => reportsApi.getStatusHistory(id),
    staleTime: 60000, // 1 minute
  });
}

// Mutations with optimistic updates
function useUpdateStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, notes }: UpdateStatusParams) =>
      reportsApi.updateStatus(id, { new_status: status, notes }),
    onMutate: async (variables) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: reportKeys.detail(variables.id) });
      const previousReport = queryClient.getQueryData(reportKeys.detail(variables.id));
      
      queryClient.setQueryData(reportKeys.detail(variables.id), (old: any) => ({
        ...old,
        status: variables.status,
      }));
      
      return { previousReport };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(reportKeys.detail(variables.id), context?.previousReport);
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: reportKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: reportKeys.history(variables.id) });
    },
  });
}
```

### 3. Error Handling Strategy

```typescript
// Error boundary for component-level errors
class ReportErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to monitoring service (e.g., Sentry)
    console.error('Report page error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// API error handling
function handleApiError(error: AxiosError) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as any;
    
    switch (status) {
      case 400:
        return { type: 'validation', message: data.detail || 'Invalid request' };
      case 403:
        return { type: 'permission', message: 'You do not have permission' };
      case 404:
        return { type: 'notfound', message: 'Report not found' };
      case 422:
        return { type: 'validation', message: data.detail || 'Validation error' };
      case 500:
        return { type: 'server', message: 'Server error. Please try again.' };
      default:
        return { type: 'unknown', message: data.detail || 'An error occurred' };
    }
  } else if (error.request) {
    return { type: 'network', message: 'Network error. Check your connection.' };
  } else {
    return { type: 'unknown', message: 'An unexpected error occurred' };
  }
}
```

### 4. Loading States Strategy

```typescript
// Skeleton loaders for better UX
function ReportDetailsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  );
}

// Progressive loading
function ManageReportPage() {
  const { data: report, isLoading: reportLoading } = useReport(id);
  const { data: history, isLoading: historyLoading } = useReportHistory(id);
  const { data: appeals, isLoading: appealsLoading } = useAppeals(id);
  
  // Show skeleton while loading critical data
  if (reportLoading) {
    return <ReportDetailsSkeleton />;
  }
  
  // Show partial content while loading secondary data
  return (
    <div>
      <ReportDetails report={report} />
      {historyLoading ? <TimelineSkeleton /> : <Timeline history={history} />}
      {appealsLoading ? <AppealsSkeleton /> : <Appeals appeals={appeals} />}
    </div>
  );
}
```

### 5. Performance Optimization

```typescript
// 1. Code splitting
const PhotoGallery = dynamic(() => import('./PhotoGallery'), {
  loading: () => <PhotoGallerySkeleton />,
  ssr: false, // Client-side only for heavy components
});

// 2. Memoization
const ReportOverview = React.memo(({ report }: { report: Report }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.report.id === nextProps.report.id &&
         prevProps.report.updated_at === nextProps.report.updated_at;
});

// 3. Virtual scrolling for long lists
import { FixedSizeList } from 'react-window';

function AuditLogList({ logs }: { logs: AuditLog[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={logs.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <AuditLogItem log={logs[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}

// 4. Debounced search
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    // Search logic
  }, 300),
  []
);
```

### 6. Accessibility (WCAG 2.1 AA)

```typescript
// 1. Semantic HTML
<main role="main" aria-label="Report Management">
  <section aria-labelledby="report-details-heading">
    <h2 id="report-details-heading">Report Details</h2>
    {/* Content */}
  </section>
</main>

// 2. Keyboard navigation
function QuickActionButton({ onClick, label, icon }: Props) {
  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={label}
      className="focus:ring-2 focus:ring-blue-500 focus:outline-none"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// 3. ARIA live regions for dynamic updates
<div role="status" aria-live="polite" aria-atomic="true">
  {updateMessage && <p>{updateMessage}</p>}
</div>

// 4. Skip links
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### 7. TypeScript Best Practices

```typescript
// 1. Strict typing
interface ReportDetailsProps {
  report: Report;
  onUpdate: () => Promise<void>;
  readonly?: boolean;
}

// 2. Discriminated unions for status
type ActionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Report }
  | { status: 'error'; error: Error };

// 3. Generic components
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

function DataTable<T>({ data, columns, onRowClick }: DataTableProps<T>) {
  // Implementation
}

// 4. Type guards
function isReport(obj: any): obj is Report {
  return obj && typeof obj.id === 'number' && typeof obj.title === 'string';
}
```

### 8. Security Best Practices

```typescript
// 1. Input sanitization
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });
}

// 2. CSRF protection (handled by API client)
// Already implemented in apiClient.ts

// 3. XSS prevention
function SafeHtml({ html }: { html: string }) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: sanitizeHtml(html),
      }}
    />
  );
}

// 4. Permission checks
function usePermissions() {
  const { data: user } = useCurrentUser();
  
  return {
    canEdit: user?.role === 'admin' || user?.role === 'super_admin',
    canDelete: user?.role === 'admin' || user?.role === 'super_admin',
    canAssign: user?.role === 'admin' || user?.role === 'super_admin',
    canClassify: user?.role === 'admin' || user?.role === 'super_admin',
  };
}
```

## 📝 Implementation Checklist

### Phase 1: Foundation (2 hours)
- [ ] Set up React Query
- [ ] Create custom hooks (useReport, useReportHistory, etc.)
- [ ] Implement error boundary
- [ ] Create skeleton loaders
- [ ] Set up TypeScript types

### Phase 2: Core Components (3 hours)
- [ ] ReportHeader with actions dropdown
- [ ] ReportOverview with inline editing
- [ ] LocationCard with map integration
- [ ] CitizenInfo with contact actions
- [ ] WorkflowProgress with visual steps
- [ ] ActivityTimeline with infinite scroll

### Phase 3: Action System (2 hours)
- [ ] QuickActionsCard with all actions
- [ ] PrimaryActionsPanel integration
- [ ] InlineActionForms integration
- [ ] Status transition validation
- [ ] Optimistic updates

### Phase 4: Advanced Features (2 hours)
- [ ] PhotoGallery with lightbox
- [ ] RelatedItems with similarity search
- [ ] InternalNotes with auto-save
- [ ] AppealsEscalationsSection integration
- [ ] AuditLog with filtering

### Phase 5: Polish (1 hour)
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Loading states for all actions
- [ ] Error handling for all scenarios
- [ ] Accessibility audit
- [ ] Performance optimization

## 🎯 Success Metrics

### Performance
- ✅ First Contentful Paint < 1.5s
- ✅ Time to Interactive < 3s
- ✅ Lighthouse Score > 90

### Accessibility
- ✅ WCAG 2.1 AA compliant
- ✅ Keyboard navigation works
- ✅ Screen reader friendly

### Code Quality
- ✅ 100% TypeScript coverage
- ✅ No console errors
- ✅ No accessibility violations
- ✅ All tests passing

### User Experience
- ✅ All actions work correctly
- ✅ Optimistic updates feel instant
- ✅ Error messages are clear
- ✅ Loading states are smooth

## 🚀 Ready to Build!

**Estimated Total Time:** 10 hours for complete production-grade implementation

**Next Step:** Start with Phase 1 - Foundation

Shall I proceed with the implementation? 🎯
