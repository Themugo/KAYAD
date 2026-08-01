// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - CALENDAR
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Car,
  Plus,
  Filter,
} from 'lucide-react';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
};

// Sample data
const SAMPLE_EVENTS = [
  { id: '1', time: '09:00', endTime: '10:30', title: 'Toyota Corolla Inspection', customer: 'John Kamau', location: 'Nairobi, Westlands', engineer: 'David Maina', status: 'confirmed', type: 'pre_purchase' },
  { id: '2', time: '11:00', endTime: '12:30', title: 'Mercedes C-Class Inspection', customer: 'Sarah Wanjiku', location: 'Kiambu, Thika Road', engineer: 'Faith Njeri', status: 'confirmed', type: 'dealer' },
  { id: '3', time: '14:00', endTime: '16:00', title: 'Toyota Land Cruiser Fleet', customer: 'Auto Dealers Ltd', location: 'Mombasa', engineer: 'David Maina', status: 'pending', type: 'fleet' },
  { id: '4', time: '10:00', endTime: '11:00', title: 'Honda Civic Inspection', customer: 'James Ochieng', location: 'Nairobi, Kilimani', engineer: 'James Ochieng', status: 'travelling', type: 'pre_purchase' },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

export default function CalendarView({ providerId }: { providerId: string }) {
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterEngineer, setFilterEngineer] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const engineers = [
    { id: 'e1', name: 'David Maina', color: '#3b82f6' },
    { id: 'e2', name: 'Faith Njeri', color: '#10b981' },
    { id: 'e3', name: 'James Ochieng', color: '#f59e0b' },
    { id: 'e4', name: 'Grace Wambui', color: '#8b5cf6' },
  ];

  const getWeekDays = () => {
    const days = [];
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getDaysInMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days = [];
    
    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(selectedDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setSelectedDate(newDate);
  };

  const formatDateHeader = () => {
    if (view === 'day') {
      return selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } else if (view === 'week') {
      const days = getWeekDays();
      const start = days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} - ${end}`;
    } else {
      return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getEventsForDay = (date: Date) => {
    return SAMPLE_EVENTS.filter(e => {
      const eventDate = new Date(e.time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventStyle = (event: typeof SAMPLE_EVENTS[0]) => {
    const startHour = parseInt(event.time.split(':')[0]);
    const startMin = parseInt(event.time.split(':')[1]);
    const endHour = parseInt(event.endTime.split(':')[0]);
    const endMin = parseInt(event.endTime.split(':')[1]);
    
    const top = ((startHour - 7) * 60 + startMin) * (64 / 60);
    const height = ((endHour - startHour) * 60 + (endMin - startMin)) * (64 / 60);
    
    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100"
            style={{ color: KAYAD_COLORS.softBlue }}
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            {formatDateHeader()}
          </h1>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 rounded-lg hover:bg-gray-100"
            style={{ color: KAYAD_COLORS.softBlue }}
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-1 rounded-lg text-sm font-medium"
            style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}
          >
            Today
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filters */}
          <div className="relative">
            <select
              value={filterEngineer || ''}
              onChange={(e) => setFilterEngineer(e.target.value || null)}
              className="pl-8 pr-4 py-2 rounded-lg border outline-none appearance-none cursor-pointer"
              style={{ borderColor: KAYAD_COLORS.softBlue, backgroundColor: KAYAD_COLORS.white }}
            >
              <option value="">All Engineers</option>
              {engineers.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <User size={16} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: KAYAD_COLORS.softBlue }} />
          </div>
          
          {/* View Toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ borderColor: KAYAD_COLORS.softBlue }}>
            {(['day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-4 py-2 text-sm font-medium capitalize transition-colors"
                style={{
                  backgroundColor: view === v ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
                  color: view === v ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
                }}
              >
                {v}
              </button>
            ))}
          </div>
          
          <button
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}
          >
            <Plus size={18} />
            New Booking
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl overflow-hidden shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
        {view === 'day' && (
          <DayView 
            date={selectedDate} 
            events={SAMPLE_EVENTS} 
            engineers={engineers}
            getEventStyle={getEventStyle}
          />
        )}
        
        {view === 'week' && (
          <WeekView 
            days={getWeekDays()} 
            events={SAMPLE_EVENTS} 
            engineers={engineers}
            getEventStyle={getEventStyle}
            isToday={isToday}
          />
        )}
        
        {view === 'month' && (
          <MonthView 
            days={getDaysInMonth()} 
            isToday={isToday}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>
          Engineers:
        </span>
        {engineers.map(e => (
          <div key={e.id} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />
            <span className="text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{e.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Day View Component
function DayView({ date, events, engineers, getEventStyle }: any) {
  return (
    <div className="flex">
      {/* Time Column */}
      <div className="w-20 border-r flex-shrink-0" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
        <div className="h-12 border-b" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
        {HOURS.map(hour => (
          <div key={hour} className="h-16 border-b text-xs p-2" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
            <span style={{ color: KAYAD_COLORS.softBlue }}>
              {hour.toString().padStart(2, '0')}:00
            </span>
          </div>
        ))}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-x-auto">
        <div className="h-12 border-b flex items-center justify-center font-medium" style={{ 
          borderColor: KAYAD_COLORS.warmBeige,
          color: KAYAD_COLORS.lightNavy 
        }}>
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div className="relative">
          {HOURS.map(hour => (
            <div key={hour} className="h-16 border-b" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
          ))}
          {events.map(event => {
            const engineer = engineers.find((e: any) => e.name === event.engineer);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute left-1 right-1 rounded-lg p-2 overflow-hidden cursor-pointer"
                style={{ 
                  ...getEventStyle(event),
                  backgroundColor: engineer?.color || KAYAD_COLORS.emerald,
                  color: KAYAD_COLORS.white,
                }}
              >
                <p className="font-medium text-sm truncate">{event.title}</p>
                <p className="text-xs opacity-80 truncate">{event.customer}</p>
                <p className="text-xs opacity-80 truncate">{event.time} - {event.endTime}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ days, events, engineers, getEventStyle, isToday }: any) {
  return (
    <div className="flex">
      {/* Time Column */}
      <div className="w-16 border-r flex-shrink-0" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
        <div className="h-12 border-b" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
        {HOURS.map(hour => (
          <div key={hour} className="h-16 border-b text-xs p-1" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
            <span style={{ color: KAYAD_COLORS.softBlue }}>
              {hour.toString().padStart(2, '0')}:00
            </span>
          </div>
        ))}
      </div>
      
      {/* Days */}
      {days.map((day: Date, index: number) => {
        const dayEvents = events.filter(e => {
          const eventDate = new Date(e.time);
          return eventDate.toDateString() === day.toDateString();
        });
        
        return (
          <div key={index} className="flex-1 border-r last:border-r-0" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
            <div 
              className="h-12 border-b flex flex-col items-center justify-center"
              style={{ 
                borderColor: KAYAD_COLORS.warmBeige,
                backgroundColor: isToday(day) ? `${KAYAD_COLORS.emerald}10` : 'transparent'
              }}
            >
              <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span 
                className={`text-lg font-bold ${isToday(day) ? 'rounded-full w-8 h-8 flex items-center justify-center' : ''}`}
                style={{ 
                  color: isToday(day) ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
                  backgroundColor: isToday(day) ? KAYAD_COLORS.emerald : 'transparent'
                }}
              >
                {day.getDate()}
              </span>
            </div>
            <div className="relative overflow-hidden">
              {HOURS.map(hour => (
                <div key={hour} className="h-16 border-b" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
              ))}
              {dayEvents.map((event: any) => {
                const engineer = engineers.find((e: any) => e.name === event.engineer);
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute left-0.5 right-0.5 rounded p-1 overflow-hidden cursor-pointer"
                    style={{ 
                      ...getEventStyle(event),
                      backgroundColor: engineer?.color || KAYAD_COLORS.emerald,
                      color: KAYAD_COLORS.white,
                    }}
                  >
                    <p className="text-xs font-medium truncate">{event.time} {event.title.split(' ')[0]}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Month View Component
function MonthView({ days, isToday }: any) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div>
      {/* Week Headers */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
        {weekDays.map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {days.map(({ date, isCurrentMonth }: any, index: number) => (
          <div
            key={index}
            className="min-h-24 border-b border-r p-2"
            style={{ 
              borderColor: KAYAD_COLORS.warmBeige,
              backgroundColor: isToday(date) ? `${KAYAD_COLORS.emerald}05` : 'transparent',
              opacity: isCurrentMonth ? 1 : 0.5
            }}
          >
            <span 
              className={`text-sm font-medium ${isToday(date) ? 'rounded-full w-7 h-7 flex items-center justify-center' : ''}`}
              style={{ 
                color: isToday(date) ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
                backgroundColor: isToday(date) ? KAYAD_COLORS.emerald : 'transparent'
              }}
            >
              {date.getDate()}
            </span>
            {/* Event indicators */}
            <div className="mt-1 space-y-1">
              {index % 3 === 0 && (
                <div className="h-1 rounded-full" style={{ backgroundColor: KAYAD_COLORS.emerald }} />
              )}
              {index % 5 === 0 && (
                <div className="h-1 rounded-full" style={{ backgroundColor: KAYAD_COLORS.mutedTerracotta }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
