# CiviLens Database Schema - Constraints & Indexes

## Overview

Comprehensive list of all database constraints, indexes, and performance optimizations.

---

## Primary Keys

All tables use auto-incrementing integer primary keys:

```sql
id SERIAL PRIMARY KEY
```

**Tables with Primary Keys:** 15 (all tables)

---

## Unique Constraints

### 1. Users Table

```sql
CONSTRAINT users_phone_key UNIQUE (phone)
CONSTRAINT users_email_key UNIQUE (email)
CONSTRAINT users_employee_id_key UNIQUE (employee_id)
```

**Purpose:**
- One phone per user (authentication)
- One email per user (optional)
- One employee ID per officer

---

### 2. Reports Table

```sql
CONSTRAINT reports_report_number_key UNIQUE (report_number)
```

**Purpose:**
- Human-readable unique identifier (e.g., "RPT-2024-001234")

---

### 3. Tasks Table

```sql
CONSTRAINT tasks_report_id_key UNIQUE (report_id)
```

**Purpose:**
- One task per report (1:1 relationship)

---

### 4. Sessions Table

```sql
CONSTRAINT sessions_jti_key UNIQUE (jti)
CONSTRAINT sessions_refresh_token_jti_key UNIQUE (refresh_token_jti)
```

**Purpose:**
- Unique JWT tokens
- Prevents token reuse

---

### 5. Departments Table

```sql
CONSTRAINT departments_name_key UNIQUE (name)
```

**Purpose:**
- One department per name

---

## Foreign Key Constraints

### Users Table

```sql
-- Department assignment
CONSTRAINT users_department_id_fkey 
    FOREIGN KEY (department_id) 
    REFERENCES departments(id) 
    ON DELETE SET NULL
```

---

### Reports Table

```sql
-- Report creator
CONSTRAINT reports_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE

-- Assigned department
CONSTRAINT reports_department_id_fkey 
    FOREIGN KEY (department_id) 
    REFERENCES departments(id) 
    ON DELETE SET NULL

-- Classifier
CONSTRAINT reports_classified_by_user_id_fkey 
    FOREIGN KEY (classified_by_user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL

-- Duplicate reference
CONSTRAINT reports_duplicate_of_report_id_fkey 
    FOREIGN KEY (duplicate_of_report_id) 
    REFERENCES reports(id) 
    ON DELETE SET NULL
```

---

### Tasks Table

```sql
-- Associated report
CONSTRAINT tasks_report_id_fkey 
    FOREIGN KEY (report_id) 
    REFERENCES reports(id) 
    ON DELETE CASCADE

-- Assigned officer
CONSTRAINT tasks_assigned_to_fkey 
    FOREIGN KEY (assigned_to) 
    REFERENCES users(id) 
    ON DELETE CASCADE

-- Assigner
CONSTRAINT tasks_assigned_by_fkey 
    FOREIGN KEY (assigned_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL
```

---

### Media Table

```sql
-- Associated report
CONSTRAINT media_report_id_fkey 
    FOREIGN KEY (report_id) 
    REFERENCES reports(id) 
    ON DELETE CASCADE
```

---

### Appeals Table

```sql
-- Associated report
CONSTRAINT appeals_report_id_fkey 
    FOREIGN KEY (report_id) 
    REFERENCES reports(id) 
    ON DELETE CASCADE

-- Submitter
CONSTRAINT appeals_submitted_by_user_id_fkey 
    FOREIGN KEY (submitted_by_user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE

-- Reviewer
CONSTRAINT appeals_reviewed_by_user_id_fkey 
    FOREIGN KEY (reviewed_by_user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL

-- Reassignment
CONSTRAINT appeals_reassigned_to_user_id_fkey 
    FOREIGN KEY (reassigned_to_user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL

CONSTRAINT appeals_reassigned_to_department_id_fkey 
    FOREIGN KEY (reassigned_to_department_id) 
    REFERENCES departments(id) 
    ON DELETE SET NULL

-- Rework
CONSTRAINT appeals_rework_assigned_to_user_id_fkey 
    FOREIGN KEY (rework_assigned_to_user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL
```

---

### Escalations Table

```sql
-- Associated report
CONSTRAINT escalations_report_id_fkey 
    FOREIGN KEY (report_id) 
    REFERENCES reports(id) 
    ON DELETE CASCADE

-- Escalator
CONSTRAINT escalations_escalated_by_user_id_fkey 
    FOREIGN KEY (escalated_by_user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE

-- Escalated to
CONSTRAINT escalations_escalated_to_user_id_fkey 
    FOREIGN KEY (escalated_to_user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL
```

