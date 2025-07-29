-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_hr_signup();

-- Create the new functions
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