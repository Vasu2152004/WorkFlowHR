const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.log('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEmployees() {
  console.log('🔍 Checking current employee data...\n')

  try {
    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, role, company_id, created_at')
      .eq('role', 'employee')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }

    console.log(`📊 Users table: ${users.length} employees found`)

    // Check employees table
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, user_id, employee_id, full_name, email, department, designation, company_id, created_at')

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return
    }

    console.log(`📊 Employees table: ${employees.length} employees found\n`)

    // Show details
    if (users.length > 0) {
      console.log('👥 Employees in Users table:')
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.full_name} (${user.email}) - Created: ${new Date(user.created_at).toLocaleDateString()}`)
      })
      console.log()
    }

    if (employees.length > 0) {
      console.log('👥 Employees in Employees table:')
      employees.forEach((emp, index) => {
        console.log(`  ${index + 1}. ${emp.full_name} (${emp.email}) - ${emp.department || 'No dept'} - Created: ${new Date(emp.created_at).toLocaleDateString()}`)
      })
      console.log()
    }

    // Check for orphaned records
    const orphanedUsers = users.filter(user => 
      !employees.some(emp => emp.user_id === user.id)
    )

    const orphanedEmployees = employees.filter(emp => 
      !users.some(user => user.id === emp.user_id)
    )

    if (orphanedUsers.length > 0) {
      console.log('⚠️  Orphaned users (exist in users table but not in employees table):')
      orphanedUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.full_name} (${user.email})`)
      })
      console.log()
    }

    if (orphanedEmployees.length > 0) {
      console.log('⚠️  Orphaned employees (exist in employees table but not in users table):')
      orphanedEmployees.forEach((emp, index) => {
        console.log(`  ${index + 1}. ${emp.full_name} (${emp.email})`)
      })
      console.log()
    }

    return { users, employees, orphanedUsers, orphanedEmployees }

  } catch (error) {
    console.error('Error checking employees:', error)
  }
}

async function migrateEmployees() {
  console.log('🔄 Starting employee migration...\n')

  try {
    // First check current state
    const state = await checkEmployees()

    if (!state || state.orphanedUsers.length === 0) {
      console.log('✅ No employees need migration or all employees are already migrated')
      return
    }

    console.log(`📝 Migrating ${state.orphanedUsers.length} employees...`)

    // Migrate each orphaned user
    for (const user of state.orphanedUsers) {
      try {
        const { data: employee, error } = await supabase
          .from('employees')
          .insert({
            user_id: user.id,
            employee_id: `EMP${String(user.id).slice(-4)}`,
            full_name: user.full_name,
            email: user.email,
            department: 'General',
            designation: 'Employee',
            salary: 0,
            joining_date: new Date(user.created_at).toISOString().split('T')[0],
            leave_balance: 20,
            role: 'employee',
            company_id: user.company_id,
            created_at: user.created_at,
            updated_at: user.updated_at || user.created_at
          })
          .select()
          .single()

        if (error) {
          console.error(`❌ Failed to migrate ${user.full_name}:`, error.message)
        } else {
          console.log(`✅ Migrated: ${user.full_name} (${user.email})`)
        }
      } catch (error) {
        console.error(`❌ Error migrating ${user.full_name}:`, error.message)
      }
    }

    console.log('\n✅ Migration completed!')
    console.log('\n🔍 Checking final state...')
    await checkEmployees()

  } catch (error) {
    console.error('Error during migration:', error)
  }
}

async function main() {
  const command = process.argv[2]

  switch (command) {
    case 'check':
      await checkEmployees()
      break
    case 'migrate':
      await migrateEmployees()
      break
    default:
      console.log('Usage: node migrate_employees.js [check|migrate]')
      console.log('  check   - Check current employee data')
      console.log('  migrate - Migrate employees from users table to employees table')
      break
  }
}

main().catch(console.error) 