---

### Sessions Table

```sql
-- User
CONSTRAINT sessions_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE
```

---

### Audit Logs Table

```sql
-- User (optional, for anonymous actions)
CONSTRAINT audit_logs_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL
```

---

### Role History Table

```sql
-- User
CONSTRAINT role_history_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE

-- Changer
CONSTRAINT role_history_changed_by_fkey 
    FOREIGN KEY (changed_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL
```

---

### Report Status History Table

```sql
-- Report
CONSTRAINT report_status_history_report_id_fkey 
    FOREIGN KEY (report_id) 
    REFERENCES reports(id) 
    ON DELETE CASCADE

-- Changer
CONSTRAINT report_status_history_changed_by_user_id_fkey 
    FOREIGN KEY (changed_by_user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL
```

---

### Area Assignments Table

```sql
-- User
CONSTRAINT area_assignments_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE

-- Assigner
CONSTRAINT area_assignments_assigned_by_fkey 
    FOREIGN KEY (assigned_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL
```

---

### Sync Tables

```sql
-- Client Sync State
CONSTRAINT client_sync_state_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE

-- Sync Conflicts
CONSTRAINT sync_conflicts_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE

-- Offline Actions
CONSTRAINT offline_actions_log_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE
```

---

## Check Constraints

### Users Table

```sql
CONSTRAINT users_reputation_score_check 
    CHECK (reputation_score >= 0)

CONSTRAINT users_total_reports_check 
    CHECK (total_reports >= 0)

CONSTRAINT users_total_validations_check 
    CHECK (total_validations >= 0)

CONSTRAINT users_helpful_validations_check 
    CHECK (helpful_validations >= 0)

CONSTRAINT users_login_count_check 
    CHECK (login_count >= 0)
```

---

### Reports Table

```sql
CONSTRAINT reports_latitude_check 
    CHECK (latitude >= -90 AND latitude <= 90)

CONSTRAINT reports_longitude_check 
    CHECK (longitude >= -180 AND longitude <= 180)

CONSTRAINT reports_ai_confidence_check 
    CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1))
```

---

### Tasks Table

```sql
CONSTRAINT tasks_priority_check 
    CHECK (priority >= 1 AND priority <= 10)
```

---

### Offline Actions Table

```sql
CONSTRAINT offline_actions_retry_count_check 
    CHECK (retry_count >= 0)

CONSTRAINT offline_actions_max_retries_check 
    CHECK (max_retries >= 0)

CONSTRAINT offline_actions_priority_check 
    CHECK (priority >= 0)
```

---

## Indexes

### Users Table

```sql
-- Primary key (automatic)
CREATE INDEX users_pkey ON users(id)

-- Unique constraints (automatic)
CREATE UNIQUE INDEX users_phone_key ON users(phone)
CREATE UNIQUE INDEX users_email_key ON users(email)
CREATE UNIQUE INDEX users_employee_id_key ON users(employee_id)

-- Foreign keys
CREATE INDEX ix_users_department_id ON users(department_id)

-- Query optimization
CREATE INDEX ix_users_role ON users(role)
CREATE INDEX ix_users_reputation_score ON users(reputation_score)
```

**Total Indexes:** 7

---

### Reports Table

```sql
-- Primary key
CREATE INDEX reports_pkey ON reports(id)

-- Unique constraint
CREATE UNIQUE INDEX reports_report_number_key ON reports(report_number)

-- Foreign keys
CREATE INDEX ix_reports_user_id ON reports(user_id)
CREATE INDEX ix_reports_department_id ON reports(department_id)

-- Query optimization
CREATE INDEX ix_reports_title ON reports(title)
CREATE INDEX ix_reports_category ON reports(category)
CREATE INDEX ix_reports_status ON reports(status)
CREATE INDEX ix_reports_severity ON reports(severity)

-- Composite indexes
CREATE INDEX idx_report_status_severity ON reports(status, severity)
CREATE INDEX idx_report_location ON reports(latitude, longitude)
CREATE INDEX idx_report_created ON reports(created_at)

-- Geospatial index (PostGIS)
CREATE INDEX idx_report_location_gist ON reports USING GIST(location)
```

**Total Indexes:** 13

