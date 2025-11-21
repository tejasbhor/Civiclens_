# 🚀 CivicLens - Quick Start Guide

## ONE-COMMAND STARTUP ⚡

### Start Everything (Recommended)
```powershell
.\START-ALL.ps1
```

This automatically starts:
1. ✅ Docker (Redis + MinIO)
2. ✅ Backend API (Port 8000)
3. ✅ AI Worker Engine
4. ✅ Admin Dashboard (Port 3001)
5. ✅ Client App (Port 8080)
6. ❓ Mobile App (Optional - you'll be asked)

### Stop Everything
```powershell
.\STOP-ALL.ps1
```

Gracefully stops all services.

---

## Manual Startup (If Needed)

### 1. Start Docker Containers
```powershell
cd D:\docker
docker compose up -d
```
- Redis: `localhost:6379`
- MinIO: `http://localhost:9000`

### 2. Start Backend API
```powershell
cd D:\Civiclens\civiclens-backend
& D:\Civiclens\.venv\Scripts\Activate.ps1
uv run uvicorn app.main:app --reload --host 0.0.0.0
```
- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`

### 3. Start AI Worker
```powershell
cd D:\Civiclens\civiclens-backend
& D:\Civiclens\.venv\Scripts\Activate.ps1
uv run python -m app.workers.ai_worker
```
- Logs: `civiclens-backend/logs/ai_worker.log`

### 4. Start Admin Dashboard
```powershell
cd D:\Civiclens\civiclens-admin
npm run dev
```
- URL: `http://localhost:3001`

### 5. Start Client App
```powershell
cd D:\Civiclens\civiclens-client
npm run dev
```
- URL: `http://localhost:8080`

### 6. Start Mobile App (Optional)
```powershell
cd D:\Civiclens\civiclens-mobile
npx expo start --clear
```
- Scan QR code in Expo Go app

---

## 🔐 Login Credentials

### Super Admin (Admin Dashboard)
```
URL: http://localhost:3001/auth/login
Phone: +919999999999
Password: Admin123!
Access: ✅ Full admin dashboard
```

### Nodal Officer (Mobile/Client App)
```
Phone: +919876543210
Password: Officer@123
Access: ❌ No admin dashboard (use mobile/client app)
```

---

## 🏗️ Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CIVICLENS STACK                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Docker Layer]                                         │
│  ├─ Redis (Port 6379) - Queue & Cache                  │
│  └─ MinIO (Port 9000) - File Storage                   │
│                                                         │
│  [Backend Layer - Python]                               │
│  ├─ FastAPI Server (Port 8000) - REST API              │
│  └─ AI Worker - Background Processing                  │
│                                                         │
│  [Frontend Layer - JavaScript]                          │
│  ├─ Admin Dashboard (Port 3001) - Next.js              │
│  ├─ Client App (Port 8080) - Vite + React              │
│  └─ Mobile App - React Native + Expo                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Health Checks

### Check All Services
```powershell
# Backend Health
curl http://localhost:8000/health

# AI Worker Status
cd civiclens-backend
uv run python check_ai_engine_health.py

# Redis Status
docker exec redis redis-cli ping

# MinIO Status
curl http://localhost:9000/minio/health/live
```

### View Logs
```powershell
# AI Worker Logs (Real-time)
Get-Content civiclens-backend\logs\ai_worker.log -Tail 20 -Wait

# Backend Logs
# (shown in terminal where uvicorn is running)

# Docker Logs
docker logs redis
docker logs minio
```

---

## 🐛 Troubleshooting

### "Port already in use"
**Problem**: Service can't start because port is occupied

**Solution**:
```powershell
# Find process using port 8000 (Backend)
netstat -ano | findstr :8000

# Kill process by PID
taskkill /PID <PID> /F

# Or use STOP-ALL.ps1 to stop everything
```

### "AI Worker not starting"
**Problem**: `ModuleNotFoundError` or missing dependencies

**Solution**:
```powershell
cd civiclens-backend
uv pip install -r requirements-ai.txt

# Always use 'uv run' for Python commands
uv run python -m app.workers.ai_worker
```

### "Docker not running"
**Problem**: Redis/MinIO containers won't start

**Solution**:
1. Start Docker Desktop
2. Wait for Docker to fully initialize
3. Run `.\START-ALL.ps1` again

### "npm install failed"
**Problem**: Node packages won't install

**Solution**:
```powershell
# Clear cache and reinstall
cd civiclens-admin  # or civiclens-client
rm -rf node_modules package-lock.json
npm install
```

---

## 🎯 Development Workflow

### Daily Startup
1. Run `.\START-ALL.ps1`
2. Wait 30-60 seconds for all services
3. Open http://localhost:3001 (Admin Dashboard)
4. Login with super admin credentials

### Daily Shutdown
1. Run `.\STOP-ALL.ps1`
2. Or press `Ctrl+C` in each terminal window

### Restart Single Service
```powershell
# Only restart backend
cd civiclens-backend
uv run uvicorn app.main:app --reload --host 0.0.0.0

# Only restart AI worker
cd civiclens-backend
uv run python -m app.workers.ai_worker

# Only restart admin dashboard
cd civiclens-admin
npm run dev
```

---

## 📚 Useful Commands

### Database
```powershell
cd civiclens-backend

# Seed super admin (if needed)
uv run python -m app.db.seeds.seed_navimumbai_data

# Check database
uv run python -c "from app.core.database import check_database_connection; import asyncio; print(asyncio.run(check_database_connection()))"
```

### Redis
```powershell
# Connect to Redis
docker exec -it redis redis-cli

# Check AI queue length
redis-cli LLEN queue:ai_processing

# Check AI worker heartbeat
redis-cli GET ai_worker:heartbeat
```

### Git
```powershell
# Pull latest changes
git pull origin main

# Check status
git status

# Commit changes
git add .
git commit -m "your message"
git push origin main
```

---

## 🎉 Ready to Go!

Your CivicLens development environment is ready!

**Next Steps:**
1. Run `.\START-ALL.ps1`
2. Wait for services to start (~1 minute)
3. Open http://localhost:3001
4. Login and start developing! 🚀

---

**Need Help?**
- Check logs in each terminal window
- Run health checks (see above)
- Review error messages carefully
- Restart services with `STOP-ALL.ps1` then `START-ALL.ps1`
