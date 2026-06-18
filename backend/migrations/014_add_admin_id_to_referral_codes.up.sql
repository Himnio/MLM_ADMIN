ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES admins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_referral_codes_admin_id ON referral_codes(admin_id);