**Note:** The GIST index enables efficient geospatial queries like:
```sql
-- Find reports within 1km
SELECT * FROM reports 
WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(85.31, 23.34), 4326),
    1000
);
```

---

### Departments Table

```sql
-- Primary key
CREATE INDEX departments_pkey ON departments(id)

-- Unique constraint
CREATE UNIQUE INDEX departments_name_key ON departments(name)
```

**Total Indexes:** 2

---

### Tasks Table

```sql
-- Primary key
CREATE INDEX tasks_pkey ON tasks(id)

-- Unique constraint
CREATE UNIQUE INDEX tasks_report_id_key ON tasks(report_id)

-- Foreign keys
CREATE INDEX ix_tasks_assigned_to ON tasks(assigned_to)

-- Query optimization
CREATE INDEX ix_tasks_status ON tasks(status)

-- Composite indexes
CREATE INDEX idx_task_officer_status ON tasks(assigned_to, status)
CREATE INDEX idx_task_priority ON tasks(priority, status)
```

**Total Indexes:** 7

---

### Media Table

```sql
-- Primary key
CREATE INDEX media_pkey ON media(id)

-- Foreign key
CREATE INDEX ix_media_report_id ON media(report_id)
```

**Total Indexes:** 2

---

### Appeals Table

```sql
-- Primary key
CREATE INDEX appeals_pkey ON appeals(id)

-- Foreign keys
CREATE INDEX ix_appeals_report_id ON appeals(report_id)
CREATE INDEX ix_appeals_submitted_by_user_id ON appeals(submitted_by_user_id)

-- Query optimization
CREATE INDEX ix_appeals_appeal_type ON appeals(appeal_type)
CREATE INDEX ix_appeals_status ON appeals(status)

-- Composite indexes
CREATE INDEX idx_appeal_report_status ON appeals(report_id, status)
CREATE INDEX idx_appeal_type_status ON appeals(appeal_type, status)
```

**Total Indexes:** 8

---

### Escalations Table

```sql
-- Primary key
CREATE INDEX escalations_pkey ON escalations(id)

-- Foreign keys
CREATE INDEX ix_escalations_report_id ON escalations(report_id)
CREATE INDEX ix_escalations_escalated_by_user_id ON escalations(escalated_by_user_id)
CREATE INDEX ix_escalations_escalated_to_user_id ON escalations(escalated_to_user_id)

-- Query optimization
CREATE INDEX ix_escalations_level ON escalations(level)
CREATE INDEX ix_escalations_reason ON escalations(reason)
CREATE INDEX ix_escalations_status ON escalations(status)

-- Composite indexes
CREATE INDEX idx_escalation_report_level ON escalations(report_id, level)
CREATE INDEX idx_escalation_status_level ON escalations(status, level)
CREATE INDEX idx_escalation_overdue ON escalations(is_overdue, sla_deadline)
```

**Total Indexes:** 11

---

### Sessions Table

```sql
-- Primary key
CREATE INDEX sessions_pkey ON sessions(id)

-- Unique constraints
CREATE UNIQUE INDEX sessions_jti_key ON sessions(jti)
CREATE UNIQUE INDEX sessions_refresh_token_jti_key ON sessions(refresh_token_jti)

-- Foreign key
CREATE INDEX ix_sessions_user_id ON sessions(user_id)
```

**Total Indexes:** 4

---

### Audit Logs Table

```sql
-- Primary key
CREATE INDEX audit_logs_pkey ON audit_logs(id)

-- Foreign key
CREATE INDEX ix_audit_logs_user_id ON audit_logs(user_id)

-- Query optimization
CREATE INDEX ix_audit_logs_action ON audit_logs(action)
CREATE INDEX ix_audit_logs_timestamp ON audit_logs(timestamp)
CREATE INDEX ix_audit_logs_ip_address ON audit_logs(ip_address)
```

**Total Indexes:** 5

---

### Role History Table

```sql
-- Primary key
CREATE INDEX role_history_pkey ON role_history(id)

-- Foreign key
CREATE INDEX ix_role_history_user_id ON role_history(user_id)
```

**Total Indexes:** 2

---

### Report Status History Table

```sql
-- Primary key
CREATE INDEX report_status_history_pkey ON report_status_history(id)

-- Foreign keys
CREATE INDEX ix_report_status_history_report_id ON report_status_history(report_id)
CREATE INDEX ix_report_status_history_changed_by_user_id ON report_status_history(changed_by_user_id)
```

**Total Indexes:** 3

---

