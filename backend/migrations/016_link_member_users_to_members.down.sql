DROP INDEX IF EXISTS idx_members_member_user_id;
ALTER TABLE members DROP COLUMN IF EXISTS member_user_id;

DROP INDEX IF EXISTS idx_referral_codes_member_user_id;
ALTER TABLE referral_codes DROP COLUMN IF EXISTS member_user_id;
