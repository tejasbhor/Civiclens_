# 🚀 CivicLens Quick Start Guide

Get CivicLens up and running in 10 minutes!

## ⚡ Prerequisites

- Docker & Docker Compose installed
- 4GB+ RAM available
- Ports 3000, 5173, 8000, 5432, 6379, 9000 available

## 📦 Installation

### 1. Clone & Configure

```bash
# Clone repository
https://github.com/tejasbhor/Civiclens_.git

# Copy environment file
cp .env.example .env

# Edit .env (optional for development)
nano .env
```

### 2. Start Services

```bash
# Start all services with Docker Compose
docker-compose up -d

# Wait for services to be healthy (30-60 seconds)
docker-compose ps
```

### 3. Initialize Database

```bash
# Run database migrations
docker-compose exec backend alembic upgrade head

# Create super admin user
docker-compose exec backend python -c "
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from passlib.context import CryptContext

db = SessionLocal()
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

admin = User(
    phone='+919876543210',
    email='admin@civiclens.local',
    full_name='Super Admin',
    role=UserRole.SUPER_ADMIN,
    hashed_password=pwd_context.hash('Admin@123'),
    is_active=True,
    phone_verified=True,
    email_verified=True
)

db.add(admin)
db.commit()
print('✅ Super admin created!')
print('Email: admin@civiclens.local')
print('Password: Admin@123')
"
```

### 4. Access Applications

| Application | URL | Credentials |
|------------|-----|-------------|
| **Backend API** | http://localhost:8000 | - |
| **API Docs** | http://localhost:8000/docs | - |
| **Admin Dashboard** | http://localhost:3000 | admin@civiclens.local / Admin@123 |
| **Citizen Portal** | http://localhost:5173 | Sign up with phone |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin |

## 🎯 First Steps

### 1. Login to Admin Dashboard

1. Go to http://localhost:3000
2. Login with: `admin@civiclens.local` / `Admin@123`
3. Explore the dashboard!

### 2. Create a Test Report

**Option A: Via Citizen Portal**
1. Go to http://localhost:5173
2. Sign up with a phone number (use OTP: 123456 for testing)
3. Submit a report with photo and location

**Option B: Via API**
```bash
# Get auth token
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@civiclens.local","password":"Admin@123"}' \
  | jq -r '.access_token')

# Create report
curl -X POST http://localhost:8000/api/v1/reports \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Broken Street Light",
    "description": "Street light not working on Main Street",
    "latitude": 23.3441,
    "longitude": 85.3096,
    "landmark": "Near City Mall"
  }'
```

### 3. View in Admin Dashboard

1. Go to Dashboard → Reports
2. See your newly created report
3. Click to view details
4. Update status, assign to officer

## 🛠️ Development Mode

### Backend Development

```bash
cd civiclens-backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment
cp .env.example .env

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload
```

### Admin Dashboard Development

```bash
cd civiclens-admin

# Install dependencies
npm install

# Copy environment
cp .env.example .env.local

# Start dev server
npm run dev
```

### Citizen Portal Development

```bash
cd civiclens-client

# Install dependencies
npm install

# Copy environment
cp .env.example .env

# Start dev server
npm run dev
```

## 📚 Next Steps

1. **Read Documentation**
   - [Full README](README.md)
   - [API Documentation](docs/API_DOCUMENTATION.md)
   - [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)

2. **Explore Features**
   - Create reports
   - Assign tasks to officers
   - View analytics
   - Configure settings

3. **Customize**
   - Update city code in settings
   - Add departments
   - Create officer accounts
   - Configure notifications

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Rebuild if needed
docker-compose up -d --build
```

### Port Already in Use

```bash
# Find process
sudo lsof -i :8000  # or :3000, :5173

# Kill process
sudo kill -9 <PID>

# Or change port in docker-compose.yml
```

### Database Connection Error

```bash
# Check PostgreSQL
docker-compose exec postgres pg_isready

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Can't Login

```bash
# Reset admin password
docker-compose exec backend python -c "
from app.db.session import SessionLocal
from app.models.user import User
from passlib.context import CryptContext

db = SessionLocal()
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

admin = db.query(User).filter(User.email == 'admin@civiclens.local').first()
if admin:
    admin.hashed_password = pwd_context.hash('Admin@123')
    db.commit()
    print('✅ Password reset to: Admin@123')
"
```

## 🧹 Clean Up

```bash
# Stop all services
docker-compose down

# Remove volumes (⚠️ deletes all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## 💡 Tips

1. **Use Docker Desktop** for easier management (Windows/Mac)
2. **Check logs** if something doesn't work
3. **Wait for health checks** before accessing services
4. **Use API docs** at /docs for testing endpoints
5. **Enable debug mode** in .env for development

## 📞 Need Help?

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/civiclens/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/civiclens/discussions)

---

**Happy Coding! 🎉**

*You're now ready to start developing with CivicLens!*
