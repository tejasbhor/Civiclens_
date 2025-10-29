# CiviLens Database Schema - Complete Summary

## 📚 Documentation Index

This is the master index for CiviLens database documentation.

### Documentation Files

1. **[DATABASE_SCHEMA_MODELS.md](./DATABASE_SCHEMA_MODELS.md)**
   - Core tables (Users, Reports, Departments, Tasks, Media, Appeals, Escalations)
   - All columns, data types, constraints
   - Enum definitions
   - Table purposes and usage

2. **[DATABASE_SCHEMA_SUPPORTING_MODELS.md](./DATABASE_SCHEMA_SUPPORTING_MODELS.md)**
   - Supporting tables (Sessions, Audit Logs, Role History, etc.)
   - Sync tables for offline support
   - Area assignments
   - Storage estimates

3. **[DATABASE_RELATIONSHIPS.md](./DATABASE_RELATIONSHIPS.md)**
   - Complete ER diagram (ASCII art)
   - All foreign key relationships
   - Cascade rules (CASCADE vs SET NULL)
   - Relationship cardinality (1:1, 1:N, M:N)
   - Circular dependencies

4. **[DATABASE_CRUD_OPERATIONS.md](./DATABASE_CRUD_OPERATIONS.md)**
   - Base CRUD operations
   - Model-specific CRUD methods
   - Query patterns and examples
   - Transaction management
   - Performance optimization
   - Bulk operations

5. **[DATABASE_CONSTRAINTS_INDEXES.md](./DATABASE_CONSTRAINTS_INDEXES.md)**
   - All constraints (PK, FK, UNIQUE, CHECK, NOT NULL)
   - All indexes (74 total)
   - Geospatial indexes (PostGIS)
   - Performance tips
   - Maintenance queries

---

## 🗄️ Database Overview

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Database** | PostgreSQL 14+ |
| **ORM** | SQLAlchemy 2.0 (Async) |
| **Geospatial** | PostGIS extension |
| **Search** | pg_trgm extension |
| **Connection Pool** | asyncpg |
| **Session Management** | AsyncSession |

---

## 📊 Database Statistics

### Tables

| Category | Count | Tables |
|----------|-------|--------|
| **Core Business** | 7 | Users, Reports, Departments, Tasks, Media, Appeals, Escalations |
| **Audit & Tracking** | 3 | Audit Logs, Role History, Report Status History |
| **Security** | 1 | Sessions |
| **Offline Sync** | 3 | Client Sync State, Sync Conflicts, Offline Actions |
| **Area Management** | 1 | Area Assignments |
| **TOTAL** | **15** | |

### Constraints

| Type | Count |
|------|-------|
| Primary Keys | 15 |
| Unique Constraints | 8 |
| Foreign Keys | 35 |
| Check Constraints | 12 |
| Not Null Constraints | 150+ |
| **TOTAL** | **220+** |

### Indexes

| Type | Count |
|------|-------|
| Primary Key Indexes | 15 |
| Unique Indexes | 8 |
| Foreign Key Indexes | 25 |
| Single Column Indexes | 15 |
| Composite Indexes | 10 |
| Geospatial (GIST) | 1 |
| **TOTAL** | **74** |

---

## 🔑 Key Entities

### 1. Users (Authentication & Roles)

**Purpose:** Core user management with progressive profile completion

**Key Features:**
- Phone-based authentication (OTP)
- Optional email and password
- 7-tier role system (Citizen → Super Admin)
- Reputation system for auto-promotion
- 2FA support (TOTP)
- Department assignments for officers
- Area-based moderation

**Roles:**
1. `citizen` - Default user
2. `contributor` - Auto-promoted (reputation ≥100)
3. `moderator` - Area-specific moderation
4. `nodal_officer` - Field worker
5. `auditor` - Read-only access
6. `admin` - Full operational access
7. `super_admin` - System owner

---

### 2. Reports (Civic Issues)

**Purpose:** Citizen-submitted civic issue reports

**Key Features:**
- Geospatial location (PostGIS)
- AI-powered classification
- 13 status states (received → resolved)
- 4 severity levels (low → critical)
- Category-based routing
- Duplicate detection
- Public/private visibility
- Media attachments

