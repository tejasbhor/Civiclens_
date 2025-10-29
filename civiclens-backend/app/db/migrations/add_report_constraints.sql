-- ============================================================================
-- Report System Database Constraints
-- Ensures data integrity at the database level
-- ============================================================================

-- Add constraint: department_id must exist if status is ASSIGNED_TO_DEPARTMENT or beyond
ALTER TABLE reports
ADD CONSTRAINT check_department_assigned
CHECK (
    (status IN ('received', 'pending_classification', 'classified', 'on_hold'))
    OR 
    (status NOT IN ('received', 'pending_classification', 'classified', 'on_hold') AND department_id IS NOT NULL)
);

-- Add constraint: Task must exist if status requires officer
-- This is enforced through application logic since we can't easily check task existence in CHECK constraint
-- Instead, we'll use a trigger

-- Create function to validate officer assignment
CREATE OR REPLACE FUNCTION validate_officer_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- If status requires officer, ensure task exists
    IF NEW.status IN ('assigned_to_officer', 'acknowledged', 'in_progress', 'pending_verification') THEN
        IF NOT EXISTS (SELECT 1 FROM tasks WHERE report_id = NEW.id) THEN
            RAISE EXCEPTION 'Cannot set status to % without officer assignment', NEW.status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate officer assignment before update
DROP TRIGGER IF EXISTS trigger_validate_officer_assignment ON reports;
CREATE TRIGGER trigger_validate_officer_assignment
    BEFORE UPDATE OF status ON reports
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION validate_officer_assignment();

-- Create function to update status_updated_at automatically
CREATE OR REPLACE FUNCTION update_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update status_updated_at
DROP TRIGGER IF EXISTS trigger_update_status_timestamp ON reports;
CREATE TRIGGER trigger_update_status_timestamp
    BEFORE UPDATE OF status ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_status_timestamp();

-- Create function to prevent backward status transitions
CREATE OR REPLACE FUNCTION prevent_backward_transitions()
RETURNS TRIGGER AS $$
DECLARE
    status_order TEXT[] := ARRAY[
        'received',
        'pending_classification',
        'classified',
        'assigned_to_department',
        'assigned_to_officer',
        'acknowledged',
        'in_progress',
        'pending_verification',
        'resolved',
        'closed'
    ];
    old_index INT;
    new_index INT;
BEGIN
    -- Allow ON_HOLD, REJECTED, DUPLICATE at any time
    IF NEW.status IN ('on_hold', 'rejected', 'duplicate') THEN
        RETURN NEW;
    END IF;
    
    -- Allow forward transitions
    old_index := array_position(status_order, OLD.status::TEXT);
    new_index := array_position(status_order, NEW.status::TEXT);
    
    IF old_index IS NOT NULL AND new_index IS NOT NULL THEN
        IF new_index < old_index THEN
            RAISE EXCEPTION 'Backward status transition not allowed: % -> %', OLD.status, NEW.status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent backward transitions
DROP TRIGGER IF EXISTS trigger_prevent_backward_transitions ON reports;
CREATE TRIGGER trigger_prevent_backward_transitions
    BEFORE UPDATE OF status ON reports
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION prevent_backward_transitions();

-- Create function to sync task status with report status
CREATE OR REPLACE FUNCTION sync_task_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update task status when report status changes
    IF NEW.status = 'acknowledged' THEN
        UPDATE tasks SET status = 'acknowledged', acknowledged_at = NOW() WHERE report_id = NEW.id;
    ELSIF NEW.status = 'in_progress' THEN
        UPDATE tasks SET status = 'in_progress', started_at = NOW() WHERE report_id = NEW.id;
    ELSIF NEW.status IN ('resolved', 'closed') THEN
        UPDATE tasks SET status = 'resolved', resolved_at = NOW() WHERE report_id = NEW.id;
    ELSIF NEW.status = 'rejected' THEN
        UPDATE tasks SET status = 'rejected', resolved_at = NOW() WHERE report_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync task status
DROP TRIGGER IF EXISTS trigger_sync_task_status ON reports;
CREATE TRIGGER trigger_sync_task_status
    AFTER UPDATE OF status ON reports
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION sync_task_status();

-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_reports_status_updated_at ON reports(status, status_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_department_status ON reports(department_id, status) WHERE department_id IS NOT NULL;

-- Add index on tasks for report_id lookups
CREATE INDEX IF NOT EXISTS idx_tasks_report_id ON tasks(report_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_status ON tasks(assigned_to, status);

-- Add comments for documentation
COMMENT ON CONSTRAINT check_department_assigned ON reports IS 
'Ensures department is assigned before status can progress beyond initial stages';

COMMENT ON FUNCTION validate_officer_assignment() IS 
'Validates that a task/officer exists before allowing officer-dependent status changes';

COMMENT ON FUNCTION prevent_backward_transitions() IS 
'Prevents backward status transitions to maintain government transparency and audit trail';

COMMENT ON FUNCTION sync_task_status() IS 
'Automatically syncs task status with report status to maintain consistency';

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================
/*
-- To rollback these changes:

DROP TRIGGER IF EXISTS trigger_validate_officer_assignment ON reports;
DROP TRIGGER IF EXISTS trigger_update_status_timestamp ON reports;
DROP TRIGGER IF EXISTS trigger_prevent_backward_transitions ON reports;
DROP TRIGGER IF EXISTS trigger_sync_task_status ON reports;

DROP FUNCTION IF EXISTS validate_officer_assignment();
DROP FUNCTION IF EXISTS update_status_timestamp();
DROP FUNCTION IF EXISTS prevent_backward_transitions();
DROP FUNCTION IF EXISTS sync_task_status();

ALTER TABLE reports DROP CONSTRAINT IF EXISTS check_department_assigned;

DROP INDEX IF EXISTS idx_reports_status_updated_at;
DROP INDEX IF EXISTS idx_reports_department_status;
DROP INDEX IF EXISTS idx_tasks_report_id;
DROP INDEX IF EXISTS idx_tasks_assigned_to_status;
*/
