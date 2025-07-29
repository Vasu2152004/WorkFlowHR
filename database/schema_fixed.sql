-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('hr', 'employee');

-- Create companies table (for multi-tenant support)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- auto-generated password for employee tracking
    role user_role DEFAULT 'hr',
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
-- Users can only access rows where company_id matches their company_id
CREATE POLICY "Users can only access their company data" ON users
    FOR ALL USING (
        company_id = (
            SELECT company_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Create RLS policies for companies table
-- Users can only access their own company
CREATE POLICY "Users can only access their company" ON companies
    FOR ALL USING (
        id = (
            SELECT company_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle user signup (for HR users only)
-- This function will be called manually from the API, not via trigger
CREATE OR REPLACE FUNCTION create_hr_user(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    password TEXT,
    company_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Insert into users table
    INSERT INTO users (id, full_name, email, password, role, company_id)
    VALUES (user_id, full_name, email, password, 'hr', company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle employee creation
CREATE OR REPLACE FUNCTION create_employee_user(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    password TEXT,
    company_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Insert into users table
    INSERT INTO users (id, full_name, email, password, role, company_id)
    VALUES (user_id, full_name, email, password, 'employee', company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 