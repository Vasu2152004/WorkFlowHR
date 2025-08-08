const { supabase, supabaseAdmin } = require('../config/supabase')

// Get working days configuration for a company
const getWorkingDaysConfig = async (req, res) => {
  try {
    const currentUser = req.user;

    // Ensure company_id is available
    if (!currentUser.company_id) {
      return res.status(400).json({ error: 'Company ID not found for user' });
    }

    const { data: config, error } = await supabaseAdmin
      .from('company_working_days')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .single();

    if (error) {
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

    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update working days configuration for a company
const updateWorkingDaysConfig = async (req, res) => {
  try {
    const currentUser = req.user;

    // Ensure company_id is available
    if (!currentUser.company_id) {
      return res.status(400).json({ error: 'Company ID not found for user' });
    }

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

    if (workingDaysConfig.working_hours_per_day < 0 || workingDaysConfig.working_hours_per_day > 24) {
      return res.status(400).json({ error: 'Working hours per day must be between 0 and 24' });
    }

    // Check if configuration already exists
    const { data: existingConfig, error: checkError } = await supabaseAdmin
      .from('company_working_days')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Error checking existing configuration' });
    }

    let result;
    if (existingConfig) {
      // Update existing configuration
      const { data: updatedConfig, error: updateError } = await supabaseAdmin
        .from('company_working_days')
        .update({
          ...workingDaysConfig,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', currentUser.company_id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: 'Error updating working days configuration' });
      }

      result = updatedConfig;
    } else {
      // Create new configuration
      const { data: newConfig, error: createError } = await supabaseAdmin
        .from('company_working_days')
        .insert([{
          company_id: currentUser.company_id,
          ...workingDaysConfig,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ error: 'Error creating working days configuration' });
      }

      result = newConfig;
    }

    res.json({ 
      message: 'Working days configuration updated successfully',
      config: result 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Calculate working days in a specific month
const calculateWorkingDaysInMonth = async (req, res) => {
  try {
    const currentUser = req.user;

    // Ensure company_id is available
    if (!currentUser.company_id) {
      return res.status(400).json({ error: 'Company ID not found for user' });
    }

    const { month, year } = req.params;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validate month and year
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid month. Must be between 1 and 12' });
    }

    if (yearNum < 1900 || yearNum > 2100) {
      return res.status(400).json({ error: 'Invalid year. Must be between 1900 and 2100' });
    }

    // Get working days configuration
    const { data: config, error: configError } = await supabaseAdmin
      .from('company_working_days')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .single();

    if (configError) {
      return res.status(500).json({ error: 'Error fetching working days configuration' });
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
    const workingDays = calculateWorkingDaysInMonthHelper(monthNum, yearNum, workingDaysConfig);

    res.json({ 
      month: monthNum,
      year: yearNum,
      workingDays,
      config: workingDaysConfig
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to calculate working days in a month
const calculateWorkingDaysInMonthHelper = (month, year, config) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    let isWorkingDay = false;
    switch (dayOfWeek) {
      case 0: // Sunday
        isWorkingDay = config.sunday_working;
        break;
      case 1: // Monday
        isWorkingDay = config.monday_working;
        break;
      case 2: // Tuesday
        isWorkingDay = config.tuesday_working;
        break;
      case 3: // Wednesday
        isWorkingDay = config.wednesday_working;
        break;
      case 4: // Thursday
        isWorkingDay = config.thursday_working;
        break;
      case 5: // Friday
        isWorkingDay = config.friday_working;
        break;
      case 6: // Saturday
        isWorkingDay = config.saturday_working;
        break;
    }

    if (isWorkingDay) {
      workingDays++;
    }
  }

  return workingDays;
};

module.exports = {
  getWorkingDaysConfig,
  updateWorkingDaysConfig,
  calculateWorkingDaysInMonth
};
