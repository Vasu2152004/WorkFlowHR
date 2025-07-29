const { supabaseAdmin } = require('../config/supabase');
const { generatePassword } = require('../utils/passwordGenerator');

async function createDummyEmployee() {
  try {
    console.log('Creating dummy employee...');
    
    // First, create a company if it doesn't exist
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('name', 'Demo Company')
      .single();

    let companyId;
    if (companyError || !company) {
      const { data: newCompany, error: createCompanyError } = await supabaseAdmin
        .from('companies')
        .insert({ name: 'Demo Company' })
        .select()
        .single();
      
      if (createCompanyError) {
        throw new Error('Failed to create company: ' + createCompanyError.message);
      }
      companyId = newCompany.id;
    } else {
      companyId = company.id;
    }

    // Create employee in Supabase Auth
    const employeePassword = generatePassword();
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'employee@demo.com',
      password: employeePassword,
      email_confirm: true
    });

    if (authError) {
      throw new Error('Failed to create auth user: ' + authError.message);
    }

    // Create employee in users table
    const { error: userError } = await supabaseAdmin
      .rpc('create_employee_user', {
        user_id: authUser.user.id,
        full_name: 'John Employee',
        email: 'employee@demo.com',
        password: employeePassword,
        company_id: companyId
      });

    if (userError) {
      throw new Error('Failed to create employee user: ' + userError.message);
    }

    console.log('✅ Dummy employee created successfully!');
    console.log('📧 Email: employee@demo.com');
    console.log('🔑 Password:', employeePassword);
    console.log('🏢 Company: Demo Company');
    console.log('👤 Role: employee');
    
  } catch (error) {
    console.error('❌ Error creating dummy employee:', error.message);
  }
}

createDummyEmployee(); 