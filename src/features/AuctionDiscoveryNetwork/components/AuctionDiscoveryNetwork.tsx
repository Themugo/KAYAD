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
  Eye,
  Users,
  FileText,
  Download,
  Heart,
  Share2,
  Image,
  ClipboardCheck,
  Car,
  Info,
  AlertTriangle,
  Play,
  Wifi,
  Radio,
  Trophy,
  CreditCard,
  BookOpen,
  TrendingUp,
  Star,
  MessageSquare,
  HelpCircle,
  UserPlus,
  CalendarPlus,
  Bookmark,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  RefreshCw,
  Bell,
  BellOff,
  Search,
  Filter,
  Grid,
  List,
  Map,
  Mail,
  Phone,
  Award,
  Truck,
  FileCheck,
  Scale,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Car as CarIcon,
  Banknote,
  Landmark,
  Briefcase,
  Gem,
  Bus,
  Zap,
  Leaf,
  BookmarkPlus,
  EyeOff,
  Globe,
  CalendarDays,
  CalendarClock,
  StarHalf,
  TrendingDown,
  Plus,
  Minus,
  Building,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

// Types
type AuctionStatus = 'live' | 'upcoming' | 'completed';
type AuctionType = 'bank' | 'dealer' | 'fleet' | 'government' | 'import' | 'luxury';

interface Vehicle {
  id: string;
  title: string;
  image: string;
  year: number;
  mileage: string;
  fuel: string;
  transmission: string;
  location: string;
  category: AuctionType;
}

interface Auction {
  id: string;
  reference: string;
  status: AuctionStatus;
  vehicle: Vehicle;
  currentBid: number;
  startingBid: number;
  reservePrice?: number;
  bidsCount: number;
  endsAt: string;
  startsAt: string;
  viewingStart: string;
  viewingEnd: string;
  registrationDeadline: string;
  organizer: Organizer;
  inspection: {
    status: 'available' | 'pending' | 'none';
    score?: number;
  };
  metrics: {
    viewers: number;
    registeredBidders: number;
  };
  winnerAlias?: string;
}

interface Organizer {
  id: string;
  name: string;
  logo: string;
  verified: boolean;
  type: 'bank' | 'dealer' | 'fleet' | 'government' | 'auctioneer';
  rating: number;
  completedAuctions: number;
  upcomingEvents: number;
  yearsOnKAYAD: number;
  address: string;
  followers: number;
}

interface LearningArticle {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  readTime: string;
}

interface Category {
  id: AuctionType;
  name: string;
  count: number;
  icon: React.ReactNode;
}

// Mock Data
const MOCK_ORGANIZERS: Organizer[] = [
  {
    id: 'org-1',
    name: 'NCBA Bank Kenya',
    logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop',
    verified: true,
    type: 'bank',
    rating: 4.8,
    completedAuctions: 156,
    upcomingEvents: 3,
    yearsOnKAYAD: 4,
    address: 'NCBA Tower, Upper Hill, Nairobi',
    followers: 2847,
  },
  {
    id: 'org-2',
    name: 'Premium Auto Auctions',
    logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&h=200&fit=crop',
    verified: true,
    type: 'auctioneer',
    rating: 4.9,
    completedAuctions: 89,
    upcomingEvents: 5,
    yearsOnKAYAD: 3,
    address: 'Westlands Business Park, Nairobi',
    followers: 1923,
  },
  {
    id: 'org-3',
    name: 'Equity Bank Auctions',
    logo: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=200&h=200&fit=crop',
    verified: true,
    type: 'bank',
    rating: 4.6,
    completedAuctions: 234,
    upcomingEvents: 2,
    yearsOnKAYAD: 5,
    address: 'Equity Centre, Nairobi',
    followers: 3456,
  },
  {
    id: 'org-4',
    name: 'Crown Motors Kenya',
    logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop',
    verified: true,
    type: 'dealer',
    rating: 4.7,
    completedAuctions: 67,
    upcomingEvents: 4,
    yearsOnKAYAD: 2,
    address: 'Mombasa Road, Nairobi',
    followers: 1234,
  },
  {
    id: 'org-5',
    name: 'Government Fleet Disposal',
    logo: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=200&h=200&fit=crop',
    verified: true,
    type: 'government',
    rating: 4.5,
    completedAuctions: 412,
    upcomingEvents: 1,
    yearsOnKAYAD: 6,
    address: 'Sheria House, Nairobi',
    followers: 892,
  },
];

