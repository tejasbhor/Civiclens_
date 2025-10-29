# CiviLens Database Schema - Supporting Models

## Overview

This document covers supporting tables for audit, security, sync, and tracking.

---

## 8. Sessions Table

**Table Name:** `sessions`  
**Purpose:** Track active user sessions for security and device management

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Session ID |
| `user_id` | Integer | FK(users.id, CASCADE), NOT NULL, INDEXED | User |
| `jti` | String(255) | UNIQUE, NOT NULL, INDEXED | JWT ID (access token) |
| `refresh_token_jti` | String(255) | UNIQUE, INDEXED, NULL | Refresh token ID |
| `device_info` | JSONB | NULL | Device details |
| `ip_address` | String(45) | NULL | IPv4/IPv6 address |
| `user_agent` | Text | NULL | Browser user agent |
| `last_activity` | DateTime(TZ) | NOT NULL, Default: now() | Last activity time |
| `expires_at` | DateTime(TZ) | NOT NULL | Session expiry |
| `login_method` | String(50) | Default: 'password' | Login method |
| `is_active` | Integer | Default: 1 | Active status (1/0) |
| `fingerprint` | String(64) | NULL | Session fingerprint hash |
| `created_at` | DateTime(TZ) | NOT NULL | Session creation |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Indexes
- `user_id` (BTREE)
- `jti` (UNIQUE, BTREE)
- `refresh_token_jti` (UNIQUE, BTREE)

### Notes
- Used for JWT token blacklisting
- Tracks concurrent sessions per user
- Enables "logout from all devices"

---

## 9. Audit Logs Table

**Table Name:** `audit_logs`  
**Purpose:** Comprehensive audit trail for security and compliance

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Audit log ID |
| `user_id` | Integer | FK(users.id, SET NULL), INDEXED, NULL | User who performed action |
| `user_role` | String(50) | NULL | User's role at time |
| `action` | Enum | NOT NULL, INDEXED | Action performed |
| `status` | Enum | NOT NULL, Default: SUCCESS | Action status |
| `timestamp` | DateTime(TZ) | NOT NULL, INDEXED, Default: now() | When action occurred |
| `ip_address` | String(45) | INDEXED, NULL | IP address |
| `user_agent` | Text | NULL | Browser/client info |
| `description` | Text | NULL | Action description |
| `extra_data` | JSONB | NULL | Additional context |
| `resource_type` | String(50) | NULL | Affected resource type |
| `resource_id` | String(100) | NULL | Affected resource ID |
| `created_at` | DateTime(TZ) | NOT NULL | Log creation |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Enums

**AuditAction:** (80+ actions tracked)
```
# Authentication
LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGED, PASSWORD_RESET_REQUESTED,
PASSWORD_RESET_COMPLETED, TWO_FA_ENABLED, TWO_FA_DISABLED, TWO_FA_VERIFIED,
OTP_SENT, OTP_VERIFIED, OTP_FAILED, SESSION_CREATED, SESSION_REVOKED,
SESSION_EXPIRED

# User Management
USER_CREATED, USER_UPDATED, USER_DELETED, USER_ACTIVATED, USER_DEACTIVATED,
ROLE_CHANGED, PROFILE_UPDATED, PROFILE_COMPLETED, REPUTATION_UPDATED,
PROMOTION_AUTOMATIC, PROMOTION_MANUAL

# Report Management
REPORT_CREATED, REPORT_UPDATED, REPORT_DELETED, REPORT_VIEWED,
REPORT_STATUS_CHANGED, REPORT_ASSIGNED_DEPARTMENT, REPORT_ASSIGNED_OFFICER,
REPORT_CLASSIFIED, REPORT_REJECTED, REPORT_RESOLVED, REPORT_CLOSED,
REPORT_REOPENED, REPORT_MARKED_DUPLICATE, REPORT_MARKED_SENSITIVE,
REPORT_FEATURED, REPORT_UNFEATURED

# Task Management
TASK_CREATED, TASK_ASSIGNED, TASK_ACKNOWLEDGED, TASK_STARTED,
TASK_COMPLETED, TASK_REJECTED, TASK_UPDATED, TASK_DELETED

# Media Management
MEDIA_UPLOADED, MEDIA_DELETED, MEDIA_UPDATED

# Appeal Management
APPEAL_SUBMITTED, APPEAL_REVIEWED, APPEAL_APPROVED, APPEAL_REJECTED,
APPEAL_WITHDRAWN

# Escalation Management
ESCALATION_CREATED, ESCALATION_ACKNOWLEDGED, ESCALATION_RESOLVED,
ESCALATION_DE_ESCALATED

# Department Management
DEPARTMENT_CREATED, DEPARTMENT_UPDATED, DEPARTMENT_DELETED

# Bulk Operations
BULK_STATUS_CHANGE, BULK_ASSIGNMENT, BULK_SEVERITY_CHANGE, BULK_EXPORT

# System Events
DATA_EXPORT, DATA_IMPORT, SYSTEM_CONFIG_CHANGED, API_KEY_CREATED,
API_KEY_REVOKED
```

