CREATE TABLE IF NOT EXISTS member_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    dob DATE NOT NULL,
    address TEXT NOT NULL,
    email VARCHAR(150),
    pan_card_id VARCHAR(20),
    aadhaar_card VARCHAR(20),
    bank_account VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_branch VARCHAR(100),
    referral_code VARCHAR(50) NOT NULL REFERENCES referral_codes(referral_code),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_member_users_member_id ON member_users(member_id);
CREATE INDEX idx_member_users_username ON member_users(username);
CREATE INDEX idx_member_users_referral_code ON member_users(referral_code);
