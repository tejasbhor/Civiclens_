# CiviLens Database Schema - Relationships & ER Diagram

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CIVICLENS DATABASE ER DIAGRAM                        │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │  DEPARTMENTS │
                              │──────────────│
                              │ id (PK)      │
                              │ name         │
                              │ description  │
                              └──────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    │ (1:N)          │ (1:N)          │
                    ▼                ▼                │
         ┌──────────────┐   ┌──────────────┐         │
         │    USERS     │   │   REPORTS    │         │
         │──────────────│   │──────────────│         │
         │ id (PK)      │   │ id (PK)      │         │
         │ phone (UQ)   │   │ report_number│         │
         │ email (UQ)   │   │ user_id (FK) │◄────────┘
         │ role         │   │ department_id│
         │ department_id│◄──┤ status       │
         └──────┬───────┘   │ severity     │
                │           │ latitude     │
                │           │ longitude    │
                │           └──────┬───────┘
                │                  │
    ┌───────────┼──────────────────┼──────────────────┐
    │           │                  │                  │
    │ (1:N)     │ (1:N)            │ (1:N)            │ (1:1)
    ▼           ▼                  ▼                  ▼
┌─────────┐ ┌──────────┐      ┌────────┐        ┌────────┐
│SESSIONS │ │ROLE_HIST │      │ MEDIA  │        │ TASKS  │
│─────────│ │──────────│      │────────│        │────────│
│id (PK)  │ │id (PK)   │      │id (PK) │        │id (PK) │
│user_id  │ │user_id   │      │report_id│       │report_id│
│jti (UQ) │ │old_role  │      │file_url│        │assigned_to│
└─────────┘ │new_role  │      │file_type│       │status  │
            └──────────┘      └────────┘        └────┬───┘
                                                     │
                                                     │ (N:1)
                                                     ▼
                                              ┌──────────┐
                                              │  USERS   │
                                              │(officer) │
                                              └──────────┘

         ┌──────────────┐
         │   REPORTS    │
         └──────┬───────┘
                │
    ┌───────────┼───────────┬──────────────┐
    │           │           │              │
    │ (1:N)     │ (1:N)     │ (1:N)        │ (1:N)
    ▼           ▼           ▼              ▼
┌─────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐
│APPEALS  │ │ESCALATION│ │STATUS_HIST│ │AUDIT_LOGS    │
│─────────│ │──────────│ │───────────│ │──────────────│
│id (PK)  │ │id (PK)   │ │id (PK)    │ │id (PK)       │
│report_id│ │report_id │ │report_id  │ │user_id       │
│submitted│ │escalated │ │old_status │ │action        │
│_by      │ │_by       │ │new_status │ │resource_type │
│status   │ │level     │ │changed_by │ │resource_id   │
└─────────┘ └──────────┘ └───────────┘ └──────────────┘

         ┌──────────────┐
         │    USERS     │
         └──────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    │ (1:N)     │ (1:N)     │ (1:N)
    ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐
