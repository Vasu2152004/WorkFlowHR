-- Comprehensive fix for infinite recursion in RLS policies
-- This script should be run in your Supabase SQL editor

-- Step 1: Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can only access their company data" ON users;

-- Step 2: Create the fixed policies
-- Allow users to access their own record
CREATE POLICY "Users can access own record" ON users
    FOR ALL USING (id = auth.uid());

-- Allow HR users to access all users in their company
CREATE POLICY "HR can access company users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users AS hr_user
            WHERE hr_user.id = auth.uid()
            AND hr_user.role = 'hr'
            AND hr_user.company_id = users.company_id
        )
    );

-- Step 3: Drop and recreate employee creation functions
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

-- Step 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_hr_user(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_employee_user(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- Step 5: Verify the policies are created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Step 6: Test the fix by checking if we can query the users table
-- This should not cause infinite recursion anymore
SELECT COUNT(*) FROM users; 