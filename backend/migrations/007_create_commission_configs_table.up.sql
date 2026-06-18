-- Create level_commission_configs table to store MLM income structure
CREATE TABLE IF NOT EXISTS level_commission_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
    income_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    seat_capacity INTEGER NOT NULL DEFAULT 0,
    commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(level)
);

-- Insert default MLM income structure (10-level plan)
INSERT INTO level_commission_configs (level, income_amount, seat_capacity, commission_percentage) VALUES
    (1, 100.00, 10, 10.00),
    (2, 200.00, 30, 7.00),
    (3, 400.00, 90, 5.00),
    (4, 800.00, 270, 4.00),
    (5, 1600.00, 810, 3.00),
    (6, 3200.00, 2430, 2.50),
    (7, 6400.00, 7290, 2.00),
    (8, 12800.00, 21870, 1.50),
    (9, 25600.00, 65610, 1.00),
    (10, 51200.00, 196830, 0.50);

-- Create table for income projections
CREATE TABLE IF NOT EXISTS income_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
    potential_income NUMERIC(10,2) NOT NULL DEFAULT 0,
    actual_income NUMERIC(10,2) NOT NULL DEFAULT 0,
    seat_filled INTEGER NOT NULL DEFAULT 0,
    percentage_complete NUMERIC(5,2) NOT NULL DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_commission_configs_level ON level_commission_configs(level);
CREATE INDEX idx_income_projections_member ON income_projections(member_id);
CREATE INDEX idx_income_projections_level ON income_projections(level);

-- Create function to calculate total potential income
CREATE OR REPLACE FUNCTION calculate_potential_income(member_uuid UUID)
RETURNS TABLE(level INTEGER, income_amount NUMERIC, seat_capacity INTEGER, commission_percentage NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lcc.level,
        lcc.income_amount,
        lcc.seat_capacity,
        lcc.commission_percentage
    FROM level_commission_configs lcc
    WHERE lcc.is_active = true
    ORDER BY lcc.level;
END;
$$;