-- Fix Salary Slip Issues (Safe Version)
-- Run this in your Supabase SQL Editor

-- Step 1: Create salary component types
DROP TYPE IF EXISTS salary_component_type CASCADE;
CREATE TYPE salary_component_type AS ENUM ('addition', 'deduction');

-- Step 2: Create salary_components table
CREATE TABLE IF NOT EXISTS salary_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    component_type salary_component_type NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, component_type)
);

-- Step 3: Create salary_slips table if it doesn't exist
CREATE TABLE IF NOT EXISTS salary_slips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    basic_salary DECIMAL(10,2) NOT NULL,
    total_working_days INTEGER NOT NULL,
    actual_working_days INTEGER NOT NULL,
    unpaid_leaves INTEGER DEFAULT 0,
    gross_salary DECIMAL(10,2) NOT NULL,
    total_additions DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL,
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'generated',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);

-- Step 4: Create salary_slip_details table if it doesn't exist
CREATE TABLE IF NOT EXISTS salary_slip_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    salary_slip_id UUID REFERENCES salary_slips(id) ON DELETE CASCADE,
    component_id UUID REFERENCES salary_components(id),
    component_name TEXT NOT NULL,
    component_type salary_component_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create leave_salary_impact table if it doesn't exist
CREATE TABLE IF NOT EXISTS leave_salary_impact (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_leaves INTEGER DEFAULT 0,
    paid_leaves INTEGER DEFAULT 0,
    unpaid_leaves INTEGER DEFAULT 0,
    leave_deduction_amount DECIMAL(10,2) DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);

-- Step 6: Create employee_fixed_deductions table
CREATE TABLE IF NOT EXISTS employee_fixed_deductions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    deduction_name TEXT NOT NULL,
    deduction_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' or 'percentage'
    amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2) DEFAULT 0, -- For percentage-based deductions
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, deduction_name)
);

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS idx_salary_components_active ON salary_components(is_active);
CREATE INDEX IF NOT EXISTS idx_salary_components_type ON salary_components(component_type);
CREATE INDEX IF NOT EXISTS idx_salary_slips_employee_month_year ON salary_slips(employee_id, month, year);
CREATE INDEX IF NOT EXISTS idx_salary_slip_details_slip_id ON salary_slip_details(salary_slip_id);
CREATE INDEX IF NOT EXISTS idx_leave_salary_impact_employee_month_year ON leave_salary_impact(employee_id, month, year);
CREATE INDEX IF NOT EXISTS idx_employee_fixed_deductions_employee_id ON employee_fixed_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_fixed_deductions_active ON employee_fixed_deductions(is_active);

-- Step 8: Insert default salary components (only if they don't exist)
INSERT INTO salary_components (name, description, component_type, is_active)
SELECT 'Bonus', 'Performance or special occasion bonus', 'addition', true
WHERE NOT EXISTS (SELECT 1 FROM salary_components WHERE name = 'Bonus' AND component_type = 'addition');

INSERT INTO salary_components (name, description, component_type, is_active)
SELECT 'Overtime', 'Extra hours worked payment', 'addition', true
WHERE NOT EXISTS (SELECT 1 FROM salary_components WHERE name = 'Overtime' AND component_type = 'addition');

INSERT INTO salary_components (name, description, component_type, is_active)
SELECT 'Allowance', 'Transport, food, or other allowances', 'addition', true
WHERE NOT EXISTS (SELECT 1 FROM salary_components WHERE name = 'Allowance' AND component_type = 'addition');

INSERT INTO salary_components (name, description, component_type, is_active)
SELECT 'Incentive', 'Performance-based incentives', 'addition', true
WHERE NOT EXISTS (SELECT 1 FROM salary_components WHERE name = 'Incentive' AND component_type = 'addition');

INSERT INTO salary_components (name, description, component_type, is_active)
SELECT 'Holiday Pay', 'Payment for working on holidays', 'addition', true
WHERE NOT EXISTS (SELECT 1 FROM salary_components WHERE name = 'Holiday Pay' AND component_type = 'addition');

INSERT INTO salary_components (name, description, component_type, is_active)
SELECT 'Tax', 'Income tax deduction', 'deduction', true
WHERE NOT EXISTS (SELECT 1 FROM salary_components WHERE name = 'Tax' AND component_type = 'deduction');

INSERT INTO salary_components (name, description, component_type, is_active)
SELECT 'Insurance', 'Health or life insurance premium', 'deduction', true
WHERE NOT EXISTS (SELECT 1 FROM salary_components WHERE name = 'Insurance' AND component_type = 'deduction');

INSERT INTO salary_components (name, description, component_type, is_active)
SELECT 'Loan', 'Employee loan repayment', 'deduction', true
WHERE NOT EXISTS (SELECT 1 FROM salary_components WHERE name = 'Loan' AND component_type = 'deduction');

INSERT INTO salary_components (name, description, component_type, is_active)
SELECT 'Advance', 'Salary advance repayment', 'deduction', true
WHERE NOT EXISTS (SELECT 1 FROM salary_components WHERE name = 'Advance' AND component_type = 'deduction');

INSERT INTO salary_components (name, description, component_type, is_active)
SELECT 'Other Deductions', 'Other miscellaneous deductions', 'deduction', true
WHERE NOT EXISTS (SELECT 1 FROM salary_components WHERE name = 'Other Deductions' AND component_type = 'deduction');

-- Step 9: Insert default fixed deductions for existing employees
INSERT INTO employee_fixed_deductions (employee_id, deduction_name, deduction_type, amount, description)
SELECT 
    e.id,
    'Professional Tax',
    'fixed',
    200.00,
    'Monthly professional tax deduction'
FROM employees e
WHERE NOT EXISTS (
    SELECT 1 FROM employee_fixed_deductions efd 
    WHERE efd.employee_id = e.id AND efd.deduction_name = 'Professional Tax'
);

-- Step 10: Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create triggers
DROP TRIGGER IF EXISTS update_salary_components_updated_at ON salary_components;
CREATE TRIGGER update_salary_components_updated_at
    BEFORE UPDATE ON salary_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_salary_slips_updated_at ON salary_slips;
CREATE TRIGGER update_salary_slips_updated_at
    BEFORE UPDATE ON salary_slips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_salary_impact_updated_at ON leave_salary_impact;
CREATE TRIGGER update_leave_salary_impact_updated_at
    BEFORE UPDATE ON leave_salary_impact
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_fixed_deductions_updated_at ON employee_fixed_deductions;
CREATE TRIGGER update_employee_fixed_deductions_updated_at
    BEFORE UPDATE ON employee_fixed_deductions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 12: Update existing salary slips to have proper component details
UPDATE salary_slip_details 
SET component_name = COALESCE(component_name, 'Unknown Component')
WHERE component_name IS NULL OR component_name = '';

-- Step 13: Ensure all salary slips have proper totals
UPDATE salary_slips 
SET total_additions = COALESCE(total_additions, 0),
    total_deductions = COALESCE(total_deductions, 0)
WHERE total_additions IS NULL OR total_deductions IS NULL; 