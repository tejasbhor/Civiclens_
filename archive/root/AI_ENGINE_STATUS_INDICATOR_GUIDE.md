# 🤖 AI Engine Status Indicator - Implementation Guide

**Date:** November 20, 2025, 8:20 PM  
**Status:** ✅ **FULLY IMPLEMENTED**

---

## 📋 **OVERVIEW**

A real-time AI Engine status indicator has been added to the CivicLens admin dashboard. This provides instant visibility into the AI worker's health and queue status across all pages.

---

## 🎯 **FEATURES**

### **Real-Time Monitoring**
- ✅ Live AI worker status (Running/Stopped/Unknown)
- ✅ Queue length tracking
- ✅ Failed queue monitoring
- ✅ Last heartbeat timestamp
- ✅ Auto-refresh every 10 seconds

### **Visual Indicators**
- 🟢 **Green** - AI Engine Running (with pulse animation)
- 🔴 **Red** - AI Engine Stopped
- ⚪ **Gray** - AI Engine Unknown/Connection Error

### **Interactive Dropdown**
- Click to expand detailed status
- View queue metrics
- Direct link to AI Dashboard
- Auto-closes when clicking outside

---

## 📦 **COMPONENTS CREATED**

### **1. AIEngineStatus Component**
**File:** `src/components/ai/AIEngineStatus.tsx`

Three variants available:

#### **Standard Version**
```tsx
import { AIEngineStatus } from '@/components/ai/AIEngineStatus';

<AIEngineStatus 
  showDetails={false}  // Optional: show queue details inline
  className=""         // Optional: custom styling
/>
```

**Features:**
- Icon with status color
- Text label: "AI Engine Running/Stopped/Unknown"
- Pulse animation when running
- Optional inline details (queue length, failed queue, heartbeat)

#### **Compact Version**
```tsx
<AIEngineStatus 
  compact={true}
  className=""
/>
```

**Features:**
- Small colored dot indicator
- "AI" label
- Minimal space usage
- Perfect for mobile/tight spaces

#### **Dropdown Version** (Currently Used)
```tsx
import { AIEngineStatusDropdown } from '@/components/ai/AIEngineStatus';

<AIEngineStatusDropdown className="" />
```

**Features:**
- Compact button with pulse dot
- Click to expand full status panel
- Shows:
  - Worker status with color-coded background
  - Last heartbeat timestamp
  - Queue length
  - Failed queue count
  - Reports in queue count
- Link to AI Dashboard
- Auto-closes on outside click

---

## 🔧 **INTEGRATION POINTS**

### **1. Top Navigation Bar** ✅ **IMPLEMENTED**

**File:** `src/components/layout/TopNav.tsx`

**Location:** Between search bar and notifications icon

**Code:**
```tsx
import { AIEngineStatusDropdown } from '@/components/ai/AIEngineStatus';

// In the component:
<div className="flex items-center gap-3 ml-6">
  {/* AI Engine Status */}
  <AIEngineStatusDropdown />
  
  {/* Notifications */}
  <div className="relative">
    <button onClick={() => setShowNotifications(!showNotifications)}>
      <Bell className="w-5 h-5 text-gray-600" />
    </button>
  </div>
  
  {/* User Menu */}
  ...
</div>
```

**Result:** AI Engine status visible on every admin page in the header.

---

## 🎨 **VISUAL DESIGN**

### **Color Scheme**

| Status | Dot Color | Background | Icon | Text |
|--------|-----------|------------|------|------|
| Running | 🟢 Green | Light Green | Activity | Green |
| Stopped | 🔴 Red | Light Red | XCircle | Red |
| Unknown | ⚪ Gray | Light Gray | AlertCircle | Gray |

### **Animations**

**Running State:**
- Pulsing dot animation (fade in/out)
- Subtle scale animation on hover

**Loading State:**
- Spinning loader icon
- Gray color scheme

---

## 🔄 **DATA FLOW**

```
┌──────────────────┐
│  AI Worker       │
│  (ai_worker.py)  │
└────────┬─────────┘
         │
         │ Updates heartbeat every 10s
         │
         ▼
┌──────────────────┐
│  Redis           │
│  ai_worker:      │
│  heartbeat       │
└────────┬─────────┘
         │
         │ Backend reads
         │
         ▼
┌──────────────────┐
│  Backend API     │
│  /ai-insights/   │
│  pipeline-status │
└────────┬─────────┘
         │
         │ Returns JSON
         │
         ▼
┌──────────────────┐
│  Frontend API    │
│  aiInsightsApi.  │
│  getPipelineStatus()
└────────┬─────────┘
         │
         │ Auto-refresh every 10s
         │
         ▼
┌──────────────────┐
│  AIEngineStatus  │
│  Component       │
└──────────────────┘
```

---

## 📊 **API INTEGRATION**

### **Endpoint Used**
```
GET /api/v1/ai-insights/pipeline-status
```

### **Response Model**
```typescript
interface PipelineStatus {
  worker_status: 'running' | 'stopped' | 'unknown';
  queue_length: number;
  failed_queue_length: number;
  last_heartbeat: string | null;
  reports_in_queue: Array<{
    id: number;
    report_number: string | null;
    title: string;
    status: string;
    created_at: string;
  }>;
}
```