**AuditStatus:**
- `success` - Action succeeded
- `failure` - Action failed
- `warning` - Action completed with warnings

### Indexes
- `user_id` (BTREE)
- `action` (BTREE)
- `timestamp` (BTREE)
- `ip_address` (BTREE)

### Notes
- Immutable logs (no updates/deletes)
- Retention policy: 7 years
- Used for compliance and forensics

---

## 10. Role History Table

**Table Name:** `role_history`  
**Purpose:** Track role changes for audit and accountability

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | History ID |
| `user_id` | Integer | FK(users.id, CASCADE), NOT NULL, INDEXED | User whose role changed |
| `old_role` | Enum | NULL | Previous role |
| `new_role` | Enum | NOT NULL | New role |
| `changed_by` | Integer | FK(users.id), NULL | Admin who changed |
| `reason` | Text | NULL | Change reason |
| `automatic` | Boolean | Default: False | Auto-promotion flag |
| `created_at` | DateTime(TZ) | NOT NULL | Change time |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Indexes
- `user_id` (BTREE)

### Notes
- Tracks promotions (citizen → contributor)
- Tracks admin role assignments
- Used for compliance

---

## 11. Report Status History Table

**Table Name:** `report_status_history`  
**Purpose:** Track all status changes for reports

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | History ID |
| `report_id` | Integer | FK(reports.id, CASCADE), NOT NULL, INDEXED | Report |
| `old_status` | Enum | NULL | Previous status |
| `new_status` | Enum | NOT NULL | New status |
| `changed_by_user_id` | Integer | FK(users.id, SET NULL), INDEXED, NULL | Who changed |
| `notes` | Text | NULL | Change notes |
| `changed_at` | DateTime(TZ) | NOT NULL, Default: now() | Change time |
| `created_at` | DateTime(TZ) | NOT NULL | Record creation |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Indexes
- `report_id` (BTREE)
- `changed_by_user_id` (BTREE)

### Notes
- Complete status change audit trail
- Used for SLA tracking
- Used for analytics

---

## 12. Area Assignments Table

**Table Name:** `area_assignments`  
**Purpose:** Assign moderators to specific geographic areas

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Assignment ID |
| `user_id` | Integer | FK(users.id, CASCADE), NOT NULL, INDEXED | Moderator |
| `area_type` | String(50) | NOT NULL | Area type |
| `area_name` | String(255) | NOT NULL | Human-readable name |
| `area_data` | JSONB | NOT NULL | Area definition |
| `is_active` | Boolean | NOT NULL, Default: True | Active status |
| `assigned_by` | Integer | FK(users.id), NULL | Admin who assigned |
| `notes` | Text | NULL | Assignment notes |
| `created_at` | DateTime(TZ) | NOT NULL | Assignment time |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Area Types

**District:**
```json
{
  "type": "district",
  "name": "Ranchi"
}
```

**Radius:**
```json
{
  "type": "radius",
  "center_lat": 23.34,
  "center_lon": 85.31,
  "radius_km": 5
}
```

**Polygon:**
```json
{
  "type": "polygon",
  "coordinates": [[lat1, lon1], [lat2, lon2], ...]
}
```

### Indexes
- `user_id` (BTREE)

### Notes
- Moderators can have multiple area assignments
- Used for area-based moderation
- Flexible JSONB structure for various area types

---

## 13. Client Sync State Table

**Table Name:** `client_sync_state`  
**Purpose:** Track sync state for offline-first mobile apps

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Sync state ID |
| `user_id` | Integer | FK(users.id, CASCADE), NOT NULL, INDEXED | User |
| `device_id` | String(255) | NOT NULL, INDEXED | Device identifier |
| `last_sync_timestamp` | DateTime(TZ) | NULL | Last sync time |
| `last_upload_timestamp` | DateTime(TZ) | NULL | Last upload time |
| `last_download_timestamp` | DateTime(TZ) | NULL | Last download time |
| `sync_version` | Integer | NOT NULL, Default: 1 | Sync version |
| `device_info` | JSONB | NULL | Device details |
| `created_at` | DateTime(TZ) | NOT NULL | Record creation |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Indexes
- `user_id` (BTREE)
- `device_id` (BTREE)

