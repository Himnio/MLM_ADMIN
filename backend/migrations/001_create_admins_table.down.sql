-- Drop trigger first
DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop admins table
DROP TABLE IF EXISTS admins CASCADE;