**Status Flow:**
```
received → pending_classification → classified → 
assigned_to_department → assigned_to_officer → 
acknowledged → in_progress → pending_verification → 
resolved → closed
```

**Alternative Flows:**
- `rejected` - Invalid report
- `duplicate` - Duplicate of another report
- `on_hold` - Temporarily paused

---

### 3. Tasks (Officer Assignments)

**Purpose:** Work assignments for officers

**Key Features:**
- One task per report (1:1)
- Priority levels (1-10)
- Status tracking (assigned → resolved)
- SLA tracking via timestamps
- Workload balancing

**Status Flow:**
```
assigned → acknowledged → in_progress → resolved
```

---

### 4. Appeals (Dispute Resolution)

**Purpose:** Citizen/officer appeals and disputes

**Key Features:**
- 7 appeal types (classification, resolution, rejection, etc.)
- Review workflow
- Reassignment support
- Rework tracking
- Status tracking (submitted → approved/rejected)

---

### 5. Escalations (Hierarchy Management)

**Purpose:** Escalate unresolved issues to higher authorities

**Key Features:**
- 3 escalation levels (Dept Head → City Manager → Mayor)
- 6 escalation reasons (SLA breach, quality issue, etc.)
- SLA deadline tracking
- Overdue flagging
- De-escalation support

---

## 🔗 Key Relationships

### User Relationships

```
User (1) ──── (N) Reports
User (1) ──── (N) Tasks (as officer)
User (1) ──── (N) Sessions
User (1) ──── (N) Appeals (as submitter)
User (1) ──── (N) Escalations (as escalator)
User (N) ──── (1) Department
```

### Report Relationships

```
Report (1) ──── (N) Media
Report (1) ──── (1) Task
Report (1) ──── (N) Appeals
Report (1) ──── (N) Escalations
Report (1) ──── (N) Status History
Report (N) ──── (1) User (creator)
Report (N) ──── (1) Department
Report (N) ──── (1) Report (duplicate_of)
```

---

## 🎯 CRUD Operations

### Base Operations (All Models)

```python
# Get single
user = await user_crud.get(db, user_id)

# Get multiple with filters
reports = await report_crud.get_multi(
    db,
    filters={'status': 'in_progress'},
    skip=0,
    limit=20
)

# Count
total = await report_crud.count(db, filters={'status': 'resolved'})

# Create
new_report = await report_crud.create(db, report_data)

# Update
updated = await report_crud.update(db, report_id, update_data)

# Delete
success = await report_crud.delete(db, report_id)
```

### Specialized Operations

**User:**
- `get_by_phone()`, `get_by_email()`
- `authenticate()`, `create_officer()`
- `update_reputation()`, `change_role()`
- `get_promotion_candidates()`

**Report:**
- `get_nearby()` - Geospatial queries
- `search()` - Full-text search
- `get_statistics()` - Aggregations
- `get_by_status()`, `get_by_department()`

**Task:**
- `get_by_officer()`, `get_by_report()`
- `get_pending_tasks()`, `get_officer_workload()`

---

## 🚀 Performance Features

### Indexing Strategy

**Single Column Indexes:**
- All foreign keys
- Status fields (reports, tasks, appeals, escalations)
- Severity fields
- Timestamps (created_at)
- Phone, email (unique)

**Composite Indexes:**
- `(status, severity)` - Common filter combination
- `(assigned_to, status)` - Officer task queries
- `(report_id, status)` - Appeal/escalation queries
- `(latitude, longitude)` - Location queries

**Geospatial Index:**
- GIST index on `location` column for efficient radius queries

### Query Optimization

**Eager Loading:**
```python
# Load relationships in single query
reports = await report_crud.get_multi(
    db,
    relationships=['user', 'department', 'media']
)
```

**Pagination:**
```python
# Always paginate large datasets
reports = await report_crud.get_multi(db, skip=0, limit=20)
total = await report_crud.count(db)
```

**Geospatial Queries:**
```python
# Efficient radius search using PostGIS
nearby = await report_crud.get_nearby(
    db,
    latitude=23.34,
    longitude=85.31,
    radius_meters=1000
)
```

---

## 🔒 Security Features

### Authentication

