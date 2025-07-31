const { supabase, supabaseAdmin } = require('../config/supabase');

async function fixExistingUser() {
  try {
    console.log('🔧 Checking existing user...');

    // Get the existing user from Auth
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing users:', authError);
      return;
    }

    // Find the HR user
    const hrUser = users.find(user => user.email === 'hr@company.com');
    
    if (!hrUser) {
      console.log('❌ HR user not found in Auth');
      return;
    }

    console.log('✅ Found HR user in Auth:', hrUser.id);

    // Check if user exists in users table
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', hrUser.id)
      .single();

    if (userError || !existingUser) {
      console.log('❌ User not found in users table, creating...');
      
      // Create company first
      const { data: companyData, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert([
          {
            name: 'Test Company',
            domain: 'company.com'
          }
        ])
        .select()
        .single();

      let companyId;
      if (companyError) {
        // Company might already exist, try to get it
        const { data: existingCompany } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('name', 'Test Company')
          .single();
        
        companyId = existingCompany?.id;
      } else {
        companyId = companyData.id;
      }

      // Create user in users table
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert([
          {
            id: hrUser.id,
            full_name: 'HR Manager',
            email: 'hr@company.com',
            role: 'hr',
            company_id: companyId,
            password: 'Hr123456'
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create user in database:', createError);
        return;
      }

      console.log('✅ User created in database successfully!');
      console.log('📧 Email: hr@company.com');
      console.log('🔑 Password: Hr123456');
      console.log('👤 Role: HR');
      console.log('🏢 Company ID:', companyId);

    } else {
      console.log('✅ User already exists in database');
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Role:', existingUser.role);
      console.log('🏢 Company ID:', existingUser.company_id);
    }

  } catch (error) {
    console.error('❌ Error fixing user:', error);
  }
}

// Run the script
fixExistingUser(); 