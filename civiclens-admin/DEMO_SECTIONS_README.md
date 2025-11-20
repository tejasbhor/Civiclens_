# 🎭 Demo & Testing Sections - CivicLens

## Overview
Complete Demo/Testing sections for simulating Citizen and Officer workflows. Perfect for validating end-to-end flows before building mobile apps, conducting demos, and training.

## 🎯 Purpose
- ✅ **API Validation** - Test all APIs without mobile app
- ✅ **Demo-Ready** - Perfect for presentations and stakeholder reviews
- ✅ **Development Speed** - Validate flows before mobile development
- ✅ **Documentation** - API calls visible for reference
- ✅ **Bug Detection** - Catch issues early
- ✅ **Training Tool** - Help team understand workflows
- ✅ **Mobile App Reference** - Exact flows to replicate

## 📁 File Structure

```
src/
├── app/dashboard/demo/
│   ├── citizen/page.tsx          # Citizen Portal route
│   └── officer/page.tsx          # Officer Portal route
│
├── components/demo/
│   ├── CitizenSimulator.tsx      # Main Citizen simulator
│   ├── OfficerSimulator.tsx      # Main Officer simulator
│   │
│   ├── citizen/
│   │   ├── SubmitReportTab.tsx   # Report submission form
│   │   ├── MyReportsTab.tsx      # Citizen's report list
│   │   ├── TrackReportTab.tsx    # Live report tracking
│   │   └── ProfileTab.tsx        # Citizen profile & stats
│   │
│   └── officer/
│       ├── MyTasksTab.tsx        # Officer's task list
│       ├── TaskDetailsTab.tsx    # Detailed task view
│       ├── SubmitCompletionTab.tsx # Work completion form
│       └── StatsTab.tsx          # Officer performance stats
```

## 🚀 Access Points

### Sidebar Navigation
```
DEMO & TESTING
├─ 👤 Citizen Portal (/dashboard/demo/citizen)
└─ 👷 Officer Portal (/dashboard/demo/officer)
```

## 👤 Citizen Portal Simulator

### Routes
- **Main**: `/dashboard/demo/citizen`

### Features

#### 1. Submit Report Tab
- Complete report submission form
- Real-time validation
- Location picker with GPS
- Photo upload (with sample data)
- Category and severity selection
- API request/response preview
- Mock submission with response

**Sample Data:**
- Test Citizens: Anil Kumar Sharma, Priya Verma, Rajesh Singh
- Pre-filled locations and addresses
- Sample photos for different issue types

#### 2. My Reports Tab
- List of all reports by citizen
- Status-based filtering (All, Active, Resolved, Closed)
- Sorting options (Date, Status, Severity)
- Quick actions:
  - View Details
  - Track Live
  - Contact Officer
  - Rate Service
  - Provide Feedback

**Sample Reports:**
- Report #CL-2025-RNC-00016: Water logging (In Progress)
- Report #CL-2025-RNC-00015: Broken streetlight (Resolved)

#### 3. Track Report Tab
- Live status timeline
- Progress tracker with 7 stages:
  1. Received
  2. Classified
  3. Assigned
  4. Acknowledged
  5. In Progress (Current)
  6. Verification
  7. Resolved
- Officer updates feed
- Direct communication options
- Location map integration

#### 4. Profile Tab
- Citizen information
- Reputation points
- Statistics:
  - Total Reports
  - Resolved Reports
  - Active Reports
- Recent activity metrics

### Test Citizens
```typescript
1. Anil Kumar Sharma
   - Phone: +91-9876543210
   - Reputation: 450 pts
   - Total Reports: 12

2. Priya Verma
   - Phone: +91-9876543211
   - Reputation: 320 pts
   - Total Reports: 8

3. Rajesh Singh
   - Phone: +91-9876543212
   - Reputation: 580 pts
   - Total Reports: 15
```

## 👷 Officer Portal Simulator

### Routes
- **Main**: `/dashboard/demo/officer`

### Features

#### 1. My Tasks Tab
- Workload summary with visual progress bar
- Task list with priority indicators
- Filtering (All, New, In Progress, Overdue)
- Sorting (Due Date, Priority, Distance)
- Quick actions:
  - View Details
  - Navigate
  - Acknowledge Task
  - Update Status

**Sample Tasks:**
- Task #T-045: Water logging (High Priority, In Progress)
- Task #T-043: Broken footpath (Medium Priority, New)

#### 2. Task Details Tab
- Complete report information
- Citizen photos (3)
- Location with GPS coordinates
- Distance calculation
- Assignment information
- Current status
- Quick actions:
  - Acknowledge Task
  - Start Work (GPS check-in + before photos)
  - Add Update
  - Put On Hold
  - Mark Complete
  - Flag as Incorrect Assignment

#### 3. Submit Completion Tab
- After photos upload (3)
- Before/After comparison view
- Completion notes (required)
- Work duration tracking
- Materials used (optional)
- Completion checklist:
  - Issue completely resolved
  - Area cleaned
  - Before/After photos uploaded
  - Materials properly disposed
- API response preview

#### 4. Stats Tab
- Overview statistics:
  - Tasks Completed: 24
  - Active Tasks: 5
  - Avg Days to Complete: 2.3
  - Avg Rating: 4.8
