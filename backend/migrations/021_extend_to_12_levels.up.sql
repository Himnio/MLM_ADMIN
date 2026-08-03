-- Extend Rudra plan from 10 levels to 12 levels
-- Applies to databases where migration 007 already ran with the 10-level plan.

-- 1. Widen CHECK constraints on all tables that restrict level to 1-10.
ALTER TABLE level_commission_configs DROP CONSTRAINT IF EXISTS level_commission_configs_level_check;
ALTER TABLE level_commission_configs DROP CONSTRAINT IF EXISTS check_commission_level;
ALTER TABLE level_commission_configs ADD CONSTRAINT level_commission_configs_level_check CHECK (level >= 1 AND level <= 12);

ALTER TABLE income_projections DROP CONSTRAINT IF EXISTS income_projections_level_check;
ALTER TABLE income_projections ADD CONSTRAINT income_projections_level_check CHECK (level >= 1 AND level <= 12);

ALTER TABLE incomes DROP CONSTRAINT IF EXISTS check_income_level;
ALTER TABLE incomes DROP CONSTRAINT IF EXISTS incomes_level_check;
ALTER TABLE incomes ADD CONSTRAINT check_income_level CHECK (level >= 1 AND level <= 12);

ALTER TABLE level_snapshots DROP CONSTRAINT IF EXISTS level_snapshots_level_check;
ALTER TABLE level_snapshots ADD CONSTRAINT level_snapshots_level_check CHECK (level >= 1 AND level <= 12);

-- 2. Insert levels 11 and 12 into level_commission_configs (idempotent).
INSERT INTO level_commission_configs (level, income_amount, seat_capacity, commission_percentage) VALUES
    (11, 102400.00, 590490, 0.25),
    (12, 204800.00, 1771470, 0.125)
ON CONFLICT (level) DO NOTHING;
