const { supabaseAdmin } = require('../config/supabase');

async function fixCompany() {
  try {
    console.log('🔧 Creating company...');

    // Create company
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert([
        {
          name: 'Test Company'
        }
      ])
      .select()
      .single();

    if (companyError) {
      console.error('❌ Company creation failed:', companyError);
      return;
    }

    console.log('✅ Company created:', companyData.id);

    // Update the HR user with the company ID
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ company_id: companyData.id })
      .eq('email', 'hr@company.com')
      .select()
      .single();

    if (updateError) {
      console.error('❌ User update failed:', updateError);
      return;
    }

    console.log('✅ User updated with company ID');
    console.log('📧 Email:', updatedUser.email);
    console.log('👤 Role:', updatedUser.role);
    console.log('🏢 Company ID:', updatedUser.company_id);

  } catch (error) {
    console.error('❌ Error fixing company:', error);
  }
}

// Run the script
fixCompany(); 