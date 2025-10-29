# 🔐 Citizen Authentication Flow - CivicLens

## 📋 Overview

CivicLens implements a **dual authentication system** for citizens:

1. **Quick OTP Login** (No Account) - For quick report filing
2. **Full Registration** (With Account) - For complete features and profile

---

## 🎯 **Two Citizen Paths**

### **Path 1: Quick Report (OTP Only)** 🚀
**For citizens who want to file a report immediately without creating an account**

#### **Flow:**
```
1. Citizen opens app/website
2. Clicks "File Report" or "Quick Report"
3. Enters phone number
4. Receives OTP via SMS
5. Verifies OTP
6. Gets temporary access token
7. Can file report immediately
8. Account auto-created with MINIMAL profile
```

#### **Backend Implementation:**
```python
# User Model - Profile Completion Levels
class ProfileCompletionLevel(str, enum.Enum):
    MINIMAL = "minimal"      # Just phone + OTP (can report)
    BASIC = "basic"          # + Name (better experience)
    COMPLETE = "complete"    # + Email, address (full features)

# Auto-created user on OTP verification
user = User(
    phone=phone,
    phone_verified=False,
    profile_completion=ProfileCompletionLevel.MINIMAL,
    role=UserRole.CITIZEN,
    account_created_via="otp"
)
```

#### **What They Can Do:**
- ✅ File reports
- ✅ Upload photos/audio
- ✅ Track their reports (via phone number)
- ❌ Cannot access full profile
- ❌ Cannot see reputation score
- ❌ Cannot validate other reports
- ❌ Limited notification options

#### **User Experience:**
```
┌─────────────────────────────────────┐
│  🚀 Quick Report                    │
├─────────────────────────────────────┤
│                                     │
│  No account needed!                 │
│  Just verify your phone number      │
│                                     │
│  📱 Enter Phone Number              │
│  [+91-__________]                   │
│                                     │
│  [Send OTP]                         │
│                                     │
│  ℹ️  You can upgrade to full        │
│     account later for more features │
└─────────────────────────────────────┘
```

---

### **Path 2: Full Registration** 👤
**For citizens who want a complete account with all features**

#### **Flow:**
```
1. Citizen clicks "Sign Up" or "Create Account"
2. Enters:
   - Phone number *
   - Full name *
   - Email (optional)
   - Password *
3. Receives OTP for phone verification
4. Verifies OTP
5. Account created with BASIC/COMPLETE profile
6. Gets access token
7. Full features unlocked
```

#### **Backend Implementation:**
```python
# Full user creation with password
user = User(
    phone=phone,
    email=email,
    full_name=full_name,
    role=UserRole.CITIZEN,
    hashed_password=get_password_hash(password),
    profile_completion=ProfileCompletionLevel.COMPLETE if email else ProfileCompletionLevel.BASIC,
    account_created_via="password"
)
```

#### **What They Can Do:**
- ✅ File reports
- ✅ Upload photos/audio
- ✅ Track all their reports
- ✅ Complete profile with address
- ✅ View reputation score
- ✅ Validate other reports (when promoted to Contributor)
- ✅ Full notification preferences
- ✅ Email notifications
- ✅ Report history and analytics

#### **User Experience:**
```
┌─────────────────────────────────────┐
│  👤 Create Account                  │
├─────────────────────────────────────┤
│                                     │
│  Get full access to all features    │
│                                     │
│  📱 Phone Number *                  │
│  [+91-__________]                   │
│                                     │
│  👤 Full Name *                     │
│  [________________]                 │
│                                     │
│  📧 Email (Optional)                │
│  [________________]                 │
│                                     │
│  🔒 Password *                      │
│  [________________]                 │
│                                     │
│  [Create Account]                   │
│                                     │
│  Already have account? [Login]      │
└─────────────────────────────────────┘
```

---

## 🔄 **Progressive Profile Enhancement**

### **Upgrading from MINIMAL to COMPLETE**

A user who started with OTP-only can upgrade their profile later:

```python
# Profile Update Endpoint
@router.put("/users/me/profile")
async def update_profile(
    profile: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # User can add:
    # - full_name
    # - email
    # - primary_address
    # - bio
    # - notification preferences
    
    # Auto-update profile completion level
    user.update_profile_completion()
```

### **Profile Completion Levels:**

| Level | Requirements | Can Do |
|-------|-------------|---------|
| **MINIMAL** | Phone only | File reports, basic tracking |
| **BASIC** | Phone + Name | Better UX, personalized experience |
| **COMPLETE** | Phone + Name + Email + Address | All features, reputation system, validations |