### **Polling Strategy**
- **Interval:** 10 seconds
- **Method:** `setInterval` in `useEffect`
- **Cleanup:** Properly cleared on unmount
- **Error Handling:** Graceful fallback to "Unknown" state

---

## 💻 **USAGE EXAMPLES**

### **Example 1: Dashboard Header** (Current Implementation)
```tsx
import { AIEngineStatusDropdown } from '@/components/ai/AIEngineStatus';

export const TopNav = () => {
  return (
    <header>
      <div className="flex items-center justify-between">
        <SearchBar />
        <div className="flex items-center gap-3">
          <AIEngineStatusDropdown />
          <Notifications />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
```

### **Example 2: Predictions Page Inline Status**
```tsx
import { AIEngineStatus } from '@/components/ai/AIEngineStatus';

export const PredictionsPage = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1>AI Predictions</h1>
        <AIEngineStatus showDetails={true} />
      </div>
      {/* Page content */}
    </div>
  );
};
```

### **Example 3: Sidebar Compact Indicator**
```tsx
import { AIEngineStatus } from '@/components/ai/AIEngineStatus';

export const Sidebar = () => {
  return (
    <aside>
      <nav>
        {/* Menu items */}
      </nav>
      <div className="absolute bottom-4 left-4">
        <AIEngineStatus compact={true} />
      </div>
    </aside>
  );
};
```

### **Example 4: Settings Page Status Card**
```tsx
import { AIEngineStatus } from '@/components/ai/AIEngineStatus';

export const SettingsPage = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="mb-4">AI Worker Status</h3>
        <AIEngineStatus showDetails={true} />
      </div>
    </div>
  );
};
```

---

## 🎯 **STATUS LOGIC**

### **Worker Status Determination**

```typescript
// Backend logic (ai_insights.py)
heartbeat = await redis.get("ai_worker:heartbeat")
worker_status = "running" if heartbeat else "stopped"
```

**"Running"** = Heartbeat exists in Redis (updated within last 60 seconds)  
**"Stopped"** = No heartbeat in Redis (expired or worker not started)  
**"Unknown"** = Redis connection error or API failure

### **Heartbeat Mechanism**

```python
# Worker updates heartbeat every 10 seconds
async def update_heartbeat():
    while True:
        await redis.set(
            "ai_worker:heartbeat",
            datetime.utcnow().isoformat(),
            ex=60  # Expires after 60 seconds
        )
        await asyncio.sleep(10)
```

**Key Points:**
- Updates every 10 seconds
- Expires after 60 seconds (allows for 6 missed updates)
- If worker crashes, heartbeat expires → status changes to "Stopped"

---

## 🚀 **TESTING GUIDE**

### **Test Scenario 1: Worker Running**

**Steps:**
1. Start AI worker: `python -m app.workers.ai_worker`
2. Refresh admin dashboard
3. Check status indicator in header

**Expected Result:**
- 🟢 Green dot with pulse animation
- Status: "AI Engine Running"
- Dropdown shows current heartbeat time
- Queue metrics displayed

---

### **Test Scenario 2: Worker Stopped**

**Steps:**
1. Stop AI worker (Ctrl+C)
2. Wait 60+ seconds for heartbeat to expire
3. Refresh page or wait for auto-refresh

**Expected Result:**
- 🔴 Red dot (no animation)
- Status: "AI Engine Stopped"
- Dropdown shows "N/A" for heartbeat
- Queue metrics still visible (but not processing)

---

### **Test Scenario 3: Redis Connection Error**

**Steps:**
1. Stop Redis server
2. Refresh page

**Expected Result:**
- ⚪ Gray dot
- Status: "AI Engine Unknown"
- Dropdown shows zeros for all metrics

---

### **Test Scenario 4: Auto-Refresh**

**Steps:**
1. Open browser console
2. Watch network tab
3. Observe API calls to `/pipeline-status`

**Expected Result:**
- API call every 10 seconds
- Status updates in real-time
- No page reload required

---

## 📊 **PERFORMANCE CONSIDERATIONS**

### **Optimizations**

✅ **Efficient Polling**
- Only fetches pipeline status (lightweight endpoint)
- 10-second interval balances freshness vs load
- No state updates if data unchanged

✅ **Proper Cleanup**
- `useEffect` cleanup function clears interval
- Prevents memory leaks
- Stops polling when component unmounts

✅ **Error Handling**
- Graceful fallback to "Unknown" state
- Console logging for debugging
- Doesn't crash on API failures

✅ **Minimal Re-renders**
- Uses `useState` for local state
- Only re-renders when status changes
- No prop drilling

---

## 🔐 **SECURITY**

### **Authentication Required**
```python
@router.get("/pipeline-status", response_model=PipelineStatus)
async def get_pipeline_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ✅ Auth required
):
```

**Access Control:**
- Requires valid JWT token
- Admin/Moderator roles have access
- Regular users don't see AI status

---

## 📱 **RESPONSIVE DESIGN**

