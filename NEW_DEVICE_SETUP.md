# 🚀 New Device Setup - Quick Reference

**Repository:** https://github.com/tejasbhor/Civiclens_  
**Latest Commit:** `09f17e8` (Complete sync - Nov 20, 2025)

---

## ⚡ Quick Start (Copy & Paste)

### 1. Clone Repository
```bash
git clone https://github.com/tejasbhor/Civiclens_.git
cd Civiclens
```

### 2. Verify Everything
```bash
# Check latest commit
git log --oneline -1
# Should show: 09f17e8 chore: complete project sync

# Check status
git status
# Should show: "On branch main, nothing to commit, working tree clean"
```

---

## 📋 Prerequisites Checklist

Install these first:
- [ ] Python 3.11+
- [ ] Node.js 18+
- [ ] PostgreSQL 14+ with PostGIS extension
- [ ] Redis 6+
- [ ] Git

---

## 🔧 Backend Setup (5 minutes)

```bash
cd civiclens-backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Linux/Mac)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with your database URL, Redis URL, etc.

# Setup database
python setup_production.py

# Start backend
uvicorn app.main:app --reload

# In another terminal - Start AI worker
python start_ai_worker.py
```

**Backend should be running on:** http://localhost:8000

---

## 🎨 Admin Dashboard Setup (3 minutes)

```bash
cd civiclens-admin

# Install dependencies
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with API URL: http://localhost:8000/api/v1

# Start development server
npm run dev
```

**Dashboard should be running on:** http://localhost:3000

---

## 📱 Mobile App Setup (3 minutes)

```bash
cd civiclens-mobile

# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env with your API URL

# Start Expo
npm start
```

---

## 🧪 Verify Everything Works

### Test Backend
```bash
# Health check
curl http://localhost:8000/health

# Should return: {"status":"healthy","timestamp":"..."}
```

### Test AI Engine
```bash
# Check AI worker status
curl http://localhost:8000/api/v1/ai-insights/pipeline-status

# Should return: {"worker_status":"running",...}
```

### Test Dashboard
1. Open http://localhost:3000
2. Look for green AI Engine indicator in top nav
3. Try logging in with admin credentials

### Test Mobile
1. Run `npm start` in civiclens-mobile
2. Open Expo Go app on phone
3. Scan QR code
4. Should load CivicLens mobile app

---

## 🔑 Important Files to Configure

### Backend `.env`
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/civiclens

# Redis
REDIS_URL=redis://localhost:6379

# MinIO/S3
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Security
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Admin `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Mobile `.env`
```env
API_URL=http://YOUR_LOCAL_IP:8000/api/v1
# Use your computer's local IP, not localhost
```

---

## 🐛 Common Issues & Fixes

### Issue: "Module not found"
```bash
# Activate virtual environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac
```

### Issue: "Database connection failed"
```bash
# Check PostgreSQL is running
# Windows: Check Services
# Linux: sudo systemctl status postgresql
# Mac: brew services list

# Create database if needed
createdb civiclens
```

### Issue: "Redis connection failed"
```bash
# Check Redis is running
redis-cli PING
# Should return: PONG

# Start Redis if needed
# Windows: Start Redis service
# Linux: sudo systemctl start redis
# Mac: brew services start redis
```

### Issue: Port already in use
```bash
# Backend (8000): Kill existing process
# Windows: netstat -ano | findstr :8000
# Linux/Mac: lsof -ti:8000 | xargs kill

# Or change port in uvicorn command:
uvicorn app.main:app --reload --port 8001
```

### Issue: Mobile app can't connect
```bash
# Use your computer's local IP, not localhost
# Find IP:
# Windows: ipconfig
# Linux/Mac: ifconfig

# Update mobile .env:
API_URL=http://192.168.1.XXX:8000/api/v1
```

---

## 📚 Documentation Quick Links

### Essential Docs (Read First)
1. `README.md` - Project overview
2. `COMPLETE_SYNC_SUMMARY.md` - What was pushed
3. `civiclens-backend/AI_ENGINE_QUICK_START.md` - AI setup

### Backend Docs
- `civiclens-backend/README.md` - Backend overview
- `civiclens-backend/BACKEND_CLEANUP_SUMMARY.md` - File structure
- `civiclens-backend/AI_ENGINE_STATUS.md` - AI status

### Setup Scripts
- `start-dev.ps1` - Start all services (Windows)
- `verify-setup.ps1` - Verify configuration
- `test-connection.ps1` - Test backend connection

---

## 🎯 What You Have Now

### Backend
✅ Production-ready AI engine  
✅ Complete API with offline-first support  
✅ Health monitoring and diagnostics  
✅ Test utilities and scripts  

### Admin Dashboard
✅ AI status integration  
✅ Real-time monitoring  
✅ Enhanced features  

### Mobile App
✅ Complete offline-first system  
✅ Citizen & Officer features  
✅ Biometric authentication  
✅ Network sync services  

### Documentation
✅ Setup guides  
✅ Implementation details  
✅ Troubleshooting  
✅ API references  

---

## ⚡ Quick Commands Reference

```bash
# Start everything (Windows)
.\start-dev.ps1

# Backend only
cd civiclens-backend
uvicorn app.main:app --reload

# AI Worker
cd civiclens-backend
python start_ai_worker.py

# Admin Dashboard
cd civiclens-admin
npm run dev

# Mobile App
cd civiclens-mobile
npm start

# Health checks
curl http://localhost:8000/health
python civiclens-backend/check_ai_engine_health.py
```

---

## 📞 Need Help?

### Check These First:
1. All prerequisites installed?
2. Virtual environment activated?
3. Services running (PostgreSQL, Redis)?
4. Environment files configured?
5. Correct ports not in use?

### View Logs:
```bash
# Backend logs (in terminal)
# AI worker logs
tail -f civiclens-backend/logs/ai_worker.log

# Check what's different
git status
git diff
```

---

## 🎉 You're All Set!

Once everything is running:
- **Backend API:** http://localhost:8000
- **Admin Dashboard:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

**Total Setup Time:** ~15 minutes

**Repository State:** Complete & Current ✅  
**All Features:** Preserved & Working ✅  
**Ready to Code:** Yes! 🚀

---

**Last Updated:** November 20, 2025  
**Commit:** 09f17e8  
**Status:** Production Ready
