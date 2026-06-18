-- Drop trigger first
DROP TRIGGER IF EXISTS check_circular_reference ON referrals;

-- Drop functions
DROP FUNCTION IF EXISTS prevent_circular_reference();
DROP FUNCTION IF EXISTS get_downline_tree(UUID, INTEGER);
DROP FUNCTION IF EXISTS count_downline_by_level(UUID, INTEGER);

-- Drop referrals table
DROP TABLE IF EXISTS referrals CASCADE;