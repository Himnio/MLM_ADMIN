-- Create referrals table (Adjacency List Model for MLM tree)
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_parent_child UNIQUE (parent_id, child_id)
);

-- Create indexes for referrals table
CREATE INDEX IF NOT EXISTS idx_referrals_parent_id ON referrals(parent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_child_id ON referrals(child_id);
CREATE INDEX IF NOT EXISTS idx_referrals_level ON referrals(level);
CREATE INDEX IF NOT EXISTS idx_referrals_parent_level ON referrals(parent_id, level);

-- Create function to prevent circular references
CREATE OR REPLACE FUNCTION prevent_circular_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the new child is an ancestor of the new parent
    IF EXISTS (
        WITH RECURSIVE ancestors AS (
            SELECT parent_id, child_id, 1 as depth
            FROM referrals
            WHERE child_id = NEW.parent_id
            
            UNION ALL
            
            SELECT r.parent_id, r.child_id, a.depth + 1
            FROM referrals r
            INNER JOIN ancestors a ON r.child_id = a.parent_id
            WHERE a.depth < 50  -- Prevent infinite recursion
        )
        SELECT 1 FROM ancestors WHERE child_id = NEW.child_id
    ) THEN
        RAISE EXCEPTION 'Circular reference detected: Cannot add member as their own ancestor';
    END IF;
    
    -- Check if the member already has a sponsor
    IF EXISTS (
        SELECT 1 FROM referrals 
        WHERE child_id = NEW.child_id AND level = 1
    ) THEN
        RAISE EXCEPTION 'Member already has a sponsor';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent circular references
CREATE TRIGGER check_circular_reference BEFORE INSERT OR UPDATE ON referrals
    FOR EACH ROW EXECUTE FUNCTION prevent_circular_reference();

-- Create function to get downline tree
CREATE OR REPLACE FUNCTION get_downline_tree(
    root_member_id UUID,
    max_depth INTEGER DEFAULT 10
)
RETURNS TABLE (
    member_id UUID,
    member_code VARCHAR(50),
    full_name VARCHAR(255),
    sponsor_id UUID,
    level INTEGER,
    path UUID[]
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline AS (
        -- Base case: the root member
        SELECT 
            m.id as member_id,
            m.member_code,
            m.full_name,
            m.sponsor_id,
            0 as level,
            ARRAY[m.id] as path
        FROM members m
        WHERE m.id = root_member_id
        
        UNION ALL
        
        -- Recursive case: get children
        SELECT 
            m.id,
            m.member_code,
            m.full_name,
            m.sponsor_id,
            d.level + 1,
            d.path || m.id
        FROM members m
        INNER JOIN downline d ON m.sponsor_id = d.member_id
        WHERE NOT m.id = ANY(d.path)  -- Prevent cycles
          AND d.level < max_depth      -- Limit depth
    )
    SELECT * FROM downline
    ORDER BY level, member_code;
END;
$$ LANGUAGE plpgsql;

-- Create function to count downline by level
CREATE OR REPLACE FUNCTION count_downline_by_level(
    root_member_id UUID,
    max_depth INTEGER DEFAULT 10
)
RETURNS TABLE (
    level INTEGER,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline AS (
        SELECT 
            m.id,
            m.sponsor_id,
            0 as level,
            ARRAY[m.id] as path
        FROM members m
        WHERE m.id = root_member_id
        
        UNION ALL
        
        SELECT 
            m.id,
            m.sponsor_id,
            d.level + 1,
            d.path || m.id
        FROM members m
        INNER JOIN downline d ON m.sponsor_id = d.id
        WHERE NOT m.id = ANY(d.path)
          AND d.level < max_depth
    )
    SELECT d.level, COUNT(*)::BIGINT
    FROM downline d
    WHERE d.level > 0  -- Exclude root member
    GROUP BY d.level
    ORDER BY d.level;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE referrals IS 'Stores referral relationships in the MLM tree structure';
COMMENT ON COLUMN referrals.id IS 'Unique identifier for the referral relationship';
COMMENT ON COLUMN referrals.parent_id IS 'ID of the parent (sponsor) member';
COMMENT ON COLUMN referrals.child_id IS 'ID of the child (downline) member';
COMMENT ON COLUMN referrals.level IS 'Level in the MLM hierarchy (1-10)';