// ============================================================
// KAYAD INSPECTION MARKETPLACE - PROVIDER BUSINESS CENTER
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  DollarSign,
  Star,
  Clock,
  FileText,
  Building2,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings,
} from 'lucide-react';
import { inspectionApi } from '../services/api';
import { OrganizationWorkspace } from '../organization/OrganizationWorkspace';
import type { ProviderDashboard, Booking, EarningsSummary, BookingStatus } from '../types/inspection';

const KAYAD_COLORS = {
  lightNavy: '#12576D',
  warmBeige: '#EEF7F5',
  white: '#ffffff',
  emerald: '#13B8A6',
  mutedTerracotta: '#91CEC5',
  softBlue: '#64748b',
};

interface ProviderBusinessCenterProps {
  providerId: string;
}

type TabType = 'dashboard' | 'bookings' | 'organization' | 'reports' | 'earnings' | 'settings';

export default function ProviderBusinessCenter({ providerId }: ProviderBusinessCenterProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [dashboard, setDashboard] = useState<ProviderDashboard | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [earningsError, setEarningsError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
    fetchEarnings();
  }, [providerId]);

  const fetchDashboard = async () => {
    setLoading(true);
    setDashboardError(null);
    try {
      const data = await inspectionApi.getProviderDashboard(providerId);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      setDashboardError('We could not load your inspection business overview. Your data has not been replaced with placeholder values.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEarnings = async () => {
    setEarningsError(null);
    try {
      const data = await inspectionApi.getProviderEarnings(providerId);
      setEarnings(data);
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
      setEarningsError('Earnings are temporarily unavailable.');
    }
  };

  const refreshWorkspace = async () => {
    await Promise.all([fetchDashboard(), fetchEarnings()]);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'organization', label: 'Branches & team', icon: Building2 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4" style={{ borderColor: KAYAD_COLORS.emerald, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 py-4 px-6 shadow-md"
        style={{ backgroundColor: KAYAD_COLORS.lightNavy }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: KAYAD_COLORS.white }}
            >
              Business Center
            </h1>
            <p style={{ color: KAYAD_COLORS.mutedTerracotta }}>
              Manage your inspection business
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={refreshWorkspace} disabled={loading} className="px-3 py-2 rounded-lg border border-white/30 text-white text-sm font-medium disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              {loading ? 'Refreshing…' : 'Refresh data'}
            </button>
            <button type="button" onClick={() => setActiveTab('bookings')} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
              <Calendar size={16} />
              View bookings
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav aria-label="Inspection business workspace" className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13B8A6] ${
                activeTab === tab.id ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
                color: activeTab === tab.id ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              <tab.icon size={16} className="inline mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {activeTab === 'dashboard' && !dashboardError && (
          <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B2D43] via-[#12576D] to-[#147C82] p-5 sm:p-7 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#C8F4EC]"><Building2 size={14} /> PROVIDER WORKSPACE</p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Your inspection business, at a glance</h2>
                <p className="mt-2 text-sm leading-6 text-white/75">Track bookings, complete reports on time, and keep your provider operations moving from one workspace.</p>
              </div>
              <button type="button" onClick={() => setActiveTab('bookings')} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#13B8A6] px-4 py-2.5 text-sm font-bold text-[#062E3A] shadow-sm transition hover:bg-[#5BE0CF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Open booking queue <ArrowUpRight size={16} /></button>
            </div>
          </section>
        )}
        {dashboardError && activeTab === 'dashboard' && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>{dashboardError}</span>
            <button type="button" onClick={refreshWorkspace} className="self-start rounded-lg border border-rose-300 px-3 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Retry</button>
          </div>
        )}
        {earningsError && activeTab === 'dashboard' && (
          <div role="status" className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">{earningsError}</div>
        )}
        {activeTab === 'dashboard' && !dashboardError && (
          <DashboardTab dashboard={dashboard} earnings={earnings} earningsError={earningsError} onOpen={setActiveTab} />
        )}
        {activeTab === 'bookings' && (
          <BookingsTab providerId={providerId} />
        )}
        {activeTab === 'organization' && (
          <OrganizationWorkspace organizationId={providerId} />
        )}
        {activeTab === 'reports' && (
          <ReportsTab providerId={providerId} />
        )}
        {activeTab === 'earnings' && (
          <EarningsTab earnings={earnings} earningsError={earningsError} providerId={providerId} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab providerId={providerId} />
        )}
      </main>
    </div>
  );
}

