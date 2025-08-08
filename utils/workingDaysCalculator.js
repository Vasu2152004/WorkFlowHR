const { supabaseAdmin } = require('../config/supabase')

// Get working days configuration for a company
const getWorkingDaysConfig = async (companyId) => {
  try {
    const { data: config, error } = await supabaseAdmin
      .from('company_working_days')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (error) {
      // Return default configuration if not found
      return {
        working_days_per_week: 5,
        working_hours_per_day: 8.00,
        monday_working: true,
        tuesday_working: true,
        wednesday_working: true,
        thursday_working: true,
        friday_working: true,
        saturday_working: false,
        sunday_working: false
      }
    }

    return config
  } catch (error) {
    console.error('Error fetching working days config:', error)
    // Return default configuration
    return {
      working_days_per_week: 5,
      working_hours_per_day: 8.00,
      monday_working: true,
      tuesday_working: true,
      wednesday_working: true,
      thursday_working: true,
      friday_working: true,
      saturday_working: false,
      sunday_working: false
    }
  }
}

// Calculate working days in a month for a company
const calculateWorkingDaysInMonth = async (companyId, month, year) => {
  try {
    const config = await getWorkingDaysConfig(companyId)
    
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Last day of the month
    
    let workingDays = 0
    const current = new Date(startDate)
    
    // Ensure we're working with dates only (no time component)
    current.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay()
      let isWorkingDay = false
      
      // Check if this day is a working day based on configuration
      switch (dayOfWeek) {
        case 1: // Monday
          isWorkingDay = config.monday_working
          break
        case 2: // Tuesday
          isWorkingDay = config.tuesday_working
          break
        case 3: // Wednesday
          isWorkingDay = config.wednesday_working
          break
        case 4: // Thursday
          isWorkingDay = config.thursday_working
          break
        case 5: // Friday
          isWorkingDay = config.friday_working
          break
        case 6: // Saturday
          isWorkingDay = config.saturday_working
          break
        case 0: // Sunday
          isWorkingDay = config.sunday_working
          break
      }
      
      if (isWorkingDay) {
        workingDays++
      }
      
      current.setDate(current.getDate() + 1)
    }
    
    return workingDays
  } catch (error) {
    console.error('Error calculating working days in month:', error)
    // Return default calculation (22 working days)
    return 22
  }
}

// Check if a specific date is a working day
const isWorkingDay = async (companyId, date) => {
  try {
    const config = await getWorkingDaysConfig(companyId)
    const dayOfWeek = date.getDay()
    
    switch (dayOfWeek) {
      case 1: // Monday
        return config.monday_working
      case 2: // Tuesday
        return config.tuesday_working
      case 3: // Wednesday
        return config.wednesday_working
      case 4: // Thursday
        return config.thursday_working
      case 5: // Friday
        return config.friday_working
      case 6: // Saturday
        return config.saturday_working
      case 0: // Sunday
        return config.sunday_working
      default:
        return false
    }
  } catch (error) {
    console.error('Error checking if date is working day:', error)
    // Return default (weekdays only)
    const dayOfWeek = date.getDay()
    return dayOfWeek >= 1 && dayOfWeek <= 5
  }
}

// Calculate daily salary based on annual salary and working days
const calculateDailySalary = (annualSalary, workingDaysPerMonth = 30) => {
  // Always use 30 days per month for daily salary calculation (as requested)
  // This ensures consistent daily rate regardless of actual days in the month
  return annualSalary / (30 * 12)
}

// Calculate monthly salary based on annual salary
const calculateMonthlySalary = (annualSalary) => {
  return annualSalary / 12
}

// Calculate working days between two dates (excluding non-working days)
const calculateWorkingDaysBetween = async (companyId, startDate, endDate) => {
  try {
    const config = await getWorkingDaysConfig(companyId)
    
    let workingDays = 0
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    // Ensure we're working with dates only (no time component)
    current.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      let isWorkingDay = false
      
      switch (dayOfWeek) {
        case 1: // Monday
          isWorkingDay = config.monday_working
          break
        case 2: // Tuesday
          isWorkingDay = config.tuesday_working
          break
        case 3: // Wednesday
          isWorkingDay = config.wednesday_working
          break
        case 4: // Thursday
          isWorkingDay = config.thursday_working
          break
        case 5: // Friday
          isWorkingDay = config.friday_working
          break
        case 6: // Saturday
          isWorkingDay = config.saturday_working
          break
        case 0: // Sunday
          isWorkingDay = config.sunday_working
          break
      }
      
      if (isWorkingDay) {
        workingDays++
      }
      
      current.setDate(current.getDate() + 1)
    }
    
    return workingDays
  } catch (error) {
    console.error('Error calculating working days between dates:', error)
    // Return default calculation (excluding weekends)
    let workingDays = 0
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    // Ensure we're working with dates only (no time component)
    current.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++
      }
      current.setDate(current.getDate() + 1)
    }
    
    return workingDays
  }
}

// Calculate leave days between two dates (respecting company working days)
const calculateLeaveDays = async (companyId, startDate, endDate) => {
  try {
    const config = await getWorkingDaysConfig(companyId)
    
    let leaveDays = 0
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    // Ensure we're working with dates only (no time component)
    current.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      let isWorkingDay = false
      
      switch (dayOfWeek) {
        case 1: // Monday
          isWorkingDay = config.monday_working
          break
        case 2: // Tuesday
          isWorkingDay = config.tuesday_working
          break
        case 3: // Wednesday
          isWorkingDay = config.wednesday_working
          break
        case 4: // Thursday
          isWorkingDay = config.thursday_working
          break
        case 5: // Friday
          isWorkingDay = config.friday_working
          break
        case 6: // Saturday
          isWorkingDay = config.saturday_working
          break
        case 0: // Sunday
          isWorkingDay = config.sunday_working
          break
      }
      
      // Only count leave days for working days
      if (isWorkingDay) {
        leaveDays++
      }
      
      current.setDate(current.getDate() + 1)
    }
    
    return leaveDays
  } catch (error) {
    console.error('Error calculating leave days:', error)
    // Return default calculation (excluding weekends)
    let leaveDays = 0
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    // Ensure we're working with dates only (no time component)
    current.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        leaveDays++
      }
      current.setDate(current.getDate() + 1)
    }
    
    return leaveDays
  }
}

// Test function to verify leave calculation logic
const testLeaveCalculation = async (companyId, startDate, endDate, expectedWorkingDays) => {
  try {
    const config = await getWorkingDaysConfig(companyId)
    const leaveDays = await calculateLeaveDays(companyId, startDate, endDate)
    
    console.log('=== Leave Calculation Test ===')
    console.log('Company Config:', config)
    console.log('Start Date:', startDate.toDateString())
    console.log('End Date:', endDate.toDateString())
    console.log('Calculated Leave Days:', leaveDays)
    console.log('Expected Working Days:', expectedWorkingDays)
    console.log('Test Result:', leaveDays === expectedWorkingDays ? 'PASS' : 'FAIL')
    console.log('=============================')
    
    return leaveDays === expectedWorkingDays
  } catch (error) {
    console.error('Test failed:', error)
    return false
  }
}

module.exports = {
  getWorkingDaysConfig,
  calculateWorkingDaysInMonth,
  isWorkingDay,
  calculateDailySalary,
  calculateMonthlySalary,
  calculateWorkingDaysBetween,
  calculateLeaveDays,
  testLeaveCalculation
}