### Area Assignments Table

```sql
-- Primary key
CREATE INDEX area_assignments_pkey ON area_assignments(id)

-- Foreign key
CREATE INDEX ix_area_assignments_user_id ON area_assignments(user_id)
```

**Total Indexes:** 2

---

### Sync Tables

```sql
-- Client Sync State
CREATE INDEX client_sync_state_pkey ON client_sync_state(id)
CREATE INDEX ix_client_sync_state_user_id ON client_sync_state(user_id)
CREATE INDEX ix_client_sync_state_device_id ON client_sync_state(device_id)

-- Sync Conflicts
CREATE INDEX sync_conflicts_pkey ON sync_conflicts(id)
CREATE INDEX ix_sync_conflicts_user_id ON sync_conflicts(user_id)

-- Offline Actions
CREATE INDEX offline_actions_log_pkey ON offline_actions_log(id)
CREATE INDEX ix_offline_actions_log_user_id ON offline_actions_log(user_id)
CREATE INDEX ix_offline_actions_log_device_id ON offline_actions_log(device_id)
CREATE INDEX ix_offline_actions_log_processed ON offline_actions_log(processed)
```

**Total Indexes:** 10

---

## Index Summary

### Total Indexes by Type

| Index Type | Count |
|------------|-------|
| Primary Keys | 15 |
| Unique Constraints | 8 |
| Foreign Key Indexes | 25 |
| Single Column Indexes | 15 |
| Composite Indexes | 10 |
| Geospatial (GIST) | 1 |
| **TOTAL** | **74** |

### Indexes by Table

| Table | Index Count |
|-------|-------------|
| Reports | 13 |
| Escalations | 11 |
| Appeals | 8 |
| Users | 7 |
| Tasks | 7 |
| Audit Logs | 5 |
| Sessions | 4 |
| Report Status History | 3 |
| Departments | 2 |
| Media | 2 |
| Role History | 2 |
| Area Assignments | 2 |
| Client Sync State | 3 |
| Sync Conflicts | 2 |
| Offline Actions | 4 |

---

## Performance Considerations

### Index Usage Guidelines

**✅ Good Index Usage:**
- Queries with WHERE clauses on indexed columns
- JOIN operations on foreign keys
- ORDER BY on indexed columns
- Geospatial queries using GIST index

**❌ Indexes Don't Help:**
- Full table scans
- Queries with functions on indexed columns (e.g., `LOWER(email)`)
- OR conditions across multiple columns
- Very small tables (<1000 rows)

---

### Query Performance Tips

**1. Use Composite Indexes:**
```sql
-- Good: Uses idx_report_status_severity
SELECT * FROM reports 
WHERE status = 'in_progress' AND severity = 'critical';

-- Bad: Only uses first column of index
SELECT * FROM reports 
WHERE severity = 'critical' AND status = 'in_progress';
```

**2. Avoid Function Calls on Indexed Columns:**
```sql
-- Bad: Index not used
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';

-- Good: Index used
SELECT * FROM users WHERE email = 'test@example.com';
```

**3. Use EXPLAIN ANALYZE:**
```sql
EXPLAIN ANALYZE
SELECT * FROM reports 
WHERE status = 'in_progress' 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## Maintenance

### Index Maintenance

**Rebuild Indexes (if fragmented):**
```sql
REINDEX TABLE reports;
```

**Analyze Tables (update statistics):**
```sql
ANALYZE reports;
ANALYZE users;
```

**Vacuum (reclaim space):**
```sql
VACUUM ANALYZE reports;
```

---

### Monitoring

**Check Index Usage:**
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

**Find Unused Indexes:**
```sql
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%_pkey';
```

---

## Constraints Summary

**Total Constraints:** 100+

| Constraint Type | Count |
|----------------|-------|
| Primary Keys | 15 |
| Unique Constraints | 8 |
| Foreign Keys | 35 |
| Check Constraints | 12 |
| Not Null Constraints | 150+ |

---

**Complete!** This concludes the database schema documentation.

**Files Created:**
1. `DATABASE_SCHEMA_MODELS.md` - Core and main models
2. `DATABASE_SCHEMA_SUPPORTING_MODELS.md` - Supporting models
3. `DATABASE_RELATIONSHIPS.md` - ER diagram and relationships
4. `DATABASE_CRUD_OPERATIONS.md` - CRUD operations
5. `DATABASE_CONSTRAINTS_INDEXES.md` - Constraints and indexes
