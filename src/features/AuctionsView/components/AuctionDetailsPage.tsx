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
  User,
  Users,
  FileText,
  Download,
  Phone,
  Mail,
  Eye,
  Heart,
  Share2,
  ClipboardCheck,
  BadgeCheck,
  Star,
  Award,
  MapPinned,
  Info,
  HelpCircle,
  Truck,
  CreditCard,
  BookOpen,
  Car,
  Settings,
  Watch,
  CalendarDays,
  AlertTriangle,
  Check,
  X,
  ExternalLink
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
  | 'viewing_open'
  | 'starts_tomorrow'
  | 'auction_live'
  | 'auction_closed'
  | 'winner_confirmed'
  | 'cancelled'
  | 'completed';

interface AuctionDetails {
  id: string;
  reference: string;
  status: AuctionStatus;
  vehicle: {
    title: string;
    year: number;
    mileage: string;
    fuel: string;
    transmission: string;
    engine: string;
    drive: string;
    body: string;
    condition: string;
    vin: string;
    images: string[];
    location: string;
  };
  auction: {
    currentBid: number;
    startingBid: number;
    reservePrice?: number;
    bidIncrement: number;
    bidsCount: number;
    startsAt: string;
    endsAt: string;
    viewingDates: { start: string; end: string };
  };
  organizer: {
    name: string;
    type: string;
    verified: boolean;
    completedAuctions: number;
    successRate: number;
    rating: number;
    yearsOnKAYAD: number;
    address: string;
    phone: string;
    email: string;
  };
  inspection: {
    status: 'available' | 'pending' | 'none';
    reportUrl?: string;
    partnerName?: string;
    cost?: number;
    availableDates?: string[];
  };
  documents: {
    id: string;
    name: string;
    url: string;
    type: 'inspection' | 'ownership' | 'logbook' | 'terms' | 'rules' | 'collection';
  }[];
}

// ============================================================
// Mock Data
// ============================================================

const MOCK_AUCTION: AuctionDetails = {
  id: 'auc-2026-1234',
  reference: 'AUC-2026-1234',
  status: 'auction_live',
  vehicle: {
    title: 'TOYOTA Land Cruiser 300 GX-R',
    year: 2022,
    mileage: '15,200 km',
    fuel: 'Petrol',
    transmission: 'Automatic',
    engine: '3.5L Twin-Turbo V6',
    drive: '4WD',
    body: 'SUV',
    condition: 'Excellent',
    vin: 'JT3AA2E88RB••••••',
    images: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
    ],
    location: 'Nairobi Vault, Karen',
  },
  auction: {
    currentBid: 16835000,
    startingBid: 14800000,
    reservePrice: 16500000,
    bidIncrement: 50000,
    bidsCount: 7,
    startsAt: '2026-01-15T09:00:00',
    endsAt: '2026-01-15T17:00:00',
    viewingDates: { start: '2026-01-10T09:00:00', end: '2026-01-14T17:00:00' },
  },
  organizer: {
    name: 'NCBA Bank Kenya',
    type: 'Verified Dealer',
    verified: true,
    completedAuctions: 156,
    successRate: 89.5,
    rating: 4.8,
    yearsOnKAYAD: 4,
    address: 'NCBA Tower, Upper Hill, Nairobi',
    phone: '+254 20 288 8000',
    email: 'auctions@ke.ncbagroup.com',
  },
  inspection: {
    status: 'available',
    reportUrl: '/inspection-report.pdf',
    partnerName: 'AutoInspect Kenya',
    cost: 8500,
    availableDates: ['2026-01-10', '2026-01-11', '2026-01-12'],
  },
  documents: [
    { id: 'doc-1', name: 'Inspection Report', url: '#', type: 'inspection' },
    { id: 'doc-2', name: 'Vehicle Ownership', url: '#', type: 'ownership' },
    { id: 'doc-3', name: 'Logbook Verification', url: '#', type: 'logbook' },
    { id: 'doc-4', name: 'Auction Terms', url: '#', type: 'terms' },
    { id: 'doc-5', name: 'Auction Rules', url: '#', type: 'rules' },
    { id: 'doc-6', name: 'Collection Instructions', url: '#', type: 'collection' },
  ],
};

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
    year: 'numeric',
  });
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================================
// Section Components
// ============================================================

