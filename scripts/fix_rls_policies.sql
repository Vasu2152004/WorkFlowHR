-- Fix for infinite recursion in RLS policies
-- This script should be run in your Supabase SQL editor

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can only access their company data" ON users;

-- Create the fixed policies
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

-- Verify the policies are created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users'; 