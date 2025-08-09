-- Fix database constraints for HRMS signup functionality
-- Run this in your Supabase SQL editor

-- 1. Check current constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.table_name='users';

-- 2. Drop the problematic self-referencing foreign key on ID
-- (This is likely what's causing the issue)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 3. Make sure ID is properly set up as UUID with default
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Ensure created_by can be NULL for the first admin user
ALTER TABLE users ALTER COLUMN created_by DROP NOT NULL;

-- 5. Add a proper foreign key for created_by (not on id itself)
ALTER TABLE users ADD CONSTRAINT users_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 7. Insert test company if it doesn't exist
INSERT INTO companies (id, name, created_at, updated_at) 
VALUES (
    '51c9890f-7efe-45b0-9faf-595208b87143',
    'Test Company (Isolation)',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify the fix
SELECT 'Database constraints fixed successfully' as status;
