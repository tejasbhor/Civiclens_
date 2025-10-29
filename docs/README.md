# CiviLens Database Documentation

Complete database schema documentation for the CiviLens backend.

---

## 📚 Documentation Files

### 1. [DATABASE_SCHEMA_SUMMARY.md](./DATABASE_SCHEMA_SUMMARY.md) ⭐ **START HERE**
**Quick overview and navigation guide**
- Technology stack
- Database statistics
- Key entities overview
- Quick reference
- Best practices

### 2. [DATABASE_SCHEMA_MODELS.md](./DATABASE_SCHEMA_MODELS.md)
**Core database tables (7 main tables)**
- Users (authentication, roles, reputation)
- Reports (civic issues, geospatial)
- Departments (government departments)
- Tasks (officer assignments)
- Media (photos, videos)
- Appeals (dispute resolution)
- Escalations (hierarchy management)

### 3. [DATABASE_SCHEMA_SUPPORTING_MODELS.md](./DATABASE_SCHEMA_SUPPORTING_MODELS.md)
**Supporting tables (8 tables)**
- Sessions (JWT, device tracking)
- Audit Logs (80+ tracked actions)
- Role History (role changes)
- Report Status History (status tracking)
- Area Assignments (moderator areas)
- Client Sync State (offline support)
- Sync Conflicts (conflict resolution)
- Offline Actions (action queue)

### 4. [DATABASE_RELATIONSHIPS.md](./DATABASE_RELATIONSHIPS.md)
**Entity relationships and constraints**
- Complete ER diagram (ASCII art)
- All 35 foreign key relationships
- Cascade rules (CASCADE vs SET NULL)
- Relationship cardinality (1:1, 1:N)
- Circular dependencies
- Referential integrity

### 5. [DATABASE_CRUD_OPERATIONS.md](./DATABASE_CRUD_OPERATIONS.md)
**CRUD operations and query patterns**
- Base CRUD operations (6 methods)
- User-specific operations (15 methods)
- Report-specific operations (8 methods)
- Task-specific operations (4 methods)
- Query patterns and examples
- Transaction management
- Performance optimization
- Bulk operations

### 6. [DATABASE_CONSTRAINTS_INDEXES.md](./DATABASE_CONSTRAINTS_INDEXES.md)
**Constraints, indexes, and performance**
- All 74 indexes
- 8 unique constraints
- 35 foreign key constraints
- 12 check constraints
- Geospatial indexes (PostGIS)
- Performance tips
- Maintenance queries

---

## 🎯 Quick Navigation

### I want to...

**Understand the database structure**
→ Start with [DATABASE_SCHEMA_SUMMARY.md](./DATABASE_SCHEMA_SUMMARY.md)

**See all tables and columns**
→ Read [DATABASE_SCHEMA_MODELS.md](./DATABASE_SCHEMA_MODELS.md) and [DATABASE_SCHEMA_SUPPORTING_MODELS.md](./DATABASE_SCHEMA_SUPPORTING_MODELS.md)

**Understand table relationships**
→ Check [DATABASE_RELATIONSHIPS.md](./DATABASE_RELATIONSHIPS.md)

**Learn how to query the database**
→ Study [DATABASE_CRUD_OPERATIONS.md](./DATABASE_CRUD_OPERATIONS.md)

**Optimize query performance**
→ Review [DATABASE_CONSTRAINTS_INDEXES.md](./DATABASE_CONSTRAINTS_INDEXES.md)

---

## 📊 Database at a Glance

### Tables: 15

| Category | Count | Purpose |
|----------|-------|---------|
| Core Business | 7 | Users, Reports, Departments, Tasks, Media, Appeals, Escalations |
| Audit & Tracking | 3 | Audit Logs, Role History, Report Status History |
| Security | 1 | Sessions |
| Offline Sync | 3 | Client Sync State, Sync Conflicts, Offline Actions |
| Area Management | 1 | Area Assignments |

### Constraints: 220+

| Type | Count |
|------|-------|
| Primary Keys | 15 |
| Unique Constraints | 8 |
| Foreign Keys | 35 |
| Check Constraints | 12 |
| Not Null Constraints | 150+ |

### Indexes: 74

| Type | Count |
|------|-------|
| Primary Key Indexes | 15 |
| Unique Indexes | 8 |
| Foreign Key Indexes | 25 |
| Single Column Indexes | 15 |
| Composite Indexes | 10 |
| Geospatial (GIST) | 1 |

---

## 🔧 Technology Stack

