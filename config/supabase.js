const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client with anon key for client-side operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables not found!');
  console.error('📝 Please create a .env file with your Supabase credentials:');
  console.error('   SUPABASE_URL=your_supabase_url_here');
  console.error('   SUPABASE_ANON_KEY=your_supabase_anon_key_here');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here');
  console.error('   JWT_SECRET=your_jwt_secret_here');
  process.exit(1);
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
      'X-Client-Info': 'hrms-backend'
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
      'X-Client-Info': 'hrms-backend-admin'
    }
  }
});

module.exports = {
  supabase,
  supabaseAdmin
}; 