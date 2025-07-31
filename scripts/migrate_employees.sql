-- Migration script to move existing employees from users table to employees table
-- This script should be run if you have existing employees in the users table

-- First, let's check what employees exist in the users table
SELECT 
    id,
    full_name,
    email,
    role,
    company_id,
    created_at
FROM users 
WHERE role = 'employee';

-- Create employees table if it doesn't exist
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT,
    designation TEXT,
    salary DECIMAL(10,2) DEFAULT 0,
    joining_date DATE,
    phone_number TEXT,
    address TEXT,
    emergency_contact TEXT,
    pan_number TEXT,
    bank_account TEXT,
    leave_balance INTEGER DEFAULT 20,
    role user_role DEFAULT 'employee',
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employees table
-- Users can only access employees from their company
CREATE POLICY "Users can access company employees" ON employees
    FOR ALL USING (
        company_id = (
            SELECT company_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

-- Create trigger for updated_at
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing employees from users table to employees table
INSERT INTO employees (
    user_id,
    employee_id,
    full_name,
    email,
    department,
    designation,
    salary,
    joining_date,
    phone_number,
    address,
    emergency_contact,
    pan_number,
    bank_account,
    leave_balance,
    role,
    company_id,
    created_at,
    updated_at
)
SELECT 
    u.id as user_id,
    'EMP' || LPAD(ROW_NUMBER() OVER (ORDER BY u.created_at)::TEXT, 4, '0') as employee_id,
    u.full_name,
    u.email,
    'General' as department, -- Default department
    'Employee' as designation, -- Default designation
    0 as salary, -- Default salary
    u.created_at::DATE as joining_date,
    NULL as phone_number,
    NULL as address,
    NULL as emergency_contact,
    NULL as pan_number,
    NULL as bank_account,
    20 as leave_balance, -- Default leave balance
    'employee' as role,
    u.company_id,
    u.created_at,
    u.updated_at
FROM users u
WHERE u.role = 'employee'
AND NOT EXISTS (
    SELECT 1 FROM employees e WHERE e.user_id = u.id
);

-- Show the migration results
SELECT 
    'Migration completed' as status,
    COUNT(*) as migrated_employees
FROM employees 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Show all employees after migration
SELECT 
    e.id,
    e.employee_id,
    e.full_name,
    e.email,
    e.department,
    e.designation,
    e.company_id,
    e.created_at
FROM employees e
ORDER BY e.created_at DESC; 