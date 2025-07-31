-- Check current state of employees in both tables
-- This script will help you understand where your employee data is stored

-- Check employees in users table
SELECT 
    'Users Table' as table_name,
    COUNT(*) as employee_count
FROM users 
WHERE role = 'employee';

-- Check employees in employees table
SELECT 
    'Employees Table' as table_name,
    COUNT(*) as employee_count
FROM employees;

-- Show detailed employee data from users table
SELECT 
    'Users Table Details' as info,
    id,
    full_name,
    email,
    role,
    company_id,
    created_at
FROM users 
WHERE role = 'employee'
ORDER BY created_at DESC;

-- Show detailed employee data from employees table
SELECT 
    'Employees Table Details' as info,
    id,
    employee_id,
    full_name,
    email,
    department,
    designation,
    company_id,
    created_at
FROM employees
ORDER BY created_at DESC;

-- Check if there are any orphaned records
SELECT 
    'Orphaned Records Check' as info,
    u.id as user_id,
    u.full_name,
    u.email,
    CASE 
        WHEN e.id IS NULL THEN 'User exists but no employee record'
        WHEN u.id IS NULL THEN 'Employee record exists but no user'
        ELSE 'Both records exist'
    END as status
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.role = 'employee'
UNION ALL
SELECT 
    'Orphaned Records Check' as info,
    e.user_id as user_id,
    e.full_name,
    e.email,
    CASE 
        WHEN u.id IS NULL THEN 'Employee record exists but no user'
        ELSE 'Both records exist'
    END as status
FROM employees e
LEFT JOIN users u ON e.user_id = u.id
WHERE u.id IS NULL; 