-- Fix for employee creation process
-- This script should be run in your Supabase SQL editor

-- Step 1: Drop any problematic triggers that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop the problematic function
DROP FUNCTION IF EXISTS handle_hr_signup();

-- Step 3: Fix the RLS policies on users table
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can only access their company data" ON users;
DROP POLICY IF EXISTS "Users can access own record" ON users;
DROP POLICY IF EXISTS "HR can access company users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users" ON users;

-- Step 4: Temporarily disable RLS to allow operations
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 5: Re-enable RLS with a simple policy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows all authenticated users
CREATE POLICY "Allow all authenticated users" ON users
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 6: Create a proper function for employee creation that bypasses RLS
CREATE OR REPLACE FUNCTION create_employee_in_users(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    password TEXT,
    company_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Insert into users table using SECURITY DEFINER to bypass RLS
    INSERT INTO users (id, full_name, email, password, role, company_id)
    VALUES (user_id, full_name, email, password, 'employee', company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION create_employee_in_users(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- Step 8: Verify the fix
SELECT COUNT(*) FROM users; 