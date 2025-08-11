-- Complete Database Setup for WorkFlowHR
-- Run this script in your Supabase SQL editor to set up all required tables

-- 1. Create companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create company_info table for detailed company information
CREATE TABLE IF NOT EXISTS public.company_info (
    id UUID NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    industry TEXT,
    founded_year INTEGER,
    location TEXT,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT company_info_id_fkey FOREIGN KEY (id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- 3. Ensure users table has all required columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Create employees table for detailed employee information
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    team_lead_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create email_logs table for tracking email communications
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT,
    text_content TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 6. Create working_days table for company working hours configuration
CREATE TABLE IF NOT EXISTS public.working_days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    working_days_per_week INTEGER DEFAULT 5,
    working_hours_per_day DECIMAL(4,2) DEFAULT 8.00,
    monday_working BOOLEAN DEFAULT TRUE,
    tuesday_working BOOLEAN DEFAULT TRUE,
    wednesday_working BOOLEAN DEFAULT TRUE,
    thursday_working BOOLEAN DEFAULT TRUE,
    friday_working BOOLEAN DEFAULT TRUE,
    saturday_working BOOLEAN DEFAULT FALSE,
    sunday_working BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON public.users(created_by);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_created_by ON public.employees(created_by);
CREATE INDEX IF NOT EXISTS idx_employees_team_lead_id ON public.employees(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);

CREATE INDEX IF NOT EXISTS idx_company_info_name ON public.company_info USING btree (name);
CREATE INDEX IF NOT EXISTS idx_company_info_industry ON public.company_info USING btree (industry);

CREATE INDEX IF NOT EXISTS idx_email_logs_company_id ON public.email_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);

CREATE INDEX IF NOT EXISTS idx_working_days_company_id ON public.working_days(company_id);

-- 8. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_days ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for company isolation

-- Users table policies
CREATE POLICY "Users can view users from their company" ON public.users
    FOR SELECT USING (company_id = auth.jwt() ->> 'company_id'::text::uuid);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "HR and Admin can manage company users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'hr_manager', 'hr')
            AND users.company_id = users.company_id
        )
    );

-- Companies table policies
CREATE POLICY "Users can view their own company" ON public.companies
    FOR SELECT USING (id = auth.jwt() ->> 'company_id'::text::uuid);

-- Company info table policies
CREATE POLICY "Users can view company info from their company" ON public.company_info
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "HR and Admin can update company info" ON public.company_info
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'hr_manager', 'hr')
            AND users.company_id = company_info.id
        )
    );

CREATE POLICY "HR and Admin can insert company info" ON public.company_info
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'hr_manager', 'hr')
            AND users.company_id = company_info.id
        )
    );

-- Employees table policies
CREATE POLICY "Employees can view own data" ON public.employees
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "HR can view company employees" ON public.employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'hr_manager', 'hr')
            AND users.company_id = employees.company_id
        )
    );

CREATE POLICY "Team leads can view team members" ON public.employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'team_lead'
            AND users.id = employees.team_lead_id
        )
    );

-- Email logs table policies
CREATE POLICY "Users can view email logs from their company" ON public.email_logs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "HR and Admin can insert email logs" ON public.email_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'hr_manager', 'hr')
            AND users.company_id = email_logs.company_id
        )
    );

-- Working days table policies
CREATE POLICY "Users can view working days from their company" ON public.working_days
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "HR and Admin can manage working days" ON public.working_days
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'hr_manager', 'hr')
            AND users.company_id = working_days.company_id
        )
    );

-- 10. Insert default company if none exists
INSERT INTO public.companies (id, name, created_at, updated_at) 
VALUES (
    '51c9890f-7efe-45b0-9faf-595208b87143',
    'Default Company',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 11. Insert default working days configuration
INSERT INTO public.working_days (company_id, working_days_per_week, working_hours_per_day, monday_working, tuesday_working, wednesday_working, thursday_working, friday_working, saturday_working, sunday_working)
VALUES (
    '51c9890f-7efe-45b0-9faf-595208b87143',
    5,
    8.00,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    FALSE
) ON CONFLICT (company_id) DO NOTHING;

-- 12. Grant necessary permissions
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.company_info TO authenticated;
GRANT ALL ON public.employees TO authenticated;
GRANT ALL ON public.email_logs TO authenticated;
GRANT ALL ON public.working_days TO authenticated;

GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.company_info TO service_role;
GRANT ALL ON public.employees TO service_role;
GRANT ALL ON public.email_logs TO service_role;
GRANT ALL ON public.working_days TO service_role;

-- 13. Create functions for common operations
CREATE OR REPLACE FUNCTION public.get_company_users(company_uuid UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    company_id UUID,
    created_at TIMESTAMPTZ,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.full_name, u.role, u.company_id, u.created_at, u.is_active
    FROM public.users u
    WHERE u.company_id = company_uuid
    AND u.role != 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Verify the setup
SELECT 'Database setup completed successfully' as status;

-- 15. Show table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'companies', 'company_info', 'employees', 'email_logs', 'working_days')
ORDER BY table_name, ordinal_position;
