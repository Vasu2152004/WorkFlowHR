-- Fix for Company Profile Issues
-- This script adds the missing company_name column and creates a company_info table

-- 1. Add company_name column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS company_name text;

-- 2. Create company_info table for detailed company information
CREATE TABLE IF NOT EXISTS public.company_info (
    id uuid NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    email text,
    website text,
    industry text,
    founded_year integer,
    location text,
    description text,
    logo_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT company_info_pkey PRIMARY KEY (id),
    CONSTRAINT company_info_id_fkey FOREIGN KEY (id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_info_name ON public.company_info USING btree (name);
CREATE INDEX IF NOT EXISTS idx_company_info_industry ON public.company_info USING btree (industry);

-- 4. Enable Row Level Security (RLS) on company_info table
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policy for company_info table
CREATE POLICY "Users can view company info from their company" ON public.company_info
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM public.users 
            WHERE company_id = company_info.id
        )
    );

CREATE POLICY "HR and Admin can update company info" ON public.company_info
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM public.users 
            WHERE company_id = company_info.id 
            AND role IN ('admin', 'hr_manager', 'hr')
        )
    );

CREATE POLICY "HR and Admin can insert company info" ON public.company_info
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.users 
            WHERE company_id = company_info.id 
            AND role IN ('admin', 'hr_manager', 'hr')
        )
    );

-- 6. Update existing users with default company names if they don't have one
UPDATE public.users 
SET company_name = 'Your Company' 
WHERE company_name IS NULL;

-- 7. Grant necessary permissions
GRANT ALL ON public.company_info TO authenticated;
GRANT ALL ON public.company_info TO service_role;

-- 8. Add comment to explain the structure
COMMENT ON TABLE public.company_info IS 'Stores detailed company information including name, address, contact details, and business information';
COMMENT ON COLUMN public.company_info.id IS 'References the companies table ID';
COMMENT ON COLUMN public.company_info.name IS 'Company name (required)';
COMMENT ON COLUMN public.company_info.address IS 'Company address';
COMMENT ON COLUMN public.company_info.phone IS 'Company phone number';
COMMENT ON COLUMN public.company_info.email IS 'Company contact email';
COMMENT ON COLUMN public.company_info.website IS 'Company website URL';
COMMENT ON COLUMN public.company_info.industry IS 'Company industry/sector';
COMMENT ON COLUMN public.company_info.founded_year IS 'Year company was founded';
COMMENT ON COLUMN public.company_info.location IS 'Company location/city';
COMMENT ON COLUMN public.company_info.description IS 'Company description';
COMMENT ON COLUMN public.company_info.logo_url IS 'Company logo URL';

-- 9. Verify the changes
SELECT 
    'users table' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('company_name', 'company_id')
ORDER BY column_name;

SELECT 
    'company_info table' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'company_info'
ORDER BY column_name;
