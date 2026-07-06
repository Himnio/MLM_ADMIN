ALTER TABLE member_users ALTER COLUMN is_active SET DEFAULT FALSE;
UPDATE member_users SET is_active = FALSE WHERE is_active IS NULL;
