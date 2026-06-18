-- Drop triggers first
DROP TRIGGER IF EXISTS update_incomes_updated_at ON incomes;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_income_distribution(DECIMAL, UUID, VARCHAR);
DROP FUNCTION IF EXISTS get_upline_at_level(UUID, INTEGER);

-- Drop tables
DROP TABLE IF EXISTS incomes CASCADE;