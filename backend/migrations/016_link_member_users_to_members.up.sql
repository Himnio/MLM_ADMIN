-- Add member_user_id to members table to link MLM tree nodes to login accounts
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_user_id UUID REFERENCES member_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_members_member_user_id ON members(member_user_id);

-- Add member_user_id to referral_codes table for codes owned by distributors
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS member_user_id UUID REFERENCES member_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_referral_codes_member_user_id ON referral_codes(member_user_id);