- Performance metrics:
  - Completion Rate: 96%
  - On-Time Delivery: 88%
  - Citizen Satisfaction: 92%
- Recent activity
- Department ranking

### Test Officers
```typescript
1. Priya Singh (OFF-007)
   - Department: Public Works
   - Zone: Zone 1
   - Workload: 5/10 (50%)

2. Amit Sharma (OFF-012)
   - Department: Electrical
   - Zone: Zone 2
   - Workload: 3/10 (30%)

3. Rajesh Kumar (OFF-005)
   - Department: Sanitation
   - Zone: Zone 1
   - Workload: 7/10 (70%)
```

## 🔧 API Endpoints Demonstrated

### Citizen APIs
```
POST   /api/v1/reports/                    # Submit new report
GET    /api/v1/reports/my-reports          # Get citizen's reports
GET    /api/v1/reports/{report_id}         # Get report details
GET    /api/v1/reports/{report_id}/history # Get status history
POST   /api/v1/appeals/                    # Submit appeal
```

### Officer APIs
```
GET    /api/v1/reports/?assigned_officer_id={id}  # Get officer's tasks
POST   /api/v1/reports/{id}/acknowledge           # Acknowledge task
POST   /api/v1/reports/{id}/start-work            # Start work (GPS + photos)
POST   /api/v1/reports/{id}/status                # Update status
PUT    /api/v1/tasks/{id}/complete                # Submit completion
```

## 🎨 UI Features

### Common Features
- **User Switching**: Easily switch between test users
- **API Response Viewer**: See real-time API calls and responses
- **Copy/Download**: Export API responses for testing
- **Status Indicators**: Color-coded status and priority badges
- **Progress Bars**: Visual workload and completion tracking

### Citizen Portal
- Blue color scheme
- User-friendly interface
- Simplified forms
- Clear status updates

### Officer Portal
- Purple color scheme
- Professional interface
- Detailed task information
- Performance metrics

## 📊 Sample Data

### Report Categories
- Roads
- Water Supply
- Sanitation
- Electricity
- Street Lights
- Drainage
- Public Property
- Other

### Severity Levels
- Low (Green)
- Medium (Yellow)
- High (Orange)
- Critical (Red)

### Status Types
- Received
- Classified
- Assigned
- Acknowledged
- In Progress
- Verification
- Resolved
- Closed

## 🧪 Testing Workflows

### Complete End-to-End Flow
1. **Citizen submits report** (Citizen Portal → Submit Report)
2. **Admin classifies** (Main Dashboard → Manage Reports)
3. **Assign to department** (Manage Reports → Classification)
4. **Assign to officer** (Manage Reports → Assignment)
5. **Officer acknowledges** (Officer Portal → Task Details)
6. **Officer starts work** (Officer Portal → Start Work)
7. **Officer completes** (Officer Portal → Submit Completion)
8. **Admin approves** (Manage Reports → Verification)
9. **Citizen provides feedback** (Citizen Portal → My Reports)

### Quick Test Scenarios

#### Scenario 1: New Report Submission
1. Navigate to Citizen Portal
2. Select "Submit Report" tab
3. Fill in report details
4. Add location (use auto-detect)
5. Upload photos (use sample)
6. Submit and view API response

#### Scenario 2: Officer Task Management
1. Navigate to Officer Portal
2. View "My Tasks" list
3. Select a task
4. View "Task Details"
5. Start work (GPS check-in)
6. Submit completion with photos

#### Scenario 3: Report Tracking
1. Navigate to Citizen Portal
2. Select "Track Report" tab
3. View progress timeline
4. Check officer updates
5. Contact officer if needed

## 🚀 Usage Tips

### For Developers
- Use API response viewer to validate endpoints
- Test different user scenarios
- Verify error handling
- Check data validation

### For Demos
- Pre-select interesting test cases
- Show complete workflows
- Highlight key features
- Demonstrate mobile app equivalents

### For Training
- Walk through each tab
- Explain workflow stages
- Show API interactions
- Practice different scenarios

## 🔮 Future Enhancements

### Planned Features
- [ ] Workflow simulator (auto-run complete flow)
- [ ] Bulk test data generator
- [ ] Real-time notifications simulation
- [ ] GPS location simulator
- [ ] Photo upload from device
- [ ] SMS notification preview
- [ ] Email notification preview
- [ ] Appeal submission flow
- [ ] Escalation workflow
- [ ] Multi-language support

### Advanced Features
- [ ] Performance metrics dashboard
- [ ] API load testing
- [ ] Response time monitoring
- [ ] Error rate tracking
- [ ] User behavior analytics

## 📝 Notes

- All data is **mock data** for testing purposes
- No actual API calls are made (responses are simulated)
- Perfect for **offline demos**
- Can be extended to make real API calls
- Ideal for **mobile app development reference**

## 🎓 Learning Resources

### For Mobile Developers
- Study the UI layouts for mobile app design
- Reference API endpoints and payloads
- Understand workflow sequences
- Copy form validation logic

### For Backend Developers
- See expected API request/response formats
- Understand data relationships
- Validate endpoint requirements
- Test error scenarios

### For QA Teams
- Use for test case development
- Validate user workflows
- Check edge cases
- Document expected behaviors

---

**Built with ❤️ for CivicLens**
*Making civic engagement accessible and efficient*
