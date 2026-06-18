-- Drop functions first
DROP FUNCTION IF EXISTS archive_old_audit_logs(INTEGER);
DROP FUNCTION IF EXISTS get_entity_audit_trail(VARCHAR, UUID, INTEGER);

-- Drop audit_logs table
DROP TABLE IF EXISTS audit_logs CASCADE;