// 1. Auction Status Banner
const StatusBanner: FC<{ status: AuctionStatus }> = ({ status }) => {
  const statusConfig: Record<AuctionStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    registration_open: { label: 'Registration Open', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: <User className="w-4 h-4" /> },
    viewing_open: { label: 'Viewing Open', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: <Eye className="w-4 h-4" /> },
    starts_tomorrow: { label: 'Auction Starts Tomorrow', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: <Clock className="w-4 h-4" /> },
    auction_live: { label: 'Auction Live', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: <Gavel className="w-4 h-4" /> },
    auction_closed: { label: 'Auction Closed', color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200', icon: <Clock className="w-4 h-4" /> },
    winner_confirmed: { label: 'Winner Confirmed', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: <Award className="w-4 h-4" /> },
    cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: <X className="w-4 h-4" /> },
    completed: { label: 'Completed', color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200', icon: <CheckCircle2 className="w-4 h-4" /> },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center justify-center gap-2 py-3 px-4 border-2 rounded-lg ${config.bgColor}`}>
      {config.icon}
      <span className={`font-bold text-sm ${config.color}`}>{config.label}</span>
    </div>
  );
};

// 2. Vehicle Hero Section
const VehicleHero: FC<{ auction: AuctionDetails; onImageChange: (index: number) => void; selectedImage: number }> = ({ 
  auction, 
  onImageChange,
  selectedImage 
}) => {
  const [isWatching, setIsWatching] = useState(false);

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Gallery */}
      <div className="space-y-4">
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
          <img 
            src={auction.vehicle.images[selectedImage]} 
            alt={auction.vehicle.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 flex gap-2">
            <Badge className="bg-red-600 text-white">LIVE</Badge>
            {auction.auction.reservePrice && auction.auction.currentBid >= auction.auction.reservePrice && (
              <Badge className="bg-emerald-600 text-white">Reserve Met</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {auction.vehicle.images.map((img, i) => (
            <button
              key={i}
              onClick={() => onImageChange(i)}
              className={`w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                selectedImage === i ? 'border-[#1E3063]' : 'border-transparent'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Info & Actions */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500 font-mono">{auction.reference}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1E3063] mb-2">
            {auction.vehicle.title}
          </h1>
          <p className="text-slate-600">{auction.vehicle.year} • {auction.vehicle.mileage} • {auction.vehicle.fuel}</p>
        </div>

        {/* Current Bid Card */}
        <Card className="p-5 bg-gradient-to-br from-[#1E3063] to-[#2a4080] text-white">
          <p className="text-sm text-slate-300 mb-1">Current Bid</p>
          <p className="text-3xl font-black mb-2">{formatCurrency(auction.auction.currentBid)}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">
              {auction.auction.bidsCount} bid{auction.auction.bidsCount !== 1 ? 's' : ''}
            </span>
            <div className="px-3 py-1 bg-white/20 rounded-full">
              <span className="text-sm font-bold flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Ends in 59:30
              </span>
            </div>
          </div>
        </Card>

        {/* Reserve Status */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            {auction.auction.currentBid >= (auction.auction.reservePrice || 0) ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Info className="w-5 h-5 text-amber-600" />
            )}
            <span className="text-sm text-slate-700">
              {auction.auction.currentBid >= (auction.auction.reservePrice || 0)
                ? 'Reserve price has been met'
                : `Reserve not yet met (${formatCurrency(auction.auction.reservePrice || 0)})`
              }
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="primary" 
            size="lg" 
            className="flex-1 bg-[#1E3063] hover:bg-[#2a4080]"
          >
            <Gavel className="w-5 h-5 mr-2" />
            Place Bid
          </Button>
          <Button variant="outline" size="lg" onClick={() => setIsWatching(!isWatching)}>
            <Heart className={`w-5 h-5 mr-2 ${isWatching ? 'fill-red-500 text-red-500' : ''}`} />
            {isWatching ? 'Watching' : 'Watch'}
          </Button>
          <Button variant="outline" size="lg">
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};

// 3. Auction Summary Card
const AuctionSummary: FC<{ auction: AuctionDetails }> = ({ auction }) => (
  <Card className="p-5">
    <h3 className="font-bold text-[#1E3063] mb-4">Auction Summary</h3>
    <div className="grid grid-cols-2 gap-4">
      {[
        { label: 'Starting Bid', value: formatCurrency(auction.auction.startingBid) },
        { label: 'Bid Increment', value: formatCurrency(auction.auction.bidIncrement) },
        { label: 'Starts', value: formatDate(auction.auction.startsAt) },
        { label: 'Ends', value: formatDate(auction.auction.endsAt) },
        { label: 'Viewing', value: `${formatDate(auction.auction.viewingDates.start)} - ${formatDate(auction.auction.viewingDates.end)}` },
        { label: 'Location', value: auction.vehicle.location },
      ].map((item, i) => (
        <div key={i}>
          <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
          <p className="text-sm font-bold text-slate-800">{item.value}</p>
        </div>
      ))}
    </div>
  </Card>
);

// 4. Organizer Trust Center
const OrganizerTrustCenter: FC<{ organizer: AuctionDetails['organizer'] }> = ({ organizer }) => (
  <Card className="p-5 border-2 border-emerald-100">
    <div className="flex items-start gap-4">
      <div className="w-16 h-16 rounded-xl bg-[#1E3063] flex items-center justify-center text-white text-xl font-black flex-shrink-0">
        {organizer.name.charAt(0)}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-[#1E3063] text-lg">{organizer.name}</h3>
          {organizer.verified && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-3">{organizer.type}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-2 bg-slate-50 rounded-lg text-center">
            <p className="text-lg font-black text-[#1E3063]">{organizer.completedAuctions}</p>
            <p className="text-[10px] text-slate-500">Auctions</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg text-center">
            <p className="text-lg font-black text-emerald-600">{organizer.successRate}%</p>
            <p className="text-[10px] text-slate-500">Success Rate</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg text-center">
            <p className="text-lg font-black text-amber-600 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              {organizer.rating}
            </p>
            <p className="text-[10px] text-slate-500">Rating</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg text-center">
            <p className="text-lg font-black text-[#1E3063]">{organizer.yearsOnKAYAD}</p>
            <p className="text-[10px] text-slate-500">Years</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-1" />
            View Profile
          </Button>
          <Button variant="outline" size="sm">
            <Phone className="w-4 h-4 mr-1" />
            Contact
          </Button>
        </div>
      </div>
    </div>

    {/* KAYAD Disclaimer */}
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          This auction is conducted by <strong>{organizer.name}</strong>. KAYAD provides the marketplace technology platform. All payments go directly to the organizer.
        </p>
      </div>
    </div>
  </Card>
);

// 5. Vehicle Overview
const VehicleOverview: FC<{ vehicle: AuctionDetails['vehicle'] }> = ({ vehicle }) => (
  <Card className="p-5">
    <h3 className="font-bold text-[#1E3063] mb-4">Vehicle Overview</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Year', value: vehicle.year },
        { label: 'Mileage', value: vehicle.mileage },
        { label: 'Fuel', value: vehicle.fuel },
        { label: 'Transmission', value: vehicle.transmission },
        { label: 'Engine', value: vehicle.engine },
        { label: 'Drive', value: vehicle.drive },
        { label: 'Body', value: vehicle.body },
        { label: 'Condition', value: vehicle.condition },
      ].map((item, i) => (
        <div key={i}>
          <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
          <p className="text-sm font-bold text-slate-800">{item.value}</p>
        </div>
      ))}
    </div>
    <div className="mt-4 pt-4 border-t border-slate-200">
      <p className="text-xs text-slate-500 mb-0.5">VIN</p>
      <p className="text-sm font-mono text-slate-700">{vehicle.vin}</p>
    </div>
  </Card>
);

// 6. Inspection Section
const InspectionSection: FC<{ inspection: AuctionDetails['inspection'] }> = ({ inspection }) => (
  <Card className="p-5">
    <h3 className="font-bold text-[#1E3063] mb-4">Inspection</h3>
    
    {inspection.status === 'available' ? (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          <div>
            <p className="font-bold text-emerald-800">Inspection Report Available</p>
            <p className="text-sm text-emerald-600">By {inspection.partnerName}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Inspection Cost</p>
            <p className="text-sm font-bold text-slate-800">{formatCurrency(inspection.cost || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Available Dates</p>
            <p className="text-sm font-bold text-slate-800">{inspection.availableDates?.length || 0} slots</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Download Report
          </Button>
          <Button variant="primary" size="sm" className="bg-[#1E3063]">
            <Calendar className="w-4 h-4 mr-1" />
            Book Inspection
          </Button>
        </div>
      </div>
    ) : (
      <div className="text-center py-6">
        <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 mb-3">No inspection report available yet</p>
        <Button variant="outline" size="sm">
          <Calendar className="w-4 h-4 mr-1" />
          Request Inspection
        </Button>
      </div>
    )}
  </Card>
);

// 7. Auction Timeline
const AuctionTimeline: FC<{ auction: AuctionDetails['auction']; status: AuctionStatus }> = ({ auction, status }) => {
  const steps = [
    { label: 'Published', done: true },
    { label: 'Viewing Open', done: true },
    { label: 'Registration', done: true },
    { label: 'Auction Live', done: true, current: status === 'auction_live' },
    { label: 'Auction Ends', done: false },
    { label: 'Winner', done: false },
    { label: 'Payment', done: false },
    { label: 'Collection', done: false },
  ];

  return (
    <Card className="p-5">
      <h3 className="font-bold text-[#1E3063] mb-4">Auction Timeline</h3>
      <div className="relative">
        <div className="absolute top-4 left-0 right-0 h-1 bg-slate-200" />
        <div 
          className="absolute top-4 left-0 h-1 bg-emerald-500 transition-all"
          style={{ width: '37.5%' }}
        />
        <div className="flex justify-between relative">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                step.current 
                  ? 'bg-red-500 text-white ring-4 ring-red-200' 
                  : step.done 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-200 text-slate-500'
              }`}>
                {step.current ? (
                  <Gavel className="w-4 h-4" />
                ) : step.done ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              <p className={`text-[10px] mt-2 text-center ${step.current ? 'text-red-600 font-bold' : step.done ? 'text-slate-700' : 'text-slate-400'}`}>
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

// 8. Register to Bid
const RegisterToBid: FC = () => (
  <Card className="p-5 bg-gradient-to-br from-[#1E3063] to-[#2a4080] text-white">
    <h3 className="font-bold text-lg mb-4">Register to Bid</h3>
    
    <div className="space-y-3 mb-6">
      {[
        'Complete bidder verification',
        'Pay Bid Security to Organizer directly',
        'Receive your bidder alias',
        'Place binding bids',
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-3 h-3" />
          </div>
          <span className="text-sm">{item}</span>
        </div>
      ))}
    </div>

    <div className="p-3 bg-white/10 rounded-xl mb-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs">
          <strong>Bid Security</strong> is paid directly to the Auction Organizer, not to KAYAD.
        </p>
      </div>
    </div>

    <Button variant="primary" size="lg" className="w-full bg-[#C85A32] hover:bg-[#a84a28]">
      <User className="w-5 h-5 mr-2" />
      Register to Bid
    </Button>
  </Card>
);

// 9. Winning Process
const WinningProcess: FC = () => (
  <Card className="p-5">
    <h3 className="font-bold text-[#1E3063] mb-4">After You Win</h3>
    <div className="space-y-4">
      {[
        { step: 1, title: 'Win Auction', desc: 'Receive confirmation and digital winning certificate' },
        { step: 2, title: 'Pay Organizer', desc: 'Transfer payment directly to the Auction Organizer' },
        { step: 3, title: 'Ownership Transfer', desc: 'Receive vehicle documentation and ownership change' },
        { step: 4, title: 'Collect Vehicle', desc: 'Arrange collection from the specified location' },
      ].map((item) => (
        <div key={item.step} className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-[#1E3063] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            {item.step}
          </div>
          <div>
            <p className="font-bold text-[#1E3063]">{item.title}</p>
            <p className="text-sm text-slate-500">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

// 10. Documents
const DocumentsSection: FC<{ documents: AuctionDetails['documents'] }> = ({ documents }) => (
  <Card className="p-5">
    <h3 className="font-bold text-[#1E3063] mb-4">Documents</h3>
    <div className="space-y-2">
      {documents.map((doc) => (
        <a
          key={doc.id}
          href={doc.url}
          className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{doc.name}</span>
          </div>
          <Download className="w-4 h-4 text-slate-400" />
        </a>
      ))}
    </div>
  </Card>
);

// 11. FAQ
const FAQSection: FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How do I inspect the vehicle?',
      a: 'Click "Book Inspection" to schedule a viewing through our certified inspection partners. Available dates are shown in the Inspection section.'
    },
    {
      q: 'How do I register to bid?',
      a: 'Click "Register to Bid" and complete the verification process. You will need to pay Bid Security directly to the Auction Organizer.'
    },
    {
      q: 'Who receives my Bid Security?',
      a: 'Bid Security is paid directly to the Auction Organizer, not to KAYAD. KAYAD provides the marketplace technology only.'
    },
    {
      q: 'Can I cancel my bid?',
      a: 'No. All bids are binding. Only bid if you intend to purchase the vehicle.'
    },
    {
      q: 'How do refunds work?',
      a: 'If you are outbid, your Bid Security will be released. Contact the Auction Organizer for specific refund procedures.'
    },
    {
      q: 'How do I collect the vehicle?',
      a: 'After paying the Organizer, you will receive collection instructions including the location, required documents, and contact person.'
    },
  ];

  return (
    <Card className="p-5">
      <h3 className="font-bold text-[#1E3063] mb-4">Frequently Asked Questions</h3>
      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium text-slate-800">{faq.q}</span>
              {openIndex === i ? <ChevronRight className="w-4 h-4 rotate-90" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4 text-sm text-slate-600">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

// ============================================================
// Main Component
// ============================================================

export const AuctionDetailsPage: FC<{ auctionId?: string }> = ({ auctionId }) => {
  // Use mock data - in production, fetch by auctionId
  const auction = MOCK_AUCTION;
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Status Banner */}
      <div className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <StatusBanner status={auction.status} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Hero */}
            <VehicleHero 
              auction={auction} 
              selectedImage={selectedImage}
              onImageChange={setSelectedImage}
            />

            {/* Auction Summary */}
            <AuctionSummary auction={auction} />

            {/* Organizer Trust Center */}
            <OrganizerTrustCenter organizer={auction.organizer} />

            {/* Vehicle Overview */}
            <VehicleOverview vehicle={auction.vehicle} />

            {/* Inspection */}
            <InspectionSection inspection={auction.inspection} />

            {/* Auction Timeline */}
            <AuctionTimeline auction={auction.auction} status={auction.status} />

            {/* Documents */}
            <DocumentsSection documents={auction.documents} />

            {/* FAQ */}
            <FAQSection />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Register to Bid */}
            <RegisterToBid />

            {/* Winning Process */}
            <WinningProcess />

            {/* Auction Disclaimer */}
            <AuctionDisclaimer variant="standard" />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex gap-3">
        <Button variant="outline" className="flex-1">
          <Heart className="w-4 h-4 mr-2" />
          Watch
        </Button>
        <Button variant="outline" className="flex-1">
          <Calendar className="w-4 h-4 mr-2" />
          Book Inspection
        </Button>
        <Button variant="primary" className="flex-1 bg-[#1E3063]">
          <Gavel className="w-4 h-4 mr-2" />
          Bid
        </Button>
      </div>
    </div>
  );
};

export default AuctionDetailsPage;
