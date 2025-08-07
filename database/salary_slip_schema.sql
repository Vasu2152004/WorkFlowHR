-- Salary Slip System Database Schema
-- Run this in your Supabase SQL Editor

-- Step 1: Create salary slip types
DROP TYPE IF EXISTS salary_component_type CASCADE;
CREATE TYPE salary_component_type AS ENUM ('addition', 'deduction');

-- Step 2: Create salary slip tables
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

-- Step 3: Create salary components table (for additions/deductions)
CREATE TABLE IF NOT EXISTS salary_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    component_type salary_component_type NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create salary slip details table (individual components)
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

-- Step 5: Create leave tracking table for salary calculations
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

-- Step 6: Insert default salary components
INSERT INTO salary_components (name, description, component_type, is_active) VALUES
-- Additions
('Bonus', 'Performance or special occasion bonus', 'addition', true),
('Overtime', 'Extra hours worked payment', 'addition', true),
('Allowance', 'Transport, food, or other allowances', 'addition', true),
('Incentive', 'Performance-based incentives', 'addition', true),
('Holiday Pay', 'Payment for working on holidays', 'addition', true),

-- Deductions
('Tax', 'Income tax deduction', 'deduction', true),
('Insurance', 'Health or life insurance premium', 'deduction', true),
('Loan', 'Employee loan repayment', 'deduction', true),
('Advance', 'Salary advance repayment', 'deduction', true),
('Other Deductions', 'Other miscellaneous deductions', 'deduction', true);

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_salary_slips_employee_month_year ON salary_slips(employee_id, month, year);
CREATE INDEX IF NOT EXISTS idx_salary_slip_details_slip_id ON salary_slip_details(salary_slip_id);
CREATE INDEX IF NOT EXISTS idx_leave_salary_impact_employee_month_year ON leave_salary_impact(employee_id, month, year);

-- Step 8: Create RLS policies
ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_slip_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_salary_impact ENABLE ROW LEVEL SECURITY;

-- Salary slips policies
CREATE POLICY "Users can view salary slips for their company" ON salary_slips
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.id = salary_slips.employee_id
            AND u.company_id = auth.jwt() ->> 'company_id'
        )
    );

CREATE POLICY "HR can create salary slips" ON salary_slips
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('hr', 'hr_manager', 'admin')
            AND company_id = auth.jwt() ->> 'company_id'
        )
    );

-- Salary components policies
CREATE POLICY "Users can view salary components for their company" ON salary_components
    FOR SELECT USING (
        company_id = auth.jwt() ->> 'company_id'
    );

CREATE POLICY "HR can manage salary components" ON salary_components
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('hr', 'hr_manager', 'admin')
            AND company_id = auth.jwt() ->> 'company_id'
        )
    );

-- Salary slip details policies
CREATE POLICY "Users can view salary slip details for their company" ON salary_slip_details
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM salary_slips ss
            JOIN employees e ON ss.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE ss.id = salary_slip_details.salary_slip_id
            AND u.company_id = auth.jwt() ->> 'company_id'
        )
    );

-- Leave salary impact policies
CREATE POLICY "Users can view leave salary impact for their company" ON leave_salary_impact
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.id = leave_salary_impact.employee_id
            AND u.company_id = auth.jwt() ->> 'company_id'
        )
    );

-- Step 9: Create functions for salary calculations
CREATE OR REPLACE FUNCTION calculate_daily_salary(annual_salary DECIMAL, working_days INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN annual_salary / (working_days * 12);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_leave_deduction(daily_salary DECIMAL, unpaid_leaves INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN daily_salary * unpaid_leaves;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_salary_slips_updated_at
    BEFORE UPDATE ON salary_slips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_components_updated_at
    BEFORE UPDATE ON salary_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_salary_impact_updated_at
    BEFORE UPDATE ON leave_salary_impact
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 