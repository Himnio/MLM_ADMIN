-- Ensure default dev admin exists with correct credentials (admin@example.com / admin123)
INSERT INTO admins (email, password_hash, full_name, role, is_active)
VALUES (
    'admin@example.com',
    '$2a$12$b5C7ou1/H905snyQCps4HOtLTFknH/r1YX2/vaBM29soij.yBQXAu',
    'Admin User',
    'super_admin',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    failed_attempts = 0,
    locked_until = NULL;
