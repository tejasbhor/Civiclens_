# 📁 CivicLens Project Structure

Complete overview of the CivicLens project organization.

## 🏗️ Root Directory

```
CivicLens/
├── civiclens-backend/      # FastAPI backend server
├── civiclens-admin/        # Next.js admin dashboard
├── civiclens-client/       # React citizen portal
├── docs/                   # Documentation
├── alembic/               # Database migrations (root level)
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── docker-compose.yml     # Docker orchestration
├── LICENSE                # MIT License
├── README.md              # Main documentation
├── CONTRIBUTING.md        # Contribution guidelines
├── CHANGELOG.md           # Version history
├── QUICK_START.md         # Quick start guide
└── PROJECT_STRUCTURE.md   # This file
```

## 🔧 Backend (civiclens-backend/)

```
civiclens-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry
│   ├── config.py                  # Configuration management
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── analytics.py       # Analytics endpoints
│   │       ├── appeals.py         # Appeal management
│   │       ├── audit.py           # Audit logging
│   │       ├── auth.py            # Authentication
│   │       ├── auth_extended.py   # Extended auth features
│   │       ├── departments.py     # Department management
│   │       ├── escalations.py     # Issue escalation
│   │       ├── media.py           # Media upload/download
│   │       ├── reports.py         # Report CRUD
│   │       ├── sync.py            # Offline sync
│   │       └── users.py           # User management
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── auth.py                # Auth utilities
│   │   ├── dependencies.py        # FastAPI dependencies
│   │   ├── rate_limit.py          # Rate limiting
│   │   ├── security.py            # Security utilities
│   │   └── storage.py             # File storage
│   │
│   ├── crud/
│   │   ├── __init__.py
│   │   ├── base.py                # Base CRUD operations
│   │   ├── report.py              # Report CRUD
│   │   ├── task.py                # Task CRUD
│   │   └── user.py                # User CRUD
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py                # Database base
│   │   └── session.py             # Database sessions
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py                # Base model
│   │   ├── audit.py               # Audit log model
│   │   ├── department.py          # Department model
│   │   ├── media.py               # Media model
│   │   ├── report.py              # Report model
│   │   ├── session.py             # Session model
│   │   ├── sync.py                # Sync state model
│   │   ├── task.py                # Task model
│   │   └── user.py                # User model
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py                # Auth schemas
│   │   ├── media.py               # Media schemas
│   │   ├── report.py              # Report schemas
│   │   ├── task.py                # Task schemas
│   │   └── user.py                # User schemas
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ai_classifier.py       # AI classification
│   │   ├── assignment.py          # Task assignment
│   │   ├── notification.py        # Notifications
│   │   └── storage.py             # Storage service
│   │
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py            # Test configuration
│       ├── test_auth.py           # Auth tests
│       ├── test_reports.py        # Report tests
│       └── test_users.py          # User tests
│
├── alembic/                       # Database migrations
│   ├── versions/                  # Migration files
│   └── env.py                     # Alembic config
│
├── media/                         # Local media storage
├── .env                           # Environment variables (gitignored)
├── .env.example                   # Environment template
├── alembic.ini                    # Alembic configuration
├── Dockerfile                     # Docker build file
├── requirements.txt               # Python dependencies
├── pytest.ini                     # Pytest configuration
└── README.md                      # Backend documentation
```

## 🎨 Admin Dashboard (civiclens-admin/)

```
civiclens-admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Home page
│   │   ├── login/
│   │   │   └── page.tsx           # Login page
│   │   │
│   │   └── dashboard/
│   │       ├── layout.tsx         # Dashboard layout
│   │       ├── page.tsx           # Dashboard home
│   │       ├── analytics/         # Analytics page
│   │       ├── create-report/     # Create report page
│   │       ├── departments/       # Departments page
│   │       ├── officers/          # Officers page
│   │       ├── predictions/       # Predictions page
│   │       ├── reports/           # Reports page
│   │       ├── settings/          # Settings page
│   │       ├── tasks/             # Tasks page
│   │       └── demo/              # Demo sections
│   │           ├── citizen/       # Citizen simulator
│   │           └── officer/       # Officer simulator
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   └── RequireAuth.tsx    # Auth guard
│   │   │
│   │   ├── dashboard/
│   │   │   ├── RecentActivity.tsx # Activity feed
│   │   │   ├── StatsCard.tsx      # Stats card
│   │   │   └── TaskList.tsx       # Task list
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   │   └── TopNav.tsx         # Top navigation
│   │   │
│   │   ├── reports/
│   │   │   ├── ReportDetail.tsx   # Report details
│   │   │   ├── ReportList.tsx     # Report list
│   │   │   └── modals/            # Report modals
│   │   │
│   │   ├── settings/
│   │   │   ├── SettingsSections.tsx    # Settings components
│   │   │   └── AdditionalSettings.tsx  # More settings
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx         # Button component
│   │       ├── Card.tsx           # Card component
│   │       ├── Input.tsx          # Input component
│   │       └── Modal.tsx          # Modal component
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx        # Auth context
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── auth.ts            # Auth API
│   │   │   ├── reports.ts         # Reports API
│   │   │   ├── tasks.ts           # Tasks API
│   │   │   └── users.ts           # Users API
│   │   │
│   │   └── utils/
│   │       ├── cn.ts              # Class name utility
│   │       ├── format.ts          # Formatting utilities
│   │       └── media.ts           # Media utilities
│   │
│   └── styles/
│       └── globals.css            # Global styles
│
├── public/
│   ├── favicon.ico
│   └── images/
│
├── .env.local                     # Environment variables (gitignored)
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── Dockerfile                     # Docker build file
├── next.config.ts                 # Next.js configuration
├── package.json                   # Node dependencies
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # Admin documentation
```

