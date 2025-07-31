const { supabase, supabaseAdmin } = require('../config/supabase');

async function createHRUser() {
  try {
    console.log('🔧 Creating HR user...');

    // Create HR user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'hr@company.com',
      password: 'Hr123456',
      email_confirm: true
    });

    if (authError) {
      console.error('❌ Auth creation failed:', authError);
      return;
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Create company first using admin client
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

    console.log('✅ Company ID:', companyId);

    // Create HR user in users table using admin client
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: authData.user.id,
          full_name: 'HR Manager',
          email: 'hr@company.com',
          role: 'hr',
          company_id: companyId,
          password: 'Hr123456'
        }
      ])
      .select()
      .single();

    if (userError) {
      console.error('❌ User creation failed:', userError);
      return;
    }

    console.log('✅ HR user created successfully!');
    console.log('📧 Email: hr@company.com');
    console.log('🔑 Password: Hr123456');
    console.log('👤 Role: HR');
    console.log('🏢 Company ID:', companyId);

  } catch (error) {
    console.error('❌ Error creating HR user:', error);
  }
}

// Run the script
createHRUser(); 