# 🐳 CivicLens v2.0 - Docker Deployment Guide

Complete guide for deploying CivicLens using Docker Compose with all services including AI worker.

## 📋 Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 20GB+ disk space

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/tejasbhor/Civiclens_.git
cd Civiclens_
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.docker.example .env

# Edit with your values
nano .env  # or use your preferred editor
```

**Required Variables:**
```env
POSTGRES_PASSWORD=your_secure_password
REDIS_PASSWORD=your_redis_password
SECRET_KEY=your_32_char_secret_key
MINIO_ROOT_PASSWORD=your_minio_password
```

### 3. Build and Start Services

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Initialize Database

```bash
# Run database migrations
docker-compose exec backend alembic upgrade head

# Run production setup (creates admin, seeds data)
docker-compose exec backend python setup_production.py

# Or non-interactive mode:
docker-compose exec -e ADMIN_PHONE="+919876543210" \
  -e ADMIN_EMAIL="admin@civiclens.gov.in" \
  -e ADMIN_NAME="System Administrator" \
  -e ADMIN_PASSWORD="SecurePassword123!" \
  backend python setup_production.py --non-interactive
```

### 5. Access Services

- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Admin Dashboard:** http://localhost:3000
- **Citizen Portal:** http://localhost:5173
- **MinIO Console:** http://localhost:9001

## 📦 Services Overview

### Core Services

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| **postgres** | civiclens-postgres | 5432 | PostgreSQL 14 with PostGIS |
| **redis** | civiclens-redis | 6379 | Redis 7 (cache, rate limiting, OTP) |
| **minio** | civiclens-minio | 9000, 9001 | Object storage for media files |
| **backend** | civiclens-backend | 8000 | FastAPI backend server |
| **ai-worker** | civiclens-ai-worker | - | Background AI processing worker |
| **admin** | civiclens-admin | 3000 | Next.js admin dashboard |
| **client** | civiclens-client | 5173 | React citizen portal |

### Service Dependencies

```
postgres (healthy) ─┬─> backend (healthy) ─┬─> admin
redis (healthy) ────┤                       ├─> client
minio (healthy) ────┘                       └─> ai-worker
```

## 🔧 Configuration

### Environment Variables

#### Database
```env
POSTGRES_PASSWORD=changeme123
DATABASE_URL=postgresql+asyncpg://civiclens_user:password@postgres:5432/civiclens_db
```

#### Redis
```env
REDIS_PASSWORD=changeme
REDIS_URL=redis://:password@redis:6379/0
```

#### MinIO
```env
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=minio:9000
```

#### Application
```env
SECRET_KEY=your-secret-key-min-32-characters
CITY_CODE=RNC
APP_VERSION=2.0.0
ENVIRONMENT=production
DEBUG=false
```

### Volume Mounts

```yaml
volumes:
  postgres-data:      # Database data
  redis-data:         # Redis persistence
  minio-data:         # Media files
  ./models:           # AI models (shared between backend and ai-worker)
  ./media:            # Local media fallback
```

## 🤖 AI Worker

The AI worker processes reports in the background using a 7-stage pipeline:

1. **Duplicate Detection** - Identifies similar reports
2. **Category Classification** - 8 categories using BART
3. **Severity Scoring** - 4 levels (low/medium/high/critical)
4. **Department Routing** - Routes to 6 Ranchi departments
5. **Update Report** - Sets AI fields with confidence scores
6. **Auto-assign Department** - ≥50% confidence
7. **Auto-assign Officer** - ≥60% confidence

### AI Worker Logs

```bash
# View AI worker logs
docker-compose logs -f ai-worker

# Check AI worker status
docker-compose ps ai-worker

# Restart AI worker
docker-compose restart ai-worker
```

### AI Models

Models are automatically downloaded on first run (~1.5GB):
- `facebook/bart-large-mnli` - Category classification
- `all-MiniLM-L6-v2` - Duplicate detection

**Pre-download models (optional):**
```bash
docker-compose exec backend python -m app.ml.download_models
```

## 🔍 Health Checks

All services have health checks configured:

```bash
# Check all service health
docker-compose ps

# Test backend health
curl http://localhost:8000/health

# Test Redis
docker-compose exec redis redis-cli ping

# Test PostgreSQL
docker-compose exec postgres pg_isready -U civiclens_user
```

## 📊 Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ai-worker

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## 🛠️ Management Commands

### Start/Stop Services

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Restart specific service
docker-compose restart backend
docker-compose restart ai-worker
```

### Database Operations

```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Rollback migration
docker-compose exec backend alembic downgrade -1

# Create migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Database backup
docker-compose exec postgres pg_dump -U civiclens_user civiclens_db > backup.sql

# Database restore
docker-compose exec -T postgres psql -U civiclens_user civiclens_db < backup.sql
```

### Shell Access

```bash
# Backend shell
docker-compose exec backend bash

# PostgreSQL shell
docker-compose exec postgres psql -U civiclens_user -d civiclens_db

# Redis CLI
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD}

# Python shell
docker-compose exec backend python
```

## 🔐 Security

### Production Checklist

- [ ] Change all default passwords
- [ ] Use strong SECRET_KEY (min 32 characters)
- [ ] Enable HTTPS (use reverse proxy like Nginx)
- [ ] Configure firewall rules
- [ ] Set up SSL certificates
- [ ] Enable Redis password authentication
- [ ] Restrict MinIO access
- [ ] Configure CORS origins properly
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts

### Recommended: Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name civiclens.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name civiclens.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin Dashboard
    location /admin/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Citizen Portal
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🐛 Troubleshooting

### Common Issues

#### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common causes:
# - Database not ready (wait for health check)
# - Missing environment variables
# - Port 8000 already in use
```

#### AI Worker crashes
```bash
# Check logs
docker-compose logs ai-worker

# Common causes:
# - Models not downloaded (download manually)
# - Insufficient memory (increase Docker memory limit)
# - Backend not healthy
```

#### Database connection errors
```bash
# Check PostgreSQL
docker-compose exec postgres pg_isready -U civiclens_user

# Check connection string
docker-compose exec backend env | grep DATABASE_URL

# Restart PostgreSQL
docker-compose restart postgres
```

#### Redis connection errors
```bash
# Check Redis
docker-compose exec redis redis-cli ping

# Check password
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} ping
```

### Reset Everything

```bash
# Stop all services
docker-compose down

# Remove volumes (⚠️ deletes all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Clean build cache
docker system prune -a

# Start fresh
docker-compose up -d --build
```

## 📈 Scaling

### Horizontal Scaling

```yaml
# Scale AI workers
docker-compose up -d --scale ai-worker=3

# Scale backend (requires load balancer)
docker-compose up -d --scale backend=2
```

### Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 🔄 Updates

### Update to Latest Version

```bash
# Pull latest code
git pull origin main

# Rebuild services
docker-compose build --no-cache

# Stop services
docker-compose down

# Start with new images
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head
```

## 📞 Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/tejasbhor/Civiclens_/issues)
- **Docker Hub:** Coming soon

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for Smart Cities**

*Making civic governance more efficient, transparent, and citizen-friendly.*
