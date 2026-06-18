-- Add better indexes to incomes table if not exists
CREATE INDEX IF NOT EXISTS idx_incomes_status ON incomes(status);
CREATE INDEX IF NOT EXISTS idx_incomes_level ON incomes(level);
CREATE INDEX IF NOT EXISTS idx_incomes_member_id_level ON incomes(member_id, level);
CREATE INDEX IF NOT EXISTS idx_incomes_from_member_id_level ON incomes(from_member_id, level);
CREATE INDEX IF NOT EXISTS idx_incomes_created_at ON incomes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incomes_processed_at ON incomes(processed_at DESC);

-- Create composite index for income summation queries
CREATE INDEX IF NOT EXISTS idx_incomes_member_status ON incomes(member_id, status);

-- Add constraint to ensure level is between 1-10
ALTER TABLE incomes ADD CONSTRAINT check_income_level CHECK (level >= 1 AND level <= 10);

-- Update income_projections with better indexes
CREATE INDEX IF NOT EXISTS idx_income_projections_member_level ON income_projections(member_id, level);
CREATE INDEX IF NOT EXISTS idx_income_projections_calculated_at ON income_projections(calculated_at DESC);
