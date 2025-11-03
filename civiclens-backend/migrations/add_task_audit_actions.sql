-- Add task-related audit action enum values
-- Run this migration to add new audit actions for task management

-- Add new enum values to the auditaction enum type
ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'task_viewed';
ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'tasks_viewed';
ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'task_updated';
ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'task_reassigned';
ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'tasks_bulk_updated';
ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'task_stats_viewed';