// Dashboard Tab
function DashboardTab({ dashboard, earnings, earningsError, onOpen }: { dashboard: ProviderDashboard | null; earnings: EarningsSummary | null; earningsError: string | null; onOpen: (tab: TabType) => void }) {
  if (!dashboard) return <div className="rounded-xl border border-[#D7E7E4] bg-white p-8 text-center text-[#64748B]">Business overview is unavailable. Use Refresh data to try again.</div>;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar className="text-[#176B87]" />}
          label="Today's Bookings"
          value={dashboard.overview.todayBookings}
          trend={null}
        />
        <StatCard
          icon={<TrendingUp className="text-[#13B8A6]" />}
          label="Monthly Revenue"
          value={`KES ${dashboard.overview.monthlyRevenue.toLocaleString()}`}
          trend={null}
        />
        <StatCard
          icon={<Star className="text-[#2F8F87]" />}
          label="Average Rating"
          value={Number.isFinite(dashboard.overview.averageRating) && dashboard.overview.totalReviews > 0 ? dashboard.overview.averageRating.toFixed(1) : 'No reviews'}
          trend={null}
        />
        <StatCard
          icon={<FileText className="text-[#5AAFA4]" />}
          label="Pending Reports"
          value={dashboard.overview.pendingReports}
          trend={null}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Bookings */}
        <div className="lg:col-span-2 rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
              Upcoming Bookings
            </h2>
            <span className="text-xs font-semibold text-[#94A3B8]">Latest 5</span>
          </div>

          {dashboard.upcomingBookings.length === 0 ? (
            <div className="text-center py-8" style={{ color: KAYAD_COLORS.softBlue }}>
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>No upcoming bookings</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboard.upcomingBookings.slice(0, 5).map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          {/* Earnings Summary */}
          <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
              Earnings Summary
            </h2>
            <div className="space-y-3">
              <EarningsRow label="Total Earnings" value={earningsError || !earnings ? '—' : `KES ${earnings.totalEarnings.toLocaleString()}`} />
              <EarningsRow label="Commission" value={earningsError || !earnings ? '—' : `KES ${earnings.totalCommission.toLocaleString()}`} isNegative />
              <EarningsRow label="Net Earnings" value={earningsError || !earnings ? '—' : `KES ${earnings.netEarnings.toLocaleString()}`} isBold />
              <div className="pt-3 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                <EarningsRow
                  label="Pending Payout"
                  value={earningsError || !earnings ? '—' : `KES ${earnings.totalPending.toLocaleString()}`}
                  highlight
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
              Quick Actions
            </h2>
            <div className="space-y-2">
              <QuickAction icon={<Calendar size={16} />} label="Open the booking queue" onClick={() => onOpen('bookings')} />
              <QuickAction icon={<Building2 size={16} />} label="Branches and team" onClick={() => onOpen('organization')} />
              <QuickAction icon={<TrendingUp size={16} />} label="Consolidated report" onClick={() => onOpen('organization')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bookings Tab
function BookingsTab({ providerId }: { providerId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchBookings();
  }, [providerId, filter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (filter !== 'all') params.status = filter;
      const response = await inspectionApi.getProviderBookings(providerId, params);
      setBookings(response.items);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'booked', label: 'New' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'inspection_started', label: 'In Progress' },
    { value: 'report_generated', label: 'Reports Ready' },
    { value: 'closed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              filter === f.value ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: filter === f.value ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
              color: filter === f.value ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <Calendar size={48} className="mx-auto mb-4" style={{ color: KAYAD_COLORS.softBlue }} />
            <p style={{ color: KAYAD_COLORS.softBlue }}>No bookings found</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))
        )}
      </div>
    </div>
  );
}

// Reports Tab
function ReportsTab({ providerId }: { providerId: string }) {
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
        Inspection Reports
      </h2>
      <div className="text-center py-12" style={{ color: KAYAD_COLORS.softBlue }}>
        <FileText size={48} className="mx-auto mb-4" />
        <p>Report records are not connected to this tab yet. Completed reports remain available through the existing report workflow.</p>
      </div>
    </div>
  );
}

