import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle,
  FileText, Newspaper, Megaphone, Image, AlertCircle
} from 'lucide-react';
import { getPublishingCalendar } from '../../../../services/cmsApi';

const colors = {
  beige: '#EEF7F5',
  terracotta: '#5aafa4',
  softBlue: '#5AAFA4',
};

const contentTypes = {
  campaign: { label: 'Campaign', color: '#13B8A6', icon: Megaphone },
  blog: { label: 'Blog Post', color: colors.terracotta, icon: Newspaper },
  news: { label: 'News', color: '#5aafa4', icon: Newspaper },
  banner: { label: 'Banner', color: '#5aafa4', icon: Image },
  page: { label: 'Page', color: colors.softBlue, icon: FileText },
};

const localDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const asArray = (value) => Array.isArray(value) ? value : [];
const eventDate = (item, type, rangeStart, rangeEnd) => {
  const inRange = (value) => {
    if (!value || !Number.isFinite(new Date(value).getTime())) return false;
    const timestamp = new Date(value).getTime();
    return timestamp >= rangeStart && timestamp <= rangeEnd;
  };
  if (type === 'campaign') return inRange(item.startDate) ? item.startDate : (inRange(item.endDate) ? item.endDate : (item.startDate || item.endDate));
  if (type === 'banner') return inRange(item.scheduleAt) ? item.scheduleAt : (inRange(item.scheduleEnd) ? item.scheduleEnd : (item.scheduleAt || item.scheduleEnd));
  return item.scheduleAt;
};

function normalizeCalendarEvents(payload, rangeStart, rangeEnd) {
  const groups = [
    ...asArray(payload?.pages).map((item) => ({ item, type: 'page' })),
    ...asArray(payload?.content).map((item) => ({ item, type: item.type === 'news' ? 'news' : 'blog' })),
    ...asArray(payload?.campaigns).map((item) => ({ item, type: 'campaign' })),
    ...asArray(payload?.banners).map((item) => ({ item, type: 'banner' })),
  ];

  return groups.flatMap(({ item, type }) => {
    const rawDate = eventDate(item, type, rangeStart, rangeEnd);
    if (!rawDate || !Number.isFinite(new Date(rawDate).getTime())) return [];
    const date = new Date(rawDate);
    const id = item.id ?? item._id ?? item.slug;
    if (id === undefined || id === null || String(id).trim() === '') return [];
    return [{
      id: `${type}:${String(id)}`,
      title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Untitled CMS item',
      type,
      date: localDateKey(date),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: typeof item.status === 'string' && item.status.trim() ? item.status.trim() : null,
      timestamp: date.getTime(),
    }];
  });
}

