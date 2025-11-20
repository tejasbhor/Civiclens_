# CivicLens Backend - Production Deployment Checklist

## 🔒 Security Configuration (CRITICAL)

### Environment Variables
- [ ] **Change SECRET_KEY** - Generate a new cryptographically secure key (minimum 32 characters)
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
- [ ] **Set DEBUG=False** - Never run production with DEBUG=True
- [ ] **Set ENVIRONMENT=production**
- [ ] **Configure CORS_ORIGINS** - Set to your actual frontend domain(s), remove localhost
  ```
  CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  ```
- [ ] **Secure Database Credentials** - Use strong passwords, never use default credentials
- [ ] **Secure Redis Password** - Set REDIS_PASSWORD to a strong value
- [ ] **Secure MinIO Credentials** - Change MINIO_ACCESS_KEY and MINIO_SECRET_KEY
- [ ] **Set MINIO_SECURE=true** - Enable HTTPS for MinIO in production

### Rate Limiting (MUST IMPLEMENT)
- [ ] **Install rate limiting package**
  ```bash
  pip install slowapi
  ```
- [ ] **Add rate limiting to auth endpoints**:
  - `/auth/request-otp` - 3 requests per 5 minutes per IP
  - `/auth/verify-otp` - 5 attempts per 15 minutes per IP
  - `/auth/login` - 5 attempts per 15 minutes per IP
- [ ] **Add global rate limiting** - 100 requests per minute per IP

