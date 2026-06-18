CREATE TABLE IF NOT EXISTS referral_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code VARCHAR(50) NOT NULL REFERENCES referral_codes(referral_code) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    pan_card_id VARCHAR(20) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_registrations_referral_code ON referral_registrations(referral_code);
