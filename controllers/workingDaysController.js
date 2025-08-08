const { supabase, supabaseAdmin } = require('../config/supabase')

// Get working days configuration for a company
const getWorkingDaysConfig = async (req, res) => {
  try {
    const currentUser = req.user;

    console.log('🔍 Working days config - User role:', currentUser.role, 'User ID:', currentUser.id);

    // Ensure company_id is available
    if (!currentUser.company_id) {
      console.log('❌ Company ID not found for user:', currentUser.id);
      return res.status(400).json({ error: 'Company ID not found for user' });
    }

    console.log('✅ User authorized - Role:', currentUser.role, 'Company ID:', currentUser.company_id);

    const { data: config, error } = await supabaseAdmin
      .from('company_working_days')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .single();

    if (error) {
      console.log('⚠️ No working days config found, returning default');
      // Return default configuration if not found
      const defaultConfig = {
        working_days_per_week: 5,
        working_hours_per_day: 8.00,
        monday_working: true,
        tuesday_working: true,
        wednesday_working: true,
        thursday_working: true,
        friday_working: true,
        saturday_working: false,
        sunday_working: false
      };

      return res.json({ config: defaultConfig });
    }

    console.log('✅ Working days config found:', config);
    res.json({ config });
  } catch (error) {
    console.error('Get working days config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update working days configuration for a company
const updateWorkingDaysConfig = async (req, res) => {
  try {
    const currentUser = req.user;

    console.log('🔍 Update working days config - User role:', currentUser.role, 'User ID:', currentUser.id);

    // Ensure company_id is available
    if (!currentUser.company_id) {
      console.log('❌ Company ID not found for user:', currentUser.id);
      return res.status(400).json({ error: 'Company ID not found for user' });
    }

    console.log('✅ User authorized for update - Role:', currentUser.role, 'Company ID:', currentUser.company_id);

    const {
      working_days_per_week,
      working_hours_per_day,
      monday_working,
      tuesday_working,
      wednesday_working,
      thursday_working,
      friday_working,
      saturday_working,
      sunday_working
    } = req.body;

    // Convert boolean values if they come as strings
    const convertToBoolean = (value) => {
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === true || value === 1) return true;
      if (value === 'false' || value === false || value === 0) return false;
      return Boolean(value);
    };

    const workingDaysConfig = {
      working_days_per_week: parseInt(working_days_per_week),
      working_hours_per_day: parseFloat(working_hours_per_day),
      monday_working: convertToBoolean(monday_working),
      tuesday_working: convertToBoolean(tuesday_working),
      wednesday_working: convertToBoolean(wednesday_working),
      thursday_working: convertToBoolean(thursday_working),
      friday_working: convertToBoolean(friday_working),
      saturday_working: convertToBoolean(saturday_working),
      sunday_working: convertToBoolean(sunday_working)
    };

    // Validate required fields
    if (workingDaysConfig.working_days_per_week < 1 || workingDaysConfig.working_days_per_week > 7) {
      return res.status(400).json({ error: 'Working days per week must be between 1 and 7' });
    }

    if (workingDaysConfig.working_hours_per_day < 1 || workingDaysConfig.working_hours_per_day > 24) {
      return res.status(400).json({ error: 'Working hours per day must be between 1 and 24' });
    }

    // Validate that at least one day is marked as working
    const workingDays = [
      workingDaysConfig.monday_working,
      workingDaysConfig.tuesday_working,
      workingDaysConfig.wednesday_working,
      workingDaysConfig.thursday_working,
      workingDaysConfig.friday_working,
      workingDaysConfig.saturday_working,
      workingDaysConfig.sunday_working
    ];
    const totalWorkingDays = workingDays.filter(day => day).length;

    if (totalWorkingDays === 0) {
      return res.status(400).json({ error: 'At least one day must be marked as working' });
    }

    if (totalWorkingDays !== workingDaysConfig.working_days_per_week) {
      return res.status(400).json({ error: 'Working days per week must match the number of working days selected' });
    }

    // Check if configuration exists
    const { data: existingConfig, error: checkError } = await supabaseAdmin
      .from('company_working_days')
      .select('id')
      .eq('company_id', currentUser.company_id)
      .single();

    let result;
    if (existingConfig) {
      console.log('🔄 Updating existing working days config');
      // Update existing configuration
      const { data: updatedConfig, error: updateError } = await supabaseAdmin
        .from('company_working_days')
        .update({
          working_days_per_week: workingDaysConfig.working_days_per_week,
          working_hours_per_day: workingDaysConfig.working_hours_per_day,
          monday_working: workingDaysConfig.monday_working,
          tuesday_working: workingDaysConfig.tuesday_working,
          wednesday_working: workingDaysConfig.wednesday_working,
          thursday_working: workingDaysConfig.thursday_working,
          friday_working: workingDaysConfig.friday_working,
          saturday_working: workingDaysConfig.saturday_working,
          sunday_working: workingDaysConfig.sunday_working,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', currentUser.company_id)
        .select()
        .single();

      if (updateError) {
        console.error('Update working days config error:', updateError);
        return res.status(500).json({ error: updateError.message });
      }

      result = updatedConfig;
    } else {
      console.log('🆕 Creating new working days config');
      // Create new configuration
      const { data: newConfig, error: createError } = await supabaseAdmin
        .from('company_working_days')
        .insert([{
          company_id: currentUser.company_id,
          working_days_per_week: workingDaysConfig.working_days_per_week,
          working_hours_per_day: workingDaysConfig.working_hours_per_day,
          monday_working: workingDaysConfig.monday_working,
          tuesday_working: workingDaysConfig.tuesday_working,
          wednesday_working: workingDaysConfig.wednesday_working,
          thursday_working: workingDaysConfig.thursday_working,
          friday_working: workingDaysConfig.friday_working,
          saturday_working: workingDaysConfig.saturday_working,
          sunday_working: workingDaysConfig.sunday_working
        }])
        .select()
        .single();

      if (createError) {
        console.error('Create working days config error:', createError);
        return res.status(500).json({ error: createError.message });
      }

      result = newConfig;
    }

    console.log('✅ Working days config updated successfully:', result);
    res.json({
      message: 'Working days configuration updated successfully',
      config: result
    });
  } catch (error) {
    console.error('Update working days config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Calculate working days in a month for testing
const calculateWorkingDaysInMonth = async (req, res) => {
  try {
    const currentUser = req.user;
    const { month, year } = req.query;

    console.log('🔍 Calculate working days - User role:', currentUser.role, 'User ID:', currentUser.id);

    // Ensure company_id is available
    if (!currentUser.company_id) {
      console.log('❌ Company ID not found for user:', currentUser.id);
      return res.status(400).json({ error: 'Company ID not found for user' });
    }

    console.log('✅ User authorized for calculation - Role:', currentUser.role, 'Company ID:', currentUser.company_id);

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }

    if (yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ error: 'Year must be between 2020 and 2030' });
    }

    // Get working days configuration
    const { data: config, error: configError } = await supabaseAdmin
      .from('company_working_days')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .single();

    if (configError && configError.code !== 'PGRST116') {
      console.error('Error fetching working days config:', configError);
      return res.status(500).json({ error: configError.message });
    }

    // Use default configuration if not found
    const workingDaysConfig = config || {
      working_days_per_week: 5,
      working_hours_per_day: 8.00,
      monday_working: true,
      tuesday_working: true,
      wednesday_working: true,
      thursday_working: true,
      friday_working: true,
      saturday_working: false,
      sunday_working: false
    };

    // Calculate working days in the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0); // Last day of the month
    
    let workingDays = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      let isWorkingDay = false;
      
      // Check if this day is a working day based on configuration
      switch (dayOfWeek) {
        case 1: // Monday
          isWorkingDay = workingDaysConfig.monday_working;
          break;
        case 2: // Tuesday
          isWorkingDay = workingDaysConfig.tuesday_working;
          break;
        case 3: // Wednesday
          isWorkingDay = workingDaysConfig.wednesday_working;
          break;
        case 4: // Thursday
          isWorkingDay = workingDaysConfig.thursday_working;
          break;
        case 5: // Friday
          isWorkingDay = workingDaysConfig.friday_working;
          break;
        case 6: // Saturday
          isWorkingDay = workingDaysConfig.saturday_working;
          break;
        case 0: // Sunday
          isWorkingDay = workingDaysConfig.sunday_working;
          break;
      }
      
      if (isWorkingDay) {
        workingDays++;
      }
      
      current.setDate(current.getDate() + 1);
    }

    console.log('✅ Working days calculated:', workingDays, 'for', monthNum, yearNum);
    res.json({
      month: monthNum,
      year: yearNum,
      workingDays,
      config: workingDaysConfig
    });
  } catch (error) {
    console.error('Calculate working days in month error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getWorkingDaysConfig,
  updateWorkingDaysConfig,
  calculateWorkingDaysInMonth
};
