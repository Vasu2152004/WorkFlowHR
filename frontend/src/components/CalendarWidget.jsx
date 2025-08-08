import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, ChevronLeft, ChevronRight, Gift, Star, Users, Clock } from 'lucide-react'

const CalendarWidget = ({ limit = 5 }) => {
  const { user, API_BASE_URL } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      fetchUpcomingEvents()
    }
  }, [user])

  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('access_token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 3) // Get events for next 3 months
      
      const response = await fetch(
        `${API_BASE_URL}/company-calendar/events/range?start_date=${today}&end_date=${endDate.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        
        // Sort by date and limit the number of events
        const sortedEvents = data
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, limit)
        setEvents(sortedEvents)
      } else {
        setError(`Failed to fetch events: ${response.status}`)
      }
    } catch (error) {
      setError('Network error while fetching events')
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'holiday':
        return <Gift className="w-4 h-4 text-red-500" />
      case 'special_day':
        return <Star className="w-4 h-4 text-yellow-500" />
      case 'company_event':
        return <Users className="w-4 h-4 text-blue-500" />
      case 'optional_holiday':
        return <Clock className="w-4 h-4 text-green-500" />
      default:
        return <Calendar className="w-4 h-4 text-gray-500" />
    }
  }

  const getEventColor = (type) => {
    switch (type) {
      case 'holiday':
        return 'bg-red-100 text-red-800'
      case 'special_day':
        return 'bg-yellow-100 text-yellow-800'
      case 'company_event':
        return 'bg-blue-100 text-blue-800'
      case 'optional_holiday':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
      })
    }
  }

  const isToday = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        <div className="text-center py-4">
          <div className="text-red-500 mb-2">
            <Calendar className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button 
            onClick={fetchUpcomingEvents}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
        <Calendar className="w-5 h-5 text-gray-400" />
      </div>
      
      {events.length === 0 ? (
        <div className="text-center py-4">
          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div 
              key={event.id} 
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isToday(event.date) 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              } transition-colors`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    isToday(event.date) ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {event.title}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventColor(event.type)}`}>
                      {event.type.replace('_', ' ')}
                    </span>
                    <span className={`text-xs ${
                      isToday(event.date) ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {formatDate(event.date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <a 
            href="/company-calendar" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all events →
          </a>
        </div>
      )}
    </div>
  )
}

export default CalendarWidget
