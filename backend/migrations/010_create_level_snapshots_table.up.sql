-- Create level_snapshots table to track historical seat filling
CREATE TABLE IF NOT EXISTS level_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
    seat_filled INTEGER NOT NULL DEFAULT 0,
    seat_capacity INTEGER NOT NULL,
    income_potential NUMERIC(10,2) NOT NULL,
    income_actual NUMERIC(10,2) NOT NULL DEFAULT 0,
    completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for snapshots
CREATE INDEX IF NOT EXISTS idx_level_snapshots_member_level ON level_snapshots(member_id, level);
CREATE INDEX IF NOT EXISTS idx_level_snapshots_snapshot_date ON level_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_level_snapshots_member_date ON level_snapshots(member_id, snapshot_date DESC);

-- Create table for income reversal tracking
CREATE TABLE IF NOT EXISTS income_reversals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_income_id UUID NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
    reversal_income_id UUID REFERENCES incomes(id) ON DELETE SET NULL,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    reversal_amount NUMERIC(10,2) NOT NULL,
    reversed_by UUID REFERENCES admins(id),
    reversed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for reversals
CREATE INDEX IF NOT EXISTS idx_income_reversals_original_id ON income_reversals(original_income_id);
CREATE INDEX IF NOT EXISTS idx_income_reversals_member_id ON income_reversals(member_id);
CREATE INDEX IF NOT EXISTS idx_income_reversals_reversed_at ON income_reversals(reversed_at DESC);

-- Create view for income summary per member
CREATE OR REPLACE VIEW member_income_summary AS
SELECT 
    m.id as member_id,
    m.member_code,
    m.full_name,
    COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_transactions,
    SUM(CASE WHEN i.status = 'completed' THEN i.amount ELSE 0 END) as total_completed_income,
    SUM(CASE WHEN i.status = 'pending' THEN i.amount ELSE 0 END) as pending_income,
    COUNT(DISTINCT i.level) as active_levels,
    MAX(i.level) as max_level_reached,
    COUNT(DISTINCT i.from_member_id) as unique_referrers,
    MAX(i.processed_at) as last_income_date
FROM members m
LEFT JOIN incomes i ON m.id = i.member_id
GROUP BY m.id, m.member_code, m.full_name;

-- Create view for level-wise income breakdown
CREATE OR REPLACE VIEW level_income_breakdown AS
SELECT 
    i.level,
    lcc.income_amount,
    lcc.seat_capacity,
    COUNT(DISTINCT i.member_id) as members_earning,
    COUNT(i.id) as total_transactions,
    SUM(CASE WHEN i.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
    SUM(CASE WHEN i.status = 'completed' THEN i.amount ELSE 0 END) as total_amount,
    AVG(CASE WHEN i.status = 'completed' THEN i.amount ELSE NULL END) as avg_amount,
    MIN(i.created_at) as first_transaction,
    MAX(i.created_at) as last_transaction
FROM incomes i
JOIN level_commission_configs lcc ON i.level = lcc.level
GROUP BY i.level, lcc.income_amount, lcc.seat_capacity;
