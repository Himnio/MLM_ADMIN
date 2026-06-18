DROP INDEX IF EXISTS idx_referral_codes_admin_id;

ALTER TABLE referral_codes DROP COLUMN IF EXISTS admin_id;