### Notes
- Supports offline-first mobile architecture
- Tracks per-device sync state
- Used for conflict detection

---

## 14. Sync Conflicts Table

**Table Name:** `sync_conflicts`  
**Purpose:** Track and resolve sync conflicts

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Conflict ID |
| `user_id` | Integer | FK(users.id, CASCADE), NOT NULL, INDEXED | User |
| `device_id` | String(255) | NOT NULL | Device identifier |
| `entity_type` | String(50) | NOT NULL | Entity type (report, profile, etc.) |
| `entity_id` | Integer | NOT NULL | Entity ID |
| `client_version` | JSONB | NOT NULL | Client's data version |
| `server_version` | JSONB | NOT NULL | Server's data version |
| `resolution_strategy` | String(50) | NULL | Resolution method |
| `resolved` | Boolean | NOT NULL, Default: False | Resolution status |
| `resolved_at` | DateTime(TZ) | NULL | Resolution time |
| `resolved_data` | JSONB | NULL | Final resolved data |
| `created_at` | DateTime(TZ) | NOT NULL | Conflict detection time |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Resolution Strategies
- `server_wins` - Server version takes precedence
- `client_wins` - Client version takes precedence
- `merge` - Automatic merge
- `manual` - Manual resolution required

### Indexes
- `user_id` (BTREE)

### Notes
- Handles offline edit conflicts
- Supports multiple resolution strategies
- Preserves both versions for audit

---

## 15. Offline Actions Log Table

**Table Name:** `offline_actions_log`  
**Purpose:** Queue offline actions for processing

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Action ID |
| `user_id` | Integer | FK(users.id, CASCADE), NOT NULL, INDEXED | User |
| `device_id` | String(255) | NOT NULL, INDEXED | Device identifier |
| `action_type` | String(50) | NOT NULL | Action type |
| `entity_type` | String(50) | NOT NULL | Entity type |
| `entity_id` | String(255) | NOT NULL | Client-side UUID |
| `payload` | JSONB | NOT NULL | Action payload |
| `processed` | Boolean | NOT NULL, INDEXED, Default: False | Processing status |
| `processed_at` | DateTime(TZ) | NULL | Processing time |
| `result` | JSONB | NULL | Processing result |
| `error_message` | Text | NULL | Error details |
| `priority` | Integer | NOT NULL, Default: 0 | Priority (higher = more important) |
| `retry_count` | Integer | NOT NULL, Default: 0 | Retry attempts |
| `max_retries` | Integer | NOT NULL, Default: 3 | Max retry limit |
| `created_at` | DateTime(TZ) | NOT NULL | Action creation |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Action Types
- `create_report` - Create new report
- `update_profile` - Update user profile
- `upload_media` - Upload media
- `update_task` - Update task status
- `submit_appeal` - Submit appeal

### Indexes
- `user_id` (BTREE)
- `device_id` (BTREE)
- `processed` (BTREE)

### Notes
- Queues offline actions for processing
- Supports retry logic
- Priority-based processing

---

## Database Statistics

### Total Tables: 15

**Core Business Logic:** 7 tables
- Users, Reports, Departments, Tasks, Media, Appeals, Escalations

**Audit & Tracking:** 3 tables
- Audit Logs, Role History, Report Status History

**Security & Sessions:** 1 table
- Sessions

**Offline Sync:** 3 tables
- Client Sync State, Sync Conflicts, Offline Actions Log

**Area Management:** 1 table
- Area Assignments

### Storage Estimates

**Small Deployment (10K users, 50K reports):**
- Users: ~5 MB
- Reports: ~50 MB
- Media: ~500 GB (files stored separately)
- Audit Logs: ~100 MB
- Total DB: ~200 MB

**Large Deployment (1M users, 5M reports):**
- Users: ~500 MB
- Reports: ~5 GB
- Media: ~50 TB (files stored separately)
- Audit Logs: ~10 GB
- Total DB: ~20 GB

### Performance Considerations

**Indexes:** 50+ indexes across all tables  
**Partitioning:** Consider partitioning audit_logs by month  
**Archival:** Archive resolved reports older than 2 years  
**Retention:** Audit logs retained for 7 years

---

**Next:** See `DATABASE_RELATIONSHIPS.md` for ER diagram and foreign key relationships.