| Component | Technology |
|-----------|-----------|
| Database | PostgreSQL 14+ |
| ORM | SQLAlchemy 2.0 (Async) |
| Geospatial | PostGIS extension |
| Search | pg_trgm extension |
| Connection Pool | asyncpg |
| Migrations | Alembic |

---

## 🚀 Key Features

### Authentication & Authorization
- Phone-based OTP authentication
- 7-tier role system (Citizen → Super Admin)
- 2FA support (TOTP)
- JWT session management
- Device and IP tracking

### Geospatial
- PostGIS for location data
- Radius-based queries
- Efficient GIST indexes
- Latitude/longitude validation

### Audit & Compliance
- 80+ tracked actions
- Immutable audit logs
- Role change history
- Status change history
- 7-year retention policy

### Offline Support
- Client sync state tracking
- Conflict detection and resolution
- Offline action queue
- Priority-based processing

### Performance
- 74 optimized indexes
- Composite indexes for common queries
- Eager loading support
- Connection pooling
- Read replica support

---

## 📖 Usage Examples

### Basic Query
```python
# Get user by ID
user = await user_crud.get(db, user_id)

# Get reports with filters
reports = await report_crud.get_multi(
    db,
    filters={'status': 'in_progress', 'severity': 'critical'},
    skip=0,
    limit=20
)
```

### Geospatial Query
```python
# Find reports within 1km
nearby_reports = await report_crud.get_nearby(
    db,
    latitude=23.34,
    longitude=85.31,
    radius_meters=1000
)
```

### Search Query
```python
# Search reports
results = await report_crud.search(
    db,
    query="pothole",
    filters={'status': 'in_progress'}
)
```

### Statistics
```python
# Get aggregated statistics
stats = await report_crud.get_statistics(db)
# Returns: {total, by_status, by_category, by_severity}
```

---

## 🎓 Best Practices

### Development
1. ✅ Always use transactions for multi-step operations
2. ✅ Use eager loading to avoid N+1 queries
3. ✅ Paginate all list queries
4. ✅ Use filters instead of loading all records
5. ✅ Test with production-like data volumes

### Production
1. ✅ Enable connection pooling (asyncpg)
2. ✅ Set up read replicas for analytics
3. ✅ Monitor query performance (pg_stat_statements)
4. ✅ Regular backups (daily full, hourly incremental)
5. ✅ Set up alerts for slow queries, high connections, disk space

---

## 🔍 Quick Reference

### Connection String
```
postgresql+asyncpg://user:password@localhost:5432/civiclens
```

### Required Extensions
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Key Enums
- **UserRole:** `citizen`, `contributor`, `moderator`, `nodal_officer`, `auditor`, `admin`, `super_admin`
- **ReportStatus:** `received`, `pending_classification`, `classified`, `assigned_to_department`, `assigned_to_officer`, `acknowledged`, `in_progress`, `pending_verification`, `resolved`, `closed`, `rejected`, `duplicate`, `on_hold`
- **ReportSeverity:** `low`, `medium`, `high`, `critical`
- **TaskStatus:** `assigned`, `acknowledged`, `in_progress`, `resolved`, `rejected`

---

## 📈 Scalability

### Small Deployment (10K users, 50K reports)
- Database: ~200 MB
- Media files: ~500 GB

### Large Deployment (1M users, 5M reports)
- Database: ~20 GB
- Media files: ~50 TB

### Optimization Strategies
- Partition audit_logs by month
- Archive resolved reports older than 2 years
- Use Redis for caching
- Set up read replicas

---

## 🛠️ Maintenance

### Regular Tasks

**Daily:**
- Monitor slow queries
- Check connection pool usage
- Monitor disk space

**Weekly:**
- Analyze tables (update statistics)
- Check index usage
- Review audit logs

**Monthly:**
- Vacuum tables (reclaim space)
- Rebuild fragmented indexes
- Archive old data

---

## 📞 Getting Help

1. **Start with the summary:** [DATABASE_SCHEMA_SUMMARY.md](./DATABASE_SCHEMA_SUMMARY.md)
2. **Check specific documentation** for your topic
3. **Review code examples** in CRUD operations guide
4. **Examine ER diagram** for relationships

---

## ✅ Documentation Status

- ✅ All 15 tables documented
- ✅ All 35 foreign keys documented
- ✅ All 74 indexes documented
- ✅ All CRUD operations documented
- ✅ All constraints documented
- ✅ ER diagram created
- ✅ Examples provided
- ✅ Best practices included

**Last Updated:** October 2024  
**Database Version:** PostgreSQL 14+  
**Schema Version:** 1.0.0

---

**Total Documentation:** 6 comprehensive files covering every aspect of the CiviLens database schema.