### SSL/TLS
- [ ] **Enable HTTPS** - Configure SSL certificates (Let's Encrypt recommended)
- [ ] **Force HTTPS redirects** - Configure reverse proxy (Nginx/Caddy)
- [ ] **Set secure cookie flags** - If using cookies in future

### Database Security
- [ ] **Run migrations** - Execute all Alembic migrations
  ```bash
  alembic upgrade head
  ```
- [ ] **Enable PostGIS extension** - Required for geospatial features
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  ```
- [ ] **Database connection pooling** - Already configured (verify settings)
- [ ] **Database backups** - Set up automated daily backups
- [ ] **Restrict database access** - Only allow backend server IP

### Redis Security
- [ ] **Enable Redis authentication** - Set requirepass in redis.conf
- [ ] **Bind to localhost only** - Unless using separate Redis server
- [ ] **Disable dangerous commands** - rename-command CONFIG "", FLUSHALL "", etc.

---

## 📊 Monitoring & Logging

### Logging
- [ ] **Configure structured logging** - JSON format for log aggregation
- [ ] **Set up log rotation** - Prevent disk space issues
- [ ] **Configure Sentry** - Already in requirements, add DSN to environment
  ```
  SENTRY_DSN=https://your-sentry-dsn
  ```
- [ ] **Log security events** - Failed logins, role changes, etc.

### Monitoring
- [ ] **Set up health check monitoring** - Monitor `/health` endpoint
- [ ] **Database connection monitoring** - Alert on connection pool exhaustion
- [ ] **Redis connection monitoring** - Alert on connection failures
- [ ] **Disk space monitoring** - For media uploads and logs
- [ ] **Memory usage monitoring** - Set up alerts for high memory usage

### Application Performance Monitoring (APM)
- [ ] **Add request ID tracking** - For distributed tracing
- [ ] **Monitor slow queries** - Database query performance
- [ ] **Track API endpoint latency** - Identify bottlenecks

---

## 🗄️ Database Configuration

### PostgreSQL Settings
- [ ] **Increase max_connections** - Based on expected load (default: 100)
- [ ] **Configure shared_buffers** - 25% of system RAM recommended
- [ ] **Enable query logging** - For slow queries (log_min_duration_statement)
- [ ] **Set up connection pooling** - PgBouncer recommended for high traffic

### Indexes
- [ ] **Verify all indexes created** - Run migrations to create spatial index
- [ ] **Analyze query performance** - Use EXPLAIN ANALYZE for slow queries
- [ ] **Create additional indexes** - Based on actual query patterns

---

## 🚀 Performance Optimization

### Caching
- [ ] **Configure Redis caching** - For frequently accessed data
- [ ] **Implement cache invalidation** - Clear cache on data updates
- [ ] **Cache API responses** - For analytics and statistics endpoints

### Database Optimization
- [ ] **Enable database query caching** - PostgreSQL shared_buffers
- [ ] **Optimize N+1 queries** - Already using selectinload, verify in production
- [ ] **Set up read replicas** - For high read traffic (optional)

### File Storage
- [ ] **Configure MinIO/S3** - For media file storage
- [ ] **Set up CDN** - CloudFlare/CloudFront for static assets
- [ ] **Implement image optimization** - Resize/compress uploads
- [ ] **Set file size limits** - Already configured (10MB), verify adequate

---

## 🔐 Additional Security Measures

### Input Validation
- [ ] **Add input sanitization** - Prevent XSS attacks
- [ ] **Validate phone numbers** - Add regex validation for phone format
- [ ] **Validate email addresses** - Already using email-validator
- [ ] **Sanitize file uploads** - Validate file types and scan for malware

### API Security
- [ ] **Add request size limits** - Prevent DoS attacks
- [ ] **Implement API versioning** - Already using /api/v1
- [ ] **Add security headers** - X-Content-Type-Options, X-Frame-Options, etc.
  ```python
  # Add middleware for security headers
  ```
- [ ] **Disable API documentation in production** - Or protect with authentication
  ```python
  docs_url=None if settings.ENVIRONMENT == "production" else "/docs"
  redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc"
  ```

### Authentication
- [ ] **Implement token refresh** - Add refresh token mechanism
- [ ] **Add token blacklisting** - For logout functionality
- [ ] **Set token expiration** - Already set to 1440 minutes (verify appropriate)
- [ ] **Implement MFA** - Multi-factor authentication (optional but recommended)

---

## 🧪 Testing

### Pre-Deployment Testing
- [ ] **Run all unit tests** - `pytest app/tests/`
- [ ] **Run integration tests** - Test all API endpoints
- [ ] **Load testing** - Use tools like Locust or k6
- [ ] **Security testing** - OWASP ZAP or similar
- [ ] **Test database migrations** - On staging environment first

### Staging Environment
- [ ] **Deploy to staging first** - Mirror production environment
- [ ] **Test with production-like data** - Use anonymized production data
- [ ] **Verify all integrations** - SMS gateway, email, etc.
- [ ] **Performance testing** - Under expected load

---

## 📦 Deployment Process

### Pre-Deployment
- [ ] **Create database backup** - Before running migrations
- [ ] **Document rollback plan** - Steps to revert if deployment fails
- [ ] **Notify users** - If downtime expected
- [ ] **Set up maintenance page** - Display during deployment

### Deployment Steps
1. [ ] **Pull latest code** - `git pull origin main`
2. [ ] **Install dependencies** - `pip install -r requirements.txt`
3. [ ] **Run database migrations** - `alembic upgrade head`
4. [ ] **Restart application** - Using process manager (systemd/supervisor)
5. [ ] **Verify health check** - `curl https://api.yourdomain.com/health`
6. [ ] **Monitor logs** - Check for errors immediately after deployment
7. [ ] **Test critical endpoints** - Login, create report, etc.

### Process Management
- [ ] **Use systemd/supervisor** - For automatic restart on failure
- [ ] **Configure worker processes** - Based on CPU cores
  ```bash
  uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000
  ```
- [ ] **Set up graceful shutdown** - Handle in-flight requests

### Reverse Proxy (Nginx/Caddy)
- [ ] **Configure reverse proxy** - Nginx or Caddy recommended
- [ ] **Enable gzip compression** - Reduce bandwidth usage
- [ ] **Set request timeouts** - Prevent hanging connections
- [ ] **Configure websocket support** - If using real-time features

---

## 🌐 Infrastructure

### Server Requirements
- [ ] **Minimum 2 CPU cores** - 4+ recommended for production
- [ ] **Minimum 4GB RAM** - 8GB+ recommended
- [ ] **SSD storage** - For database performance
- [ ] **Firewall configuration** - Only expose necessary ports (80, 443)

### Networking
- [ ] **Configure DNS** - Point domain to server
- [ ] **Set up load balancer** - For high availability (optional)
- [ ] **Configure CDN** - For static assets and media files

### Backup Strategy
- [ ] **Database backups** - Daily automated backups
- [ ] **Media file backups** - Backup MinIO/S3 bucket
- [ ] **Configuration backups** - Backup .env and config files
- [ ] **Test restore process** - Verify backups are recoverable

---

## 📝 Documentation

### Required Documentation
- [ ] **API documentation** - Keep OpenAPI/Swagger docs updated
- [ ] **Deployment guide** - Document deployment process
- [ ] **Environment variables guide** - Document all required env vars
- [ ] **Troubleshooting guide** - Common issues and solutions
- [ ] **Runbook** - Operational procedures for common tasks

### Team Communication
- [ ] **Document architecture** - System design and data flow
- [ ] **Create incident response plan** - Steps for handling outages
- [ ] **Set up on-call rotation** - If 24/7 support required

---

## 🔍 Post-Deployment Verification

### Immediate Checks (First 30 minutes)
- [ ] **Health check endpoint** - Returns 200 OK
- [ ] **Database connectivity** - No connection errors in logs
- [ ] **Redis connectivity** - Cache working properly
- [ ] **Authentication flow** - OTP and login working
- [ ] **File uploads** - Media upload working
- [ ] **API response times** - Within acceptable limits

### First 24 Hours
- [ ] **Monitor error rates** - Check Sentry/logs for errors
- [ ] **Monitor performance** - API latency, database queries
- [ ] **Check resource usage** - CPU, memory, disk
- [ ] **Verify scheduled tasks** - If any background jobs
- [ ] **User feedback** - Monitor for reported issues

### First Week
- [ ] **Review logs** - Identify any patterns or issues
- [ ] **Performance optimization** - Based on real usage patterns
- [ ] **Scale if needed** - Add resources if bottlenecks identified
- [ ] **Update documentation** - Based on deployment experience

---

## ⚠️ Critical Issues to Address Before Production

### Must Fix (Blocking Production)
1. ✅ **Missing datetime import** - FIXED
2. ✅ **Unprotected officer creation endpoint** - FIXED
3. ✅ **Role transition method call error** - FIXED
4. ✅ **Cryptographically weak OTP** - FIXED
5. ✅ **Optional authentication dependency** - FIXED
6. ❌ **No rate limiting** - MUST IMPLEMENT
7. ❌ **SMS gateway integration** - Currently returns OTP in response

### Should Fix (High Priority)
1. ✅ **Duplicate requirements** - FIXED
2. ✅ **Spatial index missing** - FIXED
3. ❌ **No request ID tracking** - Implement for debugging
4. ❌ **Error information leakage** - Remove debug info from responses
5. ❌ **Missing input sanitization** - Add XSS protection
6. ❌ **No API documentation protection** - Disable or protect in production

---

## 📞 Support & Maintenance

### Monitoring Alerts
- [ ] **Set up alerting** - PagerDuty, Opsgenie, or similar
- [ ] **Define alert thresholds** - Error rate, latency, etc.
- [ ] **Create escalation policy** - Who to contact for different issues

### Regular Maintenance
- [ ] **Weekly log review** - Check for anomalies
- [ ] **Monthly security updates** - Update dependencies
- [ ] **Quarterly performance review** - Optimize based on usage
- [ ] **Database maintenance** - VACUUM, ANALYZE, etc.

---

## 🎯 Success Metrics

### Track These Metrics
- [ ] **API response time** - P50, P95, P99
- [ ] **Error rate** - Percentage of failed requests
- [ ] **Uptime** - Target 99.9% or higher
- [ ] **Database query performance** - Slow query count
- [ ] **User authentication success rate** - OTP delivery and verification

---

## 📋 Final Pre-Launch Checklist

- [ ] All critical issues fixed
- [ ] All environment variables configured
- [ ] Rate limiting implemented
- [ ] SSL/TLS configured
- [ ] Database migrations run
- [ ] Backups configured and tested
- [ ] Monitoring and alerting set up
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Documentation complete
- [ ] Rollback plan documented
- [ ] Team trained on deployment process

---

**Last Updated**: After high-priority fixes implementation
**Next Review**: Before production deployment
