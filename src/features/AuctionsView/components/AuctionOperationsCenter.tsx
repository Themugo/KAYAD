import React, { useState, useMemo } from 'react';
import {
  Gavel,
  Clock,
  Shield,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Calendar,
  CalendarDays,
  User,
  Users,
  FileText,
  Download,
  Phone,
  Mail,
  Eye,
  Heart,
  ClipboardCheck,
  CreditCard,
  Car,
  Settings,
  Home,
  Plus,
  Search,
  Filter,
  Bell,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileBarChart,
  Truck,
  AlertTriangle,
  X,
  Check,
  Edit,
  Trash2,
  Pause,
  Play,
  Send,
  EyeOff,
  RefreshCw,
  ArrowRight,
  Info,
  Wallet,
  Building,
  Landmark,
  Users as UsersIcon,
  PieChart,
  Clock3,
  Trophy
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { FC } from 'react';

// ============================================================
// Types
// ============================================================

type AuctionStatus = 
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'live'
  | 'ended'
  | 'completed'
  | 'cancelled';

type RegistrationStatus = 'pending' | 'verified' | 'rejected';

interface Auction {
  id: string;
  reference: string;
  vehicle: {
    title: string;
    image: string;
    year: number;
    mileage: string;
  };
  status: AuctionStatus;
  currentBid: number;
  bidsCount: number;
  registrationsCount: number;
  viewingCount: number;
  startsAt: string;
  endsAt: string;
}

interface Registration {
  id: string;
  bidderAlias: string;
  auctionId: string;
  auctionTitle: string;
  status: RegistrationStatus;
  bidSecurityAmount: number;
  bidSecurityPaid: boolean;
  verifiedAt?: string;
}

interface Bidder {
  id: string;
  alias: string;
  highestBid: number;
  position: number;
  status: 'active' | 'outbid' | 'won';
}

interface Announcement {
  id: string;
  message: string;
  timestamp: string;
}

// ============================================================
// Mock Data
// ============================================================

const MOCK_AUCTIONS: Auction[] = [
  {
    id: 'auc-1',
    reference: 'AUC-2026-001',
    vehicle: { title: 'TOYOTA Land Cruiser 300 GX-R', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80', year: 2022, mileage: '15,200 km' },
    status: 'live',
    currentBid: 16835000,
    bidsCount: 7,
    registrationsCount: 12,
    viewingCount: 8,
    startsAt: '2026-01-15T09:00:00',
    endsAt: '2026-01-15T17:00:00',
  },
  {
    id: 'auc-2',
    reference: 'AUC-2026-002',
    vehicle: { title: 'PORSCHE Cayenne S', image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=400&q=80', year: 2020, mileage: '35,000 km' },
    status: 'pending_review',
    currentBid: 0,
    bidsCount: 0,
    registrationsCount: 5,
    viewingCount: 0,
    startsAt: '2026-01-20T09:00:00',
    endsAt: '2026-01-20T17:00:00',
  },
  {
    id: 'auc-3',
    reference: 'AUC-2026-003',
    vehicle: { title: 'MERCEDES-BENZ GLE 450', image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=400&q=80', year: 2021, mileage: '28,500 km' },
    status: 'approved',
    currentBid: 0,
    bidsCount: 0,
    registrationsCount: 8,
    viewingCount: 6,
    startsAt: '2026-01-18T09:00:00',
    endsAt: '2026-01-18T17:00:00',
  },
  {
    id: 'auc-4',
    reference: 'AUC-2026-004',
    vehicle: { title: 'RANGE ROVER Autobiography', image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=400&q=80', year: 2023, mileage: '8,000 km' },
    status: 'draft',
    currentBid: 0,
    bidsCount: 0,
    registrationsCount: 0,
    viewingCount: 0,
    startsAt: '2026-01-25T09:00:00',
    endsAt: '2026-01-25T17:00:00',
  },
];

const MOCK_REGISTRATIONS: Registration[] = [
  { id: 'reg-1', bidderAlias: 'A-104', auctionId: 'auc-1', auctionTitle: 'TOYOTA Land Cruiser 300', status: 'verified', bidSecurityAmount: 500000, bidSecurityPaid: true, verifiedAt: '2026-01-14T10:00:00' },
  { id: 'reg-2', bidderAlias: 'B-227', auctionId: 'auc-1', auctionTitle: 'TOYOTA Land Cruiser 300', status: 'verified', bidSecurityAmount: 500000, bidSecurityPaid: true, verifiedAt: '2026-01-14T11:00:00' },
  { id: 'reg-3', bidderAlias: 'C-042', auctionId: 'auc-1', auctionTitle: 'TOYOTA Land Cruiser 300', status: 'pending', bidSecurityAmount: 500000, bidSecurityPaid: false },
  { id: 'reg-4', bidderAlias: 'D-156', auctionId: 'auc-2', auctionTitle: 'PORSCHE Cayenne S', status: 'pending', bidSecurityAmount: 500000, bidSecurityPaid: true },
  { id: 'reg-5', bidderAlias: 'E-089', auctionId: 'auc-2', auctionTitle: 'PORSCHE Cayenne S', status: 'verified', bidSecurityAmount: 500000, bidSecurityPaid: true, verifiedAt: '2026-01-13T14:00:00' },
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
    { id: 'create', label: 'Create Auction', icon: <Plus className="w-5 h-5" /> },
    { id: 'auctions', label: 'My Auctions', icon: <Gavel className="w-5 h-5" /> },
    { id: 'registrations', label: 'Registrations', icon: <Users className="w-5 h-5" /> },
    { id: 'live', label: 'Live Control', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'winners', label: 'Winners', icon: <Trophy className="w-5 h-5" /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-5 h-5" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden lg:flex h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E3063] flex items-center justify-center">
            <Building className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-[#1E3063]">KAYAD</p>
            <p className="text-xs text-slate-500">Operations Center</p>
          </div>
        </div>
      </div>

      {/* Organizer Info */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#1E3063] text-sm truncate">NCBA Bank Kenya</p>
            <p className="text-xs text-emerald-600">Verified Dealer</p>
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

      {/* Support */}
      <div className="p-4 border-t border-slate-200">
        <Button variant="outline" className="w-full justify-start">
          <Phone className="w-4 h-4 mr-2" />
          Contact Support
        </Button>
      </div>
    </aside>
  );
};

// Stat Card
const StatCard: FC<{ label: string; value: string | number; icon: React.ReactNode; color?: string; trend?: string }> = ({ 
  label, 
  value, 
  icon,
  color = '#1E3063',
  trend
}) => (
  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
    <div className="flex items-center gap-4">
      <div 
        className="w-14 h-14 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: color + '15', color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-[#1E3063]">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend.startsWith('+') ? 'text-emerald-600' : trend.startsWith('-') ? 'text-red-600' : 'text-slate-500'
          }`}>
            {trend.startsWith('+') ? <TrendingUp className="w-3 h-3" /> : 
             trend.startsWith('-') ? <TrendingDown className="w-3 h-3" /> : null}
            {trend}
          </div>
        )}
      </div>
    </div>
  </Card>
);

// Quick Action Card
const QuickActionCard: FC<{ label: string; icon: React.ReactNode; onClick: () => void }> = ({ 
  label, 
  icon,
  onClick 
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-[#1E3063]/30 transition-all w-full"
  >
    <div className="w-12 h-12 rounded-xl bg-[#1E3063] flex items-center justify-center text-white">
      {icon}
    </div>
    <span className="text-sm font-medium text-slate-700 text-center">{label}</span>
  </button>
);

// Auction Card
const AuctionCard: FC<{ auction: Auction; onAction?: (action: string) => void }> = ({ 
  auction,
  onAction
}) => {
  const statusConfig: Record<AuctionStatus, { label: string; color: string; bgColor: string }> = {
    draft: { label: 'Draft', color: 'text-slate-700', bgColor: 'bg-slate-100' },
    pending_review: { label: 'Pending Review', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    approved: { label: 'Approved', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    live: { label: 'LIVE', color: 'text-red-700', bgColor: 'bg-red-100' },
    ended: { label: 'Ended', color: 'text-slate-700', bgColor: 'bg-slate-100' },
    completed: { label: 'Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
  };

  const config = statusConfig[auction.status];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex">
        <div className="w-32 h-28 flex-shrink-0">
          <img 
            src={auction.vehicle.image} 
            alt={auction.vehicle.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 font-mono mb-0.5">{auction.reference}</p>
              <h4 className="font-bold text-[#1E3063] truncate">{auction.vehicle.title}</h4>
            </div>
            <Badge className={`${config.bgColor} ${config.color} border-0`}>
              {config.label}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(auction.startsAt)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {auction.registrationsCount} regs
            </span>
            <span className="flex items-center gap-1">
              <Gavel className="w-3 h-3" />
              {auction.bidsCount} bids
            </span>
          </div>

          <div className="flex items-center gap-2">
            {auction.status === 'draft' && (
              <Button variant="outline" size="sm" onClick={() => onAction?.('edit')}>
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
            {auction.status === 'pending_review' && (
              <Button variant="outline" size="sm" onClick={() => onAction?.('preview')}>
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </Button>
            )}
            {auction.status === 'live' && (
              <Button variant="primary" size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => onAction?.('live')}>
                <TrendingUp className="w-3 h-3 mr-1" />
                Open Control
              </Button>
            )}
            {auction.status === 'approved' && (
              <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onAction?.('start')}>
                <Play className="w-3 h-3 mr-1" />
                Start Auction
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Registration Card
const RegistrationCard: FC<{ registration: Registration; onVerify?: () => void; onReject?: () => void }> = ({ 
  registration,
  onVerify,
  onReject
}) => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
          {registration.bidderAlias}
        </div>
        <div>
          <p className="font-bold text-[#1E3063]">{registration.bidderAlias}</p>
          <p className="text-xs text-slate-500">{registration.auctionTitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-700">{formatCurrency(registration.bidSecurityAmount)}</p>
          <Badge 
            size="sm"
            className={registration.bidSecurityPaid ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}
          >
            {registration.bidSecurityPaid ? 'Paid' : 'Pending'}
          </Badge>
        </div>
        {registration.status === 'pending' && (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onVerify}>
              <Check className="w-3 h-3 mr-1" />
              Verify
            </Button>
            <Button variant="outline" size="sm" onClick={onReject}>
              <X className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </div>
        )}
        {registration.status === 'verified' && (
          <Badge className="bg-emerald-100 text-emerald-700 border-0">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        )}
      </div>
    </div>
  </Card>
);

// ============================================================
// Dashboard Section
// ============================================================

const DashboardSection: FC<{ 
  auctions: Auction[];
  registrations: Registration[];
  onNavigate: (section: string) => void;
}> = ({ auctions, registrations, onNavigate }) => {
  const liveAuctions = auctions.filter(a => a.status === 'live');
  const pendingRegistrations = registrations.filter(r => r.status === 'pending');
  const upcomingAuctions = auctions.filter(a => a.status === 'approved');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1E3063]">Operations Dashboard</h1>
          <p className="text-slate-500">Welcome back! Here's what needs your attention today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>
          <Button variant="primary" onClick={() => onNavigate('create')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Auction
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-[#1E3063] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickActionCard label="Create Auction" icon={<Plus className="w-6 h-6" />} onClick={() => onNavigate('create')} />
          <QuickActionCard label="Import Vehicle" icon={<Car className="w-6 h-6" />} onClick={() => {}} />
          <QuickActionCard label="Registrations" icon={<Users className="w-6 h-6" />} onClick={() => onNavigate('registrations')} />
          <QuickActionCard label="Live Control" icon={<TrendingUp className="w-6 h-6" />} onClick={() => onNavigate('live')} />
          <QuickActionCard label="Calendar" icon={<Calendar className="w-6 h-6" />} onClick={() => onNavigate('calendar')} />
          <QuickActionCard label="Reports" icon={<BarChart3 className="w-6 h-6" />} onClick={() => onNavigate('reports')} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Live Auctions" 
          value={liveAuctions.length} 
          icon={<Gavel className="w-7 h-7" />} 
          color="#EF4444"
        />
        <StatCard 
          label="Pending Registrations" 
          value={pendingRegistrations.length} 
          icon={<User className="w-7 h-7" />} 
          color="#F59E0B"
        />
        <StatCard 
          label="Upcoming Auctions" 
          value={upcomingAuctions.length} 
          icon={<Calendar className="w-7 h-7" />} 
          color="#3B82F6"
        />
        <StatCard 
          label="Total Auctions" 
          value={auctions.length} 
          icon={<PieChart className="w-7 h-7" />} 
          color="#10B981"
        />
      </div>

      {/* Live Auctions Alert */}
      {liveAuctions.length > 0 && (
        <Card className="p-5 bg-red-50 border-2 border-red-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center relative">
              <Gavel className="w-7 h-7 text-red-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800">{liveAuctions.length} Auction{liveAuctions.length > 1 ? 's' : ''} Live Now</h3>
              <p className="text-sm text-red-600">Monitor and manage active auctions</p>
            </div>
            <Button variant="primary" className="bg-red-600 hover:bg-red-700" onClick={() => onNavigate('live')}>
              Open Control Room
            </Button>
          </div>
        </Card>
      )}

      {/* My Auctions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1E3063]">My Auctions</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('auctions')}>
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="space-y-4">
          {auctions.slice(0, 3).map(auction => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      </section>

      {/* Pending Registrations */}
      {pendingRegistrations.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1E3063]">Pending Registrations</h2>
            <Badge variant="warning" className="bg-amber-100 text-amber-700 border-0">
              {pendingRegistrations.length} pending
            </Badge>
          </div>
          <div className="space-y-3">
            {pendingRegistrations.slice(0, 3).map(reg => (
              <RegistrationCard key={reg.id} registration={reg} />
            ))}
          </div>
        </section>
      )}

      {/* Payment Notice */}
      <Card className="p-5 bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-blue-800 mb-1">Payment Configuration Reminder</h3>
            <p className="text-sm text-blue-700">
              Remember: Bid Security and winning payments are received directly by your organization. 
              Ensure your payment details are verified and up to date in Settings.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============================================================
// Create Auction Wizard Section
// ============================================================

const CreateAuctionSection: FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 8;

  const steps = [
    { num: 1, label: 'Vehicle' },
    { num: 2, label: 'Details' },
    { num: 3, label: 'Viewing' },
    { num: 4, label: 'Inspection' },
    { num: 5, label: 'Bid Security' },
    { num: 6, label: 'Rules' },
    { num: 7, label: 'Review' },
    { num: 8, label: 'Submit' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1E3063]">Create Auction</h1>
          <p className="text-slate-500">Follow the steps to create your auction</p>
        </div>
        <Button variant="ghost" onClick={onComplete}>
          Cancel
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s.num 
                    ? 'bg-[#1E3063] text-white' 
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {step > s.num ? <Check className="w-5 h-5" /> : s.num}
              </div>
              <p className={`text-xs mt-2 ${step >= s.num ? 'text-[#1E3063] font-medium' : 'text-slate-400'}`}>
                {s.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-[#1E3063]' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-6">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[#1E3063]">Select Vehicle</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <button className="p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-[#1E3063] transition-colors text-center">
                <Car className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="font-bold text-[#1E3063]">Choose from Inventory</p>
                <p className="text-sm text-slate-500">Select a vehicle from your stock</p>
              </button>
              <button className="p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-[#1E3063] transition-colors text-center">
                <Plus className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="font-bold text-[#1E3063]">Import Vehicle</p>
                <p className="text-sm text-slate-500">Add a new vehicle to your inventory</p>
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[#1E3063]">Bid Security Configuration</h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bid Security Amount</label>
                <input 
                  type="number" 
                  placeholder="500000"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20"
                />
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-800">Important</p>
                    <p className="text-sm text-amber-700">
                      Bid Security is paid directly to YOUR organization. KAYAD does not receive these funds.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., NCBA Bank"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Account Number</label>
                  <input 
                    type="text" 
                    placeholder="1234567890"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[#1E3063]">Review Auction</h2>
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-800">Ready for Submission</p>
                    <p className="text-sm text-emerald-700">
                      Your auction will be reviewed by KAYAD compliance before going live.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Default step content */}
        {!([1, 5, 7].includes(step)) && (
          <div className="text-center py-12">
            <Clock3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Step {step} content</p>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button 
          variant="primary" 
          onClick={() => step < totalSteps ? setStep(step + 1) : onComplete()}
        >
          {step === totalSteps ? 'Submit for Review' : 'Continue'}
          {step < totalSteps && <ChevronRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
};

// ============================================================
// Live Control Section
// ============================================================

const LiveControlSection: FC<{ auctions: Auction[] }> = ({ auctions }) => {
  const liveAuction = auctions.find(a => a.status === 'live');
  const [announcement, setAnnouncement] = useState('');
  const [bidders] = useState<Bidder[]>([
    { id: '1', alias: 'A-104', highestBid: 16835000, position: 1, status: 'won' },
    { id: '2', alias: 'B-227', highestBid: 16500000, position: 2, status: 'active' },
    { id: '3', alias: 'C-042', highestBid: 16200000, position: 3, status: 'outbid' },
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#1E3063]">Live Auction Control</h1>
        <p className="text-slate-500">Monitor and manage your live auction</p>
      </div>

      {liveAuction ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Auction Info */}
          <Card className="p-6 bg-gradient-to-br from-[#1E3063] to-[#2a4080] text-white">
            <div className="flex items-center gap-4 mb-4">
              <img 
                src={liveAuction.vehicle.image} 
                alt={liveAuction.vehicle.title}
                className="w-20 h-16 rounded-lg object-cover"
              />
              <div>
                <p className="font-mono text-sm opacity-70">{liveAuction.reference}</p>
                <h3 className="text-xl font-bold">{liveAuction.vehicle.title}</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/10 rounded-xl">
                <p className="text-sm opacity-70">Current Bid</p>
                <p className="text-3xl font-black">{formatCurrency(liveAuction.currentBid)}</p>
              </div>
              <div className="p-4 bg-white/10 rounded-xl">
                <p className="text-sm opacity-70">Total Bids</p>
                <p className="text-3xl font-black">{liveAuction.bidsCount}</p>
              </div>
            </div>
          </Card>

          {/* Controls */}
          <Card className="p-6">
            <h3 className="font-bold text-[#1E3063] mb-4">Auction Controls</h3>
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" className="flex-col py-4">
                <Pause className="w-6 h-6 mb-2" />
                Pause
              </Button>
              <Button variant="outline" className="flex-col py-4">
                <RefreshCw className="w-6 h-6 mb-2" />
                Extend
              </Button>
              <Button variant="primary" className="flex-col py-4 bg-emerald-600 hover:bg-emerald-700">
                <Check className="w-6 h-6 mb-2" />
                Close
              </Button>
            </div>
          </Card>

          {/* Announcements */}
          <Card className="p-6">
            <h3 className="font-bold text-[#1E3063] mb-4">Post Announcement</h3>
            <textarea 
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="Type an announcement for bidders..."
              className="w-full p-3 border border-slate-200 rounded-xl mb-3 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20"
            />
            <Button className="w-full bg-[#1E3063]">
              <Send className="w-4 h-4 mr-2" />
              Post Announcement
            </Button>
          </Card>

          {/* Bidders */}
          <Card className="p-6">
            <h3 className="font-bold text-[#1E3063] mb-4">Active Bidders</h3>
            <div className="space-y-2">
              {bidders.map(bidder => (
                <div 
                  key={bidder.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    bidder.status === 'won' ? 'bg-emerald-50 border border-emerald-200' :
                    bidder.status === 'outbid' ? 'bg-slate-50' :
                    'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      bidder.status === 'won' ? 'bg-emerald-500 text-white' :
                      bidder.status === 'outbid' ? 'bg-slate-200 text-slate-600' :
                      'bg-blue-500 text-white'
                    }`}>
                      {bidder.alias}
                    </div>
                    <span className="font-medium text-slate-700">#{bidder.position}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#1E3063]">{formatCurrency(bidder.highestBid)}</p>
                    <Badge 
                      size="sm"
                      className={
                        bidder.status === 'won' ? 'bg-emerald-100 text-emerald-700 border-0' :
                        bidder.status === 'outbid' ? 'bg-slate-100 text-slate-600 border-0' :
                        'bg-blue-100 text-blue-700 border-0'
                      }
                    >
                      {bidder.status === 'won' ? 'Winning' : bidder.status === 'outbid' ? 'Outbid' : 'Active'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Gavel className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Live Auctions</h3>
          <p className="text-slate-500 mb-4">You don't have any auctions running right now.</p>
        </Card>
      )}
    </div>
  );
};

// ============================================================
// Registrations Section
// ============================================================

const RegistrationsSection: FC<{ registrations: Registration[] }> = ({ registrations }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all');
  
  const filteredRegs = filter === 'all' 
    ? registrations 
    : registrations.filter(r => r.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#1E3063]">Bidder Registrations</h1>
        <p className="text-slate-500">Manage bidder registrations and verifications</p>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'verified'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f 
                ? 'bg-[#1E3063] text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-2 opacity-75">
              ({f === 'all' ? registrations.length : registrations.filter(r => r.status === f).length})
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredRegs.map(reg => (
          <RegistrationCard 
            key={reg.id} 
            registration={reg}
            onVerify={() => console.log('Verify:', reg.id)}
            onReject={() => console.log('Reject:', reg.id)}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

export const AuctionOperationsCenter: FC = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection 
          auctions={MOCK_AUCTIONS} 
          registrations={MOCK_REGISTRATIONS}
          onNavigate={setActiveSection}
        />;
      case 'create':
        return <CreateAuctionSection onComplete={() => setActiveSection('dashboard')} />;
      case 'live':
        return <LiveControlSection auctions={MOCK_AUCTIONS} />;
      case 'registrations':
        return <RegistrationsSection registrations={MOCK_REGISTRATIONS} />;
      default:
        return <DashboardSection 
          auctions={MOCK_AUCTIONS} 
          registrations={MOCK_REGISTRATIONS}
          onNavigate={setActiveSection}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8 pb-24 lg:pb-8">
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
          onClick={() => setActiveSection('create')}
          className={`flex flex-col items-center gap-1 p-2 ${
            activeSection === 'create' ? 'text-[#1E3063]' : 'text-slate-400'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px]">Create</span>
        </button>
        <button 
          onClick={() => setActiveSection('live')}
          className={`flex flex-col items-center gap-1 p-2 ${
            activeSection === 'live' ? 'text-[#1E3063]' : 'text-slate-400'
          }`}
        >
          <Gavel className="w-5 h-5" />
          <span className="text-[10px]">Live</span>
        </button>
        <button 
          onClick={() => setActiveSection('registrations')}
          className={`flex flex-col items-center gap-1 p-2 ${
            activeSection === 'registrations' ? 'text-[#1E3063]' : 'text-slate-400'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Regs</span>
        </button>
      </div>
    </div>
  );
};

export default AuctionOperationsCenter;
