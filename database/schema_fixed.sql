-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('hr', 'employee');

-- Create companies table (for multi-tenant support)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    founded_year INTEGER,
    website TEXT,
    phone TEXT,
    address TEXT,
    email TEXT,
    mission TEXT,
    vision TEXT,
    values TEXT,
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

-- Create RLS policies for users table - FIXED VERSION
-- Allow users to access their own record
CREATE POLICY "Users can access own record" ON users
    FOR ALL USING (id = auth.uid());

-- Allow HR users to access all users in their company
CREATE POLICY "HR can access company users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users AS hr_user
            WHERE hr_user.id = auth.uid()
            AND hr_user.role = 'hr'
            AND hr_user.company_id = users.company_id
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
CREATE OR REPLACE FUNCTION handle_hr_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow HR role during signup
    IF NEW.role != 'hr' THEN
        RAISE EXCEPTION 'Only HR users can sign up';
    END IF;
    
    -- Insert into users table
    INSERT INTO users (id, full_name, email, password, role, company_id)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'password', 'hr', NEW.raw_user_meta_data->>'company_id');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for HR signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_hr_signup(); 