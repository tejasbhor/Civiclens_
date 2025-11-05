-- Migration: Add REOPENED status and Feedback system
-- Date: 2025-11-05
-- Description: Adds REOPENED status to ReportStatus enum and creates feedbacks table

-- ============================================================================
-- PART 1: Add REOPENED status to reportstatus enum
-- ============================================================================

-- Add REOPENED value to the enum
ALTER TYPE reportstatus ADD VALUE IF NOT EXISTS 'reopened';

-- ============================================================================
-- PART 2: Create feedbacks table
-- ============================================================================

-- Create satisfaction level enum
DO $$ BEGIN
    CREATE TYPE satisfactionlevel AS ENUM (
        'very_satisfied',
        'satisfied',
        'neutral',
        'dissatisfied',
        'very_dissatisfied'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
    id SERIAL PRIMARY KEY,
    
    -- Report & User
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rating & Satisfaction
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    satisfaction_level satisfactionlevel NOT NULL,
    
    -- Feedback Content
    comment TEXT,
    
    -- Resolution Quality
    resolution_time_acceptable BOOLEAN NOT NULL DEFAULT TRUE,
    work_quality_acceptable BOOLEAN NOT NULL DEFAULT TRUE,
    officer_behavior_acceptable BOOLEAN NOT NULL DEFAULT TRUE,
    would_recommend BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Follow-up
    requires_followup BOOLEAN NOT NULL DEFAULT FALSE,
    followup_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_feedback_per_report UNIQUE (report_id)
);

-- ============================================================================
-- PART 3: Create indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feedback_report ON feedbacks(report_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedbacks(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_satisfaction ON feedbacks(satisfaction_level);
CREATE INDEX IF NOT EXISTS idx_feedback_report_user ON feedbacks(report_id, user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedbacks(created_at);

-- ============================================================================
-- PART 4: Add trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_feedbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_feedbacks_updated_at ON feedbacks;
CREATE TRIGGER trigger_feedbacks_updated_at
    BEFORE UPDATE ON feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION update_feedbacks_updated_at();

-- ============================================================================
-- PART 5: Grant permissions
-- ============================================================================

-- Grant permissions to application user (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE ON feedbacks TO civiclens_app;
-- GRANT USAGE, SELECT ON SEQUENCE feedbacks_id_seq TO civiclens_app;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify REOPENED status was added
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'reportstatus'::regtype ORDER BY enumsortorder;

-- Verify feedbacks table was created
SELECT table_name FROM information_schema.tables WHERE table_name = 'feedbacks';

-- Verify indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'feedbacks';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration:
-- DROP TABLE IF EXISTS feedbacks CASCADE;
-- DROP TYPE IF EXISTS satisfactionlevel CASCADE;
-- Note: Cannot remove enum value from reportstatus without recreating the enum