---

## 🔐 **Authentication Endpoints**

### **1. OTP-Based (Quick Report)**

#### **Request OTP**
```http
POST /api/v1/auth/request-otp
Content-Type: application/json

{
  "phone": "+919876543210"
}

Response:
{
  "message": "OTP sent successfully",
  "otp": "123456",  // Only in debug mode
  "expires_in_minutes": 5
}
```

#### **Verify OTP**
```http
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user_id": 123,
  "role": "citizen"
}
```

**Backend Logic:**
```python
# Get or create user
user = await user_crud.get_by_phone(db, phone)
if not user:
    # Auto-create minimal user
    user = await user_crud.create_minimal_user(db, phone)

# User can now file reports immediately
```

---

### **2. Full Registration**

#### **Sign Up (New Endpoint Needed)**
```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "phone": "+919876543210",
  "full_name": "Anil Kumar",
  "email": "anil@example.com",  // optional
  "password": "SecurePass123"
}

Response:
{
  "message": "Account created successfully. Please verify your phone.",
  "user_id": 123,
  "verification_required": true
}
```

#### **Verify Phone After Signup**
```http
POST /api/v1/auth/verify-phone
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456"
}

Response:
{
  "message": "Phone verified successfully",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user_id": 123,
  "role": "citizen"
}
```

---

### **3. Password Login (For Registered Users)**

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "phone": "+919876543210",
  "password": "SecurePass123"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user_id": 123,
  "role": "citizen"
}
```

---

## 🎨 **Frontend Implementation**

### **Landing Page Options**

```typescript
// Landing page with two clear options
<div className="landing-page">
  {/* Option 1: Quick Report */}
  <div className="quick-report-card">
    <h2>🚀 Quick Report</h2>
    <p>File a report in seconds</p>
    <p className="subtitle">No account needed</p>
    <button onClick={() => router.push('/quick-report')}>
      File Report Now
    </button>
  </div>

  {/* Option 2: Full Account */}
  <div className="full-account-card">
    <h2>👤 Create Account</h2>
    <p>Get full access to all features</p>
    <ul>
      <li>Track all your reports</li>
      <li>Build reputation</li>
      <li>Validate reports</li>
      <li>Email notifications</li>
    </ul>
    <button onClick={() => router.push('/signup')}>
      Sign Up
    </button>
    <button variant="secondary" onClick={() => router.push('/login')}>
      Login
    </button>
  </div>
</div>
```

---

## 📱 **Mobile App Flow**

### **First Launch Screen**

```
┌─────────────────────────────────────┐
│                                     │
│         🏛️ CivicLens                │
│                                     │
│    Report civic issues instantly    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Choose how you want to start:      │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  🚀 Quick Report              │ │
│  │  No account needed            │ │
│  │  [File Report Now]            │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  👤 Create Account            │ │
│  │  Unlock all features          │ │
│  │  [Sign Up]                    │ │
│  └───────────────────────────────┘ │
│                                     │
│  Already have account? [Login]      │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔄 **User Journey Examples**

### **Scenario 1: Urgent Report (OTP Path)**

```
1. Citizen sees pothole
2. Opens app → "Quick Report"
3. Enters phone: +91-9876543210
4. Gets OTP: 123456
5. Verifies OTP
6. Immediately files report with photo
7. Gets report number: CL-2025-RNC-00123
8. Can track via phone number
9. Later prompted: "Create account for more features?"
```

### **Scenario 2: Regular User (Full Account)**

```
1. Citizen wants to actively participate
2. Opens app → "Sign Up"
3. Enters:
   - Phone: +91-9876543210
   - Name: Anil Kumar
   - Email: anil@example.com
   - Password: SecurePass123
4. Gets OTP for phone verification
5. Verifies OTP
6. Account created with COMPLETE profile
7. Can file reports, track history, build reputation
8. Gets promoted to CONTRIBUTOR after 5 reports + 100 reputation
9. Can validate other reports
```

---

## 🛠️ **Backend Endpoints Needed**

### **Current (Already Implemented)** ✅
- `POST /auth/request-otp` - Request OTP
- `POST /auth/verify-otp` - Verify OTP & auto-create user
- `POST /auth/login` - Password login
- `PUT /users/me/profile` - Update profile

### **Need to Add** ⚠️
- `POST /auth/signup` - Full registration with password
- `POST /auth/verify-phone` - Verify phone after signup
- `POST /auth/resend-otp` - Resend OTP
- `GET /users/me/profile-completion` - Check profile status
- `POST /users/me/upgrade-account` - Upgrade from MINIMAL to COMPLETE