- **Phone OTP** - Primary authentication method
- **Password** - For officers/admins (bcrypt hashed)
- **2FA** - TOTP-based two-factor authentication
- **JWT** - Token-based session management
- **Session Tracking** - Device and IP tracking

### Authorization

- **Role-Based Access Control (RBAC)** - 7-tier role system
- **Area-Based Moderation** - Moderators assigned to specific areas
- **Department-Based Access** - Officers see only their department's reports

### Audit Trail

- **Audit Logs** - 80+ tracked actions
- **Role History** - All role changes tracked
- **Status History** - All report status changes tracked
- **Immutable Logs** - Audit logs cannot be modified/deleted

---

## 📱 Offline Support

### Sync Architecture

**Client Sync State:**
- Tracks last sync timestamp per device
- Version-based conflict detection

**Sync Conflicts:**
- Automatic conflict detection
- Multiple resolution strategies (server_wins, client_wins, merge, manual)

**Offline Actions:**
- Queue offline actions for processing
- Priority-based processing
- Retry logic (max 3 retries)

---

## 📈 Scalability Considerations

### Small Deployment (10K users, 50K reports)

| Component | Size |
|-----------|------|
| Users | ~5 MB |
| Reports | ~50 MB |
| Media (files) | ~500 GB |
| Audit Logs | ~100 MB |
| **Total DB** | **~200 MB** |

### Large Deployment (1M users, 5M reports)

| Component | Size |
|-----------|------|
| Users | ~500 MB |
| Reports | ~5 GB |
| Media (files) | ~50 TB |
| Audit Logs | ~10 GB |
| **Total DB** | **~20 GB** |

### Optimization Strategies

**Partitioning:**
- Partition `audit_logs` by month
- Partition `reports` by year (if needed)

**Archival:**
- Archive resolved reports older than 2 years
- Retain audit logs for 7 years (compliance)

**Caching:**
- Redis for session management
- Redis for frequently accessed data (departments, categories)

**Read Replicas:**
- Use read replicas for analytics queries
- Separate read/write workloads

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
- Review audit logs for anomalies

**Monthly:**
- Vacuum tables (reclaim space)
- Rebuild fragmented indexes
- Archive old data

### Monitoring Queries

**Check Index Usage:**
```sql
SELECT tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

**Find Slow Queries:**
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Check Table Sizes:**
```sql
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

---

## 🎓 Best Practices

### Development

1. **Always use transactions** for multi-step operations
2. **Use eager loading** to avoid N+1 queries
3. **Paginate** all list queries
4. **Use filters** instead of loading all records
5. **Test with production-like data** volumes

### Production

1. **Enable connection pooling** (asyncpg)
2. **Set up read replicas** for analytics
3. **Monitor query performance** (pg_stat_statements)
4. **Regular backups** (daily full, hourly incremental)
5. **Set up alerts** for slow queries, high connections, disk space

---

## 📝 Migration Strategy

### Alembic Migrations

CiviLens uses Alembic for database migrations:

```bash
# Create migration
alembic revision --autogenerate -m "Add new column"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Zero-Downtime Migrations

1. **Add columns** - Always nullable initially
2. **Backfill data** - Separate migration
3. **Add constraints** - After data is backfilled
4. **Remove columns** - After code deployment

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

- **UserRole:** 7 roles (citizen → super_admin)
- **ReportStatus:** 13 statuses (received → closed)
- **ReportSeverity:** 4 levels (low → critical)
- **TaskStatus:** 5 statuses (assigned → resolved)
- **AppealStatus:** 5 statuses (submitted → withdrawn)
- **EscalationLevel:** 3 levels (level_1 → level_3)

---

## 📞 Support

For questions or issues with the database schema:

1. Check the detailed documentation files
2. Review the CRUD operations guide
3. Examine the ER diagram for relationships
4. Consult the constraints and indexes guide

---

**Last Updated:** October 2024  
**Database Version:** PostgreSQL 14+  
**Schema Version:** 1.0.0

---

## ✅ Documentation Complete

All database schema documentation has been created and organized in the `docs/` folder:

1. ✅ Core models and tables
2. ✅ Supporting models
3. ✅ ER relationships
4. ✅ CRUD operations
5. ✅ Constraints and indexes
6. ✅ Summary and quick reference

**Total Pages:** 5 comprehensive documents covering every aspect of the CiviLens database.
