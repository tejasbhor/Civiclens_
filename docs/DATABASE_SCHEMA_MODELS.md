# CiviLens Database Schema - Models & Tables

## Overview

CiviLens uses **PostgreSQL** with **SQLAlchemy 2.0 ORM** and **PostGIS** for geospatial features.

**Total Tables:** 15  
**Database Type:** PostgreSQL 14+  
**Extensions Required:** PostGIS, pg_trgm (for text search)

---

## Base Model

All models inherit from `BaseModel` which provides:

```python
class BaseModel(Base, TimestampMixin):
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

---

## 1. Users Table

**Table Name:** `users`  
**Purpose:** Core user authentication, profiles, and role management

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | User ID |
| `phone` | String(20) | UNIQUE, NOT NULL, INDEXED | Primary authentication |
| `phone_verified` | Boolean | NOT NULL, Default: False | Phone verification status |
| `email` | String(255) | UNIQUE, INDEXED, NULL | Optional email |
| `email_verified` | Boolean | NOT NULL, Default: False | Email verification status |
| `full_name` | String(255) | NULL | User's full name |
| `hashed_password` | String(255) | NULL | Bcrypt hashed password (officers only) |
| `profile_completion` | Enum | NOT NULL, Default: MINIMAL | Profile completion level |
| `role` | Enum | NOT NULL, INDEXED, Default: CITIZEN | User role |
| `is_active` | Boolean | NOT NULL, Default: True | Account active status |
| `reputation_score` | Integer | NOT NULL, INDEXED, Default: 0 | Gamification score |
| `total_reports` | Integer | NOT NULL, Default: 0 | Count of reports submitted |
| `total_validations` | Integer | NOT NULL, Default: 0 | Count of validations |
| `helpful_validations` | Integer | NOT NULL, Default: 0 | Helpful validations count |
| `moderation_areas` | JSONB | NULL | Area assignments for moderators |
| `primary_latitude` | Float | NULL | User's primary location |
| `primary_longitude` | Float | NULL | User's primary location |
| `primary_address` | Text | NULL | User's address |
| `department_id` | Integer | FK(departments.id), NULL | For officers/admins |
| `employee_id` | String(50) | UNIQUE, NULL | Government employee ID |
| `current_latitude` | Float | NULL | Current location (officers) |
| `current_longitude` | Float | NULL | Current location (officers) |
| `last_location_update` | DateTime(TZ) | NULL | Last location update |
| `avatar_url` | String(500) | NULL | Profile picture URL |
| `bio` | Text | NULL | User bio |
| `preferred_language` | String(10) | Default: 'en' | Language preference |
| `push_notifications` | Boolean | Default: True | Push notification setting |
| `sms_notifications` | Boolean | Default: True | SMS notification setting |
| `email_notifications` | Boolean | Default: False | Email notification setting |
| `aadhaar_linked` | Boolean | Default: False | Aadhaar linkage status |
| `aadhaar_hash` | String(255) | NULL | Hashed Aadhaar (never plain) |
| `digilocker_linked` | Boolean | Default: False | DigiLocker linkage |
| `totp_secret` | String(32) | NULL | TOTP secret for 2FA |
| `two_fa_enabled` | Boolean | Default: False | 2FA enabled status |
| `two_fa_enabled_at` | DateTime(TZ) | NULL | When 2FA was enabled |
| `last_login` | DateTime(TZ) | NULL | Last login timestamp |
| `login_count` | Integer | Default: 0 | Total login count |
| `account_created_via` | String(50) | Default: 'otp' | Account creation method |
| `created_at` | DateTime(TZ) | NOT NULL | Record creation |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Enums

**UserRole:**
- `citizen` - Default user (Level 1)
- `contributor` - Auto-promoted based on reputation (Level 2)
- `moderator` - Admin-assigned, area-specific (Level 3)
- `nodal_officer` - Government field worker (Level 4)
- `auditor` - Read-only government access (Level 5)
- `admin` - Full operational access (Level 6)
- `super_admin` - System owner (Level 7)

**ProfileCompletionLevel:**
- `minimal` - Just phone + OTP
- `basic` - + Name
- `complete` - + Email, address

### Indexes
- `phone` (UNIQUE, BTREE)
- `email` (UNIQUE, BTREE)
- `role` (BTREE)
- `reputation_score` (BTREE)

---

## 2. Reports Table

**Table Name:** `reports`  
**Purpose:** Civic issue reports from citizens

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Report ID |
| `report_number` | String(50) | UNIQUE, INDEXED, NULL | Human-readable ID |
| `user_id` | Integer | FK(users.id, CASCADE), NOT NULL, INDEXED | Report creator |
| `department_id` | Integer | FK(departments.id, SET NULL), INDEXED, NULL | Assigned department |
| `title` | String(255) | NOT NULL, INDEXED | Report title |
| `description` | Text | NOT NULL | Detailed description |
| `category` | String(100) | INDEXED, NULL | Report category |
| `sub_category` | String(100) | NULL | Sub-category |
| `status` | Enum | NOT NULL, INDEXED, Default: RECEIVED | Report status |
| `severity` | Enum | NOT NULL, INDEXED, Default: MEDIUM | Severity level |
| `status_updated_at` | DateTime(TZ) | NULL | Last status change |
| `latitude` | Float | NOT NULL | Location latitude |
| `longitude` | Float | NOT NULL | Location longitude |
| `location` | Geography(POINT) | NULL | PostGIS geography point |
| `address` | String(500) | NULL | Formatted address |
| `landmark` | String(255) | NULL | Nearby landmark |
| `area_type` | String(50) | NULL | Urban/rural/etc |
| `ward_number` | String(50) | NULL | Ward number |
| `district` | String(100) | NULL | District name |
| `state` | String(100) | Default: 'Jharkhand' | State name |
| `pincode` | String(10) | NULL | Postal code |
| `ai_category` | String(100) | NULL | AI-suggested category |
| `ai_confidence` | Float | NULL | AI confidence score |
| `ai_processed_at` | DateTime(TZ) | NULL | AI processing time |
| `ai_model_version` | String(50) | NULL | AI model version |
| `manual_category` | String(100) | NULL | Manually set category |
| `manual_severity` | Enum | NULL | Manually set severity |
| `classified_by_user_id` | Integer | FK(users.id, SET NULL), NULL | Classifier user |
| `classification_notes` | Text | NULL | Classification notes |
| `is_public` | Boolean | NOT NULL, Default: True | Public visibility |
| `is_sensitive` | Boolean | NOT NULL, Default: False | Sensitive content flag |
| `is_featured` | Boolean | NOT NULL, Default: False | Featured report |
| `needs_review` | Boolean | NOT NULL, Default: False | Needs admin review |
| `is_duplicate` | Boolean | NOT NULL, Default: False | Duplicate flag |
| `duplicate_of_report_id` | Integer | FK(reports.id, SET NULL), NULL | Original report ID |
| `rejection_reason` | Text | NULL | Why rejected |
| `hold_reason` | Text | NULL | Why on hold |
| `created_at` | DateTime(TZ) | NOT NULL | Report creation |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Enums

**ReportStatus:**
- `received` - Initial state
- `pending_classification` - Awaiting classification
- `classified` - Classified by AI/manual
- `assigned_to_department` - Assigned to department
- `assigned_to_officer` - Assigned to specific officer
- `acknowledged` - Officer acknowledged
- `in_progress` - Work in progress
- `pending_verification` - Awaiting verification
- `resolved` - Issue resolved
- `closed` - Report closed
- `rejected` - Report rejected
- `duplicate` - Marked as duplicate
- `on_hold` - Temporarily on hold

**ReportSeverity:**
- `low` - Low priority
- `medium` - Medium priority
- `high` - High priority
- `critical` - Critical/urgent

### Indexes
- `report_number` (UNIQUE, BTREE)
- `user_id` (BTREE)
- `department_id` (BTREE)
- `title` (BTREE)
- `category` (BTREE)
- `status` (BTREE)
- `severity` (BTREE)
- `idx_report_status_severity` (status, severity) - Composite
- `idx_report_location` (latitude, longitude) - Composite
- `idx_report_location_gist` (location) - GIST for geospatial queries
- `idx_report_created` (created_at) - BTREE

---

## 3. Departments Table

**Table Name:** `departments`  
**Purpose:** Government departments handling reports

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Department ID |
| `name` | String(255) | UNIQUE, NOT NULL, INDEXED | Department name |
| `description` | Text | NULL | Department description |
| `keywords` | Text | NULL | Keywords for AI classification |
| `contact_email` | String(255) | NULL | Contact email |
| `contact_phone` | String(20) | NULL | Contact phone |
| `created_at` | DateTime(TZ) | NOT NULL | Record creation |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Indexes
- `name` (UNIQUE, BTREE)

---

## 4. Tasks Table

**Table Name:** `tasks`  
**Purpose:** Task assignments for officers

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Task ID |
| `report_id` | Integer | FK(reports.id, CASCADE), UNIQUE, NOT NULL, INDEXED | Associated report |
| `assigned_to` | Integer | FK(users.id, CASCADE), NOT NULL, INDEXED | Assigned officer |
| `assigned_by` | Integer | FK(users.id, SET NULL), NULL | Who assigned |
| `status` | Enum | NOT NULL, INDEXED, Default: ASSIGNED | Task status |
| `priority` | Integer | NOT NULL, Default: 5 | Priority (1-10) |
| `notes` | Text | NULL | Task notes |
| `resolution_notes` | Text | NULL | Resolution details |
| `assigned_at` | DateTime(TZ) | NOT NULL, Default: now() | Assignment time |
| `acknowledged_at` | DateTime(TZ) | NULL | Acknowledgment time |
| `started_at` | DateTime(TZ) | NULL | Start time |
| `resolved_at` | DateTime(TZ) | NULL | Resolution time |
| `created_at` | DateTime(TZ) | NOT NULL | Record creation |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Enums

**TaskStatus:**
- `assigned` - Task assigned
- `acknowledged` - Officer acknowledged
- `in_progress` - Work in progress
- `resolved` - Task completed
- `rejected` - Officer rejected

### Indexes
- `report_id` (UNIQUE, BTREE)
- `assigned_to` (BTREE)
- `status` (BTREE)
- `idx_task_officer_status` (assigned_to, status) - Composite
- `idx_task_priority` (priority, status) - Composite

---

## 5. Media Table

**Table Name:** `media`  
**Purpose:** Photos/videos attached to reports

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Media ID |
| `report_id` | Integer | FK(reports.id, CASCADE), NOT NULL, INDEXED | Associated report |
| `file_url` | String(500) | NOT NULL | File storage URL |
| `file_type` | Enum | NOT NULL | Media type |
| `file_size` | Integer | NULL | File size in bytes |
| `mime_type` | String(100) | NULL | MIME type |
| `is_primary` | Boolean | NOT NULL, Default: False | Primary image flag |
| `is_proof_of_work` | Boolean | NOT NULL, Default: False | Proof of completion |
| `sequence_order` | Integer | NULL | Display order |
| `caption` | String(500) | NULL | Media caption |
| `meta` | JSONB | NULL | Additional metadata |
| `upload_source` | Enum | NULL | Upload source |
| `created_at` | DateTime(TZ) | NOT NULL | Upload time |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Enums

**MediaType:**
- `IMAGE`
- `VIDEO`
- `AUDIO`
- `DOCUMENT`

**UploadSource:**
- `citizen_submission` - Citizen uploaded
- `officer_before_photo` - Before work photo
- `officer_after_photo` - After work photo

### Indexes
- `report_id` (BTREE)

---

## 6. Appeals Table

**Table Name:** `appeals`  
**Purpose:** Citizen/officer appeals and disputes

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Appeal ID |
| `report_id` | Integer | FK(reports.id, CASCADE), NOT NULL, INDEXED | Associated report |
| `submitted_by_user_id` | Integer | FK(users.id, CASCADE), NOT NULL, INDEXED | Appeal submitter |
| `appeal_type` | Enum | NOT NULL, INDEXED | Type of appeal |
| `status` | Enum | NOT NULL, INDEXED, Default: SUBMITTED | Appeal status |
| `reason` | Text | NOT NULL | Appeal reason |
| `evidence` | Text | NULL | Supporting evidence |
| `requested_action` | Text | NULL | Requested action |
| `reviewed_by_user_id` | Integer | FK(users.id, SET NULL), NULL | Reviewer |
| `review_notes` | Text | NULL | Review notes |
| `action_taken` | Text | NULL | Action taken |
| `reassigned_to_user_id` | Integer | FK(users.id, SET NULL), NULL | Reassigned officer |
| `reassigned_to_department_id` | Integer | FK(departments.id, SET NULL), NULL | Reassigned dept |
| `reassignment_reason` | Text | NULL | Why reassigned |
| `requires_rework` | Boolean | NOT NULL, Default: False | Needs rework |
| `rework_assigned_to_user_id` | Integer | FK(users.id, SET NULL), NULL | Rework assignee |
| `rework_notes` | Text | NULL | Rework notes |
| `rework_completed` | Boolean | NOT NULL, Default: False | Rework done |
| `created_at` | DateTime(TZ) | NOT NULL | Appeal creation |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Enums

**AppealType:**
- `classification` - Dispute classification
- `resolution` - Dispute resolution quality
- `rejection` - Appeal rejection
- `incorrect_assignment` - Wrong assignment
- `workload` - Excessive workload
- `resource_lack` - Lack of resources
- `quality_concern` - Quality issues

**AppealStatus:**
- `submitted` - Just submitted
- `under_review` - Being reviewed
- `approved` - Appeal approved
- `rejected` - Appeal rejected
- `withdrawn` - Citizen withdrew

### Indexes
- `report_id` (BTREE)
- `submitted_by_user_id` (BTREE)
- `appeal_type` (BTREE)
- `status` (BTREE)
- `idx_appeal_report_status` (report_id, status) - Composite
- `idx_appeal_type_status` (appeal_type, status) - Composite

---

## 7. Escalations Table

**Table Name:** `escalations`  
**Purpose:** Escalate reports to higher authorities

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PK, Auto | Escalation ID |
| `report_id` | Integer | FK(reports.id, CASCADE), NOT NULL, INDEXED | Associated report |
| `escalated_by_user_id` | Integer | FK(users.id, CASCADE), NOT NULL, INDEXED | Who escalated |
| `escalated_to_user_id` | Integer | FK(users.id, SET NULL), INDEXED, NULL | Escalated to |
| `level` | Enum | NOT NULL, INDEXED | Escalation level |
| `reason` | Enum | NOT NULL, INDEXED | Escalation reason |
| `status` | Enum | NOT NULL, INDEXED, Default: ESCALATED | Escalation status |
| `description` | Text | NOT NULL | Why escalated |
| `previous_actions` | Text | NULL | Previous attempts |
| `urgency_notes` | Text | NULL | Urgency details |
| `acknowledged_at` | DateTime(TZ) | NULL | Acknowledgment time |
| `response_notes` | Text | NULL | Response notes |
| `action_taken` | Text | NULL | Action taken |
| `resolved_at` | DateTime(TZ) | NULL | Resolution time |
| `sla_deadline` | DateTime(TZ) | NULL | SLA deadline |
| `is_overdue` | Boolean | NOT NULL, Default: False | Overdue flag |
| `created_at` | DateTime(TZ) | NOT NULL | Escalation time |
| `updated_at` | DateTime(TZ) | NULL | Last update |

### Enums

**EscalationLevel:**
- `level_1` - Department Head
- `level_2` - City Manager
- `level_3` - Mayor/Council

**EscalationReason:**
- `sla_breach` - Exceeded time limits
- `unresolved` - Not resolved
- `quality_issue` - Poor quality
- `citizen_complaint` - Citizen escalated
- `vip_attention` - VIP/Media attention
- `critical_priority` - Critical issue

**EscalationStatus:**
- `escalated` - Just escalated
- `acknowledged` - Acknowledged
- `under_review` - Being reviewed
- `action_taken` - Action taken
- `resolved` - Resolved
- `de_escalated` - Sent back

### Indexes
- `report_id` (BTREE)
- `escalated_by_user_id` (BTREE)
- `escalated_to_user_id` (BTREE)
- `level` (BTREE)
- `reason` (BTREE)
- `status` (BTREE)
- `idx_escalation_report_level` (report_id, level) - Composite
- `idx_escalation_status_level` (status, level) - Composite
- `idx_escalation_overdue` (is_overdue, sla_deadline) - Composite

---

## Summary

**Core Tables:** 7 (Users, Reports, Departments, Tasks, Media, Appeals, Escalations)  
**Supporting Tables:** 8 (Sessions, Audit Logs, Role History, Status History, Area Assignments, Sync tables)

**Next:** See `DATABASE_RELATIONSHIPS.md` for ER diagram and foreign key relationships.