// Earnings Tab
function EarningsTab({ earnings, earningsError, providerId }: { earnings: EarningsSummary | null; earningsError: string | null; providerId: string }) {
  const [period, setPeriod] = useState('monthly');

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {['weekly', 'monthly', 'yearly'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium capitalize ${
              period === p ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: period === p ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
              color: period === p ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Total Earnings</p>
          <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            {earningsError || !earnings ? '—' : `KES ${earnings.totalEarnings.toLocaleString()}`}
          </p>
        </div>
        <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Commission Paid</p>
          <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.mutedTerracotta }}>
            {earningsError || !earnings ? '—' : `KES ${earnings.totalCommission.toLocaleString()}`}
          </p>
        </div>
        <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Net Earnings</p>
          <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>
            {earningsError || !earnings ? '—' : `KES ${earnings.netEarnings.toLocaleString()}`}
          </p>
        </div>
        <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Pending Payout</p>
          <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            {earningsError || !earnings ? '—' : `KES ${earnings.totalPending.toLocaleString()}`}
          </p>
        </div>
      </div>

      {earningsError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{earningsError} Retry from Refresh data in the dashboard.</div>}
      {/* Settlements */}
      <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
          Settlements
        </h2>
        <div className="text-center py-8" style={{ color: KAYAD_COLORS.softBlue }}>
          <DollarSign size={48} className="mx-auto mb-4" />
          <p>Settlement history will appear here.</p>
        </div>
      </div>
    </div>
  );
}

// Settings Tab
function SettingsTab({ providerId }: { providerId: string }) {
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
        Business Settings
      </h2>
      <div className="text-center py-12" style={{ color: KAYAD_COLORS.softBlue }}>
        <Settings size={48} className="mx-auto mb-4" />
        <p>Business profile and package editing are managed from “My business” on the Inspections screen. Branches, team roles and invitations are in the Branches &amp; team tab.</p>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string | number; trend: any }) {
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{value}</p>
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const statusColors: Record<string, string> = {
    booked: '#176B87',
    confirmed: '#2F8F87',
    inspector_assigned: '#2F8F87',
    travelling: '#5AAFA4',
    inspection_started: '#13B8A6',
    inspection_complete: '#13B8A6',
    report_generated: '#13B8A6',
    // STAGE 2 API CONTRACT CONVERGENCE FIX: the backend's real booking-status
    // enum (backend/inspection/services/bookingService.js's validTransitions
    // keys) includes customer_reviewed and no_show, which this lookup table
    // omitted. The dot indicator already falls back safely
    // (statusColors[...] || KAYAD_COLORS.softBlue below), but the badge two
    // lines down used statusColors[booking.status] + '20' unconditionally,
    // producing the literal invalid CSS string "undefined20" (silently
    // ignored by the browser) and leaving the badge text color unset for
    // these two statuses.
    customer_reviewed: '#2F8F87',
    no_show: '#C65D5D',
    closed: '#64748b',
    cancelled: '#C65D5D',
  };

  return (
    <div
      className="rounded-lg p-4 flex items-center justify-between"
      style={{ backgroundColor: KAYAD_COLORS.warmBeige }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-2 h-12 rounded-full"
          style={{ backgroundColor: statusColors[booking.status] || KAYAD_COLORS.softBlue }}
        />
        <div>
          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>
            {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
          </p>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            {booking.vehicle?.registration} • {booking.reference}
          </p>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-bold" style={{ color: KAYAD_COLORS.emerald }}>
          KES {booking.totalPrice.toLocaleString()}
        </p>
        <span
          className="text-xs px-2 py-1 rounded-full capitalize"
          style={{ backgroundColor: `${statusColors[booking.status] || KAYAD_COLORS.softBlue}20`, color: statusColors[booking.status] || KAYAD_COLORS.softBlue }}
        >
          {booking.status.replace('_', ' ')}
        </span>

      </div>
    </div>
  );
}

function EarningsRow({ label, value, isBold = false, isNegative = false, highlight = false }: any) {
  return (
    <div className="flex justify-between">
      <span style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
      <span
        className={`font-medium ${isBold ? 'font-bold text-lg' : ''}`}
        style={{
          color: isNegative
            ? KAYAD_COLORS.mutedTerracotta
            : highlight
              ? KAYAD_COLORS.emerald
              : KAYAD_COLORS.lightNavy
        }}
      >
        {value}
      </span>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center justify-between rounded-lg border border-[#D7E7E4] bg-[#F6FAF9] p-3 text-left hover:bg-[#EAF5F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13B8A6]"
      style={{ color: KAYAD_COLORS.lightNavy }}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ArrowUpRight size={14} aria-hidden="true" />
    </button>
  );
}
