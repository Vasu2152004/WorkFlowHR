-- Add company_id to leave_requests table for proper isolation
ALTER TABLE leave_requests 
ADD COLUMN company_id UUID REFERENCES companies(id);

-- Update existing leave_requests to have company_id based on employee's company
UPDATE leave_requests 
SET company_id = (
  SELECT e.company_id 
  FROM employees e 
  WHERE e.id = leave_requests.employee_id
)
WHERE company_id IS NULL;

-- Make company_id NOT NULL after updating existing records
ALTER TABLE leave_requests 
ALTER COLUMN company_id SET NOT NULL;

-- Add RLS policies for leave_requests table
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Policy for employees to see only their own leave requests
CREATE POLICY "Employees can view own leave requests" ON leave_requests
FOR SELECT USING (
  employee_id IN (
    SELECT id FROM employees 
    WHERE user_id = auth.uid()
  )
);

-- Policy for HR/HR Manager to see leave requests in their company
CREATE POLICY "HR can view company leave requests" ON leave_requests
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM users 
    WHERE id = auth.uid()
  )
);

-- Policy for creating leave requests (employees can create their own, HR can create for company employees)
CREATE POLICY "Users can create leave requests" ON leave_requests
FOR INSERT WITH CHECK (
  (auth.role() = 'authenticated' AND 
   employee_id IN (
     SELECT id FROM employees 
     WHERE user_id = auth.uid()
   )) OR
  (auth.role() = 'authenticated' AND 
   company_id IN (
     SELECT company_id FROM users 
     WHERE id = auth.uid()
   ))
);

-- Policy for updating leave requests (HR can update company requests)
CREATE POLICY "HR can update company leave requests" ON leave_requests
FOR UPDATE USING (
  company_id IN (
    SELECT company_id FROM users 
    WHERE id = auth.uid()
  )
);

-- Add company_id to salary_slips table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'salary_slips' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE salary_slips ADD COLUMN company_id UUID REFERENCES companies(id);
    END IF;
END $$;

-- Update existing salary_slips to have company_id
UPDATE salary_slips 
SET company_id = (
  SELECT e.company_id 
  FROM employees e 
  WHERE e.id = salary_slips.employee_id
)
WHERE company_id IS NULL;

-- Make company_id NOT NULL for salary_slips
ALTER TABLE salary_slips 
ALTER COLUMN company_id SET NOT NULL;

-- Add RLS policies for salary_slips table
ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;

-- Policy for employees to see only their own salary slips
CREATE POLICY "Employees can view own salary slips" ON salary_slips
FOR SELECT USING (
  employee_id IN (
    SELECT id FROM employees 
    WHERE user_id = auth.uid()
  )
);

-- Policy for HR/HR Manager to see salary slips in their company
CREATE POLICY "HR can view company salary slips" ON salary_slips
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM users 
    WHERE id = auth.uid()
  )
);

-- Policy for creating salary slips (HR only)
CREATE POLICY "HR can create company salary slips" ON salary_slips
FOR INSERT WITH CHECK (
  company_id IN (
    SELECT company_id FROM users 
    WHERE id = auth.uid()
  )
);

-- Policy for updating salary slips (HR only)
CREATE POLICY "HR can update company salary slips" ON salary_slips
FOR UPDATE USING (
  company_id IN (
    SELECT company_id FROM users 
    WHERE id = auth.uid()
  )
);