export default function PublishingCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calendarPayload, setCalendarPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const rangeStart = new Date(year, month, 1).getTime();
  const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    let active = true;
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 1).toISOString();
    setLoading(true);
    setError('');
    setCalendarPayload(null);
    getPublishingCalendar(startDate, endDate)
      .then((response) => {
        if (!active) return;
        const payload = response?.data ?? response;
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !['pages', 'content', 'campaigns', 'banners'].some((key) => Array.isArray(payload[key]))) {
          throw new Error('The publishing calendar returned an invalid response.');
        }
        setCalendarPayload(payload);
      })
      .catch((requestError) => {
        if (!active) return;
        setCalendarPayload(null);
        setError(requestError?.response?.data?.message || requestError?.message || 'Scheduled content could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year, month, requestVersion]);

  const events = useMemo(() => normalizeCalendarEvents(calendarPayload, rangeStart, rangeEnd), [calendarPayload, rangeStart, rangeEnd]);
  const eventsByDate = useMemo(() => {
    const result = new Map();
    for (const event of events) {
      if (!result.has(event.date)) result.set(event.date, []);
      result.get(event.date).push(event);
    }
    for (const dayEvents of result.values()) dayEvents.sort((a, b) => a.timestamp - b.timestamp);
    return result;
  }, [events]);

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let i = 0; i < startingDay; i++) {
      const date = new Date(year, month, i - startingDay + 1);
      result.push({ date, dateString: localDateKey(date), isCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      result.push({ date, dateString: localDateKey(date), isCurrentMonth: true });
    }
    while (result.length < 42) {
      const date = new Date(year, month, result.length - startingDay + 1);
      result.push({ date, dateString: localDateKey(date), isCurrentMonth: false });
    }
    const today = localDateKey(new Date());
    return result.map((day) => ({ ...day, isToday: day.dateString === today }));
  }, [year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());
  const upcomingEvents = useMemo(() => events
    .filter((event) => event.timestamp >= rangeStart && event.timestamp <= rangeEnd)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 5), [events, rangeStart, rangeEnd]);

  return (
    <div className="min-h-screen bg-[#EEF7F5]">
      <header className="bg-white border-b border-[#D7E7E4] sticky top-0 z-20">
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0A3340] flex items-center justify-center">
              <Calendar size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0A3340]">Publishing Calendar</h1>
              <p className="text-xs text-[#64748B]">Scheduled CMS pages, content, campaigns and banners</p>
            </div>
          </div>
          <button type="button" onClick={() => setRequestVersion((value) => value + 1)} disabled={loading}
            className="px-3 py-2 border border-[#D7E7E4] rounded-lg text-sm text-[#0A3340] hover:bg-[#F6FAF9] disabled:opacity-50">
            {loading ? 'Refreshing…' : 'Refresh calendar'}
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <section className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden" aria-label="Publishing calendar">
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 border-b border-[#D7E7E4]">
            <div className="flex items-center gap-2 sm:gap-4">
              <button type="button" onClick={prevMonth} aria-label="Previous month" className="p-2 hover:bg-[#EEF7F5] rounded-lg"><ChevronLeft size={20} /></button>
              <h2 className="text-lg sm:text-xl font-bold text-[#0A3340] min-w-[150px] text-center">{monthNames[month]} {year}</h2>
              <button type="button" onClick={nextMonth} aria-label="Next month" className="p-2 hover:bg-[#EEF7F5] rounded-lg"><ChevronRight size={20} /></button>
              <button type="button" onClick={goToToday} className="px-3 py-1.5 text-sm border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">Today</button>
            </div>
            <div className="text-sm text-[#64748B]" aria-live="polite">{loading ? 'Loading scheduled content…' : `${events.length} scheduled item${events.length === 1 ? '' : 's'} loaded`}</div>
          </div>

          {error && <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 flex items-start gap-2"><AlertCircle size={18} className="shrink-0 mt-0.5" /><div><p className="font-semibold">Calendar data unavailable</p><p className="text-sm">{error}</p><button type="button" onClick={() => setRequestVersion((value) => value + 1)} className="mt-2 underline font-semibold">Try again</button></div></div>}

          {!error && <div className="grid grid-cols-7" aria-busy={loading}>
            {dayNames.map((day) => <div key={day} className="px-1 sm:px-2 py-3 text-center text-[10px] sm:text-xs font-semibold text-[#64748B] uppercase border-b border-[#D7E7E4]">{day}</div>)}
            {days.map((day) => {
              const dayEvents = eventsByDate.get(day.dateString) || [];
              return <div key={day.dateString} className={`min-h-[86px] sm:min-h-[120px] border-b border-r border-[#D7E7E4] p-1 sm:p-2 ${!day.isCurrentMonth ? 'bg-[#F6FAF9]' : 'bg-white hover:bg-[#F6FAF9]/50'} ${day.isToday ? 'ring-2 ring-inset ring-[#0A3340]' : ''}`}>
                <div className={`text-xs sm:text-sm font-medium mb-1 ${!day.isCurrentMonth ? 'text-[#94B8B2]' : day.isToday ? 'text-[#0A3340]' : 'text-[#12576D]'}`}>{day.date.getDate()}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => {
                    const type = contentTypes[event.type] || contentTypes.page;
                    return <div key={event.id} className="text-[10px] sm:text-xs px-1.5 py-1 rounded truncate" style={{ backgroundColor: `${type.color}20`, color: type.color }} title={`${event.title} · ${event.time}`}>
                      <span className="hidden sm:inline">{event.time} </span>{event.title}
                    </div>;
                  })}
                  {dayEvents.length > 2 && <div className="text-[10px] sm:text-xs text-[#64748B] px-1">+{dayEvents.length - 2} more</div>}
                </div>
              </div>;
            })}
          </div>}
          {!loading && !error && events.length === 0 && <p className="px-4 py-5 text-sm text-[#64748B] border-t border-[#D7E7E4]">No scheduled CMS content was returned for this period.</p>}
        </section>

        <section className="mt-6 bg-white rounded-xl shadow-sm border border-[#D7E7E4] p-4 sm:p-6" aria-label="Upcoming scheduled content">
          <h3 className="text-lg font-semibold text-[#0A3340] mb-4">Upcoming Scheduled Content</h3>
          {loading ? <p className="text-sm text-[#64748B]">Loading scheduled content…</p> : error ? <p className="text-sm text-red-700">Upcoming items cannot be shown until calendar data is available.</p> : upcomingEvents.length === 0 ? <p className="text-sm text-[#64748B]">No scheduled content in this month.</p> : <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const type = contentTypes[event.type] || contentTypes.page;
              const TypeIcon = type.icon || FileText;
              return <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#D7E7E4]">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${type.color}20` }}><TypeIcon size={18} style={{ color: type.color }} /></div>
                <div className="flex-1 min-w-0"><div className="font-medium text-[#0A3340] truncate">{event.title}</div><div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#64748B]"><span>{type.label}</span><span>{new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span><span className="inline-flex items-center gap-1"><Clock size={12} />{event.time}</span></div></div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B]"><CheckCircle size={14} />{event.status ? event.status.replaceAll('_', ' ') : 'Status unavailable'}</span>
              </div>;
            })}
          </div>}
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Content type legend">
          <span className="text-sm text-[#64748B]">Content Types:</span>
          {Object.entries(contentTypes).map(([key, type]) => <div key={key} className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ backgroundColor: type.color }} /><span className="text-sm text-[#64748B]">{type.label}</span></div>)}
        </div>
        <p className="mt-3 text-xs text-[#64748B]">This view reflects existing CMS scheduling records. Scheduling and editing remain in the corresponding content-management workflows.</p>
      </div>
    </div>
  );
}
