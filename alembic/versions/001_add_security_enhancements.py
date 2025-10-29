"""add security enhancements

Revision ID: 001_security
Revises: 
Create Date: 2025-01-20

Adds:
- 2FA fields to users table (totp_secret, two_fa_enabled, two_fa_enabled_at)
- Session fingerprinting (fingerprint field in sessions)
- Audit logs table
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_security'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add 2FA fields to users table
    op.add_column('users', sa.Column('totp_secret', sa.String(length=32), nullable=True))
    op.add_column('users', sa.Column('two_fa_enabled', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('users', sa.Column('two_fa_enabled_at', sa.DateTime(timezone=True), nullable=True))
    
    # 2. Add fingerprint to sessions table
    op.add_column('sessions', sa.Column('fingerprint', sa.String(length=64), nullable=True))
    
    # 3. Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('user_role', sa.String(length=50), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='success'),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )
    
    # 4. Create indexes for audit_logs
    op.create_index('idx_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('idx_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('idx_audit_logs_timestamp', 'audit_logs', ['timestamp'])
    op.create_index('idx_audit_logs_ip_address', 'audit_logs', ['ip_address'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_audit_logs_ip_address', table_name='audit_logs')
    op.drop_index('idx_audit_logs_timestamp', table_name='audit_logs')
    op.drop_index('idx_audit_logs_action', table_name='audit_logs')
    op.drop_index('idx_audit_logs_user_id', table_name='audit_logs')
    
    # Drop audit_logs table
    op.drop_table('audit_logs')
    
    # Remove fingerprint from sessions
    op.drop_column('sessions', 'fingerprint')
    
    # Remove 2FA fields from users
    op.drop_column('users', 'two_fa_enabled_at')
    op.drop_column('users', 'two_fa_enabled')
    op.drop_column('users', 'totp_secret')
