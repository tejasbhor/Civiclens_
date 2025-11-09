-- =====================================================
-- CivicLens Complete Workflow Implementation Migration
-- =====================================================
-- This migration adds:
-- 1. ASSIGNMENT_REJECTED status
-- 2. Officer rejection tracking fields
-- 3. ON_HOLD enhancements
-- 4. SLA tracking for tasks
-- 5. Notification system
-- 6. Officer performance metrics
-- =====================================================

-- Add new status to reportstatus enum (note: no underscore in enum name)
ALTER TYPE reportstatus ADD VALUE IF NOT EXISTS 'assignment_rejected';

-- Add officer rejection fields to reports table
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS assignment_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS assignment_rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assignment_rejected_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add ON_HOLD enhancement fields to reports table
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS estimated_resume_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hold_approved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hold_approval_required BOOLEAN DEFAULT FALSE NOT NULL;

-- Add SLA tracking fields to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_violated INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS sla_violation_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- Create notification_type enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'status_change',
        'task_assigned',
        'task_acknowledged',
        'task_started',
        'task_completed',
        'verification_required',
        'resolution_approved',
        'resolution_rejected',
        'appeal_submitted',
        'appeal_reviewed',
        'feedback_received',
        'sla_warning',
        'sla_violated',
        'escalation_created',
        'assignment_rejected',
        'on_hold',
        'work_resumed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notification_priority enum
DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM (
        'low',
        'normal',
        'high',
        'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    related_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    related_appeal_id INTEGER REFERENCES appeals(id) ON DELETE CASCADE,
    related_escalation_id INTEGER REFERENCES escalations(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_user_created ON notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_priority ON notifications(priority, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_related_report ON notifications(related_report_id);

-- Create officer_metrics table
CREATE TABLE IF NOT EXISTS officer_metrics (
    id SERIAL PRIMARY KEY,
    officer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Task Counts
    total_assigned INTEGER DEFAULT 0 NOT NULL,
    total_completed INTEGER DEFAULT 0 NOT NULL,
    total_active INTEGER DEFAULT 0 NOT NULL,
    total_acknowledged INTEGER DEFAULT 0 NOT NULL,
    total_in_progress INTEGER DEFAULT 0 NOT NULL,
    total_on_hold INTEGER DEFAULT 0 NOT NULL,
    
    -- Performance Metrics
    resolution_rate FLOAT DEFAULT 0.0 NOT NULL,
    avg_resolution_time_hours FLOAT DEFAULT 0.0 NOT NULL,
    avg_acknowledgment_time_hours FLOAT DEFAULT 0.0 NOT NULL,
    avg_completion_time_hours FLOAT DEFAULT 0.0 NOT NULL,
    
    -- SLA Metrics
    sla_compliance_rate FLOAT DEFAULT 0.0 NOT NULL,
    sla_violations_count INTEGER DEFAULT 0 NOT NULL,
    sla_warnings_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Citizen Satisfaction
    avg_satisfaction_score FLOAT DEFAULT 0.0 NOT NULL,
    total_feedbacks_received INTEGER DEFAULT 0 NOT NULL,
    positive_feedbacks_count INTEGER DEFAULT 0 NOT NULL,
    negative_feedbacks_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Quality Metrics
    rework_count INTEGER DEFAULT 0 NOT NULL,
    rework_rate FLOAT DEFAULT 0.0 NOT NULL,
    first_time_resolution_rate FLOAT DEFAULT 0.0 NOT NULL,
    
    -- Workload Metrics
    avg_daily_workload FLOAT DEFAULT 0.0 NOT NULL,
    peak_concurrent_tasks INTEGER DEFAULT 0 NOT NULL,
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Unique constraint
    CONSTRAINT uq_officer_period UNIQUE (officer_id, period_start, period_end)
);

-- Create indexes for officer_metrics
CREATE INDEX IF NOT EXISTS idx_officer_metrics_officer_id ON officer_metrics(officer_id);
CREATE INDEX IF NOT EXISTS idx_officer_metrics_period ON officer_metrics(officer_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_officer_metrics_performance ON officer_metrics(officer_id, resolution_rate, sla_compliance_rate);

-- Create indexes for new report fields
CREATE INDEX IF NOT EXISTS idx_reports_assignment_rejected_by ON reports(assignment_rejected_by_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_hold_approved_by ON reports(hold_approved_by_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_estimated_resume ON reports(estimated_resume_date) WHERE status = 'on_hold';

-- Create indexes for task SLA fields
CREATE INDEX IF NOT EXISTS idx_tasks_sla_deadline ON tasks(sla_deadline) WHERE sla_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_sla_violated ON tasks(sla_violated) WHERE sla_violated > 0;

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'System notifications for users about report/task updates';
COMMENT ON TABLE officer_metrics IS 'Performance metrics for field officers calculated periodically';
COMMENT ON COLUMN reports.assignment_rejection_reason IS 'Reason provided by officer for rejecting assignment';
COMMENT ON COLUMN reports.estimated_resume_date IS 'Estimated date when ON_HOLD work will resume';
COMMENT ON COLUMN tasks.sla_deadline IS 'SLA deadline based on report severity';
COMMENT ON COLUMN tasks.sla_violated IS '0=compliant, 1=warning, 2=violated';

-- Grant permissions (only if civiclens_app role exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'civiclens_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO civiclens_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON officer_metrics TO civiclens_app;
        GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO civiclens_app;
        GRANT USAGE, SELECT ON SEQUENCE officer_metrics_id_seq TO civiclens_app;
        RAISE NOTICE 'Permissions granted to civiclens_app role';
    ELSE
        RAISE NOTICE 'Role civiclens_app does not exist - skipping permission grants';
    END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Run this migration with:
-- psql -U postgres -d civiclens -f migrations/add_workflow_enhancements.sql
-- =====================================================
