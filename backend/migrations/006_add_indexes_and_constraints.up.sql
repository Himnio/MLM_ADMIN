-- Additional indexes for better performance
-- Composite indexes for common query patterns

-- Members table composite indexes
CREATE INDEX IF NOT EXISTS idx_members_status_joined_at ON members(status, joined_at);
CREATE INDEX IF NOT EXISTS idx_members_sponsor_status ON members(sponsor_id, status) WHERE sponsor_id IS NOT NULL;

-- Incomes table composite indexes
CREATE INDEX IF NOT EXISTS idx_incomes_member_processed_at ON incomes(member_id, processed_at);
CREATE INDEX IF NOT EXISTS idx_incomes_from_member_level ON incomes(from_member_id, level);
CREATE INDEX IF NOT EXISTS idx_incomes_status_processed_at ON incomes(status, processed_at);

-- Audit logs composite indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_action_created ON audit_logs(admin_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created ON audit_logs(entity_type, entity_id, created_at);

-- Create function to update member's downline count (for caching)
CREATE OR REPLACE FUNCTION update_member_downline_count()
RETURNS TRIGGER AS $$
BEGIN
    -- This would update a cached downline count if we had one
    -- For now, we'll just return
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate member code format
CREATE OR REPLACE FUNCTION validate_member_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure member code follows the pattern MBR + digits
    IF NEW.member_code !~ '^MBR[0-9]+$' THEN
        RAISE EXCEPTION 'Invalid member code format. Must be MBR followed by numbers.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate member code
CREATE TRIGGER validate_member_code_before_insert
    BEFORE INSERT ON members
    FOR EACH ROW
    EXECUTE FUNCTION validate_member_code();

-- Create function to get member hierarchy
CREATE OR REPLACE FUNCTION get_member_hierarchy(
    p_member_id UUID,
    p_direction VARCHAR DEFAULT 'upline', -- 'upline' or 'downline'
    p_max_levels INTEGER DEFAULT 10
)
RETURNS TABLE (
    member_id UUID,
    member_code VARCHAR,
    full_name VARCHAR,
    sponsor_id UUID,
    level INTEGER,
    relationship VARCHAR
) AS $$
BEGIN
    IF p_direction = 'upline' THEN
        -- Get upline hierarchy (sponsor chain)
        RETURN QUERY
        WITH RECURSIVE upline AS (
            SELECT 
                m.id as member_id,
                m.member_code,
                m.full_name,
                m.sponsor_id,
                0 as level,
                'self' as relationship
            FROM members m
            WHERE m.id = p_member_id
            
            UNION ALL
            
            SELECT 
                m.id,
                m.member_code,
                m.full_name,
                m.sponsor_id,
                u.level + 1,
                CASE 
                    WHEN u.level + 1 = 1 THEN 'direct_sponsor'
                    ELSE 'upline_level_' || (u.level + 1)
                END
            FROM members m
            INNER JOIN upline u ON m.id = u.sponsor_id
            WHERE m.sponsor_id IS NOT NULL AND u.level < p_max_levels
        )
        SELECT * FROM upline ORDER BY level;
        
    ELSIF p_direction = 'downline' THEN
        -- Get downline hierarchy
        RETURN QUERY
        WITH RECURSIVE downline AS (
            SELECT 
                m.id as member_id,
                m.member_code,
                m.full_name,
                m.sponsor_id,
                0 as level,
                'self' as relationship
            FROM members m
            WHERE m.id = p_member_id
            
            UNION ALL
            
            SELECT 
                m.id,
                m.member_code,
                m.full_name,
                m.sponsor_id,
                d.level + 1,
                CASE 
                    WHEN d.level + 1 = 1 THEN 'direct_referral'
                    ELSE 'downline_level_' || (d.level + 1)
                END
            FROM members m
            INNER JOIN downline d ON m.sponsor_id = d.member_id
            WHERE NOT m.id = ANY(d.path) AND d.level < p_max_levels
        )
        SELECT * FROM downline ORDER BY level;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate total downline statistics
CREATE OR REPLACE FUNCTION calculate_downline_stats(
    p_member_id UUID
)
RETURNS TABLE (
    total_downline BIGINT,
    active_downline BIGINT,
    level_1_count BIGINT,
    level_2_count BIGINT,
    level_3_count BIGINT,
    level_4_count BIGINT,
    level_5_count BIGINT,
    level_6_count BIGINT,
    level_7_count BIGINT,
    level_8_count BIGINT,
    level_9_count BIGINT,
    level_10_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline AS (
        SELECT 
            m.id,
            m.sponsor_id,
            m.status,
            0 as level,
            ARRAY[m.id] as path
        FROM members m
        WHERE m.id = p_member_id
        
        UNION ALL
        
        SELECT 
            m.id,
            m.sponsor_id,
            m.status,
            d.level + 1,
            d.path || m.id
        FROM members m
        INNER JOIN downline d ON m.sponsor_id = d.member_id
        WHERE NOT m.id = ANY(d.path) AND d.level < 10
    )
    SELECT 
        COUNT(*) FILTER (WHERE level > 0) as total_downline,
        COUNT(*) FILTER (WHERE level > 0 AND status = 'active') as active_downline,
        COUNT(*) FILTER (WHERE level = 1) as level_1_count,
        COUNT(*) FILTER (WHERE level = 2) as level_2_count,
        COUNT(*) FILTER (WHERE level = 3) as level_3_count,
        COUNT(*) FILTER (WHERE level = 4) as level_4_count,
        COUNT(*) FILTER (WHERE level = 5) as level_5_count,
        COUNT(*) FILTER (WHERE level = 6) as level_6_count,
        COUNT(*) FILTER (WHERE level = 7) as level_7_count,
        COUNT(*) FILTER (WHERE level = 8) as level_8_count,
        COUNT(*) FILTER (WHERE level = 9) as level_9_count,
        COUNT(*) FILTER (WHERE level = 10) as level_10_count
    FROM downline;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION get_member_hierarchy(UUID, VARCHAR, INTEGER) IS 'Get member hierarchy in upline or downline direction';
COMMENT ON FUNCTION calculate_downline_stats(UUID) IS 'Calculate comprehensive downline statistics for a member';