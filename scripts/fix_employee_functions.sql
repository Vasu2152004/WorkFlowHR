-- Fix for employee creation functions
-- This script should be run in your Supabase SQL editor

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS create_hr_user(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_employee_user(UUID, TEXT, TEXT, TEXT, UUID);

-- Create function to handle HR user creation
CREATE OR REPLACE FUNCTION create_hr_user(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    password TEXT,
    company_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Insert into users table
    INSERT INTO users (id, full_name, email, password, role, company_id)
    VALUES (user_id, full_name, email, password, 'hr', company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle employee user creation
CREATE OR REPLACE FUNCTION create_employee_user(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    password TEXT,
    company_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Insert into users table
    INSERT INTO users (id, full_name, email, password, role, company_id)
    VALUES (user_id, full_name, email, password, 'employee', company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_hr_user(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_employee_user(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated; 