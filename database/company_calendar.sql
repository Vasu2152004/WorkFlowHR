-- Company Calendar Feature
-- Run this in your Supabase SQL Editor

-- Step 1: Create company_calendar table
CREATE TABLE IF NOT EXISTS company_calendar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'holiday' CHECK (type IN ('holiday', 'special_day', 'company_event', 'optional_holiday')),
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern VARCHAR(50), -- 'yearly', 'monthly', 'weekly'
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, date, title)
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_calendar_company_id ON company_calendar(company_id);
CREATE INDEX IF NOT EXISTS idx_company_calendar_date ON company_calendar(date);
CREATE INDEX IF NOT EXISTS idx_company_calendar_type ON company_calendar(type);

-- Step 3: Enable RLS
ALTER TABLE company_calendar ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Policy for viewing calendar events (all users can view their company's calendar)
CREATE POLICY "Users can view calendar events for their company" ON company_calendar
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy for managing calendar events (hr, hr_manager, admin only)
CREATE POLICY "HR, HR managers and admins can manage calendar events for their company" ON company_calendar
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

-- Policy for inserting calendar events (hr, hr_manager, admin only)
CREATE POLICY "HR, HR managers and admins can insert calendar events for their company" ON company_calendar
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

-- Policy for updating calendar events (hr, hr_manager, admin only)
CREATE POLICY "HR, HR managers and admins can update calendar events for their company" ON company_calendar
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

-- Policy for deleting calendar events (hr, hr_manager, admin only)
CREATE POLICY "HR, HR managers and admins can delete calendar events for their company" ON company_calendar
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

-- Step 5: Create trigger to update updated_at
CREATE TRIGGER update_company_calendar_updated_at
    BEFORE UPDATE ON company_calendar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Insert some default holidays for the current year
INSERT INTO company_calendar (company_id, title, description, date, type, is_recurring, recurring_pattern)
SELECT 
    c.id,
    'New Year''s Day',
    'New Year''s Day Holiday',
    (EXTRACT(YEAR FROM CURRENT_DATE) || '-01-01')::DATE,
    'holiday',
    true,
    'yearly'
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM company_calendar 
    WHERE company_id = c.id 
    AND title = 'New Year''s Day' 
    AND date = (EXTRACT(YEAR FROM CURRENT_DATE) || '-01-01')::DATE
);

INSERT INTO company_calendar (company_id, title, description, date, type, is_recurring, recurring_pattern)
SELECT 
    c.id,
    'Independence Day',
    'Independence Day Holiday',
    (EXTRACT(YEAR FROM CURRENT_DATE) || '-08-15')::DATE,
    'holiday',
    true,
    'yearly'
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM company_calendar 
    WHERE company_id = c.id 
    AND title = 'Independence Day' 
    AND date = (EXTRACT(YEAR FROM CURRENT_DATE) || '-08-15')::DATE
);

INSERT INTO company_calendar (company_id, title, description, date, type, is_recurring, recurring_pattern)
SELECT 
    c.id,
    'Republic Day',
    'Republic Day Holiday',
    (EXTRACT(YEAR FROM CURRENT_DATE) || '-01-26')::DATE,
    'holiday',
    true,
    'yearly'
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM company_calendar 
    WHERE company_id = c.id 
    AND title = 'Republic Day' 
    AND date = (EXTRACT(YEAR FROM CURRENT_DATE) || '-01-26')::DATE
);
