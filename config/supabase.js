const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client with anon key for client-side operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables not found. Please create a .env file with your Supabase credentials.');
}

// Create Supabase client with retry options and timeout
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'workflowhr-backend'
    }
  }
});

// Create Supabase client with service role key for admin operations
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'workflowhr-backend-admin'
    }
  }
});

module.exports = {
  supabase,
  supabaseAdmin
}; 