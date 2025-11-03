"""add task audit actions

Revision ID: 003_task_audit
Revises: 002_assignment
Create Date: 2025-01-30

Adds new audit action enum values for task management operations
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_task_audit'
down_revision = '002_assignment'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add new task-related audit action enum values"""
    
    print("Adding task-related audit action enum values...")
    
    # Add new enum values to the auditaction enum type
    op.execute("ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'task_viewed'")
    op.execute("ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'tasks_viewed'")
    op.execute("ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'task_updated'")
    op.execute("ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'task_reassigned'")
    op.execute("ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'tasks_bulk_updated'")
    op.execute("ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'task_stats_viewed'")
    
    print("✅ Task audit action enum values added successfully")


def downgrade() -> None:
    """Remove task-related audit action enum values"""
    
    print("⚠️  Warning: PostgreSQL does not support removing enum values.")
    print("The enum values will remain in the database but won't be used.")
    print("To fully remove them, you would need to recreate the enum type.")