│AREA_ASSGN│ │SYNC_STATE│ │OFFLINE_ACTION│
│──────────│ │──────────│ │──────────────│
│id (PK)   │ │id (PK)   │ │id (PK)       │
│user_id   │ │user_id   │ │user_id       │
│area_type │ │device_id │ │device_id     │
│area_data │ │sync_ver  │ │action_type   │
└──────────┘ └──────────┘ └──────────────┘
```

---

## Foreign Key Relationships

### 1. Users Table

**Outgoing Foreign Keys:**

| Column | References | On Delete | Relationship |
|--------|-----------|-----------|--------------|
| `department_id` | `departments.id` | SET NULL | Many-to-One |

**Incoming Foreign Keys:**

| From Table | Column | On Delete | Relationship |
|------------|--------|-----------|--------------|
| `reports` | `user_id` | CASCADE | One-to-Many |
| `reports` | `classified_by_user_id` | SET NULL | One-to-Many |
| `tasks` | `assigned_to` | CASCADE | One-to-Many |
| `tasks` | `assigned_by` | SET NULL | One-to-Many |
| `appeals` | `submitted_by_user_id` | CASCADE | One-to-Many |
| `appeals` | `reviewed_by_user_id` | SET NULL | One-to-Many |
| `appeals` | `reassigned_to_user_id` | SET NULL | One-to-Many |
| `appeals` | `rework_assigned_to_user_id` | SET NULL | One-to-Many |
| `escalations` | `escalated_by_user_id` | CASCADE | One-to-Many |
| `escalations` | `escalated_to_user_id` | SET NULL | One-to-Many |
| `sessions` | `user_id` | CASCADE | One-to-Many |
| `audit_logs` | `user_id` | SET NULL | One-to-Many |
| `role_history` | `user_id` | CASCADE | One-to-Many |
| `role_history` | `changed_by` | - | One-to-Many |
| `report_status_history` | `changed_by_user_id` | SET NULL | One-to-Many |
| `area_assignments` | `user_id` | CASCADE | One-to-Many |
| `area_assignments` | `assigned_by` | - | One-to-Many |
| `client_sync_state` | `user_id` | CASCADE | One-to-Many |
| `sync_conflicts` | `user_id` | CASCADE | One-to-Many |
| `offline_actions_log` | `user_id` | CASCADE | One-to-Many |

---

### 2. Reports Table

**Outgoing Foreign Keys:**

| Column | References | On Delete | Relationship |
|--------|-----------|-----------|--------------|
| `user_id` | `users.id` | CASCADE | Many-to-One |
| `department_id` | `departments.id` | SET NULL | Many-to-One |
| `classified_by_user_id` | `users.id` | SET NULL | Many-to-One |
| `duplicate_of_report_id` | `reports.id` | SET NULL | Self-Reference |

**Incoming Foreign Keys:**

| From Table | Column | On Delete | Relationship |
|------------|--------|-----------|--------------|
| `media` | `report_id` | CASCADE | One-to-Many |
| `tasks` | `report_id` | CASCADE | One-to-One |
| `appeals` | `report_id` | CASCADE | One-to-Many |
| `escalations` | `report_id` | CASCADE | One-to-Many |
| `report_status_history` | `report_id` | CASCADE | One-to-Many |
| `reports` | `duplicate_of_report_id` | SET NULL | One-to-Many |

---

### 3. Departments Table

**Incoming Foreign Keys:**

| From Table | Column | On Delete | Relationship |
|------------|--------|-----------|--------------|
| `users` | `department_id` | SET NULL | One-to-Many |
| `reports` | `department_id` | SET NULL | One-to-Many |
| `appeals` | `reassigned_to_department_id` | SET NULL | One-to-Many |

---

### 4. Tasks Table

**Outgoing Foreign Keys:**

| Column | References | On Delete | Relationship |
|--------|-----------|-----------|--------------|
| `report_id` | `reports.id` | CASCADE | One-to-One |
| `assigned_to` | `users.id` | CASCADE | Many-to-One |
| `assigned_by` | `users.id` | SET NULL | Many-to-One |

---

### 5. Media Table

**Outgoing Foreign Keys:**

| Column | References | On Delete | Relationship |
|--------|-----------|-----------|--------------|
| `report_id` | `reports.id` | CASCADE | Many-to-One |

---

### 6. Appeals Table

**Outgoing Foreign Keys:**

| Column | References | On Delete | Relationship |
|--------|-----------|-----------|--------------|
| `report_id` | `reports.id` | CASCADE | Many-to-One |
| `submitted_by_user_id` | `users.id` | CASCADE | Many-to-One |
| `reviewed_by_user_id` | `users.id` | SET NULL | Many-to-One |
| `reassigned_to_user_id` | `users.id` | SET NULL | Many-to-One |
| `reassigned_to_department_id` | `departments.id` | SET NULL | Many-to-One |
| `rework_assigned_to_user_id` | `users.id` | SET NULL | Many-to-One |

---

### 7. Escalations Table

**Outgoing Foreign Keys:**

| Column | References | On Delete | Relationship |
|--------|-----------|-----------|--------------|
| `report_id` | `reports.id` | CASCADE | Many-to-One |
| `escalated_by_user_id` | `users.id` | CASCADE | Many-to-One |
| `escalated_to_user_id` | `users.id` | SET NULL | Many-to-One |

---

### 8. Sessions Table

**Outgoing Foreign Keys:**

| Column | References | On Delete | Relationship |
|--------|-----------|-----------|--------------|
| `user_id` | `users.id` | CASCADE | Many-to-One |

---

### 9. Audit Logs Table

**Outgoing Foreign Keys:**

| Column | References | On Delete | Relationship |
|--------|-----------|-----------|--------------|
| `user_id` | `users.id` | SET NULL | Many-to-One |

---

### 10. Role History Table

**Outgoing Foreign Keys:**

| Column | References | On Delete | Relationship |
|--------|-----------|-----------|--------------|
| `user_id` | `users.id` | CASCADE | Many-to-One |
| `changed_by` | `users.id` | - | Many-to-One |

---

### 11. Report Status History Table

**Outgoing Foreign Keys:**

| Column | References | On Delete | Relationship |
|--------|-----------|-----------|--------------|
| `report_id` | `reports.id` | CASCADE | Many-to-One |
| `changed_by_user_id` | `users.id` | SET NULL | Many-to-One |

---

### 12. Area Assignments Table

**Outgoing Foreign Keys:**

| Column | References | On Delete | Relationship |
|--------|-----------|-----------|--------------|
| `user_id` | `users.id` | CASCADE | Many-to-One |
| `assigned_by` | `users.id` | - | Many-to-One |

---

### 13-15. Sync Tables

**Outgoing Foreign Keys:**

| Table | Column | References | On Delete | Relationship |
|-------|--------|-----------|-----------|--------------|
| `client_sync_state` | `user_id` | `users.id` | CASCADE | Many-to-One |
| `sync_conflicts` | `user_id` | `users.id` | CASCADE | Many-to-One |
| `offline_actions_log` | `user_id` | `users.id` | CASCADE | Many-to-One |

---

## Cascade Rules Summary

### CASCADE (Delete child records)

When parent is deleted, child records are automatically deleted:

- `users` → `reports` (user deleted = reports deleted)
- `users` → `sessions` (user deleted = sessions deleted)
- `users` → `role_history` (user deleted = history deleted)
- `users` → `area_assignments` (user deleted = assignments deleted)
- `users` → `sync_state`, `sync_conflicts`, `offline_actions` (user deleted = sync data deleted)
- `reports` → `media` (report deleted = media deleted)
- `reports` → `tasks` (report deleted = task deleted)
- `reports` → `appeals` (report deleted = appeals deleted)
- `reports` → `escalations` (report deleted = escalations deleted)
- `reports` → `report_status_history` (report deleted = history deleted)
- `tasks` → via `assigned_to` (user deleted = tasks deleted)
- `appeals` → via `submitted_by_user_id` (user deleted = appeals deleted)
- `escalations` → via `escalated_by_user_id` (user deleted = escalations deleted)

### SET NULL (Preserve child records)

When parent is deleted, foreign key is set to NULL:

- `departments` → `users.department_id`
- `departments` → `reports.department_id`
- `users` → `reports.classified_by_user_id`
- `users` → `tasks.assigned_by`
- `users` → `appeals.reviewed_by_user_id`
- `users` → `appeals.reassigned_to_user_id`
- `users` → `appeals.rework_assigned_to_user_id`
- `users` → `escalations.escalated_to_user_id`
- `users` → `audit_logs.user_id`
- `users` → `report_status_history.changed_by_user_id`
- `reports` → `reports.duplicate_of_report_id`
- `departments` → `appeals.reassigned_to_department_id`

---

## Relationship Cardinality

### One-to-One (1:1)

- `reports` ↔ `tasks` (Each report has at most one task)

### One-to-Many (1:N)

- `users` → `reports` (User creates many reports)
- `users` → `sessions` (User has many sessions)
- `users` → `assigned_tasks` (Officer has many tasks)
- `departments` → `users` (Department has many officers)
- `departments` → `reports` (Department handles many reports)
- `reports` → `media` (Report has many media files)
- `reports` → `appeals` (Report can have many appeals)
- `reports` → `escalations` (Report can have many escalations)
- `reports` → `status_history` (Report has many status changes)
- `users` → `area_assignments` (Moderator has many areas)
- `users` → `sync_states` (User has many devices)

### Many-to-Many (M:N)

No direct many-to-many relationships. All M:N relationships are implemented via junction tables or are logically separated.

---

## Referential Integrity Constraints

### Unique Constraints

| Table | Columns | Purpose |
|-------|---------|---------|
| `users` | `phone` | One phone per user |
| `users` | `email` | One email per user |
| `users` | `employee_id` | One employee ID per officer |
| `reports` | `report_number` | Unique report identifier |
| `tasks` | `report_id` | One task per report |
| `sessions` | `jti` | Unique JWT ID |
| `sessions` | `refresh_token_jti` | Unique refresh token |
| `departments` | `name` | Unique department name |

### Check Constraints

**Users:**
- `reputation_score >= 0`
- `total_reports >= 0`
- `total_validations >= 0`
- `helpful_validations >= 0`
- `login_count >= 0`

**Reports:**
- `latitude BETWEEN -90 AND 90`
- `longitude BETWEEN -180 AND 180`
- `ai_confidence BETWEEN 0 AND 1`

**Tasks:**
- `priority BETWEEN 1 AND 10`

**Offline Actions:**
- `retry_count >= 0`
- `max_retries >= 0`
- `priority >= 0`

---

## Circular Dependencies

### Self-Referencing Tables

**Reports:**
- `duplicate_of_report_id` references `reports.id`
- Allows marking reports as duplicates of other reports

**Users (via Role History):**
- `changed_by` references `users.id`
- Allows tracking which admin changed a user's role

**Area Assignments:**
- `assigned_by` references `users.id`
- Allows tracking which admin assigned an area

### Handling Circular Dependencies

All circular dependencies use `SET NULL` on delete to prevent cascade loops.

---

## Database Constraints Summary

**Total Foreign Keys:** 35+  
**Unique Constraints:** 8  
**Check Constraints:** 10+  
**Cascade Deletes:** 15  
**Set Null Deletes:** 15  
**Indexes:** 50+  

---

**Next:** See `DATABASE_CRUD_OPERATIONS.md` for CRUD operations and methods.