---

## 🔒 **Security Considerations**

### **OTP Security**
- ✅ Rate limiting (max 3 OTPs per phone per hour)
- ✅ OTP expires in 5 minutes
- ✅ Stored in Redis (not database)
- ✅ Deleted after verification
- ✅ 6-digit random OTP

### **Password Security**
- ✅ Minimum 8 characters
- ✅ Must contain uppercase letter
- ✅ Must contain digit
- ✅ Hashed with bcrypt
- ✅ Never stored in plain text

### **Session Management**
- ✅ JWT tokens with JTI (unique session ID)
- ✅ Refresh token rotation
- ✅ Session tracking in database
- ✅ Can revoke sessions
- ✅ IP address and user agent logging

---

## 📊 **Database Schema**

```sql
-- User table supports both paths
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    
    -- Core Authentication (Required)
    phone VARCHAR(20) UNIQUE NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Optional Profile (Progressive)
    email VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    full_name VARCHAR(255),
    
    -- Password (Only for full accounts)
    hashed_password VARCHAR(255),
    
    -- Profile Completion
    profile_completion VARCHAR(20) DEFAULT 'minimal',
    -- Values: 'minimal', 'basic', 'complete'
    
    -- Role & Status
    role VARCHAR(20) DEFAULT 'citizen',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Reputation System
    reputation_score INTEGER DEFAULT 0,
    total_reports INTEGER DEFAULT 0,
    
    -- Metadata
    account_created_via VARCHAR(50) DEFAULT 'otp',
    -- Values: 'otp', 'password', 'government_sso'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 **Recommended Implementation**

### **1. Frontend Routes**

```typescript
// Public routes
/                          // Landing page with both options
/quick-report             // OTP-only flow
/signup                   // Full registration
/login                    // Password login
/verify-otp              // OTP verification page

// Protected routes (after auth)
/dashboard               // User dashboard
/reports/create          // Create report
/reports/my-reports      // User's reports
/profile                 // Profile settings
```

### **2. Backend Endpoints to Add**

```python
# Add to app/api/v1/auth.py

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    request: CitizenSignupRequest,
    db: AsyncSession = Depends(get_db)
):
    """Full citizen registration with password"""
    # Check if phone already exists
    existing_user = await user_crud.get_by_phone(db, request.phone)
    if existing_user:
        raise HTTPException(400, "Phone number already registered")
    
    # Create user with password
    user = await user_crud.create_with_password(db, request)
    
    # Send OTP for phone verification
    otp = generate_otp()
    await redis_client.setex(f"otp:{request.phone}", 300, otp)
    
    return {
        "message": "Account created. Please verify your phone.",
        "user_id": user.id,
        "otp": otp if settings.DEBUG else None
    }

@router.post("/verify-phone")
async def verify_phone(
    request: PhoneVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify phone after signup"""
    # Verify OTP
    # Mark phone_verified = True
    # Return access tokens
    pass
```

### **3. Frontend Components**

```typescript
// components/auth/QuickReportAuth.tsx
// - Phone input
// - OTP input
// - Minimal UI
// - Direct to report creation

// components/auth/SignupForm.tsx
// - Phone, name, email, password inputs
// - Password strength indicator
// - Terms acceptance
// - OTP verification step

// components/auth/LoginForm.tsx
// - Phone/email + password
// - "Forgot password?" link
// - "Sign up" link
```

---

## ✅ **Summary**

### **Quick OTP Path (No Account)**
- ✅ Already implemented in backend
- ✅ Auto-creates MINIMAL profile
- ✅ User can file reports immediately
- ✅ Can upgrade profile later

### **Full Registration Path (With Account)**
- ⚠️ Need to add `/auth/signup` endpoint
- ⚠️ Need to add phone verification after signup
- ✅ Password login already implemented
- ✅ Profile update already implemented

### **Key Points**
1. **Both paths are valid** - User chooses based on their needs
2. **Progressive enhancement** - Can upgrade from MINIMAL to COMPLETE
3. **No friction for urgent reports** - OTP path is instant
4. **Full features for engaged users** - Registration unlocks everything
5. **Security maintained** - Both paths are secure and rate-limited

---

**Status**: Backend 80% ready, need to add signup endpoint  
**Recommendation**: Implement `/auth/signup` and `/auth/verify-phone` endpoints  
**Priority**: High - Essential for citizen onboarding
