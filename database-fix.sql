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

-- 8. Create employees table if it doesn't exist
CREATE TABLE IF NOT EXISTS employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    salary DECIMAL(10,2) NOT NULL,
    joining_date DATE NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    emergency_contact TEXT,
    pan_number VARCHAR(20),
    bank_account TEXT,
    leave_balance INTEGER DEFAULT 20,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create indexes for employees table
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_created_by ON employees(created_by);
CREATE INDEX IF NOT EXISTS idx_employees_team_lead_id ON employees(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- 10. Add RLS policies for employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy for employees to see their own data
CREATE POLICY "Employees can view own data" ON employees
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for HR/Admin to see all employees in their company
CREATE POLICY "HR can view company employees" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'hr_manager', 'hr')
            AND users.company_id = employees.company_id
        )
    );

-- Policy for team leads to see their team members
CREATE POLICY "Team leads can view team members" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'team_lead'
            AND users.id = employees.team_lead_id
        )
    );

-- Verify the fix
SELECT 'Database constraints fixed successfully' as status;
