-- Working Days Configuration for Companies
-- Run this in your Supabase SQL Editor

-- Step 1: Add working_days_per_week column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS working_days_per_week INTEGER DEFAULT 5 CHECK (working_days_per_week >= 1 AND working_days_per_week <= 7),
ADD COLUMN IF NOT EXISTS working_hours_per_day DECIMAL(4,2) DEFAULT 8.00 CHECK (working_hours_per_day >= 1 AND working_hours_per_day <= 24);

-- Step 2: Create working days configuration table for more detailed control
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

-- Step 3: Insert default working days configuration for existing companies
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

-- Step 4: Create function to calculate working days in a month
CREATE OR REPLACE FUNCTION calculate_working_days_in_month(
    company_id_param UUID,
    month_param INTEGER,
    year_param INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    working_days_count INTEGER := 0;
    current_date DATE;
    end_date DATE;
    day_of_week INTEGER;
    is_working_day BOOLEAN;
    working_days_config RECORD;
BEGIN
    -- Get working days configuration for the company
    SELECT * INTO working_days_config
    FROM company_working_days
    WHERE company_id = company_id_param;
    
    -- If no configuration found, use default (5 days per week)
    IF working_days_config IS NULL THEN
        working_days_config.working_days_per_week := 5;
        working_days_config.monday_working := true;
        working_days_config.tuesday_working := true;
        working_days_config.wednesday_working := true;
        working_days_config.thursday_working := true;
        working_days_config.friday_working := true;
        working_days_config.saturday_working := false;
        working_days_config.sunday_working := false;
    END IF;
    
    -- Set start and end dates for the month
    current_date := DATE(year_param, month_param, 1);
    end_date := DATE(year_param, month_param + 1, 1) - INTERVAL '1 day';
    
    -- Count working days
    WHILE current_date <= end_date LOOP
        day_of_week := EXTRACT(DOW FROM current_date);
        
        -- Check if this day is a working day based on configuration
        is_working_day := false;
        
        CASE day_of_week
            WHEN 1 THEN -- Monday
                is_working_day := working_days_config.monday_working;
            WHEN 2 THEN -- Tuesday
                is_working_day := working_days_config.tuesday_working;
            WHEN 3 THEN -- Wednesday
                is_working_day := working_days_config.wednesday_working;
            WHEN 4 THEN -- Thursday
                is_working_day := working_days_config.thursday_working;
            WHEN 5 THEN -- Friday
                is_working_day := working_days_config.friday_working;
            WHEN 6 THEN -- Saturday
                is_working_day := working_days_config.saturday_working;
            WHEN 0 THEN -- Sunday
                is_working_day := working_days_config.sunday_working;
        END CASE;
        
        IF is_working_day THEN
            working_days_count := working_days_count + 1;
        END IF;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN working_days_count;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function to check if a specific date is a working day
CREATE OR REPLACE FUNCTION is_working_day(
    company_id_param UUID,
    check_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    day_of_week INTEGER;
    working_days_config RECORD;
BEGIN
    -- Get working days configuration for the company
    SELECT * INTO working_days_config
    FROM company_working_days
    WHERE company_id = company_id_param;
    
    -- If no configuration found, use default (5 days per week)
    IF working_days_config IS NULL THEN
        working_days_config.working_days_per_week := 5;
        working_days_config.monday_working := true;
        working_days_config.tuesday_working := true;
        working_days_config.wednesday_working := true;
        working_days_config.thursday_working := true;
        working_days_config.friday_working := true;
        working_days_config.saturday_working := false;
        working_days_config.sunday_working := false;
    END IF;
    
    day_of_week := EXTRACT(DOW FROM check_date);
    
    -- Check if this day is a working day based on configuration
    CASE day_of_week
        WHEN 1 THEN -- Monday
            RETURN working_days_config.monday_working;
        WHEN 2 THEN -- Tuesday
            RETURN working_days_config.tuesday_working;
        WHEN 3 THEN -- Wednesday
            RETURN working_days_config.wednesday_working;
        WHEN 4 THEN -- Thursday
            RETURN working_days_config.thursday_working;
        WHEN 5 THEN -- Friday
            RETURN working_days_config.friday_working;
        WHEN 6 THEN -- Saturday
            RETURN working_days_config.saturday_working;
        WHEN 0 THEN -- Sunday
            RETURN working_days_config.sunday_working;
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_working_days_company_id ON company_working_days(company_id);

-- Step 7: Create RLS policies for company_working_days
ALTER TABLE company_working_days ENABLE ROW LEVEL SECURITY;

-- Policy for viewing working days config (users can view their company's config)
CREATE POLICY "Users can view working days config for their company" ON company_working_days
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy for managing working days config (hr, hr_manager, admin)
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

-- Policy for inserting new working days config (hr, hr_manager, admin)
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

-- Policy for updating working days config (hr, hr_manager, admin)
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

-- Policy for deleting working days config (hr, hr_manager, admin)
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

-- Step 8: Create trigger to update updated_at
CREATE TRIGGER update_company_working_days_updated_at
    BEFORE UPDATE ON company_working_days
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
