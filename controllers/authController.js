const { supabase, supabaseAdmin } = require('../config/supabase');
const { generatePassword } = require('../utils/passwordGenerator');

// HR Signup - Only HR users can sign up
const hrSignup = async (req, res) => {
  try {
    const { email, password, full_name, company_name } = req.body;

    // Validate required fields
    if (!email || !password || !full_name || !company_name) {
      return res.status(400).json({ 
        error: 'Email, password, full name, and company name are required' 
      });
    }

    // First, create the company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert([{ name: company_name }])
      .select()
      .single();

    if (companyError) {
      return res.status(500).json({ error: 'Failed to create company' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Manually create the user in our users table
    const { error: userError } = await supabaseAdmin
      .rpc('create_hr_user', {
        user_id: authData.user.id,
        full_name: full_name,
        email: email,
        password: password,
        company_id: company.id
      });

    if (userError) {
      // If user creation fails, delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create user in database' });
    }
    res.status(201).json({
      message: 'HR user created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
        role: 'hr',
        company_id: company.id
      }
    });

  } catch (error) {
    console.error('HR signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user details from our users table using admin client to bypass RLS
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found in system' });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        company_id: userData.company_id
      },
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, company_id, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  hrSignup,
  login,
  logout,
  getProfile,
  refreshToken
}; 