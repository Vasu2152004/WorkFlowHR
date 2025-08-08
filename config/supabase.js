const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client with anon key for client-side operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let supabaseAdmin = null;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not found. Supabase functionality will be disabled.');
  console.warn('Please set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
} else {
  try {
    // Create Supabase client with retry options and timeout
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
    if (supabaseServiceRoleKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
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
    } else {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Admin operations will be disabled.');
      supabaseAdmin = supabase; // Fallback to regular client
    }

    console.log('✅ Supabase clients configured successfully');
  } catch (error) {
    console.error('❌ Error configuring Supabase clients:', error.message);
    supabase = null;
    supabaseAdmin = null;
  }
}

module.exports = {
  supabase,
  supabaseAdmin
}; 