### **Desktop** (1024px+)
- Full dropdown with all details
- Shows in header next to notifications
- Proper spacing and alignment

### **Tablet** (768px - 1023px)
- Standard view maintained
- May need to test sidebar overlap

### **Mobile** (< 768px)
- Consider using compact version
- May hide in collapsed menu
- **TODO:** Test mobile responsiveness

---

## 🐛 **TROUBLESHOOTING**

### **Issue: Status shows "Unknown"**

**Possible Causes:**
1. Redis not running
2. Backend not running
3. Network error
4. Authentication issue

**Solution:**
```bash
# Check Redis
redis-cli ping

# Check backend
curl http://localhost:8000/api/v1/ai-insights/pipeline-status

# Check auth token
console.log(localStorage.getItem('token'))
```

---

### **Issue: Status stuck on "Stopped"**

**Possible Causes:**
1. AI worker not running
2. Worker crashed
3. Heartbeat expired

**Solution:**
```bash
# Start AI worker
cd civiclens-backend
python -m app.workers.ai_worker

# Check worker logs
# Should see: "AI ENGINE - NAVI MUMBAI MUNICIPAL CORPORATION"
```

---

### **Issue: Dropdown not opening**

**Possible Causes:**
1. CSS z-index conflict
2. Click handler issue
3. State management bug

**Solution:**
- Check browser console for errors
- Verify z-index in dropdown CSS
- Test with browser dev tools

---

## 🎯 **FUTURE ENHANCEMENTS**

### **Planned Features**

1. **Sound/Visual Alerts**
   - Desktop notification when worker stops
   - Sound alert for failed queue threshold
   - Browser notification API integration

2. **Historical Metrics**
   - Uptime percentage (last 24h, 7d, 30d)
   - Processing rate trends
   - Downtime incidents log

3. **Quick Actions**
   - Restart worker button (admin only)
   - Clear failed queue button
   - View logs button

4. **Mobile Optimization**
   - Dedicated mobile view
   - Swipe gestures for dropdown
   - Vibration on critical alerts

5. **Slack/Teams Integration**
   - Notify team when worker stops
   - Daily status summary
   - Alert on high failed queue

---

## 📋 **COMPONENT PROPS REFERENCE**

### **AIEngineStatus Props**

```typescript
interface AIEngineStatusProps {
  className?: string;      // Custom CSS classes
  showDetails?: boolean;   // Show inline queue details
  compact?: boolean;       // Use compact dot indicator
}
```

**Default Values:**
- `className`: `''`
- `showDetails`: `false`
- `compact`: `false`

---

## 🔄 **STATE MANAGEMENT**

### **Local State**

```typescript
const [status, setStatus] = useState<PipelineStatus | null>(null);
const [loading, setLoading] = useState(true);
```

**No Global State Needed:**
- Each instance fetches independently
- Lightweight enough for multiple instances
- Real-time updates per component

---

## ✅ **IMPLEMENTATION CHECKLIST**

- [x] Create `AIEngineStatus.tsx` component
- [x] Create `AIEngineStatusDropdown` variant
- [x] Add to TopNav header
- [x] Implement auto-refresh (10s interval)
- [x] Add proper error handling
- [x] Create documentation
- [x] Test with worker running
- [x] Test with worker stopped
- [x] Test with Redis down
- [x] Add pulse animation
- [x] Add dropdown functionality
- [x] Add link to AI Dashboard
- [ ] Test mobile responsiveness
- [ ] Add keyboard navigation (accessibility)
- [ ] Add ARIA labels
- [ ] Create E2E tests

---

## 📈 **METRICS & MONITORING**

### **What to Monitor**

1. **Status Accuracy**
   - Does indicator match actual worker state?
   - Lag time between worker start/stop and indicator update

2. **API Performance**
   - `/pipeline-status` response time
   - Error rate
   - Cache hit rate

3. **User Engagement**
   - Click rate on dropdown
   - Time spent viewing status
   - Correlation with AI Dashboard visits

---

## 📝 **SUMMARY**

### **✅ What Was Implemented**

1. **Real-time AI Engine status indicator** in header
2. **Three component variants** (Standard, Compact, Dropdown)
3. **Auto-refresh every 10 seconds**
4. **Color-coded visual states** (Green/Red/Gray)
5. **Pulse animation** for running state
6. **Detailed dropdown** with queue metrics
7. **Direct link** to AI Dashboard
8. **Proper error handling** and fallbacks

### **🎯 Where It Appears**

- ✅ **Top Navigation Bar** - All admin pages
- 🔄 **Available for use** - Any page/component

### **🚀 Ready for Production**

- ✅ Fully functional
- ✅ Well-documented
- ✅ Error handling complete
- ✅ Performance optimized
- ⚠️ Mobile responsiveness needs testing

---

**📅 Implementation Date:** November 20, 2025, 8:20 PM  
**🎉 Status:** COMPLETE & READY TO USE  
**📍 Location:** `src/components/ai/AIEngineStatus.tsx`

---

*AI Engine Status Indicator - Providing real-time visibility into the CivicLens AI pipeline!* 🤖✨
