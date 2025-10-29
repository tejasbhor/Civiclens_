"""reports module expansion

Revision ID: 7a2751c30c52
Revises: 001_security
Create Date: 2025-10-24 20:35:45.343172

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7a2751c30c52'
down_revision: Union[str, None] = '001_security'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Extend reportstatus enum with new values (idempotent)
    for val in [
        'pending_classification', 'assigned_to_department', 'assigned_to_officer',
        'acknowledged', 'pending_verification', 'closed', 'duplicate', 'on_hold'
    ]:
        op.execute(
            f"""
            DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                WHERE t.typname = 'reportstatus' AND e.enumlabel = '{val}'
            ) THEN
                ALTER TYPE reportstatus ADD VALUE '{val}';
            END IF;
            END $$;
            """
        )

    # 2) Convert reports.is_public to boolean only if column is integer
    op.execute(
        """
        DO $$ BEGIN
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name='reports' AND column_name='is_public' AND data_type = 'integer'
        ) THEN
            ALTER TABLE reports ALTER COLUMN is_public TYPE boolean USING (CASE WHEN is_public = 1 THEN TRUE ELSE FALSE END);
            ALTER TABLE reports ALTER COLUMN is_public SET DEFAULT TRUE;
        END IF;
        END $$;
        """
    )

    # 3) Add/alter columns on reports using IF NOT EXISTS
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_number VARCHAR(50)")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100)")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS landmark VARCHAR(255)")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS area_type VARCHAR(50)")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS ward_number VARCHAR(50)")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS district VARCHAR(100)")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Jharkhand'")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS pincode VARCHAR(10)")

    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_category VARCHAR(100)")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_confidence FLOAT")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(50)")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS manual_category VARCHAR(100)")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS manual_severity reportseverity")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS classified_by_user_id INTEGER")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS classification_notes TEXT")

    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT FALSE NOT NULL")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE NOT NULL")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE NOT NULL")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE NOT NULL")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS duplicate_of_report_id INTEGER")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS rejection_reason TEXT")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS hold_reason TEXT")

    # 4) Create FKs if missing
    op.execute(
        """
        DO $$ BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='reports_classified_by_user_id_fkey'
        ) THEN
            ALTER TABLE reports
            ADD CONSTRAINT reports_classified_by_user_id_fkey FOREIGN KEY (classified_by_user_id)
            REFERENCES users(id) ON DELETE SET NULL;
        END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='reports_duplicate_of_report_id_fkey'
        ) THEN
            ALTER TABLE reports
            ADD CONSTRAINT reports_duplicate_of_report_id_fkey FOREIGN KEY (duplicate_of_report_id)
            REFERENCES reports(id) ON DELETE SET NULL;
        END IF;
        END $$;
        """
    )

    # 5) Drop deprecated confidence_score if present
    op.execute(
        """
        DO $$ BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='confidence_score'
        ) THEN
            ALTER TABLE reports DROP COLUMN confidence_score;
        END IF;
        END $$;
        """
    )

    # 6) Extend mediatype enum: add AUDIO, DOCUMENT
    for val in ['AUDIO', 'DOCUMENT']:
        op.execute(
            f"""
            DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                WHERE t.typname = 'mediatype' AND e.enumlabel = '{val}'
            ) THEN
                ALTER TYPE mediatype ADD VALUE '{val}';
            END IF;
            END $$;
            """
        )

    # 7) Create uploadsource enum if not exists
    try:
        sa.Enum('citizen_submission', 'officer_before_photo', 'officer_after_photo', name='uploadsource').create(op.get_bind(), checkfirst=True)
    except Exception:
        pass

    # 8) Add media columns (rename metadata->meta)
    op.execute("ALTER TABLE media ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE NOT NULL")
    op.execute("ALTER TABLE media ADD COLUMN IF NOT EXISTS is_proof_of_work BOOLEAN DEFAULT FALSE NOT NULL")
    op.execute("ALTER TABLE media ADD COLUMN IF NOT EXISTS sequence_order INTEGER")
    op.execute("ALTER TABLE media ADD COLUMN IF NOT EXISTS caption VARCHAR(500)")
    op.execute("ALTER TABLE media ADD COLUMN IF NOT EXISTS meta JSONB")
    op.execute("ALTER TABLE media ADD COLUMN IF NOT EXISTS upload_source uploadsource")

    # 9) Create report_status_history table if not exists
    op.execute(
        """
        DO $$ BEGIN
        IF NOT EXISTS (
            SELECT FROM information_schema.tables WHERE table_name='report_status_history'
        ) THEN
            CREATE TABLE report_status_history (
                id SERIAL PRIMARY KEY,
                report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                old_status reportstatus NULL,
                new_status reportstatus NOT NULL,
                changed_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
                notes TEXT NULL,
                changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NULL
            );
        END IF;
        END $$;
        """
    )


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('sync_conflicts',
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('device_id', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('entity_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('entity_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('client_version', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=False),
    sa.Column('server_version', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=False),
    sa.Column('resolution_strategy', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('resolved', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('resolved_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('resolved_data', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='sync_conflicts_user_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='sync_conflicts_pkey')
    )
    op.create_index('ix_sync_conflicts_user_id', 'sync_conflicts', ['user_id'], unique=False)
    op.create_index('ix_sync_conflicts_id', 'sync_conflicts', ['id'], unique=False)
    op.create_table('spatial_ref_sys',
    sa.Column('srid', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('auth_name', sa.VARCHAR(length=256), autoincrement=False, nullable=True),
    sa.Column('auth_srid', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('srtext', sa.VARCHAR(length=2048), autoincrement=False, nullable=True),
    sa.Column('proj4text', sa.VARCHAR(length=2048), autoincrement=False, nullable=True),
    sa.CheckConstraint('srid > 0 AND srid <= 998999', name='spatial_ref_sys_srid_check'),
    sa.PrimaryKeyConstraint('srid', name='spatial_ref_sys_pkey')
    )
    op.create_table('users',
    sa.Column('phone', sa.VARCHAR(length=20), autoincrement=False, nullable=False),
    sa.Column('phone_verified', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('email', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.Column('email_verified', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('full_name', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.Column('hashed_password', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.Column('profile_completion', postgresql.ENUM('minimal', 'basic', 'complete', name='profilecompletionlevel'), autoincrement=False, nullable=False),
    sa.Column('role', postgresql.ENUM('citizen', 'contributor', 'moderator', 'nodal_officer', 'auditor', 'admin', 'super_admin', name='userrole'), autoincrement=False, nullable=False),
    sa.Column('is_active', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('reputation_score', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('total_reports', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('total_validations', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('helpful_validations', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('moderation_areas', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('primary_latitude', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('primary_longitude', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('primary_address', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('department_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('employee_id', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('current_latitude', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('current_longitude', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('last_location_update', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('avatar_url', sa.VARCHAR(length=500), autoincrement=False, nullable=True),
    sa.Column('bio', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('preferred_language', sa.VARCHAR(length=10), autoincrement=False, nullable=True),
    sa.Column('push_notifications', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('sms_notifications', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('email_notifications', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('aadhaar_linked', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('aadhaar_hash', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.Column('digilocker_linked', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('totp_secret', sa.VARCHAR(length=32), autoincrement=False, nullable=True),
    sa.Column('two_fa_enabled', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('two_fa_enabled_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('last_login', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('login_count', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('account_created_via', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), server_default=sa.text("nextval('users_id_seq'::regclass)"), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['department_id'], ['departments.id'], name='users_department_id_fkey', ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name='users_pkey'),
    sa.UniqueConstraint('employee_id', name='users_employee_id_key'),
    postgresql_ignore_search_path=False
    )
    op.create_index('ix_users_role', 'users', ['role'], unique=False)
    op.create_index('ix_users_reputation_score', 'users', ['reputation_score'], unique=False)
    op.create_index('ix_users_phone', 'users', ['phone'], unique=True)
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_table('departments',
    sa.Column('name', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('description', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('keywords', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('contact_email', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.Column('contact_phone', sa.VARCHAR(length=20), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), server_default=sa.text("nextval('departments_id_seq'::regclass)"), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id', name='departments_pkey'),
    postgresql_ignore_search_path=False
    )
    op.create_index('ix_departments_name', 'departments', ['name'], unique=True)
    op.create_index('ix_departments_id', 'departments', ['id'], unique=False)
    op.create_table('reports',
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('department_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('title', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('description', sa.TEXT(), autoincrement=False, nullable=False),
    sa.Column('category', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('status', postgresql.ENUM('received', 'classified', 'assigned', 'in_progress', 'resolved', 'rejected', name='reportstatus'), autoincrement=False, nullable=False),
    sa.Column('severity', postgresql.ENUM('low', 'medium', 'high', 'critical', name='reportseverity'), autoincrement=False, nullable=False),
    sa.Column('latitude', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=False),
    sa.Column('longitude', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=False),
    sa.Column('location', sa.NullType(), autoincrement=False, nullable=True),
    sa.Column('address', sa.VARCHAR(length=500), autoincrement=False, nullable=True),
    sa.Column('confidence_score', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('is_public', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('id', sa.INTEGER(), server_default=sa.text("nextval('reports_id_seq'::regclass)"), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['department_id'], ['departments.id'], name='reports_department_id_fkey', ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='reports_user_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='reports_pkey'),
    postgresql_ignore_search_path=False
    )
    op.create_index('ix_reports_user_id', 'reports', ['user_id'], unique=False)
    op.create_index('ix_reports_title', 'reports', ['title'], unique=False)
    op.create_index('ix_reports_status', 'reports', ['status'], unique=False)
    op.create_index('ix_reports_severity', 'reports', ['severity'], unique=False)
    op.create_index('ix_reports_id', 'reports', ['id'], unique=False)
    op.create_index('ix_reports_department_id', 'reports', ['department_id'], unique=False)
    op.create_index('ix_reports_category', 'reports', ['category'], unique=False)
    op.create_index('idx_reports_location', 'reports', ['location'], unique=False, postgresql_using='gist')
    op.create_index('idx_report_status_severity', 'reports', ['status', 'severity'], unique=False)
    op.create_index('idx_report_location_gist', 'reports', ['location'], unique=False, postgresql_using='gist')
    op.create_index('idx_report_location', 'reports', ['latitude', 'longitude'], unique=False)
    op.create_index('idx_report_created', 'reports', ['created_at'], unique=False)
    op.create_table('area_assignments',
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('area_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('area_name', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('area_data', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=False),
    sa.Column('is_active', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('assigned_by', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('notes', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], name='area_assignments_assigned_by_fkey'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='area_assignments_user_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='area_assignments_pkey')
    )
    op.create_index('ix_area_assignments_user_id', 'area_assignments', ['user_id'], unique=False)
    op.create_index('ix_area_assignments_id', 'area_assignments', ['id'], unique=False)
    op.create_table('media',
    sa.Column('report_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('file_url', sa.VARCHAR(length=500), autoincrement=False, nullable=False),
    sa.Column('file_type', postgresql.ENUM('IMAGE', 'VIDEO', name='mediatype'), autoincrement=False, nullable=False),
    sa.Column('file_size', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('mime_type', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['report_id'], ['reports.id'], name='media_report_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='media_pkey')
    )
    op.create_index('ix_media_report_id', 'media', ['report_id'], unique=False)
    op.create_index('ix_media_id', 'media', ['id'], unique=False)
    op.create_table('audit_logs',
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('user_role', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('action', postgresql.ENUM('login_success', 'login_failure', 'logout', 'logout_all', 'token_refresh', 'password_change', 'password_reset_request', 'password_reset_complete', '2fa_enabled', '2fa_disabled', '2fa_success', '2fa_failure', 'user_created', 'user_updated', 'user_deleted', 'user_role_changed', 'session_created', 'session_revoked', 'session_expired', 'account_locked', 'account_unlocked', 'ip_blocked', 'suspicious_activity', 'sensitive_data_access', 'bulk_data_export', 'system_config_change', name='auditaction'), autoincrement=False, nullable=False),
    sa.Column('status', postgresql.ENUM('success', 'failure', 'warning', name='auditstatus'), autoincrement=False, nullable=False),
    sa.Column('timestamp', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('ip_address', sa.VARCHAR(length=45), autoincrement=False, nullable=True),
    sa.Column('user_agent', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('description', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('resource_type', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('resource_id', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='audit_logs_user_id_fkey', ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name='audit_logs_pkey')
    )
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'], unique=False)
    op.create_index('ix_audit_logs_timestamp', 'audit_logs', ['timestamp'], unique=False)
    op.create_index('ix_audit_logs_ip_address', 'audit_logs', ['ip_address'], unique=False)
    op.create_index('ix_audit_logs_id', 'audit_logs', ['id'], unique=False)
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'], unique=False)
    op.create_table('tasks',
    sa.Column('report_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('assigned_to', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('assigned_by', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('status', postgresql.ENUM('assigned', 'acknowledged', 'in_progress', 'resolved', 'rejected', name='taskstatus'), autoincrement=False, nullable=False),
    sa.Column('priority', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('notes', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('resolution_notes', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('assigned_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('acknowledged_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('started_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('resolved_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], name='tasks_assigned_by_fkey', ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], name='tasks_assigned_to_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['report_id'], ['reports.id'], name='tasks_report_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='tasks_pkey')
    )
    op.create_index('ix_tasks_status', 'tasks', ['status'], unique=False)
    op.create_index('ix_tasks_report_id', 'tasks', ['report_id'], unique=True)
    op.create_index('ix_tasks_id', 'tasks', ['id'], unique=False)
    op.create_index('ix_tasks_assigned_to', 'tasks', ['assigned_to'], unique=False)
    op.create_index('idx_task_priority', 'tasks', ['priority', 'status'], unique=False)
    op.create_index('idx_task_officer_status', 'tasks', ['assigned_to', 'status'], unique=False)
    op.create_table('role_history',
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('old_role', postgresql.ENUM('citizen', 'contributor', 'moderator', 'nodal_officer', 'auditor', 'admin', 'super_admin', name='userrole'), autoincrement=False, nullable=True),
    sa.Column('new_role', postgresql.ENUM('citizen', 'contributor', 'moderator', 'nodal_officer', 'auditor', 'admin', 'super_admin', name='userrole'), autoincrement=False, nullable=False),
    sa.Column('changed_by', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('reason', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('automatic', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['changed_by'], ['users.id'], name='role_history_changed_by_fkey'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='role_history_user_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='role_history_pkey')
    )
    op.create_index('ix_role_history_user_id', 'role_history', ['user_id'], unique=False)
    op.create_index('ix_role_history_id', 'role_history', ['id'], unique=False)
    op.create_table('sessions',
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('jti', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('refresh_token_jti', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.Column('device_info', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('ip_address', sa.VARCHAR(length=45), autoincrement=False, nullable=True),
    sa.Column('user_agent', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('last_activity', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('login_method', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('is_active', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('fingerprint', sa.VARCHAR(length=64), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='sessions_user_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='sessions_pkey')
    )
    op.create_index('ix_sessions_user_id', 'sessions', ['user_id'], unique=False)
    op.create_index('ix_sessions_refresh_token_jti', 'sessions', ['refresh_token_jti'], unique=True)
    op.create_index('ix_sessions_jti', 'sessions', ['jti'], unique=True)
    op.create_index('ix_sessions_id', 'sessions', ['id'], unique=False)
    op.create_table('offline_actions_log',
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('device_id', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('action_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('entity_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('entity_id', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=False),
    sa.Column('processed', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('processed_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('result', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('error_message', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('priority', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('retry_count', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('max_retries', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='offline_actions_log_user_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='offline_actions_log_pkey')
    )
    op.create_index('ix_offline_actions_log_user_id', 'offline_actions_log', ['user_id'], unique=False)
    op.create_index('ix_offline_actions_log_processed', 'offline_actions_log', ['processed'], unique=False)
    op.create_index('ix_offline_actions_log_id', 'offline_actions_log', ['id'], unique=False)
    op.create_index('ix_offline_actions_log_device_id', 'offline_actions_log', ['device_id'], unique=False)
    op.create_table('client_sync_state',
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('device_id', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('last_sync_timestamp', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('last_upload_timestamp', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('last_download_timestamp', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('sync_version', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('device_info', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='client_sync_state_user_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='client_sync_state_pkey')
    )
    op.create_index('ix_client_sync_state_user_id', 'client_sync_state', ['user_id'], unique=False)
    op.create_index('ix_client_sync_state_id', 'client_sync_state', ['id'], unique=False)
    op.create_index('ix_client_sync_state_device_id', 'client_sync_state', ['device_id'], unique=False)
    # ### end Alembic commands ###
