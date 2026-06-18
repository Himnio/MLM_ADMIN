-- Drop indexes
DROP INDEX IF EXISTS idx_incomes_member_status;
DROP INDEX IF EXISTS idx_incomes_processed_at;
DROP INDEX IF EXISTS idx_incomes_created_at;
DROP INDEX IF EXISTS idx_incomes_from_member_id_level;
DROP INDEX IF EXISTS idx_incomes_member_id_level;
DROP INDEX IF EXISTS idx_incomes_level;
DROP INDEX IF EXISTS idx_incomes_status;
DROP INDEX IF EXISTS idx_income_projections_calculated_at;
DROP INDEX IF EXISTS idx_income_projections_member_level;

-- Drop constraint
ALTER TABLE incomes DROP CONSTRAINT IF EXISTS check_income_level;
