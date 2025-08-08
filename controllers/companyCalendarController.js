const { supabase, supabaseAdmin } = require('../config/supabase')

// Get calendar events for a company
const getCalendarEvents = async (req, res) => {
  try {
    const currentUser = req.user
    const { month, year, type } = req.query

    // Ensure company_id is available
    if (!currentUser.company_id) {
      return res.status(400).json({ error: 'Company ID not found for user' })
    }

    let query = supabaseAdmin
      .from('company_calendar')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('date', { ascending: true })

    // Filter by month and year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]
      query = query.gte('date', startDate).lte('date', endDate)
    }

    // Filter by type if provided
    if (type) {
      query = query.eq('type', type)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching calendar events:', error)
      return res.status(500).json({ error: 'Failed to fetch calendar events' })
    }

    res.json(events || [])
  } catch (error) {
    console.error('Get calendar events error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create a new calendar event
const createCalendarEvent = async (req, res) => {
  try {
    const currentUser = req.user
    const { title, description, date, type, is_recurring, recurring_pattern } = req.body

    // Ensure company_id is available
    if (!currentUser.company_id) {
      return res.status(400).json({ error: 'Company ID not found for user' })
    }

    // Validate required fields
    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' })
    }

    // Validate date format
    const eventDate = new Date(date)
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' })
    }

    // Validate type
    const validTypes = ['holiday', 'special_day', 'company_event', 'optional_holiday']
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid event type' })
    }

    // Create calendar event
    const { data: event, error } = await supabaseAdmin
      .from('company_calendar')
      .insert([{
        company_id: currentUser.company_id,
        title: title.trim(),
        description: description?.trim() || null,
        date: eventDate.toISOString().split('T')[0],
        type: type || 'holiday',
        is_recurring: is_recurring || false,
        recurring_pattern: recurring_pattern || null,
        created_by: currentUser.id
      }])
      .select()
      .single()

    if (error) {
      console.error('Create calendar event error:', error)
      return res.status(500).json({ error: error.message })
    }

    res.status(201).json({
      message: 'Calendar event created successfully',
      event
    })
  } catch (error) {
    console.error('Create calendar event error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update a calendar event
const updateCalendarEvent = async (req, res) => {
  try {
    const currentUser = req.user
    const { id } = req.params
    const { title, description, date, type, is_recurring, recurring_pattern } = req.body

    console.log('🔍 Update calendar event - User role:', currentUser.role, 'User ID:', currentUser.id)

    // Ensure company_id is available
    if (!currentUser.company_id) {
      console.log('❌ Company ID not found for user:', currentUser.id)
      return res.status(400).json({ error: 'Company ID not found for user' })
    }

    // Validate required fields
    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' })
    }

    // Validate date format
    const eventDate = new Date(date)
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' })
    }

    // Validate type
    const validTypes = ['holiday', 'special_day', 'company_event', 'optional_holiday']
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid event type' })
    }

    console.log('✅ User authorized for update - Role:', currentUser.role, 'Company ID:', currentUser.company_id)

    // Check if event exists and belongs to the company
    const { data: existingEvent, error: checkError } = await supabaseAdmin
      .from('company_calendar')
      .select('id')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (checkError || !existingEvent) {
      return res.status(404).json({ error: 'Calendar event not found or access denied' })
    }

    // Update calendar event
    const { data: event, error } = await supabaseAdmin
      .from('company_calendar')
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        date: eventDate.toISOString().split('T')[0],
        type: type || 'holiday',
        is_recurring: is_recurring || false,
        recurring_pattern: recurring_pattern || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .select()
      .single()

    if (error) {
      console.error('Update calendar event error:', error)
      return res.status(500).json({ error: error.message })
    }

    console.log('✅ Calendar event updated successfully:', event)
    res.json({
      message: 'Calendar event updated successfully',
      event
    })
  } catch (error) {
    console.error('Update calendar event error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Delete a calendar event
const deleteCalendarEvent = async (req, res) => {
  try {
    const currentUser = req.user
    const { id } = req.params

    console.log('🔍 Delete calendar event - User role:', currentUser.role, 'User ID:', currentUser.id)

    // Ensure company_id is available
    if (!currentUser.company_id) {
      console.log('❌ Company ID not found for user:', currentUser.id)
      return res.status(400).json({ error: 'Company ID not found for user' })
    }

    console.log('✅ User authorized for delete - Role:', currentUser.role, 'Company ID:', currentUser.company_id)

    // Check if event exists and belongs to the company
    const { data: existingEvent, error: checkError } = await supabaseAdmin
      .from('company_calendar')
      .select('id, title')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (checkError || !existingEvent) {
      return res.status(404).json({ error: 'Calendar event not found or access denied' })
    }

    // Delete calendar event
    const { error } = await supabaseAdmin
      .from('company_calendar')
      .delete()
      .eq('id', id)
      .eq('company_id', currentUser.company_id)

    if (error) {
      console.error('Delete calendar event error:', error)
      return res.status(500).json({ error: error.message })
    }

    console.log('✅ Calendar event deleted successfully:', existingEvent.title)
    res.json({
      message: 'Calendar event deleted successfully',
      deletedEvent: existingEvent
    })
  } catch (error) {
    console.error('Delete calendar event error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get calendar events for a specific date range
const getCalendarEventsByDateRange = async (req, res) => {
  try {
    const currentUser = req.user
    const { start_date, end_date, type } = req.query

    console.log('🔍 Get calendar events by date range - User role:', currentUser.role, 'User ID:', currentUser.id)

    // Ensure company_id is available
    if (!currentUser.company_id) {
      console.log('❌ Company ID not found for user:', currentUser.id)
      return res.status(400).json({ error: 'Company ID not found for user' })
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' })
    }

    console.log('✅ User authorized - Role:', currentUser.role, 'Company ID:', currentUser.company_id)

    let query = supabaseAdmin
      .from('company_calendar')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .gte('date', start_date)
      .lte('date', end_date)
      .order('date', { ascending: true })

    // Filter by type if provided
    if (type) {
      query = query.eq('type', type)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching calendar events by date range:', error)
      return res.status(500).json({ error: 'Failed to fetch calendar events' })
    }

    console.log('✅ Calendar events found for date range:', events?.length || 0)
    res.json(events || [])
  } catch (error) {
    console.error('Get calendar events by date range error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventsByDateRange
}
