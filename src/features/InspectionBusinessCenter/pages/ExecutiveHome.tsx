// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - EXECUTIVE HOME
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  DollarSign, 
  Star, 
  Clock, 
  Users, 
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Car,
  MapPin,
  User,
  ClipboardList,
  Settings,
  Bell,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import type { ExecutiveDashboard, UpcomingJob } from '../types/businessCenter';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
  amber: '#f59e0b',
  red: '#ef4444',
};

interface ExecutiveHomeProps {
  providerId: string;
  onNavigate?: (section: string, id?: string) => void;
}

export default function ExecutiveHome({ providerId, onNavigate }: ExecutiveHomeProps) {
  const [dashboard, setDashboard] = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [providerId]);

  const fetchDashboard = async () => {
    setLoading(true);
    // Simulated data - would call API
    setDashboard({
      summary: {
        todaysJobs: 12,
        jobsAwaitingAssignment: 3,
        engineersOnDuty: 5,
        engineersTravelling: 2,
        reportsPending: 4,
        reportsInQA: 2,
        completedToday: 7,
        revenueToday: 185000,
        monthlyRevenue: 2450000,
        averageRating: 4.7,
        customerSatisfaction: 4.8,
        cancelledToday: 1,
        qualityAlerts: 2,
      },
      upcomingJobs: [
        { id: '1', reference: 'KAYAD-ABC123', customerName: 'John Kamau', vehicle: 'Toyota Corolla 2022', scheduledDate: '2024-01-15', scheduledTime: '09:00', status: 'confirmed', engineerId: null, county: 'Nairobi' },
        { id: '2', reference: 'KAYAD-DEF456', customerName: 'Sarah Wanjiku', vehicle: 'Mercedes C-Class 2021', scheduledDate: '2024-01-15', scheduledTime: '11:30', status: 'inspector_assigned', engineerId: 'e1', county: 'Kiambu' },
        { id: '3', reference: 'KAYAD-GHI789', customerName: 'Auto Dealers Ltd', vehicle: 'Toyota Land Cruiser 2020', scheduledDate: '2024-01-15', scheduledTime: '14:00', status: 'confirmed', engineerId: null, county: 'Mombasa' },
      ],
      quickStats: {
        totalEngineers: 8,
        totalBookings: 245,
        totalRevenue: 8950000,
        avgInspectionTime: 75,
      },
    });
    setLoading(false);
  };

  if (loading || !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin" style={{ color: KAYAD_COLORS.emerald }} size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            Executive Dashboard
          </h1>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: KAYAD_COLORS.softBlue }}
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <SummaryCard
          icon={<Calendar className="text-blue-500" />}
          label="Today's Jobs"
          value={dashboard.summary.todaysJobs}
          trend={dashboard.summary.completedToday}
          trendLabel="completed"
          color="blue"
          onClick={() => onNavigate?.('bookings')}
        />
        <SummaryCard
          icon={<Users className="text-purple-500" />}
          label="Awaiting Assignment"
          value={dashboard.summary.jobsAwaitingAssignment}
          alert={dashboard.summary.jobsAwaitingAssignment > 0}
          color="purple"
          onClick={() => onNavigate?.('bookings', 'awaiting')}
        />
        <SummaryCard
          icon={<Car className="text-emerald-500" />}
          label="Engineers On Duty"
          value={dashboard.summary.engineersOnDuty}
          subValue={`${dashboard.summary.engineersTravelling} travelling`}
          color="emerald"
          onClick={() => onNavigate?.('engineers')}
        />
        <SummaryCard
          icon={<FileText className="text-amber-500" />}
          label="Reports Pending"
          value={dashboard.summary.reportsPending}
          alert={dashboard.summary.reportsInQA > 0}
          subValue={`${dashboard.summary.reportsInQA} in QA`}
          color="amber"
          onClick={() => onNavigate?.('reports')}
        />
        <SummaryCard
          icon={<DollarSign className="text-green-500" />}
          label="Today's Revenue"
          value={`KES ${(dashboard.summary.revenueToday / 1000).toFixed(0)}K`}
          color="green"
          onClick={() => onNavigate?.('finance')}
        />
        <SummaryCard
          icon={<Star className="text-yellow-500" />}
          label="Customer Rating"
          value={dashboard.summary.customerSatisfaction.toFixed(1)}
          subValue={`${dashboard.summary.averageRating.toFixed(1)} avg`}
          color="yellow"
        />
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<TrendingUp className="text-emerald-500" />}
          label="Monthly Revenue"
          value={`KES ${(dashboard.summary.monthlyRevenue / 100000).toFixed(1)}M`}
          color="emerald"
          onClick={() => onNavigate?.('finance')}
        />
        <SummaryCard
          icon={<CheckCircle className="text-teal-500" />}
          label="Completed Today"
          value={dashboard.summary.completedToday}
          color="teal"
        />
        <SummaryCard
          icon={<XCircle className="text-red-500" />}
          label="Cancelled"
          value={dashboard.summary.cancelledToday}
          color="red"
        />
        <SummaryCard
          icon={<AlertTriangle className="text-orange-500" />}
          label="Quality Alerts"
          value={dashboard.summary.qualityAlerts}
          alert={dashboard.summary.qualityAlerts > 0}
          color="orange"
          onClick={() => onNavigate?.('reports', 'qa')}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Jobs */}
        <div className="lg:col-span-2 rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
              Upcoming Jobs
            </h2>
            <button 
              onClick={() => onNavigate?.('bookings')}
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: KAYAD_COLORS.emerald }}
            >
              View All <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="space-y-3">
            {dashboard.upcomingJobs.map((job) => (
              <JobCard key={job.id} job={job} onClick={() => onNavigate?.('booking', job.id)} />
            ))}
            
            {dashboard.upcomingJobs.length === 0 && (
              <div className="text-center py-8" style={{ color: KAYAD_COLORS.softBlue }}>
                <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                <p>No upcoming jobs</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction 
                icon={<User size={20} />} 
                label="Assign Engineer"
                onClick={() => onNavigate?.('bookings', 'assign')}
              />
              <QuickAction 
                icon={<CheckCircle size={20} />} 
                label="Accept Booking"
                onClick={() => onNavigate?.('bookings', 'pending')}
              />
              <QuickAction 
                icon={<Clock size={20} />} 
                label="Reschedule"
                onClick={() => onNavigate?.('calendar')}
              />
              <QuickAction 
                icon={<FileText size={20} />} 
                label="Generate Report"
                onClick={() => onNavigate?.('reports', 'create')}
              />
              <QuickAction 
                icon={<Users size={20} />} 
                label="Manage Team"
                onClick={() => onNavigate?.('engineers')}
              />
              <QuickAction 
                icon={<Settings size={20} />} 
                label="Settings"
                onClick={() => onNavigate?.('settings')}
              />
            </div>
          </div>

          {/* Alerts */}
          {dashboard.summary.qualityAlerts > 0 && (
            <div className="rounded-xl p-4 border-2" style={{ borderColor: KAYAD_COLORS.amber, backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-amber-500" size={20} />
                <span className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                  Quality Alerts
                </span>
              </div>
              <p className="text-sm mb-3" style={{ color: KAYAD_COLORS.softBlue }}>
                {dashboard.summary.qualityAlerts} report(s) pending quality review for over 24 hours.
              </p>
              <button
                onClick={() => onNavigate?.('reports', 'qa')}
                className="text-sm font-medium"
                style={{ color: KAYAD_COLORS.emerald }}
              >
                Review Now →
              </button>
            </div>
          )}

          {/* Team Status */}
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
              Team Status
            </h2>
            <div className="space-y-3">
              <TeamMemberStatus name="David Maina" role="Lead Engineer" status="on_site" jobs={3} />
              <TeamMemberStatus name="Faith Njeri" role="Senior Inspector" status="travelling" jobs={2} />
              <TeamMemberStatus name="James Ochieng" role="Inspector" status="available" jobs={0} />
              <TeamMemberStatus name="Grace Wambui" role="QA Reviewer" status="available" jobs={4} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components
function SummaryCard({ 
  icon, 
  label, 
  value, 
  subValue,
  trend, 
  trendLabel,
  alert,
  color,
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  subValue?: string;
  trend?: number;
  trendLabel?: string;
  alert?: boolean;
  color: string;
  onClick?: () => void;
}) {
  const colorMap: Record<string, string> = {
    blue: '#3b82f6',
    purple: '#8b5cf6',
    emerald: '#10b981',
    amber: '#f59e0b',
    green: '#22c55e',
    yellow: '#eab308',
    teal: '#14b8a6',
    red: '#ef4444',
    orange: '#f97316',
  };

  return (
    <motion.div
      whileHover={{ scale: onClick ? 1.02 : 1 }}
      onClick={onClick}
      className={`rounded-xl p-4 shadow-md cursor-pointer ${onClick ? 'hover:shadow-lg' : ''}`}
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${colorMap[color]}15` }}>
          {icon}
        </div>
        {alert && (
          <span 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: KAYAD_COLORS.amber }}
          />
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
        {value}
      </p>
      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
        {label}
      </p>
      {subValue && (
        <p className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
          {subValue}
        </p>
      )}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {trend > 0 ? (
            <TrendingUp size={14} className="text-emerald-500" />
          ) : trend < 0 ? (
            <TrendingDown size={14} className="text-red-500" />
          ) : null}
          <span className="text-xs" style={{ color: trend >= 0 ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
            {trend > 0 ? '+' : ''}{trend} {trendLabel}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function JobCard({ job, onClick }: { job: UpcomingJob; onClick?: () => void }) {
  const statusColors: Record<string, string> = {
    booked: '#3b82f6',
    confirmed: '#8b5cf6',
    inspector_assigned: '#8b5cf6',
    travelling: '#f59e0b',
    inspection_started: '#10b981',
    inspection_complete: '#10b981',
    report_generated: '#10b981',
    customer_reviewed: '#6b7280',
    closed: '#6b7280',
    cancelled: '#ef4444',
  };

  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
      style={{ backgroundColor: KAYAD_COLORS.warmBeige }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-2 h-12 rounded-full"
          style={{ backgroundColor: statusColors[job.status] || KAYAD_COLORS.softBlue }}
        />
        <div>
          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>
            {job.vehicle}
          </p>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            {job.customerName} • {job.reference}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>
              <MapPin size={12} className="inline mr-1" />
              {job.county}
            </span>
            <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>
              <Clock size={12} className="inline mr-1" />
              {job.scheduledTime}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <span 
          className="px-2 py-1 rounded-full text-xs font-medium capitalize"
          style={{ 
            backgroundColor: `${statusColors[job.status]}20`,
            color: statusColors[job.status]
          }}
        >
          {job.status.replace('_', ' ')}
        </span>
        <ChevronRight size={16} className="mt-2" style={{ color: KAYAD_COLORS.softBlue }} />
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-3 rounded-lg transition-colors hover:bg-gray-50"
      style={{ borderColor: KAYAD_COLORS.warmBeige }}
    >
      <div style={{ color: KAYAD_COLORS.emerald }}>{icon}</div>
      <span className="text-xs mt-1" style={{ color: KAYAD_COLORS.lightNavy }}>
        {label}
      </span>
    </button>
  );
}

function TeamMemberStatus({ name, role, status, jobs }: { name: string; role: string; status: string; jobs: number }) {
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    available: { bg: '#10b98120', text: '#10b981', label: 'Available' },
    on_site: { bg: '#3b82f620', text: '#3b82f6', label: 'On Site' },
    travelling: { bg: '#f59e0b20', text: '#f59e0b', label: 'Travelling' },
    offline: { bg: '#6b728020', text: '#6b7280', label: 'Offline' },
  };

  const s = statusColors[status] || statusColors.offline;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}
        >
          {name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>
            {name}
          </p>
          <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>
            {role}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span 
          className="px-2 py-0.5 rounded-full text-xs"
          style={{ backgroundColor: s.bg, color: s.text }}
        >
          {s.label}
        </span>
        {jobs > 0 && (
          <p className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
            {jobs} jobs
          </p>
        )}
      </div>
    </div>
  );
}