const MOCK_AUCTIONS: Auction[] = [
  {
    id: 'auc-1',
    reference: 'AUC-2026-047',
    status: 'live',
    vehicle: {
      id: 'v1',
      title: 'TOYOTA Land Cruiser 300 GX-R Premium',
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
      year: 2023,
      mileage: '12,450 km',
      fuel: 'Petrol Hybrid',
      transmission: 'Automatic',
      location: 'Nairobi (Karen)',
      category: 'luxury',
    },
    currentBid: 18750000,
    startingBid: 16500000,
    reservePrice: 18000000,
    bidsCount: 14,
    endsAt: new Date(Date.now() + 45 * 60000).toISOString(),
    startsAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    viewingStart: '2026-01-08T10:00:00',
    viewingEnd: '2026-01-14T18:00:00',
    registrationDeadline: '2026-01-14T17:00:00',
    organizer: MOCK_ORGANIZERS[0],
    inspection: { status: 'available', score: 98 },
    metrics: { viewers: 312, registeredBidders: 8 },
  },
  {
    id: 'auc-2',
    reference: 'AUC-2026-046',
    status: 'live',
    vehicle: {
      id: 'v2',
      title: 'PORSCHE Cayenne S Platinum Edition',
      image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80',
      year: 2021,
      mileage: '28,300 km',
      fuel: 'Petrol',
      transmission: 'Automatic',
      location: 'Nairobi (Westlands)',
      category: 'luxury',
    },
    currentBid: 13400000,
    startingBid: 11500000,
    bidsCount: 9,
    endsAt: new Date(Date.now() + 2 * 3600000).toISOString(),
    startsAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    viewingStart: '2026-01-10T09:00:00',
    viewingEnd: '2026-01-14T16:00:00',
    registrationDeadline: '2026-01-14T15:00:00',
    organizer: MOCK_ORGANIZERS[1],
    inspection: { status: 'available', score: 95 },
    metrics: { viewers: 198, registeredBidders: 5 },
  },
  {
    id: 'auc-3',
    reference: 'AUC-2026-048',
    status: 'upcoming',
    vehicle: {
      id: 'v3',
      title: 'BMW X7 M50i xDrive',
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
      year: 2022,
      mileage: '18,200 km',
      fuel: 'Petrol',
      transmission: 'Automatic',
      location: 'Mombasa',
      category: 'luxury',
    },
    currentBid: 0,
    startingBid: 14500000,
    bidsCount: 0,
    endsAt: new Date(Date.now() + 18 * 3600000).toISOString(),
    startsAt: new Date(Date.now() + 18 * 3600000).toISOString(),
    viewingStart: '2026-01-16T09:00:00',
    viewingEnd: '2026-01-17T18:00:00',
    registrationDeadline: new Date(Date.now() + 17 * 3600000).toISOString(),
    organizer: MOCK_ORGANIZERS[1],
    inspection: { status: 'pending' },
    metrics: { viewers: 0, registeredBidders: 3 },
  },
  {
    id: 'auc-4',
    reference: 'AUC-2026-049',
    status: 'upcoming',
    vehicle: {
      id: 'v4',
      title: 'MERCEDES-AMG GT 63 S',
      image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
      year: 2020,
      mileage: '32,100 km',
      fuel: 'Petrol',
      transmission: 'Automatic',
      location: 'Nairobi (Karen)',
      category: 'luxury',
    },
    currentBid: 0,
    startingBid: 16800000,
    bidsCount: 0,
    endsAt: new Date(Date.now() + 42 * 3600000).toISOString(),
    startsAt: new Date(Date.now() + 42 * 3600000).toISOString(),
    viewingStart: '2026-01-18T10:00:00',
    viewingEnd: '2026-01-19T17:00:00',
    registrationDeadline: new Date(Date.now() + 41 * 3600000).toISOString(),
    organizer: MOCK_ORGANIZERS[0],
    inspection: { status: 'available', score: 97 },
    metrics: { viewers: 0, registeredBidders: 7 },
  },
  {
    id: 'auc-5',
    reference: 'AUC-2026-050',
    status: 'upcoming',
    vehicle: {
      id: 'v5',
      title: 'TOYOTA Hilux Double Cab Invincible',
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
      year: 2023,
      mileage: '8,200 km',
      fuel: 'Diesel',
      transmission: 'Manual',
      location: 'Nakuru',
      category: 'dealer',
    },
    currentBid: 0,
    startingBid: 4200000,
    bidsCount: 0,
    endsAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    startsAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    viewingStart: '2026-01-19T09:00:00',
    viewingEnd: '2026-01-20T16:00:00',
    registrationDeadline: new Date(Date.now() + 47 * 3600000).toISOString(),
    organizer: MOCK_ORGANIZERS[3],
    inspection: { status: 'available', score: 92 },
    metrics: { viewers: 0, registeredBidders: 2 },
  },
  {
    id: 'auc-6',
    reference: 'AUC-2026-041',
    status: 'completed',
    vehicle: {
      id: 'v6',
      title: 'RANGE ROVER Sport HSE Dynamic',
      image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80',
      year: 2021,
      mileage: '45,200 km',
      fuel: 'Diesel',
      transmission: 'Automatic',
      location: 'Nairobi (Kilimani)',
      category: 'luxury',
    },
    currentBid: 11200000,
    startingBid: 9500000,
    reservePrice: 10800000,
    bidsCount: 18,
    endsAt: '2026-01-14T17:00:00',
    startsAt: '2026-01-14T09:00:00',
    viewingStart: '2026-01-08T10:00:00',
    viewingEnd: '2026-01-13T18:00:00',
    registrationDeadline: '2026-01-13T17:00:00',
    organizer: MOCK_ORGANIZERS[0],
    inspection: { status: 'available', score: 94 },
    metrics: { viewers: 456, registeredBidders: 12 },
    winnerAlias: 'A-104',
  },
  {
    id: 'auc-7',
    reference: 'AUC-2026-042',
    status: 'completed',
    vehicle: {
      id: 'v7',
      title: 'TOYOTA Corolla Cross Hybrid',
      image: 'https://images.unsplash.com/photo-1623869675781-80aa31012a5a?auto=format&fit=crop&w=800&q=80',
      year: 2022,
      mileage: '22,100 km',
      fuel: 'Hybrid',
      transmission: 'Automatic',
      location: 'Kisumu',
      category: 'bank',
    },
    currentBid: 3200000,
    startingBid: 2800000,
    reservePrice: 3000000,
    bidsCount: 11,
    endsAt: '2026-01-13T15:00:00',
    startsAt: '2026-01-13T10:00:00',
    viewingStart: '2026-01-07T09:00:00',
    viewingEnd: '2026-01-12T17:00:00',
    registrationDeadline: '2026-01-12T16:00:00',
    organizer: MOCK_ORGANIZERS[2],
    inspection: { status: 'available', score: 91 },
    metrics: { viewers: 234, registeredBidders: 8 },
    winnerAlias: 'B-227',
  },
];

