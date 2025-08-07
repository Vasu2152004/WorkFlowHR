-- Employee Fixed Deductions Schema
-- Run this in your Supabase SQL Editor

-- Create employee fixed deductions table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employee_fixed_deductions_employee_id ON employee_fixed_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_fixed_deductions_active ON employee_fixed_deductions(is_active);

-- Enable RLS
ALTER TABLE employee_fixed_deductions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view fixed deductions for their company" ON employee_fixed_deductions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.id = employee_fixed_deductions.employee_id
            AND u.company_id = auth.jwt() ->> 'company_id'
        )
    );

CREATE POLICY "HR can manage fixed deductions" ON employee_fixed_deductions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('hr', 'hr_manager', 'admin')
            AND company_id = auth.jwt() ->> 'company_id'
        )
    );

-- Insert default fixed deductions for existing employees
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

-- Create trigger to update updated_at
CREATE TRIGGER update_employee_fixed_deductions_updated_at
    BEFORE UPDATE ON employee_fixed_deductions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 