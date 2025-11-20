# 🔗 CivicLens Client-Backend Integration Guide

## 📋 **Overview**

This guide provides a comprehensive analysis of the CivicLens web client and detailed steps to integrate it with the FastAPI backend.

---

## 🏗️ **Current Architecture**

### **Client Structure** (`civiclens-client/`)

```
civiclens-client/
├── src/
│   ├── pages/
│   │   ├── citizen/          # Citizen portal pages
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── SubmitReport.tsx
│   │   │   ├── TrackReport.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Profile.tsx
│   │   │   └── Notifications.tsx
│   │   │
│   │   └── officer/          # Officer portal pages
│   │       ├── Login.tsx
│   │       ├── Dashboard.tsx
│   │       ├── Tasks.tsx
│   │       ├── TaskDetails.tsx
│   │       ├── AcknowledgeTask.tsx
│   │       ├── StartWork.tsx
│   │       ├── CompleteWork.tsx
│   │       └── Profile.tsx
│   │
│   ├── services/
│   │   └── mockAuthService.ts    # ⚠️ Currently using mock data
│   │
│   ├── components/               # Reusable UI components
│   ├── hooks/                    # Custom React hooks
│   └── lib/                      # Utilities
│
├── .env                          # ⚠️ Currently using Supabase
└── package.json
```

### **Backend Structure** (`civiclens-backend/`)

```
civiclens-backend/
├── app/
│   ├── api/v1/
│   │   ├── auth.py              # ✅ Authentication endpoints
│   │   ├── reports.py           # ✅ Report management
│   │   ├── media.py             # ✅ Media upload
│   │   ├── users.py             # ✅ User management
│   │   ├── departments.py       # ✅ Departments
│   │   ├── analytics.py         # ✅ Statistics
│   │   ├── audit.py             # ✅ Audit logs
│   │   ├── appeals.py           # ✅ Appeals system
│   │   └── escalations.py       # ✅ Escalations
│   │
│   ├── core/                    # Security, database, etc.
│   ├── models/                  # SQLAlchemy models
│   ├── schemas/                 # Pydantic schemas
│   └── crud/                    # Database operations
│
└── main.py                      # FastAPI app
```

---

## 🎯 **Integration Strategy**

### **Phase 1: API Service Layer** ✅ **PRIORITY**

Create a centralized API service to replace mock services.

### **Phase 2: Authentication Integration** ✅ **CRITICAL**

Connect client auth flows to backend endpoints.

### **Phase 3: Feature Integration** ✅ **CORE**

Integrate all citizen and officer features.

### **Phase 4: Real-time Updates** 🔄 **ENHANCEMENT**

Add WebSocket support for live updates.

---

## 📝 **Phase 1: Create API Service Layer**

### **Step 1.1: Create API Client**

**File:** `civiclens-client/src/services/apiClient.ts`

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired - try refresh
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token, refresh_token } = response.data;
          localStorage.setItem('authToken', access_token);
          localStorage.setItem('refreshToken', refresh_token);
          
          // Retry original request
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${access_token}`;
            return apiClient.request(error.config);
          }
        } catch (refreshError) {
          // Refresh failed - logout
          localStorage.clear();
          window.location.href = '/';
        }
      } else {
        // No refresh token - logout
        localStorage.clear();
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### **Step 1.2: Create Auth Service**

**File:** `civiclens-client/src/services/authService.ts`

```typescript
import apiClient from './apiClient';

export interface User {
  id: number;
  phone: string;
  full_name?: string;
  email?: string;
  role: 'citizen' | 'officer' | 'admin';
  profile_completion: 'minimal' | 'basic' | 'complete';
  account_created_via: 'otp' | 'password';
  reputation_score?: number;
  total_reports?: number;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: number;
  role: string;
}

export interface OTPResponse {
  message: string;
  otp?: string; // Only in development
  expires_in_minutes: number;
}

export const authService = {
  // Request OTP
  async requestOTP(phone: string): Promise<OTPResponse> {
    const response = await apiClient.post('/auth/request-otp', { phone });
    return response.data;
  },

  // Verify OTP (Quick Login)
  async verifyOTP(phone: string, otp: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/verify-otp', { phone, otp });
    return response.data;
  },

  // Full Signup
  async signup(data: {
    phone: string;
    full_name: string;
    email?: string;
    password: string;
  }): Promise<{ message: string; user_id: number }> {
    const response = await apiClient.post('/auth/signup', data);
    return response.data;
  },

  // Verify Phone After Signup
  async verifyPhone(phone: string, otp: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/verify-phone', { phone, otp });
    return response.data;
  },

  // Login with Password
  async login(phone: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', { phone, password });
    return response.data;
  },

  // Get Current User
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  // Refresh Token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.clear();
    }
  },
};
```

### **Step 1.3: Create Reports Service**

**File:** `civiclens-client/src/services/reportsService.ts`

```typescript
import apiClient from './apiClient';

