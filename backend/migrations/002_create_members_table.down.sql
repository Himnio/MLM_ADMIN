-- Drop trigger first
DROP TRIGGER IF EXISTS update_members_updated_at ON members;

-- Drop function
DROP FUNCTION IF EXISTS generate_member_code();

-- Drop members table
DROP TABLE IF EXISTS members CASCADE;