-- Drop trigger and function
DROP TRIGGER IF EXISTS income_status_change_trigger ON incomes;
DROP FUNCTION IF EXISTS log_income_status_change();

-- Drop indexes
DROP INDEX IF EXISTS idx_income_calculations_calculated_at;
DROP INDEX IF EXISTS idx_income_calculations_type;
DROP INDEX IF EXISTS idx_income_calculations_transaction_id;
DROP INDEX IF EXISTS idx_income_calculations_level;
DROP INDEX IF EXISTS idx_income_calculations_sponsor_id;
DROP INDEX IF EXISTS idx_income_calculations_member_id;
DROP INDEX IF EXISTS idx_income_history_status;
DROP INDEX IF EXISTS idx_income_history_changed_at;
DROP INDEX IF EXISTS idx_income_history_member_id;
DROP INDEX IF EXISTS idx_income_history_income_id;

-- Drop tables
DROP TABLE IF EXISTS income_calculations;
DROP TABLE IF EXISTS income_history;