const CATEGORIES: Category[] = [
  { id: 'bank', name: 'Bank Repossessions', count: 45, icon: <Landmark className="w-6 h-6" /> },
  { id: 'dealer', name: 'Dealer Clearance', count: 32, icon: <CarIcon className="w-6 h-6" /> },
  { id: 'fleet', name: 'Fleet Disposal', count: 18, icon: <Bus className="w-6 h-6" /> },
  { id: 'government', name: 'Government Auctions', count: 12, icon: <Building className="w-6 h-6" /> },
  { id: 'import', name: 'Direct Imports', count: 28, icon: <Globe className="w-6 h-6" /> },
  { id: 'luxury', name: 'Luxury Vehicles', count: 24, icon: <Gem className="w-6 h-6" /> },
];

const LEARNING_ARTICLES: LearningArticle[] = [
  { id: '1', title: 'How Vehicle Auctions Work', description: 'Understanding the basics of online vehicle auctions, from registration to winning.', icon: <Gavel className="w-5 h-5" />, readTime: '5 min' },
  { id: '2', title: 'Understanding Bid Security', description: 'Learn about refundable deposits and how to protect your bidding commitment.', icon: <Shield className="w-5 h-5" />, readTime: '4 min' },
  { id: '3', title: 'Booking Vehicle Inspections', description: 'How to schedule and prepare for pre-auction vehicle inspections.', icon: <ClipboardCheck className="w-5 h-5" />, readTime: '3 min' },
  { id: '4', title: 'Preparing to Bid', description: 'Checklist for first-time bidders to ensure a smooth auction experience.', icon: <CheckCircle2 className="w-5 h-5" />, readTime: '6 min' },
  { id: '5', title: 'Winning an Auction', description: 'What happens after you win and how to proceed with payment.', icon: <Trophy className="w-5 h-5" />, readTime: '4 min' },
  { id: '6', title: 'Vehicle Collection Process', description: 'Complete guide to collecting your won vehicle, including documentation.', icon: <Truck className="w-5 h-5" />, readTime: '5 min' },
  { id: '7', title: 'Ownership Transfer', description: 'Understanding the legal requirements for transferring vehicle ownership.', icon: <FileCheck className="w-5 h-5" />, readTime: '7 min' },
];