## 👥 Citizen Portal (civiclens-client/)

```
civiclens-client/
├── src/
│   ├── pages/
│   │   ├── citizen/
│   │   │   ├── Dashboard.tsx      # Citizen dashboard
│   │   │   ├── Login.tsx          # Login page
│   │   │   ├── MyReports.tsx      # User's reports
│   │   │   ├── Profile.tsx        # User profile
│   │   │   ├── SubmitReport.tsx   # Submit report
│   │   │   └── TrackReport.tsx    # Track report
│   │   │
│   │   └── NotFound.tsx           # 404 page
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx         # Header component
│   │   │   ├── Footer.tsx         # Footer component
│   │   │   └── Loader.tsx         # Loading spinner
│   │   │
│   │   ├── forms/
│   │   │   ├── ReportForm.tsx     # Report form
│   │   │   └── ProfileForm.tsx    # Profile form
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx         # Button component
│   │       ├── Card.tsx           # Card component
│   │       └── Input.tsx          # Input component
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx        # Auth context
│   │
│   ├── services/
│   │   ├── api.ts                 # API client
│   │   ├── authService.ts         # Auth service
│   │   └── reportsService.ts      # Reports service
│   │
│   ├── utils/
│   │   ├── constants.ts           # Constants
│   │   ├── formatters.ts          # Formatting utilities
│   │   └── validators.ts          # Validation utilities
│   │
│   ├── styles/
│   │   └── index.css              # Global styles
│   │
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # Entry point
│   └── vite-env.d.ts              # Vite types
│
├── public/
│   ├── favicon.ico
│   └── assets/
│
├── .env                           # Environment variables (gitignored)
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── Dockerfile                     # Docker build file
├── nginx.conf                     # Nginx configuration
├── index.html                     # HTML template
├── package.json                   # Node dependencies
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite configuration
└── README.md                      # Client documentation
```

## 📚 Documentation (docs/)

```
docs/
├── API_DOCUMENTATION.md           # Complete API reference
├── DATABASE_SCHEMA.md             # Database structure
├── DEPLOYMENT_GUIDE.md            # Deployment instructions
├── SETTINGS_IMPLEMENTATION_COMPLETE.md  # Settings guide
└── [other documentation files]
```

## 🔑 Key Files Explained

### Backend

- **`app/main.py`** - FastAPI application initialization, middleware, CORS
- **`app/config.py`** - Environment variables and configuration
- **`app/api/v1/*.py`** - API endpoint definitions
- **`app/models/*.py`** - SQLAlchemy database models
- **`app/schemas/*.py`** - Pydantic request/response schemas
- **`app/crud/*.py`** - Database CRUD operations
- **`app/services/*.py`** - Business logic services
- **`alembic/versions/*.py`** - Database migration files

### Admin Dashboard

- **`src/app/dashboard/page.tsx`** - Main dashboard page
- **`src/components/layout/Sidebar.tsx`** - Navigation menu
- **`src/lib/api/*.ts`** - API client functions
- **`src/contexts/AuthContext.tsx`** - Authentication state
- **`tailwind.config.ts`** - UI styling configuration

### Citizen Portal

- **`src/pages/citizen/*.tsx`** - Citizen-facing pages
- **`src/services/*.ts`** - API service layer
- **`src/contexts/AuthContext.tsx`** - Authentication state
- **`vite.config.ts`** - Build configuration

## 🗄️ Database Structure

### Main Tables

- **users** - User accounts (citizens, officers, admins)
- **reports** - Civic issue reports
- **tasks** - Officer task assignments
- **media** - Uploaded images and audio
- **departments** - Government departments
- **audit_logs** - System activity logs
- **sessions** - User sessions
- **client_sync_state** - Offline sync state

## 🔐 Environment Variables

### Backend (.env)
- Database connection
- Redis connection
- JWT secrets
- MinIO credentials
- Security settings

### Frontend (.env.local / .env)
- API endpoint URL
- Feature flags
- Analytics keys

## 📦 Dependencies

### Backend (Python)
- FastAPI - Web framework
- SQLAlchemy - ORM
- Alembic - Migrations
- Redis - Caching
- Scikit-learn - AI/ML
- Pillow - Image processing

### Frontend (Node.js)
- Next.js / React - UI framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- Axios - HTTP client
- Lucide - Icons

## 🚀 Build Outputs

### Backend
- No build step (Python)
- Runs directly with uvicorn

### Admin Dashboard
- `.next/` - Next.js build output
- `.next/standalone/` - Docker standalone build

### Citizen Portal
- `dist/` - Vite production build
- Static files served by Nginx

## 🧪 Testing Structure

```
tests/
├── unit/                  # Unit tests
├── integration/           # Integration tests
├── e2e/                   # End-to-end tests
└── fixtures/              # Test data
```

---

**This structure supports:**
- ✅ Scalable development
- ✅ Clear separation of concerns
- ✅ Easy navigation
- ✅ Modular architecture
- ✅ Production deployment
