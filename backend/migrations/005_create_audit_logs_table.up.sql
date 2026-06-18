-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create index for JSONB queries on old_value and new_value
CREATE INDEX IF NOT EXISTS idx_audit_logs_old_value ON audit_logs USING gin(old_value);
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_value ON audit_logs USING gin(new_value);

-- Create function to archive old audit logs (for maintenance)
CREATE OR REPLACE FUNCTION archive_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- In a real implementation, you would move old records to an archive table
    -- For now, we'll just delete them (you should create an audit_logs_archive table)
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get audit trail for an entity
CREATE OR REPLACE FUNCTION get_entity_audit_trail(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    admin_id UUID,
    admin_name VARCHAR,
    action VARCHAR,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.admin_id,
        a.full_name as admin_name,
        al.action,
        al.old_value,
        al.new_value,
        al.ip_address,
        al.created_at
    FROM audit_logs al
    LEFT JOIN admins a ON al.admin_id = a.id
    WHERE al.entity_type = p_entity_type 
      AND al.entity_id = p_entity_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE audit_logs IS 'Stores audit trail of all admin actions in the system';
COMMENT ON COLUMN audit_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN audit_logs.admin_id IS 'ID of the admin who performed the action';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (create, update, delete, login, logout, etc.)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (admin, member, referral, income, system)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN audit_logs.old_value IS 'Previous state of the entity (JSON)';
COMMENT ON COLUMN audit_logs.new_value IS 'New state of the entity (JSON)';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the admin';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent of the admin browser/client';
COMMENT ON COLUMN audit_logs.created_at IS 'When the action was performed';