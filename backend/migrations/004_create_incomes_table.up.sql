-- Create incomes table
CREATE TABLE IF NOT EXISTS incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    from_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    description TEXT,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for incomes table
CREATE INDEX IF NOT EXISTS idx_incomes_member_id ON incomes(member_id);
CREATE INDEX IF NOT EXISTS idx_incomes_from_member_id ON incomes(from_member_id);
CREATE INDEX IF NOT EXISTS idx_incomes_level ON incomes(level);
CREATE INDEX IF NOT EXISTS idx_incomes_status ON incomes(status);
CREATE INDEX IF NOT EXISTS idx_incomes_transaction_id ON incomes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_incomes_processed_at ON incomes(processed_at);

-- Create trigger for incomes table
CREATE TRIGGER update_incomes_updated_at BEFORE UPDATE ON incomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate income distribution
CREATE OR REPLACE FUNCTION calculate_income_distribution(
    p_base_amount DECIMAL,
    p_from_member_id UUID,
    p_transaction_id VARCHAR
)
RETURNS TABLE (
    member_id UUID,
    from_member_id UUID,
    level INTEGER,
    amount DECIMAL,
    percentage DECIMAL,
    transaction_id VARCHAR
) AS $$
DECLARE
    level_config RECORD;
    upline_member RECORD;
    calculated_amount DECIMAL;
BEGIN
    -- Loop through each level configuration
    FOR level_config IN 
        SELECT 
            level,
            commission_percentage AS percentage
        FROM level_commission_configs 
        WHERE is_active = true 
        ORDER BY level
    LOOP
        -- Get the upline member at this level
        SELECT m.id INTO upline_member
        FROM get_upline_at_level(p_from_member_id, level_config.level) m;
        
        IF upline_member.id IS NOT NULL THEN
            -- Calculate the amount for this level
            calculated_amount := p_base_amount * (level_config.percentage / 100);
            
            -- Return the distribution record
            member_id := upline_member.id;
            from_member_id := p_from_member_id;
            level := level_config.level;
            amount := calculated_amount;
            percentage := level_config.percentage;
            transaction_id := p_transaction_id || '_L' || level_config.level;
            
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to get upline at specific level
CREATE OR REPLACE FUNCTION get_upline_at_level(
    p_member_id UUID,
    p_level INTEGER
)
RETURNS UUID AS $$
DECLARE
    upline_id UUID;
BEGIN
    WITH RECURSIVE upline AS (
        SELECT 
            m.sponsor_id,
            1 as level
        FROM members m
        WHERE m.id = p_member_id AND m.sponsor_id IS NOT NULL
        
        UNION ALL
        
        SELECT 
            m.sponsor_id,
            u.level + 1
        FROM members m
        INNER JOIN upline u ON m.id = u.sponsor_id
        WHERE m.sponsor_id IS NOT NULL AND u.level < p_level
    )
    SELECT sponsor_id INTO upline_id
    FROM upline
    WHERE level = p_level
    LIMIT 1;
    
    RETURN upline_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE incomes IS 'Stores income transactions from MLM commission calculations';
COMMENT ON COLUMN incomes.id IS 'Unique identifier for the income record';
COMMENT ON COLUMN incomes.member_id IS 'ID of the member receiving the income';
COMMENT ON COLUMN incomes.from_member_id IS 'ID of the member whose activity generated the income';
COMMENT ON COLUMN incomes.level IS 'Level in the MLM hierarchy at which this income was calculated';
COMMENT ON COLUMN incomes.amount IS 'Amount of income earned';
COMMENT ON COLUMN incomes.percentage IS 'Percentage of base amount used to calculate this income';
COMMENT ON COLUMN incomes.transaction_id IS 'Unique transaction identifier for tracking';
COMMENT ON COLUMN incomes.status IS 'Status of the income record (pending, completed, failed, reversed)';
COMMENT ON COLUMN incomes.description IS 'Optional description of the income';
COMMENT ON COLUMN incomes.processed_at IS 'When this income was processed';
