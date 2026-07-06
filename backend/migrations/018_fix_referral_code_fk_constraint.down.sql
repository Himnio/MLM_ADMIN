-- Restore original FK constraint
ALTER TABLE member_users DROP CONSTRAINT IF EXISTS member_users_referral_code_fkey;
ALTER TABLE member_users ALTER COLUMN referral_code SET NOT NULL;
ALTER TABLE member_users ADD CONSTRAINT member_users_referral_code_fkey
    FOREIGN KEY (referral_code) REFERENCES referral_codes(referral_code);
