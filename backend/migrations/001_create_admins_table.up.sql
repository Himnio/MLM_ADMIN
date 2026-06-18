-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for admins table
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);
CREATE INDEX IF NOT EXISTS idx_admins_deleted_at ON admins(deleted_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for admins table
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin (password: admin123 - change in production!)
-- Password hash: bcrypt cost 12 for "admin123"
INSERT INTO admins (email, password_hash, full_name, role, is_active) 
VALUES (
    'admin@example.com',
    '$2a$12$b5C7ou1/H905snyQCps4HOtLTFknH/r1YX2/vaBM29soij.yBQXAu',
    'Admin User',
    'super_admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Add comment
COMMENT ON TABLE admins IS 'Stores admin user accounts for the MLM management system';
COMMENT ON COLUMN admins.id IS 'Unique identifier for the admin';
COMMENT ON COLUMN admins.email IS 'Admin email address used for login';
COMMENT ON COLUMN admins.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN admins.full_name IS 'Full name of the admin';
COMMENT ON COLUMN admins.role IS 'Role of the admin (super_admin, admin, viewer)';
COMMENT ON COLUMN admins.is_active IS 'Whether the admin account is active';
COMMENT ON COLUMN admins.last_login IS 'Timestamp of last login';
COMMENT ON COLUMN admins.failed_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN admins.locked_until IS 'Timestamp until which the account is locked';