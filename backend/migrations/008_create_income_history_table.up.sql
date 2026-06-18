-- Create income_history table for audit trail
CREATE TABLE IF NOT EXISTS income_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    income_id UUID NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES admins(id),
    reason TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for tracking income calculations per transaction
CREATE TABLE IF NOT EXISTS income_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    sponsor_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
    base_amount NUMERIC(10,2) NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    calculated_amount NUMERIC(10,2) NOT NULL,
    calculation_type VARCHAR(50) NOT NULL, -- 'registration', 'referral', 'upgrade', 'bonus'
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    metadata JSONB,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for income_history
CREATE INDEX idx_income_history_income_id ON income_history(income_id);
CREATE INDEX idx_income_history_member_id ON income_history(member_id);
CREATE INDEX idx_income_history_changed_at ON income_history(changed_at);
CREATE INDEX idx_income_history_status ON income_history(new_status);

-- Create indexes for income_calculations
CREATE INDEX idx_income_calculations_member_id ON income_calculations(member_id);
CREATE INDEX idx_income_calculations_sponsor_id ON income_calculations(sponsor_id);
CREATE INDEX idx_income_calculations_level ON income_calculations(level);
CREATE INDEX idx_income_calculations_transaction_id ON income_calculations(transaction_id);
CREATE INDEX idx_income_calculations_type ON income_calculations(calculation_type);
CREATE INDEX idx_income_calculations_calculated_at ON income_calculations(calculated_at);

-- Create function to log income status changes
CREATE OR REPLACE FUNCTION log_income_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO income_history (income_id, member_id, previous_status, new_status, reason, changed_at)
        VALUES (NEW.id, NEW.member_id, OLD.status, NEW.status, 'Status updated', NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status change logging
CREATE TRIGGER income_status_change_trigger
AFTER UPDATE ON incomes
FOR EACH ROW
EXECUTE FUNCTION log_income_status_change();
