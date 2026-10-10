import React, { useState, useMemo } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, CheckCircle,
  FileText, Newspaper, Megaphone, Image, AlertCircle, Edit, Trash2,
  X, Eye
} from 'lucide-react';

// Design System Colors
const colors = {
  navy: '#0A3340',
  beige: '#EEF7F5',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#5aafa4',
  softBlue: '#5AAFA4',
};

// Mock scheduled content
const scheduledContent = [];

const contentTypes = {
  campaign: { label: 'Campaign', color: '#13B8A6', icon: Megaphone },
  blog: { label: 'Blog Post', color: colors.terracotta, icon: Newspaper },
  news: { label: 'News', color: '#5aafa4', icon: Newspaper },
  banner: { label: 'Banner', color: '#5aafa4', icon: Image },
  page: { label: 'Page', color: colors.softBlue, icon: FileText },
};

export default function PublishingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Previous month days
    for (let i = 0; i < startingDay; i++) {
      const prevDate = new Date(year, month, -startingDay + i + 1);
      days.push({ ...prevDate, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Next month days to fill grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days.map(d => ({
      date: d,
      dateString: d.toISOString().split('T')[0],
      isCurrentMonth: d.getMonth() === month,
      isToday: d.toDateString() === new Date().toDateString()
    }));
  };

  const getEventsForDate = (dateString) => {
    return scheduledContent.filter(item => item.date === dateString);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="min-h-screen bg-[#EEF7F5]">
      {/* Header */}
      <header className="bg-white border-b border-[#D7E7E4] sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A3340] flex items-center justify-center">
                  <Calendar size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#0A3340]">Publishing Calendar</h1>
                  <p className="text-xs text-[#64748B]">Schedule and manage content</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEventModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]"
              >
                <Plus size={18} />
                Schedule Content
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Calendar Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#D7E7E4]">
            <div className="flex items-center gap-4">
              <button onClick={prevMonth} className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-bold text-[#0A3340] min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button onClick={nextMonth} className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <ChevronRight size={20} />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1 bg-[#EEF7F5] rounded-lg p-1">
              {['month', 'week', 'day'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded text-sm font-medium capitalize ${viewMode === mode ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {/* Day Headers */}
            {dayNames.map(day => (
              <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-[#64748B] uppercase border-b border-[#D7E7E4]">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {days.map((day, index) => {
              const events = getEventsForDate(day.dateString);
              const TypeInfo = contentTypes;

              return (
                <div
                  key={index}
                  className={`min-h-[120px] border-b border-r border-[#D7E7E4] p-2 ${!day.isCurrentMonth ? 'bg-[#F6FAF9]' : 'bg-white hover:bg-[#F6FAF9]/50'} ${day.isToday ? 'ring-2 ring-inset ring-[#0A3340]' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${!day.isCurrentMonth ? 'text-[#BDE5DE]' : day.isToday ? 'text-[#0A3340]' : 'text-[#12576D]'}`}>
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {events.slice(0, 3).map(event => {
                      const type = TypeInfo[event.type];
                      return (
                        <div
                          key={event.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: `${type?.color}20`, color: type?.color }}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      );
                    })}
                    {events.length > 3 && (
                      <div className="text-xs text-[#94A3B8] px-1.5">
                        +{events.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Content */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-[#D7E7E4] p-6">
          <h3 className="text-lg font-semibold text-[#0A3340] mb-4">Upcoming Scheduled Content</h3>
          <div className="space-y-3">
            {scheduledContent
              .filter(item => item.status === 'scheduled')
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .slice(0, 5)
              .map(item => {
                const type = contentTypes[item.type];
                const TypeIcon = type?.icon || FileText;
                return (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border border-[#D7E7E4] hover:bg-[#F6FAF9] transition-colors">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${type?.color}20` }}
                    >
                      <TypeIcon size={18} style={{ color: type?.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[#0A3340]">{item.title}</div>
                      <div className="flex items-center gap-3 text-xs text-[#64748B]">
                        <span className="px-2 py-0.5 rounded" style={{ backgroundColor: `${type?.color}20`, color: type?.color }}>
                          {type?.label}
                        </span>
                        <span>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                        Scheduled
                      </span>
                      <button className="p-1.5 hover:bg-[#EEF7F5] rounded">
                        <Edit size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6">
          <span className="text-sm text-[#64748B]">Content Types:</span>
          {Object.entries(contentTypes).map(([key, type]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: type?.color }}
              />
              <span className="text-sm text-[#64748B]">{type?.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Content Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-[#0A3340]/50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-[#D7E7E4]">
              <h2 className="text-lg font-bold text-[#0A3340]">Schedule New Content</h2>
              <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#12576D] mb-1">Content Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] focus:ring-2 focus:ring-[#0A3340]/20 outline-none"
                  placeholder="Enter content title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#12576D] mb-1">Content Type</label>
                <select className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] outline-none">
                  {Object.entries(contentTypes).map(([key, type]) => (
                    <option key={key} value={key}>{type?.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#12576D] mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#12576D] mb-1">Time</label>
                  <input
                    type="time"
                    className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#D7E7E4]">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
