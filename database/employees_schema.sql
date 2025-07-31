-- Create employees table for comprehensive employee data
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  joining_date DATE NOT NULL,
  phone_number VARCHAR(20),
  address TEXT,
  emergency_contact VARCHAR(255),
  pan_number VARCHAR(20),
  bank_account VARCHAR(50),
  leave_balance INTEGER DEFAULT 20,
  role VARCHAR(20) DEFAULT 'employee',
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  password VARCHAR(255) NOT NULL, -- Store generated password
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees can view own data" ON employees
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "HR can view company employees" ON employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'hr' 
      AND users.company_id = employees.company_id
    )
  );

CREATE POLICY "HR can insert company employees" ON employees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'hr' 
      AND users.company_id = employees.company_id
    )
  );

CREATE POLICY "HR can update company employees" ON employees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'hr' 
      AND users.company_id = employees.company_id
    )
  );

CREATE POLICY "HR can delete company employees" ON employees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'hr' 
      AND users.company_id = employees.company_id
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at(); 