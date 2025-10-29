-- Security Enhancements Migration
-- Adds 2FA, audit logging, and session fingerprinting
-- Run this manually or via Alembic

-- 1. Add 2FA fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(32),
ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_fa_enabled_at TIMESTAMP WITH TIME ZONE;

-- 2. Add fingerprint to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS fingerprint VARCHAR(64);

-- 3. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    description TEXT,
    extra_data JSONB,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- 5. Add comments
COMMENT ON TABLE audit_logs IS 'Audit trail for security and compliance';
COMMENT ON COLUMN users.totp_secret IS 'TOTP secret for 2FA (encrypted)';
COMMENT ON COLUMN users.two_fa_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN sessions.fingerprint IS 'Session fingerprint for hijacking detection';

-- 6. Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT ON audit_logs TO civiclens_app;
-- GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO civiclens_app;
