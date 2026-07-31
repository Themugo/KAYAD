import React, { useState, useMemo } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, CheckCircle,
  FileText, Newspaper, Megaphone, Image, AlertCircle, Edit, Trash2,
  X, Eye
} from 'lucide-react';

// Design System Colors
const colors = {
  navy: '#17244B',
  beige: '#F6F1E8',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#C77B58',
  softBlue: '#60A5FA',
};

// Mock scheduled content
const mockScheduledContent = [
  { id: '1', title: 'New Year Sale Announcement', type: 'campaign', date: '2024-01-15', time: '09:00', status: 'scheduled' },
  { id: '2', title: 'Top 10 SUVs for 2024', type: 'blog', date: '2024-01-16', time: '10:00', status: 'scheduled' },
  { id: '3', title: 'Holiday Banner Update', type: 'banner', date: '2024-01-17', time: '08:00', status: 'scheduled' },
  { id: '4', title: 'Auction Week Kickoff', type: 'campaign', date: '2024-01-18', time: '07:00', status: 'draft' },
  { id: '5', title: 'Dealer Spotlight: Toyota Kenya', type: 'news', date: '2024-01-19', time: '11:00', status: 'scheduled' },
  { id: '6', title: 'Finance Tips Article', type: 'blog', date: '2024-01-20', time: '09:30', status: 'scheduled' },
  { id: '7', title: 'Valentines Promo Banner', type: 'banner', date: '2024-02-01', time: '00:00', status: 'draft' },
  { id: '8', title: 'New Dealer Onboarding Guide', type: 'page', date: '2024-01-22', time: '14:00', status: 'scheduled' },
];

const contentTypes = {
  campaign: { label: 'Campaign', color: '#EC4899', icon: Megaphone },
  blog: { label: 'Blog Post', color: colors.terracotta, icon: Newspaper },
  news: { label: 'News', color: '#8B5CF6', icon: Newspaper },
  banner: { label: 'Banner', color: '#A855F7', icon: Image },
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
    return mockScheduledContent.filter(item => item.date === dateString);
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
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#17244B] flex items-center justify-center">
                  <Calendar size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Publishing Calendar</h1>
                  <p className="text-xs text-slate-500">Schedule and manage content</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEventModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]"
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-bold text-slate-800 min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                <ChevronRight size={20} />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
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
              <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
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
                  className={`min-h-[120px] border-b border-r border-slate-100 p-2 ${!day.isCurrentMonth ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/50'} ${day.isToday ? 'ring-2 ring-inset ring-[#17244B]' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${!day.isCurrentMonth ? 'text-slate-300' : day.isToday ? 'text-[#17244B]' : 'text-slate-700'}`}>
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
                      <div className="text-xs text-slate-400 px-1.5">
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
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Upcoming Scheduled Content</h3>
          <div className="space-y-3">
            {mockScheduledContent
              .filter(item => item.status === 'scheduled')
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .slice(0, 5)
              .map(item => {
                const type = contentTypes[item.type];
                const TypeIcon = type?.icon || FileText;
                return (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${type?.color}20` }}
                    >
                      <TypeIcon size={18} style={{ color: type?.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{item.title}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
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
                      <button className="p-1.5 hover:bg-slate-100 rounded">
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
          <span className="text-sm text-slate-500">Content Types:</span>
          {Object.entries(contentTypes).map(([key, type]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: type?.color }}
              />
              <span className="text-sm text-slate-600">{type?.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Content Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Schedule New Content</h2>
              <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none"
                  placeholder="Enter content title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content Type</label>
                <select className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none">
                  {Object.entries(contentTypes).map(([key, type]) => (
                    <option key={key} value={key}>{type?.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
