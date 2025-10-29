# 🏛️ CivicLens - Smart Civic Issue Management System

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/tejasbhor/Civiclens_.git)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg)](https://reactjs.org/)

**CivicLens** is a comprehensive, AI-powered civic issue management platform designed for smart cities. It enables citizens to report civic issues, government officers to manage and resolve them efficiently, and administrators to gain insights through analytics and predictions.

## 🌟 Key Features

### 👥 For Citizens
- **Quick Report Submission** - Report civic issues with photos, audio, and GPS location
- **Real-time Tracking** - Track report status with detailed timeline
- **OTP-based Authentication** - Quick login without account creation
- **Reputation System** - Earn points for helpful reports and validations
- **Multi-language Support** - Interface available in multiple languages

### 👮 For Officers
- **Task Management** - View and manage assigned civic issues
- **Field Updates** - Update status with before/after photos
- **GPS Tracking** - Location-based task assignment
- **Workload Dashboard** - Monitor personal and team performance
- **Mobile-first Design** - Optimized for field work

### 🏛️ For Administrators
- **Comprehensive Dashboard** - Real-time statistics and insights
- **AI-powered Classification** - Automatic issue categorization
- **Analytics & Predictions** - Trend analysis and forecasting
- **User Management** - Role-based access control
- **Audit Logging** - Complete activity tracking
- **Settings Management** - System-wide configuration

## 🏗️ Architecture

```
CivicLens/
├── civiclens-backend/      # FastAPI backend server
├── civiclens-admin/        # Next.js admin dashboard
├── civiclens-client/       # React citizen portal
├── docs/                   # Documentation
└── alembic/               # Database migrations
```

### Technology Stack

**Backend:**
- FastAPI 0.109.0 - High-performance async API framework
- PostgreSQL with PostGIS - Geospatial database
- Redis - Caching and session management
- SQLAlchemy 2.0 - ORM with async support
- MinIO - Object storage for media files
- Scikit-learn - AI/ML for classification

**Admin Dashboard:**
- Next.js 15.5.6 - React framework with SSR
- TypeScript - Type-safe development
- Tailwind CSS - Utility-first styling
- Lucide Icons - Modern icon library

**Citizen Portal:**
- React 18.3.1 - UI library
- Vite - Fast build tool
- TypeScript - Type safety
- Tailwind CSS - Responsive design

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- Redis 6+
- MinIO (optional, for production)

### 1. Clone the Repository

```bash
https://github.com/tejasbhor/Civiclens_.git
```

### 2. Backend Setup

```bash
cd civiclens-backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# DATABASE_URL, REDIS_URL, SECRET_KEY, etc.

# Run database migrations
alembic upgrade head

# Create super admin
python create_super_admin.py

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### 3. Admin Dashboard Setup

```bash
cd civiclens-admin

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Start development server
npm run dev
```

Admin Dashboard: `http://localhost:3000`

### 4. Citizen Portal Setup

```bash
cd civiclens-client

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env
# VITE_API_URL=http://localhost:8000/api/v1

# Start development server
npm run dev
```

Citizen Portal: `http://localhost:5173`

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete API reference
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - Database structure and relationships
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[Settings Implementation](docs/SETTINGS_IMPLEMENTATION_COMPLETE.md)** - Admin settings guide
- **[Testing Guide](civiclens-backend/TESTING_GUIDE.md)** - Testing procedures

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth
- **Role-Based Access Control** - 7-tier user hierarchy
- **Two-Factor Authentication** - TOTP-based 2FA for admins
- **Rate Limiting** - Prevent brute force attacks
- **Session Fingerprinting** - Detect session hijacking
- **Audit Logging** - Complete activity tracking
- **Password Policies** - Configurable complexity requirements
- **IP Whitelisting** - Restrict admin access by IP

## 👥 User Roles

1. **Citizen** - Report issues, track status
2. **Contributor** - Auto-promoted based on reputation
3. **Moderator** - Area-specific moderation
4. **Nodal Officer** - Field workers, task management
5. **Auditor** - Read-only government access
6. **Admin** - Full operational access
7. **Super Admin** - System owner, ultimate authority

## 🗺️ Key Features in Detail

### AI-Powered Classification
- Automatic categorization of reports
- Confidence scoring
- Manual override capability
- Continuous learning from validated data

### Geospatial Features
- GPS-based report submission
- Location-based task assignment
- Reverse geocoding for addresses
- Area-based moderation

### Analytics Dashboard
- Real-time statistics
- Trend analysis
- Predictive insights
- Department performance metrics
- Response time tracking

### Offline Support
- Progressive Web App (PWA)
- Offline report submission
- Background sync when online
- Conflict resolution

## 🧪 Testing

```bash
# Backend tests
cd civiclens-backend
pytest

# Frontend tests
cd civiclens-admin
npm test

cd civiclens-client
npm test
```

## 📦 Production Deployment

### Docker Deployment (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for detailed instructions on:
- Server setup
- Database configuration
- Environment variables
- SSL/TLS setup
- Nginx configuration
- Process management with PM2/Systemd

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- FastAPI for the excellent async framework
- Next.js team for the powerful React framework
- PostgreSQL and PostGIS for robust geospatial support
- The open-source community for amazing tools and libraries

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/civiclens/issues)
- **Email**: support@civiclens.example.com

## 🗺️ Roadmap

### v1.1 (Planned)
- [ ] Mobile apps (iOS & Android)
- [ ] WhatsApp integration for notifications
- [ ] Advanced AI models for priority prediction
- [ ] Multi-city support
- [ ] Public dashboard for transparency

### v1.2 (Planned)
- [ ] Integration with government systems (DigiLocker, Aadhaar)
- [ ] Chatbot for citizen queries
- [ ] Video report support
- [ ] Gamification for citizens
- [ ] Advanced analytics with ML insights

## 📊 Project Status

- ✅ Core API - Complete
- ✅ Admin Dashboard - Complete
- ✅ Citizen Portal - Complete
- ✅ Authentication & Security - Complete
- ✅ AI Classification - Complete
- ✅ Analytics - Complete
- ✅ Settings Management - Complete
- 🚧 Mobile Apps - In Progress
- 📋 Government Integration - Planned

---

**Built with ❤️ for Smart Cities**

*Making civic governance more efficient, transparent, and citizen-friendly.*
