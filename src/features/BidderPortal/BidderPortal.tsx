import React, { useState, useMemo } from 'react';
import {
  User,
  Gavel,
  Clock,
  Shield,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Bell,
  BellOff,
  Calendar,
  CalendarDays,
  Car,
  ChevronRight,
  ChevronLeft,
  Download,
  Eye,
  FileText,
  Heart,
  HelpCircle,
  Home,
  List,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Settings,
  Star,
  Ticket,
  Trophy,
  Truck,
  CreditCard,
  BookOpen,
  Clock3,
  Users,
  Wrench,
  X,
  ExternalLink,
  Plus,
  Search,
  Filter,
  Share2,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Info,
  TrendingUp
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { AuctionDisclaimer } from '../../components/auction/AuctionDisclaimer';
import type { FC } from 'react';

// ============================================================
// Types
// ============================================================

type AuctionStatus = 
  | 'registration_open'
  | 'registration_pending'
  | 'registration_approved'
  | 'viewing'
  | 'auction_live'
  | 'auction_ended'
  | 'won'
  | 'lost'
  | 'completed'
  | 'cancelled';

type NotificationType = 
  | 'registration_approved'
  | 'registration_rejected'
  | 'viewing_reminder'
  | 'inspection_ready'
  | 'auction_starts'
  | 'outbid'
  | 'won'
  | 'lost'
  | 'certificate_ready'
  | 'payment_reminder'
  | 'ownership_ready';

interface AuctionRegistration {
  id: string;
  reference: string;
  vehicle: {
    title: string;
    image: string;
    year: number;
  };
  organizer: {
    name: string;
    verified: boolean;
  };
  status: AuctionStatus;
  currentBid: number;
  bidsCount: number;
  endsAt?: string;
  startsAt?: string;
  viewingDates?: { start: string; end: string };
  bidSecurityRequired?: number;
  bidSecurityPaid?: boolean;
  bidSecurityVerified?: boolean;
  myPosition?: number;
  timeline: {
    registration: boolean;
    bidSecurity: boolean;
    viewing: boolean;
    live: boolean;
    ended: boolean;
    won: boolean;
    payment: boolean;
    collection: boolean;
  };
  currentStage: number;
}

interface Notification {
  id: string;
  type: NotificationType;
  auctionId: string;
  auctionTitle: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface WinningCertificate {
  id: string;
  reference: string;
  vehicle: string;
  organizer: string;
  winningAmount: number;
  issueDate: string;
  status: 'issued' | 'payment_pending' | 'payment_confirmed' | 'collected';
}

interface Inspection {
  id: string;
  vehicleTitle: string;
  vehicleImage: string;
  date: string;
  time: string;
  location: string;
  partner: string;
  status: 'scheduled' | 'completed' | 'report_ready';
  reportUrl?: string;
}

interface ViewingAppointment {
  id: string;
  vehicleTitle: string;
  vehicleImage: string;
  organizer: string;
  date: string;
  time: string;
  location: string;
  contact: string;
  contactPhone: string;
  status: 'confirmed' | 'completed' | 'cancelled';
}

// ============================================================
// Mock Data
// ============================================================

const MOCK_REGISTRATIONS: AuctionRegistration[] = [
  {
    id: 'reg-1',
    reference: 'REG-2026-001',
    vehicle: {
      title: 'TOYOTA Land Cruiser 300 GX-R',
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80',
      year: 2022,
    },
    organizer: { name: 'NCBA Bank Kenya', verified: true },
    status: 'auction_live',
    currentBid: 16835000,
    bidsCount: 7,
    endsAt: '2026-01-15T17:00:00',
    bidSecurityRequired: 500000,
    bidSecurityPaid: true,
    bidSecurityVerified: true,
    myPosition: 2,
    timeline: {
      registration: true,
      bidSecurity: true,
      viewing: true,
      live: true,
      ended: false,
      won: false,
      payment: false,
      collection: false,
    },
    currentStage: 3,
  },
  {
    id: 'reg-2',
    reference: 'REG-2026-002',
    vehicle: {
      title: 'PORSCHE Cayenne S',
      image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=400&q=80',
      year: 2020,
    },
    organizer: { name: 'Crown Motors Kenya', verified: true },
    status: 'registration_approved',
    currentBid: 12212000,
    bidsCount: 0,
    startsAt: '2026-01-16T09:00:00',
    bidSecurityRequired: 500000,
    bidSecurityPaid: true,
    bidSecurityVerified: true,
    viewingDates: { start: '2026-01-13', end: '2026-01-15' },
    timeline: {
      registration: true,
      bidSecurity: true,
      viewing: true,
      live: false,
      ended: false,
      won: false,
      payment: false,
      collection: false,
    },
    currentStage: 2,
  },
  {
    id: 'reg-3',
    reference: 'REG-2026-003',
    vehicle: {
      title: 'MERCEDES-BENZ GLE 450',
      image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=400&q=80',
      year: 2021,
    },
    organizer: { name: 'Kenya Government Disposal', verified: true },
    status: 'won',
    currentBid: 12048000,
    bidsCount: 13,
    bidSecurityRequired: 500000,
    bidSecurityPaid: true,
    bidSecurityVerified: true,
    timeline: {
      registration: true,
      bidSecurity: true,
      viewing: true,
      live: true,
      ended: true,
      won: true,
      payment: false,
      collection: false,
    },
    currentStage: 6,
  },
  {
    id: 'reg-4',
    reference: 'REG-2026-004',
    vehicle: {
      title: 'RANGE ROVER Autobiography',
      image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=400&q=80',
      year: 2023,
    },
    organizer: { name: 'NCBA Bank Kenya', verified: true },
    status: 'registration_pending',
    currentBid: 24500000,
    bidsCount: 0,
    startsAt: '2026-01-20T09:00:00',
    bidSecurityRequired: 500000,
    bidSecurityPaid: false,
    bidSecurityVerified: false,
    timeline: {
      registration: true,
      bidSecurity: false,
      viewing: false,
      live: false,
      ended: false,
      won: false,
      payment: false,
      collection: false,
    },
    currentStage: 0,
  },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'auction_starts',
    auctionId: 'reg-1',
    auctionTitle: 'TOYOTA Land Cruiser 300 GX-R',
    title: 'Auction Starting Soon',
    message: 'The auction starts in 30 minutes. Make sure your bid security is verified.',
    timestamp: '2026-01-15T08:30:00',
    read: false,
    actionUrl: '/auction/auc-1',
  },
  {
    id: 'notif-2',
    type: 'won',
    auctionId: 'reg-3',
    auctionTitle: 'MERCEDES-BENZ GLE 450',
    title: 'Congratulations! You Won',
    message: 'You won the auction for Ksh 12,048,000. Complete payment to the organizer.',
    timestamp: '2026-01-14T17:00:00',
    read: false,
    actionUrl: '/auction/auc-3',
  },
  {
    id: 'notif-3',
    type: 'certificate_ready',
    auctionId: 'reg-3',
    auctionTitle: 'MERCEDES-BENZ GLE 450',
    title: 'Winning Certificate Ready',
    message: 'Your digital winning certificate is ready for download.',
    timestamp: '2026-01-14T17:15:00',
    read: true,
    actionUrl: '/certificates/cert-3',
  },
  {
    id: 'notif-4',
    type: 'payment_reminder',
    auctionId: 'reg-3',
    auctionTitle: 'MERCEDES-BENZ GLE 450',
    title: 'Payment Reminder',
    message: 'Complete payment to NCBA Bank Kenya within 48 hours.',
    timestamp: '2026-01-14T18:00:00',
    read: false,
    actionUrl: '/payments/cert-3',
  },
];

const MOCK_CERTIFICATES: WinningCertificate[] = [
  {
    id: 'cert-1',
    reference: 'CERT-2026-001',
    vehicle: 'TOYOTA Land Cruiser 300 GX-R (2022)',
    organizer: 'NCBA Bank Kenya',
    winningAmount: 15200000,
    issueDate: '2026-01-10',
    status: 'collected',
  },
  {
    id: 'cert-2',
    reference: 'CERT-2026-002',
    vehicle: 'BMW X5 M Competition (2021)',
    organizer: 'Crown Motors Kenya',
    winningAmount: 8900000,
    issueDate: '2025-12-20',
    status: 'collected',
  },
];

const MOCK_INSPECTIONS: Inspection[] = [
  {
    id: 'insp-1',
    vehicleTitle: 'PORSCHE Cayenne S',
    vehicleImage: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=400&q=80',
    date: '2026-01-13',
    time: '10:00 AM',
    location: 'Nairobi Vault, Westlands',
    partner: 'AutoInspect Kenya',
    status: 'completed',
    reportUrl: '/reports/insp-1.pdf',
  },
  {
    id: 'insp-2',
    vehicleTitle: 'RANGE ROVER Autobiography',
    vehicleImage: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=400&q=80',
    date: '2026-01-18',
    time: '2:00 PM',
    location: 'Nairobi Vault, Karen',
    partner: 'AutoInspect Kenya',
    status: 'scheduled',
  },
];

// ============================================================
// Helper Functions
// ============================================================

const formatCurrency = (amount: number) => {
  return `Ksh ${amount.toLocaleString()}`;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================================
// Components
// ============================================================

// Sidebar Navigation
const Sidebar: FC<{ activeSection: string; onNavigate: (section: string) => void }> = ({ 
  activeSection, 
  onNavigate 
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { id: 'auctions', label: 'My Auctions', icon: <Gavel className="w-5 h-5" /> },
    { id: 'live', label: 'Live Auctions', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Heart className="w-5 h-5" /> },
    { id: 'inspections', label: 'Inspections', icon: <Wrench className="w-5 h-5" /> },
    { id: 'viewings', label: 'Viewings', icon: <Eye className="w-5 h-5" /> },
    { id: 'certificates', label: 'Certificates', icon: <FileText className="w-5 h-5" /> },
    { id: 'documents', label: 'Documents', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    { id: 'help', label: 'Help Center', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden lg:flex h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E3063] flex items-center justify-center">
            <Gavel className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-[#1E3063]">KAYAD</p>
            <p className="text-xs text-slate-500">Bidder Portal</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="font-bold text-emerald-700">A-104</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#1E3063] truncate">Bidder A-104</p>
            <p className="text-xs text-emerald-600">Verified</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeSection === item.id
                ? 'bg-[#1E3063] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-slate-200">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </div>
    </aside>
  );
};

// Quick Stats Card
const StatCard: FC<{ label: string; value: string | number; icon: React.ReactNode; color?: string }> = ({ 
  label, 
  value, 
  icon,
  color = '#1E3063'
}) => (
  <Card className="p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: color + '15', color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-[#1E3063]">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  </Card>
);

// Auction Timeline Progress
const AuctionTimelineProgress: FC<{ timeline: AuctionRegistration['timeline']; currentStage: number }> = ({ 
  timeline, 
  currentStage 
}) => {
  const stages = [
    { label: 'Registration', key: 'registration' as const },
    { label: 'Bid Security', key: 'bidSecurity' as const },
    { label: 'Viewing', key: 'viewing' as const },
    { label: 'Auction', key: 'live' as const },
    { label: 'Payment', key: 'payment' as const },
    { label: 'Collection', key: 'collection' as const },
  ];

  return (
    <div className="flex items-center justify-between">
      {stages.map((stage, i) => {
        const isComplete = timeline[stage.key];
        const isCurrent = i === currentStage;

        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCurrent 
                    ? 'bg-red-500 text-white ring-4 ring-red-200' 
                    : isComplete 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isComplete ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <p className={`text-[10px] mt-1 text-center ${
                isCurrent ? 'text-red-600 font-bold' : isComplete ? 'text-slate-700' : 'text-slate-400'
              }`}>
                {stage.label}
              </p>
            </div>
            {i < stages.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${
                timeline[stages[i + 1]?.key || 'registration'] ? 'bg-emerald-500' : 'bg-slate-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Auction Card
const AuctionCard: FC<{ registration: AuctionRegistration; onAction?: () => void }> = ({ 
  registration,
  onAction
}) => {
  const statusConfig: Record<AuctionStatus, { label: string; color: string; bgColor: string }> = {
    registration_open: { label: 'Registration Open', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    registration_pending: { label: 'Pending Approval', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    registration_approved: { label: 'Approved', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    viewing: { label: 'Viewing', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    auction_live: { label: 'LIVE', color: 'text-red-700', bgColor: 'bg-red-100' },
    auction_ended: { label: 'Ended', color: 'text-slate-700', bgColor: 'bg-slate-100' },
    won: { label: 'Won', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    lost: { label: 'Lost', color: 'text-slate-700', bgColor: 'bg-slate-100' },
    completed: { label: 'Completed', color: 'text-slate-700', bgColor: 'bg-slate-100' },
    cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
  };

  const config = statusConfig[registration.status];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-col sm:flex-row">
        <div className="w-full sm:w-32 h-32 sm:h-24 flex-shrink-0">
          <img 
            src={registration.vehicle.image} 
            alt={registration.vehicle.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-[#1E3063] truncate">{registration.vehicle.title}</h4>
              <p className="text-xs text-slate-500">{registration.organizer.name}</p>
            </div>
            <Badge className={`${config.bgColor} ${config.color} border-0`}>
              {config.label}
            </Badge>
          </div>

          <AuctionTimelineProgress timeline={registration.timeline} currentStage={registration.currentStage} />

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-500">Current Bid</p>
              <p className="text-lg font-black text-[#1E3063]">
                {formatCurrency(registration.currentBid)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Bids</p>
              <p className="font-bold text-slate-700">{registration.bidsCount}</p>
            </div>
            {registration.status === 'auction_live' && (
              <Button variant="primary" size="sm" className="bg-red-600 hover:bg-red-700">
                <Gavel className="w-4 h-4 mr-1" />
                Join
              </Button>
            )}
            {registration.status === 'won' && (
              <Button variant="primary" size="sm" className="bg-[#1E3063]">
                Pay Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Dashboard Section
const DashboardSection: FC<{
  registrations: AuctionRegistration[];
  notifications: Notification[];
  certificates: WinningCertificate[];
}> = ({ registrations, notifications, certificates }) => {
  const liveCount = registrations.filter(r => r.status === 'auction_live').length;
  const wonCount = registrations.filter(r => r.status === 'won').length;
  const pendingCount = registrations.filter(r => r.status === 'registration_pending').length;
  const unreadCount = notifications.filter(n => !n.read).length;

  const liveAuctions = registrations.filter(r => r.status === 'auction_live');
  const wonAuctions = registrations.filter(r => r.status === 'won');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#1E3063] mb-2">Welcome Back</h1>
        <p className="text-slate-500">Track your auction activity and next actions</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Live Now" value={liveCount} icon={<Gavel className="w-6 h-6" />} color="#EF4444" />
        <StatCard label="Won" value={wonCount} icon={<Trophy className="w-6 h-6" />} color="#10B981" />
        <StatCard label="Pending" value={pendingCount} icon={<Clock className="w-6 h-6" />} color="#F59E0B" />
        <StatCard label="Unread" value={unreadCount} icon={<Bell className="w-6 h-6" />} color="#6366F1" />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" className="bg-[#1E3063]">
          <Gavel className="w-4 h-4 mr-2" />
          Browse Auctions
        </Button>
        <Button variant="outline">
          <Search className="w-4 h-4 mr-2" />
          Find Vehicles
        </Button>
        <Button variant="outline">
          <Bell className="w-4 h-4 mr-2" />
          Notification Settings
        </Button>
      </div>

      {/* Live Auctions Alert */}
      {liveCount > 0 && (
        <Card className="p-5 bg-red-50 border-2 border-red-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
              <Gavel className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800">{liveCount} Auction{liveCount > 1 ? 's' : ''} Live Now</h3>
              <p className="text-sm text-red-600">Join now to place your bids</p>
            </div>
            <Button variant="primary" className="bg-red-600 hover:bg-red-700">
              View Live Auctions
            </Button>
          </div>
        </Card>
      )}

      {/* Active Auctions */}
      {liveAuctions.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[#1E3063] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-500" />
            Active Auctions
          </h2>
          <div className="space-y-4">
            {liveAuctions.map(reg => (
              <AuctionCard key={reg.id} registration={reg} />
            ))}
          </div>
        </section>
      )}

      {/* Won Auctions - Action Required */}
      {wonAuctions.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[#1E3063] mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Action Required
          </h2>
          <div className="space-y-4">
            {wonAuctions.map(reg => (
              <Card key={reg.id} className="p-5 border-2 border-amber-200 bg-amber-50">
                <div className="flex items-center gap-4">
                  <img 
                    src={reg.vehicle.image} 
                    alt={reg.vehicle.title}
                    className="w-20 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-[#1E3063]">{reg.vehicle.title}</h4>
                    <p className="text-sm text-slate-600">Won at {formatCurrency(reg.currentBid)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-amber-600 font-medium mb-1">Complete Payment</p>
                    <Button size="sm" variant="primary" className="bg-[#C85A32]">
                      Pay Organizer
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Recent Notifications */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1E3063]">Recent Notifications</h2>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
        <Card className="divide-y divide-slate-100">
          {notifications.slice(0, 3).map(notif => (
            <div key={notif.id} className={`p-4 flex items-start gap-3 ${!notif.read ? 'bg-blue-50' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                notif.read ? 'bg-slate-100' : 'bg-blue-100'
              }`}>
                {notif.type === 'won' ? (
                  <Trophy className="w-5 h-5 text-emerald-600" />
                ) : notif.type === 'outbid' ? (
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                ) : (
                  <Bell className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${notif.read ? 'text-slate-700' : 'text-[#1E3063]'}`}>
                  {notif.title}
                </p>
                <p className="text-xs text-slate-500 truncate">{notif.message}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {formatDate(notif.timestamp)}
              </span>
            </div>
          ))}
        </Card>
      </section>

      {/* Payment Reminder Notice */}
      <Card className="p-5 bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-bold text-blue-800 mb-1">Payment Information</p>
            <p className="text-sm text-blue-700">
              All auction payments (Bid Security and winning payments) are made directly to the 
              Auction Organizer. KAYAD provides the marketplace technology platform only.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// My Auctions Section
const MyAuctionsSection: FC<{ registrations: AuctionRegistration[] }> = ({ registrations }) => {
  const [activeTab, setActiveTab] = useState<AuctionStatus | 'all'>('all');

  const tabs: { id: AuctionStatus | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: registrations.length },
    { id: 'registration_pending', label: 'Pending', count: registrations.filter(r => r.status === 'registration_pending').length },
    { id: 'registration_approved', label: 'Approved', count: registrations.filter(r => r.status === 'registration_approved').length },
    { id: 'auction_live', label: 'Live', count: registrations.filter(r => r.status === 'auction_live').length },
    { id: 'won', label: 'Won', count: registrations.filter(r => r.status === 'won').length },
    { id: 'completed', label: 'Completed', count: registrations.filter(r => r.status === 'completed').length },
  ];

  const filteredRegistrations = activeTab === 'all' 
    ? registrations 
    : registrations.filter(r => r.status === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#1E3063] mb-2">My Auctions</h1>
        <p className="text-slate-500">Track all your auction registrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#1E3063] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-75">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Auction List */}
      <div className="space-y-4">
        {filteredRegistrations.length === 0 ? (
          <Card className="p-12 text-center">
            <Gavel className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-800 mb-2">No auctions found</h3>
            <p className="text-sm text-slate-500 mb-4">
              {activeTab === 'all' 
                ? 'Start by browsing and registering for auctions'
                : `No auctions with status: ${activeTab}`
              }
            </p>
            <Button variant="primary" className="bg-[#1E3063]">
              Browse Auctions
            </Button>
          </Card>
        ) : (
          filteredRegistrations.map(reg => (
            <AuctionCard key={reg.id} registration={reg} />
          ))
        )}
      </div>
    </div>
  );
};

// Certificates Section
const CertificatesSection: FC<{ certificates: WinningCertificate[] }> = ({ certificates }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-black text-[#1E3063] mb-2">Winning Certificates</h1>
      <p className="text-slate-500">Download and share your winning certificates</p>
    </div>

    <div className="grid gap-4">
      {certificates.map(cert => (
        <Card key={cert.id} className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-mono text-xs text-slate-500 mb-1">{cert.reference}</p>
                <h4 className="font-bold text-[#1E3063]">{cert.vehicle}</h4>
                <p className="text-sm text-slate-600">{cert.organizer}</p>
                <p className="text-lg font-black text-emerald-600 mt-2">
                  {formatCurrency(cert.winningAmount)}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={`${
                cert.status === 'collected' ? 'bg-emerald-100 text-emerald-700' :
                cert.status === 'payment_confirmed' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              } border-0`}>
                {cert.status.replace('_', ' ')}
              </Badge>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// Inspections Section
const InspectionsSection: FC<{ inspections: Inspection[] }> = ({ inspections }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-black text-[#1E3063] mb-2">My Inspections</h1>
      <p className="text-slate-500">Track your vehicle inspections</p>
    </div>

    <div className="grid gap-4">
      {inspections.map(insp => (
        <Card key={insp.id} className="p-4">
          <div className="flex items-start gap-4">
            <img 
              src={insp.vehicleImage} 
              alt={insp.vehicleTitle}
              className="w-24 h-18 rounded-lg object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`${
                  insp.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  insp.status === 'report_ready' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                } border-0`}>
                  {insp.status.replace('_', ' ')}
                </Badge>
              </div>
              <h4 className="font-bold text-[#1E3063]">{insp.vehicleTitle}</h4>
              <p className="text-sm text-slate-600">{formatDate(insp.date)} at {insp.time}</p>
              <p className="text-xs text-slate-500">{insp.partner} - {insp.location}</p>
            </div>
            {insp.reportUrl && (
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Report
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// Notifications Section
const NotificationsSection: FC<{ notifications: Notification[] }> = ({ notifications }) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1E3063] mb-2">Notifications</h1>
          <p className="text-slate-500">
            {notifications.filter(n => !n.read).length} unread
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filter === 'all' ? 'primary' : 'outline'} 
            size="sm"
            className={filter === 'all' ? 'bg-[#1E3063]' : ''}
          >
            All
          </Button>
          <Button 
            variant={filter === 'unread' ? 'primary' : 'outline'} 
            size="sm"
            className={filter === 'unread' ? 'bg-[#1E3063]' : ''}
          >
            Unread
          </Button>
        </div>
      </div>

      <Card className="divide-y divide-slate-100">
        {filteredNotifications.map(notif => (
          <div 
            key={notif.id} 
            className={`p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors ${
              !notif.read ? 'bg-blue-50/50' : ''
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              !notif.read ? 'bg-blue-100' : 'bg-slate-100'
            }`}>
              <Bell className={`w-5 h-5 ${!notif.read ? 'text-blue-600' : 'text-slate-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`font-medium ${!notif.read ? 'text-[#1E3063]' : 'text-slate-700'}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-slate-500 mb-1">{notif.auctionTitle}</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {formatDate(notif.timestamp)}
                </span>
              </div>
              <p className="text-sm text-slate-600">{notif.message}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

// Help Section
const HelpSection: FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-black text-[#1E3063] mb-2">Help Center</h1>
      <p className="text-slate-500">Get answers to common questions</p>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      {[
        { 
          icon: <Gavel className="w-6 h-6" />,
          title: 'How Bidding Works',
          desc: 'Learn how to participate in live auctions'
        },
        { 
          icon: <Shield className="w-6 h-6" />,
          title: 'Bid Security',
          desc: 'Understand deposit requirements and refunds'
        },
        { 
          icon: <Trophy className="w-6 h-6" />,
          title: 'Winning Auctions',
          desc: 'What happens after you win'
        },
        { 
          icon: <CreditCard className="w-6 h-6" />,
          title: 'Payments',
          desc: 'How to pay the Auction Organizer'
        },
        { 
          icon: <Truck className="w-6 h-6" />,
          title: 'Vehicle Collection',
          desc: 'Arrange pickup after payment'
        },
        { 
          icon: <MessageSquare className="w-6 h-6" />,
          title: 'Disputes',
          desc: 'How we handle disagreements'
        },
      ].map((item, i) => (
        <Card key={i} className="p-5 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              {item.icon}
            </div>
            <div>
              <h4 className="font-bold text-[#1E3063] mb-1">{item.title}</h4>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
          </div>
        </Card>
      ))}
    </div>

    {/* Contact Support */}
    <Card className="p-5 bg-[#1E3063] text-white">
      <h3 className="font-bold mb-3">Need More Help?</h3>
      <p className="text-sm text-slate-300 mb-4">
        Our support team is available Monday to Friday, 8am to 6pm EAT.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="border-white text-white hover:bg-white/10">
          <Phone className="w-4 h-4 mr-2" />
          Call Support
        </Button>
        <Button variant="outline" className="border-white text-white hover:bg-white/10">
          <Mail className="w-4 h-4 mr-2" />
          Email Support
        </Button>
        <Button variant="outline" className="border-white text-white hover:bg-white/10">
          <MessageSquare className="w-4 h-4 mr-2" />
          Live Chat
        </Button>
      </div>
    </Card>
  </div>
);

// ============================================================
// Main Component
// ============================================================

export const BidderPortal: FC = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <DashboardSection 
            registrations={MOCK_REGISTRATIONS}
            notifications={MOCK_NOTIFICATIONS}
            certificates={MOCK_CERTIFICATES}
          />
        );
      case 'auctions':
        return <MyAuctionsSection registrations={MOCK_REGISTRATIONS} />;
      case 'certificates':
        return <CertificatesSection certificates={MOCK_CERTIFICATES} />;
      case 'inspections':
        return <InspectionsSection inspections={MOCK_INSPECTIONS} />;
      case 'notifications':
        return <NotificationsSection notifications={MOCK_NOTIFICATIONS} />;
      case 'help':
        return <HelpSection />;
      default:
        return (
          <DashboardSection 
            registrations={MOCK_REGISTRATIONS}
            notifications={MOCK_NOTIFICATIONS}
            certificates={MOCK_CERTIFICATES}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8 pb-24 lg:pb-8">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex justify-around">
        <button 
          onClick={() => setActiveSection('dashboard')}
          className={`flex flex-col items-center gap-1 p-2 ${
            activeSection === 'dashboard' ? 'text-[#1E3063]' : 'text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>
        <button 
          onClick={() => setActiveSection('auctions')}
          className={`flex flex-col items-center gap-1 p-2 ${
            activeSection === 'auctions' ? 'text-[#1E3063]' : 'text-slate-400'
          }`}
        >
          <Gavel className="w-5 h-5" />
          <span className="text-[10px]">Auctions</span>
        </button>
        <button 
          onClick={() => setActiveSection('notifications')}
          className={`flex flex-col items-center gap-1 p-2 relative ${
            activeSection === 'notifications' ? 'text-[#1E3063]' : 'text-slate-400'
          }`}
        >
          <Bell className="w-5 h-5" />
          {MOCK_NOTIFICATIONS.filter(n => !n.read).length > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center">
              {MOCK_NOTIFICATIONS.filter(n => !n.read).length}
            </span>
          )}
          <span className="text-[10px]">Alerts</span>
        </button>
        <button 
          onClick={() => setActiveSection('help')}
          className={`flex flex-col items-center gap-1 p-2 ${
            activeSection === 'help' ? 'text-[#1E3063]' : 'text-slate-400'
          }`}
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-[10px]">Help</span>
        </button>
      </div>
    </div>
  );
};

export default BidderPortal;
