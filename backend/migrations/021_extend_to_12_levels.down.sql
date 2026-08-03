-- Revert Rudra plan extension from 12 levels back to 10 levels
ALTER TABLE level_commission_configs DROP CONSTRAINT IF EXISTS level_commission_configs_level_check;
ALTER TABLE level_commission_configs ADD CONSTRAINT level_commission_configs_level_check CHECK (level >= 1 AND level <= 10);

ALTER TABLE income_projections DROP CONSTRAINT IF EXISTS income_projections_level_check;
ALTER TABLE income_projections ADD CONSTRAINT income_projections_level_check CHECK (level >= 1 AND level <= 10);

ALTER TABLE incomes DROP CONSTRAINT IF EXISTS check_income_level;
ALTER TABLE incomes ADD CONSTRAINT check_income_level CHECK (level >= 1 AND level <= 10);

ALTER TABLE level_snapshots DROP CONSTRAINT IF EXISTS level_snapshots_level_check;
ALTER TABLE level_snapshots ADD CONSTRAINT level_snapshots_level_check CHECK (level >= 1 AND level <= 10);

DELETE FROM level_commission_configs WHERE level IN (11, 12);
