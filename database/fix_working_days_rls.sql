-- Fix RLS policies for working days configuration to allow hr, hr_manager, and admin roles

-- Step 1: Create the company_working_days table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_working_days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    working_days_per_week INTEGER NOT NULL DEFAULT 5 CHECK (working_days_per_week >= 1 AND working_days_per_week <= 7),
    working_hours_per_day DECIMAL(4,2) NOT NULL DEFAULT 8.00 CHECK (working_hours_per_day >= 1 AND working_hours_per_day <= 24),
    monday_working BOOLEAN DEFAULT true,
    tuesday_working BOOLEAN DEFAULT true,
    wednesday_working BOOLEAN DEFAULT true,
    thursday_working BOOLEAN DEFAULT true,
    friday_working BOOLEAN DEFAULT true,
    saturday_working BOOLEAN DEFAULT false,
    sunday_working BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- Step 2: Enable RLS on the table
ALTER TABLE company_working_days ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins and HR managers can manage working days config for their company" ON company_working_days;
DROP POLICY IF EXISTS "Admins and HR managers can insert working days config for their company" ON company_working_days;
DROP POLICY IF EXISTS "Admins and HR managers can update working days config for their company" ON company_working_days;
DROP POLICY IF EXISTS "Admins and HR managers can delete working days config for their company" ON company_working_days;
DROP POLICY IF EXISTS "Users can view working days config for their company" ON company_working_days;

-- Step 4: Create new policies that allow hr, hr_manager, and admin roles
CREATE POLICY "Users can view working days config for their company" ON company_working_days
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "HR, HR managers and admins can manage working days config for their company" ON company_working_days
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('hr', 'hr_manager', 'admin')
        )
    );

CREATE POLICY "HR, HR managers and admins can insert working days config for their company" ON company_working_days
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('hr', 'hr_manager', 'admin')
        )
    );

CREATE POLICY "HR, HR managers and admins can update working days config for their company" ON company_working_days
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('hr', 'hr_manager', 'admin')
        )
    );

CREATE POLICY "HR, HR managers and admins can delete working days config for their company" ON company_working_days
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('hr', 'hr_manager', 'admin')
        )
    );

-- Step 5: Insert default working days configuration for existing companies if not exists
INSERT INTO company_working_days (company_id, working_days_per_week, working_hours_per_day, monday_working, tuesday_working, wednesday_working, thursday_working, friday_working, saturday_working, sunday_working)
SELECT 
    id,
    5,
    8.00,
    true,
    true,
    true,
    true,
    true,
    false,
    false
FROM companies
WHERE id NOT IN (SELECT company_id FROM company_working_days);