// Helper Functions
const formatCurrency = (amount: number) => `Ksh ${amount.toLocaleString()}`;
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
};
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
};
const formatTimeRemaining = (endTime: string): string => {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) {
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
};

// Components

const HeroSummary: React.FC<{ liveCount: number; todayCount: number; scheduledCount: number; biddersCount: number; viewersCount: number; nextAuctionTime: string }> = ({
  liveCount, todayCount, scheduledCount, biddersCount, viewersCount, nextAuctionTime
}) => (
  <div className="bg-gradient-to-br from-[#1E3063] to-[#2a4080] py-12">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
        {[
          { label: 'Live Auctions', value: liveCount, icon: <Radio className="w-5 h-5" />, color: 'text-red-400' },
          { label: "Today's Events", value: todayCount, icon: <Calendar className="w-5 h-5" />, color: 'text-emerald-400' },
          { label: 'Scheduled', value: scheduledCount, icon: <Clock className="w-5 h-5" />, color: 'text-blue-400' },
          { label: 'Active Bidders', value: biddersCount, icon: <Users className="w-5 h-5" />, color: 'text-amber-400' },
          { label: 'Spectators', value: viewersCount, icon: <Eye className="w-5 h-5" />, color: 'text-purple-400' },
          { label: 'Next Starts In', value: nextAuctionTime, icon: <CalendarClock className="w-5 h-5" />, color: 'text-cyan-400', isText: true },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className={`flex items-center justify-center mb-2 ${item.color}`}>
              {item.icon}
            </div>
            {item.isText ? (
              <p className="text-lg font-bold text-white">{item.value}</p>
            ) : (
              <p className="text-2xl font-black text-white">{item.value}</p>
            )}
            <p className="text-xs text-slate-300 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LiveAuctionCard: React.FC<{ auction: Auction; onWatch: () => void }> = ({ auction, onWatch }) => (
  <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300">
    <div className="relative">
      <img
        src={auction.vehicle.image}
        alt={auction.vehicle.title}
        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute top-3 left-3 flex gap-2">
        <Badge className="bg-red-600 text-white">
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          LIVE
        </Badge>
        {auction.inspection.status === 'available' && (
          <Badge className="bg-emerald-500 text-white">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Inspected
          </Badge>
        )}
      </div>
      <div className="absolute top-3 right-3">
        <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
          <Bookmark className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
    <div className="p-4">
      <p className="text-xs text-slate-500 font-mono mb-1">{auction.reference}</p>
      <h3 className="font-bold text-[#1E3063] text-sm mb-2 line-clamp-1">{auction.vehicle.title}</h3>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <MapPin className="w-3 h-3" />
        <span>{auction.vehicle.location}</span>
      </div>
      <div className="bg-gradient-to-br from-[#1E3063] to-[#2a4080] rounded-lg p-3 text-white mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-300">Current Bid</p>
            <p className="text-lg font-black">{formatCurrency(auction.currentBid)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-300">Ends In</p>
            <p className="text-sm font-bold text-amber-300">{formatTimeRemaining(auction.endsAt)}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span>{auction.bidsCount} bids</span>
        <span>{auction.metrics.viewers} watching</span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-[#1E3063] flex items-center justify-center text-white text-xs font-bold">
          {auction.organizer.name.charAt(0)}
        </div>
        <span className="text-xs text-slate-600 truncate">{auction.organizer.name}</span>
        {auction.organizer.verified && <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
      </div>
      <Button className="w-full bg-[#C85A32] hover:bg-[#a84a28]" onClick={onWatch}>
        <Play className="w-4 h-4 mr-2" />
        Watch Live
      </Button>
    </div>
  </Card>
);

const UpcomingAuctionCard: React.FC<{ auction: Auction; onRegister: () => void }> = ({ auction, onRegister }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all">
    <div className="flex gap-4 p-4">
      <img
        src={auction.vehicle.image}
        alt={auction.vehicle.title}
        className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-blue-100 text-blue-700 text-xs">
            <CalendarClock className="w-3 h-3 mr-1" />
            Starts {formatDate(auction.startsAt)}
          </Badge>
          {auction.inspection.status === 'available' && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
              <ClipboardCheck className="w-3 h-3 mr-1" />
              Inspected
            </Badge>
          )}
        </div>
        <h3 className="font-bold text-[#1E3063] text-sm mb-1">{auction.vehicle.title}</h3>
        <p className="text-xs text-slate-500 mb-2">{auction.vehicle.year} • {auction.vehicle.mileage}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            <span>{auction.organizer.name}</span>
            {auction.organizer.verified && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
          </div>
        </div>
      </div>
    </div>
    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="bg-slate-50 p-2 rounded">
          <p className="text-slate-500">Viewing</p>
          <p className="font-medium text-slate-700">{formatDate(auction.viewingStart)} - {formatDate(auction.viewingEnd)}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded">
          <p className="text-slate-500">Registration</p>
          <p className="font-medium text-slate-700">{formatDate(auction.registrationDeadline)} by {formatTime(auction.registrationDeadline)}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <BookmarkPlus className="w-4 h-4 mr-1" />
          Save Reminder
        </Button>
        <Button size="sm" className="flex-1 bg-[#C85A32] hover:bg-[#a84a28]" onClick={onRegister}>
          <UserPlus className="w-4 h-4 mr-1" />
          Register Interest
        </Button>
      </div>
    </div>
  </Card>
);

const CompletedAuctionCard: React.FC<{ auction: Auction }> = ({ auction }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all">
    <div className="flex gap-4 p-4">
      <img
        src={auction.vehicle.image}
        alt={auction.vehicle.title}
        className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-slate-100 text-slate-600 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
          <span className="text-xs text-slate-500">{formatDate(auction.endsAt)}</span>
        </div>
        <h3 className="font-bold text-[#1E3063] text-sm mb-1">{auction.vehicle.title}</h3>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Building2 className="w-3 h-3" />
          <span>{auction.organizer.name}</span>
        </div>
      </div>
    </div>
    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500">Final Price</p>
          <p className="text-lg font-black text-[#1E3063]">{formatCurrency(auction.currentBid)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Winner</p>
          <p className="font-bold text-emerald-600">{auction.winnerAlias}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span>{auction.bidsCount} bids</span>
        <span>{auction.bidsCount > 10 ? 'Competitive' : 'Standard'}</span>
      </div>
      <Button variant="outline" size="sm" className="w-full">
        <FileText className="w-4 h-4 mr-1" />
        View Results
      </Button>
    </div>
  </Card>
);

const OrganizerCard: React.FC<{ organizer: Organizer }> = ({ organizer }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all">
    <div className="p-4">
      <div className="flex items-start gap-3 mb-4">
        <img
          src={organizer.logo}
          alt={organizer.name}
          className="w-16 h-16 rounded-xl object-cover bg-slate-100"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-[#1E3063] text-sm truncate">{organizer.name}</h3>
            {organizer.verified && <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-slate-500 capitalize">{organizer.type}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-0.5 text-xs text-amber-500">
              <Star className="w-3 h-3 fill-amber-500" />
              {organizer.rating}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">{organizer.yearsOnKAYAD} years</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-black text-[#1E3063]">{organizer.completedAuctions}</p>
          <p className="text-xs text-slate-500">Completed</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-black text-emerald-600">{organizer.upcomingEvents}</p>
          <p className="text-xs text-slate-500">Upcoming</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span>{organizer.followers.toLocaleString()} followers</span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <Eye className="w-4 h-4 mr-1" />
          View Profile
        </Button>
        <Button size="sm" className="flex-1 bg-[#C85A32] hover:bg-[#a84a28]">
          <Bell className="w-4 h-4 mr-1" />
          Follow
        </Button>
      </div>
    </div>
  </Card>
);

const CategoryCard: React.FC<{ category: Category }> = ({ category }) => (
  <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-[#1E3063]/10 flex items-center justify-center text-[#1E3063] group-hover:bg-[#1E3063] group-hover:text-white transition-colors">
        {category.icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-[#1E3063] text-sm">{category.name}</h3>
        <p className="text-xs text-slate-500">{category.count} auctions</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#1E3063] transition-colors" />
    </div>
  </Card>
);

const LearningArticleCard: React.FC<{ article: LearningArticle }> = ({ article }) => (
  <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
        {article.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-[#1E3063] text-sm mb-1 group-hover:text-[#C85A32] transition-colors">
          {article.title}
        </h3>
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{article.description}</p>
        <span className="text-xs text-slate-400">{article.readTime} read</span>
      </div>
    </div>
  </Card>
);

const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#C85A32] to-[#a84a28] py-12">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <Mail className="w-12 h-12 text-white/80 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">Stay in the Loop</h2>
        <p className="text-white/80 mb-6">
          Get notified about new auctions, featured vehicles, and exclusive events.
        </p>
        {subscribed ? (
          <div className="flex items-center justify-center gap-2 text-white">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Thanks for subscribing!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <Button type="submit" className="bg-white text-[#C85A32] hover:bg-white/90 px-6">
              Subscribe
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

// Main Component
const AuctionDiscoveryNetwork: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategories, setSelectedCategories] = useState<AuctionType[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const liveAuctions = MOCK_AUCTIONS.filter(a => a.status === 'live');
  const upcomingAuctions = MOCK_AUCTIONS.filter(a => a.status === 'upcoming');
  const completedAuctions = MOCK_AUCTIONS.filter(a => a.status === 'completed');

  const regions = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu'];

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Hero Summary */}
      <HeroSummary
        liveCount={liveAuctions.length}
        todayCount={liveAuctions.length + upcomingAuctions.filter(a => {
          const startsAt = new Date(a.startsAt);
          const today = new Date();
          return startsAt.toDateString() === today.toDateString();
        }).length}
        scheduledCount={upcomingAuctions.length}
        biddersCount={MOCK_AUCTIONS.reduce((sum, a) => sum + a.metrics.registeredBidders, 0)}
        viewersCount={MOCK_AUCTIONS.reduce((sum, a) => sum + a.metrics.viewers, 0)}
        nextAuctionTime={upcomingAuctions.length > 0 ? formatTimeRemaining(upcomingAuctions[0].startsAt) : 'N/A'}
      />

      {/* Search and Filters */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search vehicles, organizers, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20 focus:border-[#1E3063]"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="hidden md:flex"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <div className="hidden md:flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-[#1E3063] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-[#1E3063] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl animate-fade-in">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">Region</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20">
                    <option>All Regions</option>
                    {regions.map(r => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">Category</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20">
                    <option>All Categories</option>
                    {CATEGORIES.map(c => (
                      <option key={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">Price Range</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20">
                    <option>Any Price</option>
                    <option>Under Ksh 1M</option>
                    <option>Ksh 1M - 5M</option>
                    <option>Ksh 5M - 15M</option>
                    <option>Over Ksh 15M</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">Auction Type</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20">
                    <option>All Types</option>
                    <option>Bank Repossessions</option>
                    <option>Dealer Clearance</option>
                    <option>Fleet Disposal</option>
                    <option>Government Auctions</option>
                    <option>Luxury Vehicles</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Live Now */}
        {liveAuctions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#1E3063]">Live Now</h2>
                  <p className="text-sm text-slate-500">{liveAuctions.length} active auctions</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                View All Live
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveAuctions.map(auction => (
                <LiveAuctionCard
                  key={auction.id}
                  auction={auction}
                  onWatch={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        {/* Starting Soon */}
        {upcomingAuctions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#1E3063]">Starting Soon</h2>
                  <p className="text-sm text-slate-500">Beginning within 24 hours</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                View All Upcoming
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {upcomingAuctions.slice(0, 4).map(auction => (
                <UpcomingAuctionCard
                  key={auction.id}
                  auction={auction}
                  onRegister={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        {/* Today's Timeline */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1E3063]">Today's Auctions</h2>
              <p className="text-sm text-slate-500">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>
          <Card className="p-6">
            <div className="space-y-4">
              {[
                { period: 'Morning', time: '09:00', auction: liveAuctions[0] },
                { period: 'Afternoon', time: '14:00', auction: upcomingAuctions[0] },
                { period: 'Evening', time: '18:00', auction: upcomingAuctions[1] },
              ].map((slot, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="text-center w-20 flex-shrink-0">
                    <p className="text-xs text-slate-500 uppercase">{slot.period}</p>
                    <p className="text-lg font-bold text-[#1E3063]">{slot.time}</p>
                  </div>
                  <div className="w-px h-12 bg-slate-200" />
                  {slot.auction ? (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={slot.auction.vehicle.image}
                        alt={slot.auction.vehicle.title}
                        className="w-16 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1E3063] text-sm truncate">{slot.auction.vehicle.title}</p>
                        <p className="text-xs text-slate-500">{slot.auction.organizer.name}</p>
                      </div>
                      <Badge className={slot.auction.status === 'live' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                        {slot.auction.status === 'live' ? 'Live' : formatTimeRemaining(slot.auction.startsAt)}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 flex-1">No auction scheduled</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* This Week Calendar */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#1E3063]">This Week</h2>
                <p className="text-sm text-slate-500">Jan 15 - Jan 21, 2026</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <MapPin className="w-4 h-4 mr-1" />
                Kenya
              </Button>
              <Button variant="outline" size="sm">
                <CarIcon className="w-4 h-4 mr-1" />
                All Types
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <div key={day} className="text-center">
                <p className="text-xs text-slate-500 mb-2">{day}</p>
                <div className={`p-3 rounded-xl ${i === 2 || i === 4 ? 'bg-[#1E3063] text-white' : 'bg-slate-100 text-slate-600'} ${i === 2 ? 'ring-2 ring-[#C85A32]' : ''}`}>
                  <p className="text-lg font-bold">{15 + i}</p>
                  <p className="text-xs">{i === 2 || i === 4 ? '2 events' : i === 0 ? '1 event' : 'None'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Organizers */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#1E3063]">Featured Organizers</h2>
                <p className="text-sm text-slate-500">Trusted auction hosts</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Browse All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_ORGANIZERS.slice(0, 6).map(organizer => (
              <OrganizerCard key={organizer.id} organizer={organizer} />
            ))}
          </div>
        </section>

        {/* Auction Categories */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                <Grid className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#1E3063]">Browse by Category</h2>
                <p className="text-sm text-slate-500">Find auctions by type</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map(category => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>

        {/* Recently Completed */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#1E3063]">Recently Completed</h2>
                <p className="text-sm text-slate-500">Latest auction results</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View All Results
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedAuctions.map(auction => (
              <CompletedAuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        </section>

        {/* Replay Archive */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#1E3063]">Replay Archive</h2>
                <p className="text-sm text-slate-500">Watch auction summaries</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Browse Archive
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {completedAuctions.slice(0, 2).map(auction => (
              <Card key={auction.id} className="overflow-hidden">
                <div className="relative">
                  <img
                    src={auction.vehicle.image}
                    alt={auction.vehicle.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-xs opacity-80">Watch the full auction replay</p>
                    <h3 className="font-bold">{auction.vehicle.title}</h3>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-white/90 text-slate-700">
                      <Play className="w-3 h-3 mr-1" />
                      Replay
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-xs text-slate-500">Final Price</p>
                      <p className="font-bold text-[#1E3063] text-sm">{formatCurrency(auction.currentBid)}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-xs text-slate-500">Bids</p>
                      <p className="font-bold text-[#1E3063] text-sm">{auction.bidsCount}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-xs text-slate-500">Duration</p>
                      <p className="font-bold text-[#1E3063] text-sm">8h 15m</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-xs text-slate-500">Reserve</p>
                      <p className="font-bold text-emerald-600 text-sm">{auction.currentBid >= (auction.reservePrice || 0) ? 'Met' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Auction Learning Center */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#1E3063]">Auction Learning Center</h2>
                <p className="text-sm text-slate-500">Everything you need to know</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View All Articles
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LEARNING_ARTICLES.map(article => (
              <LearningArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      </div>

      {/* Newsletter */}
      <NewsletterSection />

      {/* Bottom Spacing */}
      <div className="h-24" />
    </div>
  );
};

export default AuctionDiscoveryNetwork;