export interface Report {
  id: number;
  report_number: string;
  title: string;
  description: string;
  category?: string;
  sub_category?: string;
  severity?: string;
  status: string;
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
  citizen_id: number;
  department_id?: number;
  officer_id?: number;
  created_at: string;
  updated_at: string;
  media?: MediaFile[];
}

export interface MediaFile {
  id: number;
  file_url: string;
  file_type: 'image' | 'audio' | 'video';
  file_size?: number;
  mime_type?: string;
  caption?: string;
  is_primary: boolean;
  uploaded_at: string;
}

export interface CreateReportRequest {
  title: string;
  description: string;
  category?: string;
  sub_category?: string;
  severity?: string;
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
}

export const reportsService = {
  // Create Report
  async createReport(data: CreateReportRequest): Promise<Report> {
    const response = await apiClient.post('/reports/', data);
    return response.data;
  },

  // Get My Reports
  async getMyReports(params?: {
    status?: string;
    category?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ reports: Report[]; total: number }> {
    const response = await apiClient.get('/reports/my-reports', { params });
    return response.data;
  },

  // Get Report by ID
  async getReportById(id: number): Promise<Report> {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },

  // Get Report Status History
  async getStatusHistory(id: number): Promise<any> {
    const response = await apiClient.get(`/reports/${id}/history`);
    return response.data;
  },

  // Upload Media
  async uploadMedia(reportId: number, files: File[]): Promise<MediaFile[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post(
      `/media/upload/${reportId}/bulk`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Get Report Media
  async getReportMedia(reportId: number): Promise<MediaFile[]> {
    const response = await apiClient.get(`/media/report/${reportId}`);
    return response.data;
  },
};
```

### **Step 1.4: Create Officer Tasks Service**

**File:** `civiclens-client/src/services/tasksService.ts`

```typescript
import apiClient from './apiClient';

export interface Task {
  id: number;
  report_id: number;
  officer_id: number;
  status: string;
  priority: string;
  assigned_at: string;
  acknowledged_at?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  report?: any;
}

export const tasksService = {
  // Get My Tasks
  async getMyTasks(params?: {
    status?: string;
    priority?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ tasks: Task[]; total: number }> {
    const response = await apiClient.get('/reports/my-tasks', { params });
    return response.data;
  },

  // Get Task Details
  async getTaskDetails(reportId: number): Promise<Task> {
    const response = await apiClient.get(`/reports/${reportId}/task`);
    return response.data;
  },

  // Acknowledge Task
  async acknowledgeTask(reportId: number, notes?: string): Promise<Task> {
    const response = await apiClient.post(`/reports/${reportId}/acknowledge`, {
      notes,
    });
    return response.data;
  },

  // Start Work
  async startWork(reportId: number, notes?: string): Promise<Task> {
    const response = await apiClient.post(`/reports/${reportId}/start-work`, {
      notes,
    });
    return response.data;
  },

  // Complete Work
  async completeWork(
    reportId: number,
    data: {
      completion_notes: string;
      resolution_summary?: string;
    }
  ): Promise<Task> {
    const response = await apiClient.post(
      `/reports/${reportId}/complete-work`,
      data
    );
    return response.data;
  },
};
```

---

## 🔐 **Phase 2: Update Authentication**

### **Step 2.1: Update Citizen Login**

**File:** `civiclens-client/src/pages/citizen/Login.tsx`

**Replace:**
```typescript
import { mockAuthService } from "@/services/mockAuthService";
```

**With:**
```typescript
import { authService } from "@/services/authService";
```

**Update all method calls:**
```typescript
// BEFORE
const response = await mockAuthService.requestOTP(phone);

// AFTER
const response = await authService.requestOTP(phone);
```

### **Step 2.2: Update Officer Login**

**File:** `civiclens-client/src/pages/officer/Login.tsx`

Same changes as citizen login.

### **Step 2.3: Create Auth Context**

**File:** `civiclens-client/src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('authToken');
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (token: string, refreshToken: string) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    await refreshUser();
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## 📦 **Phase 3: Update Environment Variables**

### **Step 3.1: Update .env**

**File:** `civiclens-client/.env`

```env
# Backend API
VITE_API_URL=http://localhost:8000/api/v1

# Remove Supabase (not needed)
# VITE_SUPABASE_PROJECT_ID=...
# VITE_SUPABASE_PUBLISHABLE_KEY=...
# VITE_SUPABASE_URL=...
```

### **Step 3.2: Update vite.config.ts** (if needed)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 🚀 **Phase 4: Feature Integration**

### **Citizen Features**

| Feature | Frontend Page | Backend Endpoint | Status |
|---------|--------------|------------------|--------|
| Quick Login (OTP) | `Login.tsx` | `POST /auth/request-otp`<br>`POST /auth/verify-otp` | ✅ Ready |
| Full Signup | `Login.tsx` | `POST /auth/signup`<br>`POST /auth/verify-phone` | ✅ Ready |
| Submit Report | `SubmitReport.tsx` | `POST /reports/` | ✅ Ready |
| Upload Media | `SubmitReport.tsx` | `POST /media/upload/{id}/bulk` | ✅ Ready |
| My Reports | `Reports.tsx` | `GET /reports/my-reports` | ✅ Ready |
| Track Report | `TrackReport.tsx` | `GET /reports/{id}`<br>`GET /reports/{id}/history` | ✅ Ready |
| Profile | `Profile.tsx` | `GET /users/me`<br>`PUT /users/me` | ✅ Ready |
| Dashboard Stats | `Dashboard.tsx` | `GET /analytics/stats` | ✅ Ready |

### **Officer Features**

| Feature | Frontend Page | Backend Endpoint | Status |
|---------|--------------|------------------|--------|
| Login | `Login.tsx` | `POST /auth/login` | ✅ Ready |
| My Tasks | `Tasks.tsx` | `GET /reports/my-tasks` | ✅ Ready |
| Task Details | `TaskDetails.tsx` | `GET /reports/{id}/task` | ✅ Ready |
| Acknowledge Task | `AcknowledgeTask.tsx` | `POST /reports/{id}/acknowledge` | ✅ Ready |
| Start Work | `StartWork.tsx` | `POST /reports/{id}/start-work` | ✅ Ready |
| Complete Work | `CompleteWork.tsx` | `POST /reports/{id}/complete-work` | ✅ Ready |
| Upload Before/After | `CompleteWork.tsx` | `POST /media/upload/{id}/bulk` | ✅ Ready |
| Profile | `Profile.tsx` | `GET /users/me` | ✅ Ready |
| Dashboard Stats | `Dashboard.tsx` | `GET /analytics/stats` | ✅ Ready |

---

## 📋 **Implementation Checklist**

### **✅ Phase 1: Setup (Day 1)**

- [ ] Create `apiClient.ts`
- [ ] Create `authService.ts`
- [ ] Create `reportsService.ts`
- [ ] Create `tasksService.ts`
- [ ] Update `.env` file
- [ ] Test API connectivity

### **✅ Phase 2: Authentication (Day 2)**

- [ ] Create `AuthContext.tsx`
- [ ] Update `App.tsx` with AuthProvider
- [ ] Update Citizen Login page
- [ ] Update Officer Login page
- [ ] Test OTP flow
- [ ] Test password login
- [ ] Test token refresh

### **✅ Phase 3: Citizen Features (Day 3-4)**

- [ ] Update Submit Report page
- [ ] Update My Reports page
- [ ] Update Track Report page
- [ ] Update Profile page
- [ ] Update Dashboard page
- [ ] Test all citizen flows

### **✅ Phase 4: Officer Features (Day 5-6)**

- [ ] Update Tasks page
- [ ] Update Task Details page
- [ ] Update Acknowledge Task page
- [ ] Update Start Work page
- [ ] Update Complete Work page
- [ ] Update Profile page
- [ ] Update Dashboard page
- [ ] Test all officer flows

### **✅ Phase 5: Testing & Polish (Day 7)**

- [ ] End-to-end testing
- [ ] Error handling
- [ ] Loading states
- [ ] Success messages
- [ ] Mobile responsiveness
- [ ] Performance optimization

---

## 🔧 **Quick Start Commands**

### **Backend (Terminal 1)**

```bash
cd civiclens-backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **Client (Terminal 2)**

```bash
cd civiclens-client
npm install
npm run dev
```

### **Access**

- **Client:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 🎯 **Next Steps**

1. **Create API Services** - Start with `apiClient.ts` and `authService.ts`
2. **Test Authentication** - Verify OTP and login flows work
3. **Integrate Features** - Update pages one by one
4. **Test Thoroughly** - Ensure all flows work end-to-end
5. **Deploy** - Deploy both frontend and backend

---

## 📚 **Additional Resources**

- **Backend API Docs:** http://localhost:8000/docs
- **Backend README:** `civiclens-backend/README.md`
- **Admin Dashboard:** http://localhost:3000 (Next.js admin)

---

## ⚠️ **Important Notes**

1. **Remove Supabase** - The client is currently configured for Supabase but should use your FastAPI backend
2. **Mock Service** - Replace `mockAuthService.ts` with real API calls
3. **Token Management** - Implement proper token refresh logic
4. **Error Handling** - Add comprehensive error handling
5. **Loading States** - Show loading indicators during API calls
6. **Offline Support** - Consider adding offline capabilities later

---

**Status:** 📝 **READY FOR INTEGRATION**

**All backend endpoints are ready and tested. Client needs to be updated to use real API calls instead of mock data.**

Would you like me to start implementing any specific phase?
