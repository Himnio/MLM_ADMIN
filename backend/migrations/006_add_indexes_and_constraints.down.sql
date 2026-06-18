-- Drop functions
DROP FUNCTION IF EXISTS calculate_downline_stats(UUID);
DROP FUNCTION IF EXISTS get_member_hierarchy(UUID, VARCHAR, INTEGER);

-- Drop trigger
DROP TRIGGER IF EXISTS validate_member_code_before_insert ON members;

-- Drop functions
DROP FUNCTION IF EXISTS update_member_downline_count();
DROP FUNCTION IF EXISTS validate_member_code();

-- Drop additional indexes
DROP INDEX IF EXISTS idx_members_status_joined_at;
DROP INDEX IF EXISTS idx_members_sponsor_status;
DROP INDEX IF EXISTS idx_incomes_member_processed_at;
DROP INDEX IF EXISTS idx_incomes_from_member_level;
DROP INDEX IF EXISTS idx_incomes_status_processed_at;
DROP INDEX IF EXISTS idx_audit_logs_admin_action_created;
DROP INDEX IF EXISTS idx_audit_logs_entity_created;