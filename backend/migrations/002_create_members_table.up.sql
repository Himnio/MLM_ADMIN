-- Create members table
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID REFERENCES members(id) ON DELETE SET NULL,
    member_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for members table
CREATE INDEX IF NOT EXISTS idx_members_sponsor_id ON members(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_members_member_code ON members(member_code);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_joined_at ON members(joined_at);
CREATE INDEX IF NOT EXISTS idx_members_deleted_at ON members(deleted_at);

-- Create trigger for members table
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate member code
CREATE OR REPLACE FUNCTION generate_member_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    new_code VARCHAR(50);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate code: MBR + timestamp (seconds) + random 3 digits
        SELECT 'MBR' || EXTRACT(EPOCH FROM NOW())::VARCHAR || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0')
        INTO new_code;
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM members WHERE member_code = new_code) INTO code_exists;
        
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE members IS 'Stores MLM member information';
COMMENT ON COLUMN members.id IS 'Unique identifier for the member';
COMMENT ON COLUMN members.sponsor_id IS 'Reference to the sponsor (parent) member';
COMMENT ON COLUMN members.member_code IS 'Unique member code generated automatically';
COMMENT ON COLUMN members.full_name IS 'Full name of the member';
COMMENT ON COLUMN members.email IS 'Email address of the member';
COMMENT ON COLUMN members.phone IS 'Phone number of the member';
COMMENT ON COLUMN members.status IS 'Member status (active, inactive, pending, suspended)';
COMMENT ON COLUMN members.joined_at IS 'Date when the member joined';