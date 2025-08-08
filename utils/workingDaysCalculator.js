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
    // Return false if error occurs
    return false
  }
}

// Calculate daily salary based on annual salary and working days per month
const calculateDailySalary = (annualSalary, workingDaysPerMonth = 30) => {
  const monthlySalary = annualSalary / 12
  return monthlySalary / workingDaysPerMonth
}

// Calculate monthly salary from annual salary
const calculateMonthlySalary = (annualSalary) => {
  return annualSalary / 12
}

// Calculate working days between two dates (respecting company working days)
const calculateWorkingDaysBetween = async (companyId, startDate, endDate) => {
  try {
    const config = await getWorkingDaysConfig(companyId)
    
    // Ensure we're working with dates only
    const start = new Date(startDate)
    const end = new Date(endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    
    let workingDays = 0
    const current = new Date(start)
    
    while (current <= end) {
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
    // Return simple calculation if error occurs
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return Math.max(0, diffDays)
  }
}

// Calculate leave days between two dates (respecting company working days)
const calculateLeaveDays = async (companyId, startDate, endDate) => {
  try {
    const config = await getWorkingDaysConfig(companyId)
    
    // Ensure we're working with dates only
    const start = new Date(startDate)
    const end = new Date(endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    
    let leaveDays = 0
    const current = new Date(start)
    
    while (current <= end) {
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
        leaveDays++
      }
      
      current.setDate(current.getDate() + 1)
    }
    
    return leaveDays
  } catch (error) {
    // Return simple calculation if error occurs
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return Math.max(0, diffDays)
  }
}

// Test function to verify leave calculation logic
const testLeaveCalculation = async (companyId, startDate, endDate, expectedWorkingDays) => {
  try {
    const config = await getWorkingDaysConfig(companyId)
    const leaveDays = await calculateLeaveDays(companyId, startDate, endDate)
    
    return {
      config,
      startDate: startDate.toDateString(),
      endDate: endDate.toDateString(),
      calculatedLeaveDays: leaveDays,
      expectedWorkingDays,
      testResult: leaveDays === expectedWorkingDays ? 'PASS' : 'FAIL'
    }
  } catch (error) {
    return {
      error: error.message,
      testResult: 'FAIL'
    }
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
