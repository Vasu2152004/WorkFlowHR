-- Update companies table to add new fields for company profile
-- This script should be run if the companies table already exists

-- Add new columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS founded_year INTEGER,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS mission TEXT,
ADD COLUMN IF NOT EXISTS vision TEXT,
ADD COLUMN IF NOT EXISTS values TEXT;

-- Update existing companies with some default values (optional)
-- UPDATE companies SET 
--   description = 'A leading company in our industry',
--   industry = 'Technology',
--   founded_year = 2020,
--   email = 'info@company.com'
-- WHERE description IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position; 