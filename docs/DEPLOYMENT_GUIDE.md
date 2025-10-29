# CivicLens Deployment Guide

This guide covers deploying CivicLens in production environments.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 50 GB SSD
- OS: Ubuntu 20.04+ / Debian 11+ / CentOS 8+

**Recommended:**
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 100+ GB SSD
- OS: Ubuntu 22.04 LTS

### Software Requirements

- Docker 20.10+ & Docker Compose 2.0+ (for Docker deployment)
- Python 3.11+ (for manual deployment)
- Node.js 18+ (for manual deployment)
- PostgreSQL 14+ with PostGIS extension
- Redis 6+
- Nginx (for reverse proxy)
- SSL certificate (Let's Encrypt recommended)

## Docker Deployment (Recommended)

### 1. Clone Repository

```bash
https://github.com/tejasbhor/Civiclens_.git
```

### 2. Configure Environment

```bash
# Copy environment file
cp .env.example .env

# Edit with your values
nano .env
```

**Important:** Change these values:
- `POSTGRES_PASSWORD` - Strong database password
- `REDIS_PASSWORD` - Strong Redis password
- `SECRET_KEY` - Random 64+ character string
- `MINIO_ROOT_PASSWORD` - Strong MinIO password

### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Create super admin
docker-compose exec backend python create_super_admin.py
```

### 5. Access Applications

- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Admin Dashboard**: http://localhost:3000
- **Citizen Portal**: http://localhost:5173
- **MinIO Console**: http://localhost:9001

### 6. Configure Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/civiclens

server {
    listen 80;
    server_name api.civiclens.example.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name admin.civiclens.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name civiclens.example.com;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/civiclens /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Manual Deployment

### 1. Install System Dependencies

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip \
    postgresql-14 postgresql-14-postgis-3 redis-server \
    nodejs npm nginx certbot python3-certbot-nginx

# CentOS/RHEL
sudo dnf install -y python3.11 python3-pip \
    postgresql14-server postgresql14-contrib postgis33_14 \
    redis nodejs nginx certbot python3-certbot-nginx
```

### 2. Setup PostgreSQL

```bash
# Initialize database
sudo -u postgres psql

CREATE DATABASE civiclens;
CREATE USER civiclens WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE civiclens TO civiclens;

# Enable PostGIS
\c civiclens
CREATE EXTENSION postgis;
\q
```

### 3. Setup Redis

```bash
# Configure Redis
sudo nano /etc/redis/redis.conf

# Set password
requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis
sudo systemctl enable redis
```

### 4. Deploy Backend

```bash
cd civiclens-backend

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env

# Run migrations
alembic upgrade head

# Create super admin
python create_super_admin.py

# Create systemd service
sudo nano /etc/systemd/system/civiclens-backend.service
```

**Backend Service File:**

```ini
[Unit]
Description=CivicLens Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=civiclens
WorkingDirectory=/opt/civiclens/civiclens-backend
Environment="PATH=/opt/civiclens/civiclens-backend/.venv/bin"
ExecStart=/opt/civiclens/civiclens-backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl daemon-reload
sudo systemctl start civiclens-backend
sudo systemctl enable civiclens-backend
```

### 5. Deploy Admin Dashboard

```bash
cd civiclens-admin

# Install dependencies
npm install

# Build for production
npm run build

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "civiclens-admin" -- start
pm2 save
pm2 startup
```

### 6. Deploy Citizen Portal

```bash
cd civiclens-client

# Install dependencies
npm install

# Build for production
npm run build

# Copy to nginx
sudo cp -r dist/* /var/www/civiclens-client/
```

## Environment Configuration

### Production Environment Variables

```bash
# Backend (.env)
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://user:pass@localhost:5432/civiclens
REDIS_URL=redis://:pass@localhost:6379/0
SECRET_KEY=your_very_long_random_secret_key
HTTPS_ONLY=true
SECURE_COOKIES=true
CORS_ORIGINS=https://admin.civiclens.example.com,https://civiclens.example.com

# Admin Dashboard (.env.local)
NEXT_PUBLIC_API_URL=https://api.civiclens.example.com/api/v1
NODE_ENV=production

# Citizen Portal (.env)
VITE_API_URL=https://api.civiclens.example.com/api/v1
```

## SSL/TLS Configuration

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d api.civiclens.example.com
sudo certbot --nginx -d admin.civiclens.example.com
sudo certbot --nginx -d civiclens.example.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Manual SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.civiclens.example.com;
    
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.civiclens.example.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring & Logging

### Application Logs

```bash
# Backend logs
docker-compose logs -f backend

# Or for manual deployment
sudo journalctl -u civiclens-backend -f

# Admin dashboard logs
pm2 logs civiclens-admin

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Database connection
docker-compose exec postgres pg_isready

# Redis connection
docker-compose exec redis redis-cli ping
```

### Monitoring Tools (Optional)

- **Prometheus + Grafana** - Metrics and dashboards
- **Sentry** - Error tracking
- **ELK Stack** - Log aggregation
- **Uptime Robot** - Uptime monitoring

## Backup & Recovery

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U civiclens civiclens > backup_$(date +%Y%m%d).sql

# Or for manual deployment
pg_dump -U civiclens civiclens > backup_$(date +%Y%m%d).sql

# Automated daily backups
crontab -e
0 2 * * * /path/to/backup_script.sh
```

**Backup Script:**

```bash
#!/bin/bash
BACKUP_DIR="/backups/civiclens"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -U civiclens civiclens | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Media files backup
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /path/to/media

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### Restore from Backup

```bash
# Restore database
gunzip < backup.sql.gz | psql -U civiclens civiclens

# Restore media files
tar -xzf media_backup.tar.gz -C /path/to/media
```

## Troubleshooting

### Common Issues

**1. Database Connection Error**

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -U civiclens -h localhost -d civiclens

# Check firewall
sudo ufw status
```

**2. Redis Connection Error**

```bash
# Check Redis status
sudo systemctl status redis

# Test connection
redis-cli -a your_password ping
```

**3. Port Already in Use**

```bash
# Find process using port
sudo lsof -i :8000

# Kill process
sudo kill -9 <PID>
```

**4. Permission Issues**

```bash
# Fix media directory permissions
sudo chown -R civiclens:civiclens /path/to/media
sudo chmod -R 755 /path/to/media
```

**5. Docker Issues**

```bash
# Restart services
docker-compose restart

# Rebuild containers
docker-compose up -d --build

# Clean up
docker system prune -a
```

### Performance Optimization

1. **Database Indexing** - Ensure all indexes are created
2. **Connection Pooling** - Configure appropriate pool sizes
3. **Redis Caching** - Enable caching for frequently accessed data
4. **CDN** - Use CDN for static assets
5. **Load Balancing** - Use multiple backend instances

### Security Checklist

- [ ] Change all default passwords
- [ ] Enable SSL/TLS
- [ ] Configure firewall (UFW/iptables)
- [ ] Enable fail2ban for SSH
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Audit logs enabled

## Support

For deployment issues:
- Check [GitHub Issues](https://github.com/yourusername/civiclens/issues)
- Review logs for error messages
- Contact support: support@civiclens.example.com

---

**Deployment successful! 🚀**
