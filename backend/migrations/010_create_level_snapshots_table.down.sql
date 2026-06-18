-- Drop views
DROP VIEW IF EXISTS level_income_breakdown;
DROP VIEW IF EXISTS member_income_summary;

-- Drop indexes for reversals
DROP INDEX IF EXISTS idx_income_reversals_reversed_at;
DROP INDEX IF EXISTS idx_income_reversals_member_id;
DROP INDEX IF EXISTS idx_income_reversals_original_id;

-- Drop indexes for snapshots
DROP INDEX IF EXISTS idx_level_snapshots_member_date;
DROP INDEX IF EXISTS idx_level_snapshots_snapshot_date;
DROP INDEX IF EXISTS idx_level_snapshots_member_level;

-- Drop tables
DROP TABLE IF EXISTS income_reversals;
DROP TABLE IF EXISTS level_snapshots;
