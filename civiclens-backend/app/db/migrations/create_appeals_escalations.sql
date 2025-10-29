-- Migration: Create Appeals and Escalations tables
-- Date: 2025-10-25
-- Description: Add support for appeals and escalations system

-- Create Appeal Type Enum
CREATE TYPE appeal_type AS ENUM (
    'classification',
    'resolution',
    'rejection',
    'incorrect_assignment',
    'workload',
    'resource_lack',
    'quality_concern'
);

-- Create Appeal Status Enum
CREATE TYPE appeal_status AS ENUM (
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'withdrawn'
);

-- Create Appeals Table
CREATE TABLE IF NOT EXISTS appeals (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    submitted_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appeal_type appeal_type NOT NULL,
    status appeal_status NOT NULL DEFAULT 'submitted',
    reason TEXT NOT NULL,
    evidence TEXT,
    requested_action TEXT,
    reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    action_taken TEXT,
    -- Reassignment fields (for incorrect assignment appeals)
    reassigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reassigned_to_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    reassignment_reason TEXT,
    -- Rework fields (for resolution quality appeals)
    requires_rework BOOLEAN DEFAULT FALSE,
    rework_assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rework_notes TEXT,
    rework_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for appeals
CREATE INDEX idx_appeal_report_id ON appeals(report_id);
CREATE INDEX idx_appeal_submitted_by ON appeals(submitted_by_user_id);
CREATE INDEX idx_appeal_type ON appeals(appeal_type);
CREATE INDEX idx_appeal_status ON appeals(status);
CREATE INDEX idx_appeal_report_status ON appeals(report_id, status);
CREATE INDEX idx_appeal_type_status ON appeals(appeal_type, status);

-- Create Escalation Level Enum
CREATE TYPE escalation_level AS ENUM (
    'level_1',
    'level_2',
    'level_3'
);

-- Create Escalation Reason Enum
CREATE TYPE escalation_reason AS ENUM (
    'sla_breach',
    'unresolved',
    'quality_issue',
    'citizen_complaint',
    'vip_attention',
    'critical_priority'
);

-- Create Escalation Status Enum
CREATE TYPE escalation_status AS ENUM (
    'escalated',
    'acknowledged',
    'under_review',
    'action_taken',
    'resolved',
    'de_escalated'
);

-- Create Escalations Table
CREATE TABLE IF NOT EXISTS escalations (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    escalated_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    escalated_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    level escalation_level NOT NULL,
    reason escalation_reason NOT NULL,
    status escalation_status NOT NULL DEFAULT 'escalated',
    description TEXT NOT NULL,
    previous_actions TEXT,
    urgency_notes TEXT,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    response_notes TEXT,
    action_taken TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    is_overdue BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for escalations
CREATE INDEX idx_escalation_report_id ON escalations(report_id);
CREATE INDEX idx_escalation_escalated_by ON escalations(escalated_by_user_id);
CREATE INDEX idx_escalation_escalated_to ON escalations(escalated_to_user_id);
CREATE INDEX idx_escalation_level ON escalations(level);
CREATE INDEX idx_escalation_reason ON escalations(reason);
CREATE INDEX idx_escalation_status ON escalations(status);
CREATE INDEX idx_escalation_report_level ON escalations(report_id, level);
CREATE INDEX idx_escalation_status_level ON escalations(status, level);
CREATE INDEX idx_escalation_overdue ON escalations(is_overdue, sla_deadline);

-- Create trigger to update updated_at timestamp for appeals
CREATE OR REPLACE FUNCTION update_appeals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_appeals_updated_at
    BEFORE UPDATE ON appeals
    FOR EACH ROW
    EXECUTE FUNCTION update_appeals_updated_at();

-- Create trigger to update updated_at timestamp for escalations
CREATE OR REPLACE FUNCTION update_escalations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_escalations_updated_at
    BEFORE UPDATE ON escalations
    FOR EACH ROW
    EXECUTE FUNCTION update_escalations_updated_at();

-- Add comments for documentation
COMMENT ON TABLE appeals IS 'Appeals submitted by citizens for classification, resolution, or assignment disputes';
COMMENT ON TABLE escalations IS 'Escalations of reports to higher authority levels for urgent or unresolved issues';

COMMENT ON COLUMN appeals.appeal_type IS 'Type of appeal: classification, resolution, assignment, or rejection';
COMMENT ON COLUMN appeals.status IS 'Current status of the appeal';
COMMENT ON COLUMN escalations.level IS 'Escalation level: level_1 (dept head), level_2 (city manager), level_3 (mayor)';
COMMENT ON COLUMN escalations.reason IS 'Reason for escalation';
COMMENT ON COLUMN escalations.is_overdue IS 'Whether the escalation has exceeded its SLA deadline';
