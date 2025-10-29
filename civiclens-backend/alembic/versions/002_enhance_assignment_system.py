"""enhance assignment system

Revision ID: 002_assignment
Revises: 7a2751c30c52
Create Date: 2025-01-26

Adds:
- Performance indexes for assignment queries
- Data integrity constraints
- Optimizations for workload balancing
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_assignment'
down_revision = '7a2751c30c52'  # reports module expansion
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply migration - Add indexes and constraints for assignment system"""
    
    # Add performance indexes for assignment queries
    print("Adding performance indexes for assignment system...")
    
    # Index for officer workload queries (Task.assigned_to + Report.status)
    op.create_index(
        'idx_task_officer_report_status',
        'tasks',
        ['assigned_to'],
        postgresql_where=sa.text("assigned_to IS NOT NULL")
    )
    
    # Index for department-based officer queries
    op.create_index(
        'idx_user_department_role_active',
        'users',
        ['department_id', 'role', 'is_active'],
        postgresql_where=sa.text("department_id IS NOT NULL AND role IN ('nodal_officer', 'admin')")
    )
    
    # Index for report assignment queries
    op.create_index(
        'idx_report_department_status',
        'reports',
        ['department_id', 'status'],
        postgresql_where=sa.text("department_id IS NOT NULL")
    )
    
    # Index for workload calculation queries (Task + Report join)
    op.create_index(
        'idx_report_task_workload',
        'reports',
        ['status', 'created_at', 'updated_at'],
        postgresql_where=sa.text("status IN ('assigned_to_officer', 'acknowledged', 'in_progress', 'pending_verification', 'resolved', 'closed')")
    )
    
    # Add check constraints for data integrity
    print("Adding data integrity constraints...")
    
    # Ensure task priority is within valid range
    op.create_check_constraint(
        'chk_task_priority_range',
        'tasks',
        'priority >= 1 AND priority <= 10'
    )
    
    # Ensure report severity is valid
    op.create_check_constraint(
        'chk_report_severity_valid',
        'reports',
        "severity IN ('low', 'medium', 'high', 'critical')"
    )
    
    # Ensure task status is valid
    op.create_check_constraint(
        'chk_task_status_valid',
        'tasks',
        "status IN ('assigned', 'acknowledged', 'in_progress', 'resolved', 'rejected')"
    )
    
    # Add partial indexes for common queries
    print("Adding partial indexes for common assignment queries...")
    
    # Index for active tasks only
    op.create_index(
        'idx_task_active_assignments',
        'tasks',
        ['assigned_to', 'status', 'assigned_at'],
        postgresql_where=sa.text("status IN ('assigned', 'acknowledged', 'in_progress')")
    )
    
    # Index for recent report assignments (last 30 days)
    op.create_index(
        'idx_report_recent_assignments',
        'reports',
        ['department_id', 'status', 'created_at'],
        postgresql_where=sa.text("created_at >= NOW() - INTERVAL '30 days'")
    )
    
    print("✅ Assignment system indexes and constraints added successfully")


def downgrade() -> None:
    """Rollback migration - Remove indexes and constraints"""
    
    print("Removing assignment system indexes and constraints...")
    
    # Remove indexes
    op.drop_index('idx_task_officer_report_status', 'tasks')
    op.drop_index('idx_user_department_role_active', 'users')
    op.drop_index('idx_report_department_status', 'reports')
    op.drop_index('idx_report_task_workload', 'reports')
    op.drop_index('idx_task_active_assignments', 'tasks')
    op.drop_index('idx_report_recent_assignments', 'reports')
    
    # Remove check constraints
    op.drop_constraint('chk_task_priority_range', 'tasks', type_='check')
    op.drop_constraint('chk_report_severity_valid', 'reports', type_='check')
    op.drop_constraint('chk_task_status_valid', 'tasks', type_='check')
    
    print("✅ Assignment system migration rolled back successfully")