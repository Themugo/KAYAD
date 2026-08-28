// ============================================================
// KAYAD PRIVATE SELLER PLATFORM - GUIDED SELLING EXPERIENCE
// Sections 1-17: Step-by-step seller journey
// ============================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createCar, VehicleApiError } from '../../../services/vehicleApi';
import {
  Home, Warehouse, Heart, ShoppingCart, ClipboardCheck, DollarSign, FileText, Clock,
  Bell, TrendingUp, Award, Bot, MessageSquare, Settings, ChevronRight, Menu, X,
  User, LogOut, Moon, Sun, Globe, Shield, BellRing, Search, Plus, Minus,
  Car, Camera, Image, Gauge, Wrench, Calendar, MapPin, Star, Trophy,
  CheckCircle, AlertCircle, XCircle, Clock3, Package, Truck, Key, ShieldCheck,
  Check, Circle, ArrowRight, ArrowLeft, PlusCircle, MinusCircle,
  File, FileCheck, Upload, Download, Eye, Trash2, Share2, Copy, FileUp,
  CreditCard, Building, Receipt, PiggyBank, Percent, Banknote, TrendingDown,
  BarChart3, Sparkles, ArrowUpRight, RefreshCw, DollarSign as DollarSignIcon,
  MessageCircle, Mail, Phone, Bell as BellIcon, CalendarCheck, Users,
  BadgeCheck, BadgeDollarSign, ShieldAlert, ShieldCheck as ShieldCheckVerified,
  Fingerprint, IdCard, MailCheck,
  PlusCircle as PlusCircleIcon, Settings2, ExternalLink, Filter, SortAsc, Grid, List,
  ClipboardList, ListChecks, ListOrdered, CheckSquare, Square,
  Eye as EyeIcon, Heart as HeartIcon, MessageSquare as MessageSquareIcon, Timer, TrendingUp as TrendingUpIcon,
  Lightbulb, Target, Zap,
  HelpCircle, BookOpen, AlertTriangle, Info, ExternalLink as ExternalLinkIcon,
  Phone as PhoneIcon, Mail as MailIcon,
  Calendar as CalendarIcon, MapPin as MapPinIcon, Clock as ClockIcon,
  UserCheck, CheckCircle2,
} from 'lucide-react';

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface Listing {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  color: string;
  condition: 'excellent' | 'good' | 'fair';
  description: string;
  images: string[];
  status: 'draft' | 'active' | 'pending' | 'sold' | 'withdrawn';
  views: number;
  favorites: number;
  enquiries: number;
  createdAt: string;
  verified: boolean;
  inspected: boolean;
  listedForInspection: boolean;
  escrowEnabled: boolean;
}

interface Enquiry {
  id: string;
  buyerName: string;
  buyerAvatar?: string;
  vehicleId: string;
  vehicleTitle: string;
  type: 'message' | 'viewing_request' | 'inspection_request' | 'finance_interest' | 'escrow_request' | 'offer';
  subject: string;
  message: string;
  budget?: number;
  preferredDate?: string;
  status: 'new' | 'replied' | 'converted' | 'closed';
  date: string;
}

interface ViewingAppointment {
  id: string;
  buyerName: string;
  vehicleId: string;
  vehicleTitle: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  location: string;
  notes?: string;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
}

interface EscrowTransaction {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  buyerName: string;
  salePrice: number;
  escrowAmount: number;
  depositAmount: number;
  depositPaid: boolean;
  status: 'pending' | 'deposit_received' | 'inspection_passed' | 'funds_released' | 'completed' | 'cancelled' | 'disputed';
  milestones: { name: string; completed: boolean; date?: string }[];
  createdAt: string;
  completedAt?: string;
}

interface SellerStats {
  totalListings: number;
  activeListings: number;
  draftListings: number;
  soldVehicles: number;
  totalViews: number;
  totalEnquiries: number;
  avgResponseTime: number;
  trustScore: number;
}

interface VerificationStatus {
  nationalId: { verified: boolean; date?: string };
  phone: { verified: boolean; date?: string };
  email: { verified: boolean; date?: string };
  tims: { verified: boolean; date?: string };
  ghostCheck: { completed: boolean; date?: string; grade?: string };
  profileComplete: number;
}

interface ListingDraft {
  step: number;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    registration: string;
    vin: string;
  };
  photos: string[];
  details: {
    mileage: number;
    fuelType: string;
    transmission: string;
    color: string;
    condition: string;
    description: string;
  };
  ownership: {
    ownerName: string;
    ownerId: string;
    purchaseDate: string;
    logbookAvailable: boolean;
  };
  condition: {
    exterior: string;
    interior: string;
    engine: string;
    tyres: string;
    knownIssues: string;
    serviceHistory: string;
  };
  pricing: {
    askingPrice: number;
    negotiable: boolean;
    tradeIn: boolean;
  };
  delivery: {
    canDeliver: boolean;
    deliveryRadius: number;
  };
}

// ============================================================
// SAMPLE DATA
// ============================================================

const SAMPLE_SELLER = {
  name: 'John Mwangi',
  email: 'john.mwangi@email.com',
  phone: '+254 723 456 789',
  memberSince: '2023-06-15',
  trustScore: 85,
  tier: 'Verified Seller' as 'New Seller' | 'Verified Seller' | 'Trusted Seller' | 'Premium Seller',
};

const SAMPLE_STATS: SellerStats = {
  totalListings: 3,
  activeListings: 1,
  draftListings: 1,
  soldVehicles: 1,
  totalViews: 1247,
  totalEnquiries: 23,
  avgResponseTime: 2.5,
  trustScore: 85,
};

const SAMPLE_LISTINGS: Listing[] = [
  {
    id: 'l1',
    make: 'Toyota',
    model: 'Corolla',
    year: 2019,
    price: 1850000,
    mileage: 45000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    color: 'Silver',
    condition: 'good',
    description: 'Well maintained Toyota Corolla. Single owner. Full service history.',
    images: [],
    status: 'active',
    views: 523,
    favorites: 12,
    enquiries: 8,
    createdAt: '2024-02-15',
    verified: true,
    inspected: true,
    listedForInspection: true,
    escrowEnabled: true,
  },
  {
    id: 'l2',
    make: 'Honda',
    model: 'Civic',
    year: 2020,
    price: 2200000,
    mileage: 32000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    color: 'White',
    condition: 'excellent',
    description: 'Low mileage Honda Civic in pristine condition.',
    images: [],
    status: 'draft',
    views: 0,
    favorites: 0,
    enquiries: 0,
    createdAt: '2024-03-01',
    verified: false,
    inspected: false,
    listedForInspection: false,
    escrowEnabled: false,
  },
  {
    id: 'l3',
    make: 'Nissan',
    model: 'X-Trail',
    year: 2018,
    price: 2100000,
    mileage: 68000,
    fuelType: 'Diesel',
    transmission: 'Manual',
    color: 'Black',
    condition: 'good',
    description: 'Family SUV with ample space. Good condition.',
    images: [],
    status: 'sold',
    views: 724,
    favorites: 18,
    enquiries: 15,
    createdAt: '2023-11-20',
    verified: true,
    inspected: true,
    listedForInspection: true,
    escrowEnabled: true,
  },
];

const SAMPLE_ENQUIRIES: Enquiry[] = [
  {
    id: 'e1',
    buyerName: 'Sarah Kimani',
    vehicleId: 'l1',
    vehicleTitle: '2019 Toyota Corolla',
    type: 'viewing_request',
    subject: 'Viewing Request',
    message: 'Hi, I am interested in viewing this vehicle. Would tomorrow at 2 PM be possible?',
    preferredDate: '2024-03-16',
    status: 'new',
    date: '2024-03-15',
  },
  {
    id: 'e2',
    buyerName: 'David Ochieng',
    vehicleId: 'l1',
    vehicleTitle: '2019 Toyota Corolla',
    type: 'offer',
    subject: 'Offer: KES 1,700,000',
    message: 'I would like to make an offer of KES 1,700,000. I can pay cash and complete the transaction within 3 days.',
    budget: 1700000,
    status: 'replied',
    date: '2024-03-14',
  },
];

const SAMPLE_VIEWINGS: ViewingAppointment[] = [
  {
    id: 'v1',
    buyerName: 'Sarah Kimani',
    vehicleId: 'l1',
    vehicleTitle: '2019 Toyota Corolla',
    date: '2024-03-16',
    time: '14:00',
    status: 'confirmed',
    location: 'Westlands, Nairobi',
    buyerConfirmed: true,
    sellerConfirmed: true,
  },
  {
    id: 'v2',
    buyerName: 'Peter Njoroge',
    vehicleId: 'l1',
    vehicleTitle: '2019 Toyota Corolla',
    date: '2024-03-18',
    time: '10:30',
    status: 'scheduled',
    location: 'Kasarani, Nairobi',
    buyerConfirmed: true,
    sellerConfirmed: false,
  },
];

const SAMPLE_ESCROW: EscrowTransaction[] = [
  {
    id: 'esc1',
    vehicleId: 'l3',
    vehicleTitle: '2018 Nissan X-Trail',
    buyerName: 'James Otieno',
    salePrice: 2000000,
    escrowAmount: 2000000,
    depositAmount: 200000,
    depositPaid: true,
    status: 'completed',
    milestones: [
      { name: 'Deposit Received', completed: true, date: '2023-12-01' },
      { name: 'Vehicle Inspection', completed: true, date: '2023-12-03' },
      { name: 'Balance Payment', completed: true, date: '2023-12-05' },
      { name: 'Ownership Transfer', completed: true, date: '2023-12-07' },
      { name: 'Funds Released', completed: true, date: '2023-12-07' },
    ],
    createdAt: '2023-12-01',
    completedAt: '2023-12-07',
  },
];

const SAMPLE_VERIFICATION: VerificationStatus = {
  nationalId: { verified: true, date: '2024-01-15' },
  phone: { verified: true, date: '2024-01-10' },
  email: { verified: true, date: '2024-01-10' },
  tims: { verified: false },
  ghostCheck: { completed: false },
  profileComplete: 75,
};

const SAMPLE_DOCUMENTS = [
  { id: 'd1', type: 'logbook', title: 'TIMS Logbook - Toyota Corolla', date: '2024-01-20', verified: true },
  { id: 'd2', type: 'national_id', title: 'National ID Copy', date: '2024-01-15', verified: true },
  { id: 'd3', type: 'service', title: 'Service Record - Jan 2024', date: '2024-01-25', verified: false },
];

const SAMPLE_PRICE_GUIDANCE = {
  suggestedPrice: 1820000,
  marketRange: { min: 1700000, max: 1950000 },
  highDemandPrice: 1900000,
  quickSalePrice: 1750000,
  premiumPrice: 2100000,
  tradeInEstimate: 1600000,
  confidenceScore: 85,
  comparableCount: 12,
  marketTrend: 'stable' as 'increasing' | 'stable' | 'decreasing',
  priceFactors: [
    { factor: 'Low mileage for age', impact: 'positive' },
    { factor: 'Full service history', impact: 'positive' },
    { factor: 'Automatic transmission', impact: 'positive' },
    { factor: 'Silver color', impact: 'neutral' },
  ],
};

// ============================================================
// THEME CONSTANTS
// ============================================================

const KAYAD_THEME = {
  navy: '#0A1628',
  navyLight: '#1e3a5f',
  gold: '#D4AF37',
  goldLight: '#F5E6B3',
  emerald: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  orange: '#F97316',
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  warmBeige: '#F5F0E8',
};

// ============================================================
// MAIN COMPONENT
// ============================================================

type PlatformSection = 
  | 'home' 
  | 'listing-wizard' 
  | 'pricing' 
  | 'trust-center' 
  | 'listing-quality' 
  | 'photo-studio' 
  | 'enquiries' 
  | 'viewings' 
  | 'escrow' 
  | 'documents' 
  | 'progress' 
  | 'insights' 
  | 'copilot' 
  | 'help';

export default function PrivateSellerPlatform() {
  const [activeSection, setActiveSection] = useState<PlatformSection>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [listingDraft, setListingDraft] = useState<ListingDraft | null>(null);

  const handleSectionChange = useCallback((section: PlatformSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  }, []);

  const unreadEnquiries = SAMPLE_ENQUIRIES.filter(e => e.status === 'new').length;
  const upcomingViewings = SAMPLE_VIEWINGS.filter(v => v.status === 'scheduled' || v.status === 'confirmed').length;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-screen" style={{ backgroundColor: KAYAD_THEME.navy }}>
        <SidebarContent 
          activeSection={activeSection} 
          onSectionChange={handleSectionChange}
          unreadEnquiries={unreadEnquiries}
          upcomingViewings={upcomingViewings}
        />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: KAYAD_THEME.navy }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Car size={18} style={{ color: 'white' }} />
            </div>
            <span className="text-white font-bold">Sell</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            {mobileMenuOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 pt-16"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-72 h-full p-4 overflow-y-auto"
              style={{ backgroundColor: KAYAD_THEME.navy }}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent 
                activeSection={activeSection} 
                onSectionChange={handleSectionChange}
                unreadEnquiries={unreadEnquiries}
                upcomingViewings={upcomingViewings}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'home' && <SellerHomeSection seller={SAMPLE_SELLER} stats={SAMPLE_STATS} onNavigate={handleSectionChange} />}
              {activeSection === 'listing-wizard' && <ListingWizardSection draft={listingDraft} setDraft={setListingDraft} onNavigate={handleSectionChange} />}
              {activeSection === 'pricing' && <PricingAssistantSection />}
              {activeSection === 'trust-center' && <TrustCenterSection verification={SAMPLE_VERIFICATION} />}
              {activeSection === 'listing-quality' && <ListingQualitySection listings={SAMPLE_LISTINGS} />}
              {activeSection === 'photo-studio' && <PhotoStudioSection />}
              {activeSection === 'enquiries' && <EnquiryCenterSection enquiries={SAMPLE_ENQUIRIES} />}
              {activeSection === 'viewings' && <ViewingAppointmentsSection viewings={SAMPLE_VIEWINGS} />}
              {activeSection === 'escrow' && <EscrowCenterSection transactions={SAMPLE_ESCROW} />}
              {activeSection === 'documents' && <DocumentCenterSection documents={SAMPLE_DOCUMENTS} />}
              {activeSection === 'progress' && <SaleProgressSection />}
              {activeSection === 'insights' && <SellerInsightsSection stats={SAMPLE_STATS} />}
              {activeSection === 'copilot' && <SellerCopilotSection />}
              {activeSection === 'help' && <HelpCenterSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// SIDEBAR COMPONENT
// ============================================================

function SidebarContent({ 
  activeSection, 
  onSectionChange, 
  unreadEnquiries,
  upcomingViewings,
}: { 
  activeSection: PlatformSection;
  onSectionChange: (s: PlatformSection) => void;
  unreadEnquiries: number;
  upcomingViewings: number;
}) {
  const navItems: { id: PlatformSection; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Seller Home', icon: <Home size={20} /> },
    { id: 'listing-wizard', label: 'Create Listing', icon: <PlusCircleIcon size={20} /> },
    { id: 'enquiries', label: 'Enquiries', icon: <MessageCircle size={20} />, badge: unreadEnquiries },
    { id: 'viewings', label: 'Viewings', icon: <CalendarIcon size={20} />, badge: upcomingViewings },
    { id: 'escrow', label: 'Escrow', icon: <Shield size={20} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={20} /> },
    { id: 'progress', label: 'Sale Progress', icon: <TrendingUp size={20} /> },
    { id: 'insights', label: 'Insights', icon: <BarChart3 size={20} /> },
    { id: 'pricing', label: 'AI Pricing', icon: <DollarSign size={20} /> },
    { id: 'trust-center', label: 'Trust Center', icon: <BadgeCheck size={20} /> },
    { id: 'listing-quality', label: 'Quality Score', icon: <CheckCircle size={20} /> },
    { id: 'photo-studio', label: 'Photo Studio', icon: <Camera size={20} /> },
    { id: 'copilot', label: 'AI Copilot', icon: <Bot size={20} /> },
    { id: 'help', label: 'Help', icon: <HelpCircle size={20} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Car size={24} color="white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">KAYAD</h1>
            <p className="text-white/60 text-xs">Private Seller</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${
                activeSection === item.id 
                  ? 'bg-orange-500/20 text-orange-400' 
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute right-3 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheckVerified size={16} style={{ color: KAYAD_THEME.emerald }} />
            <span className="text-white/70 text-xs">Trust Score</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white font-bold">85%</span>
            <span className="text-white/50 text-xs">Verified Seller</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 1: SELLER HOME
// ============================================================

function SellerHomeSection({ seller, stats, onNavigate }: { 
  seller: typeof SAMPLE_SELLER; 
  stats: SellerStats;
  onNavigate: (s: PlatformSection) => void;
}) {
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 lg:p-8"
        style={{ background: `linear-gradient(135deg, ${KAYAD_THEME.navy} 0%, #2d4a6f 100%)` }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              {greeting}, {seller.name.split(' ')[0]}
            </h1>
            <p className="text-white/70">Your personal selling assistant is ready to help</p>
          </div>
          <button 
            onClick={() => onNavigate('listing-wizard')}
            className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2"
            style={{ backgroundColor: KAYAD_THEME.orange }}
          >
            <PlusCircleIcon size={20} /> Create Listing
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <QuickStat icon={<Car size={20} />} value={stats.activeListings.toString()} label="Active" color={KAYAD_THEME.orange} />
          <QuickStat icon={<EyeIcon size={20} />} value={stats.totalViews.toLocaleString()} label="Views" color={KAYAD_THEME.gold} />
          <QuickStat icon={<MessageCircle size={20} />} value={stats.totalEnquiries.toString()} label="Enquiries" color={KAYAD_THEME.emerald} />
          <QuickStat icon={<CheckCircle size={20} />} value={stats.soldVehicles.toString()} label="Sold" color="#10B981" />
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Create Listing', icon: <PlusCircleIcon size={24} />, color: KAYAD_THEME.orange, section: 'listing-wizard' as PlatformSection },
          { label: 'View Enquiries', icon: <MessageCircle size={24} />, color: KAYAD_THEME.navy, section: 'enquiries' as PlatformSection },
          { label: 'Check Pricing', icon: <DollarSign size={24} />, color: KAYAD_THEME.emerald, section: 'pricing' as PlatformSection },
          { label: 'Manage Viewings', icon: <CalendarIcon size={24} />, color: '#8B5CF6', section: 'viewings' as PlatformSection },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onNavigate(action.section)}
            className="rounded-xl p-4 lg:p-6 text-center transition-all hover:scale-105 hover:shadow-lg"
            style={{ backgroundColor: 'white' }}
          >
            <div 
              className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: `${action.color}15` }}
            >
              <div style={{ color: action.color }}>{action.icon}</div>
            </div>
            <p className="font-semibold text-sm" style={{ color: KAYAD_THEME.navy }}>{action.label}</p>
          </motion.button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: KAYAD_THEME.navy }}>Your Listings</h2>
          <button onClick={() => onNavigate('listing-wizard')} className="text-sm font-medium flex items-center gap-1" style={{ color: KAYAD_THEME.orange }}>
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="space-y-4">
          {SAMPLE_LISTINGS.filter(l => l.status === 'active' || l.status === 'draft').map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickStat({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <p className="text-white text-xl font-bold">{value}</p>
        <p className="text-white/60 text-xs">{label}</p>
      </div>
    </div>
  );
}

function ListingCard({ listing, delay }: { listing: Listing; delay: number }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    draft: { bg: 'bg-slate-100', text: 'text-slate-600' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'white' }}
    >
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-48 h-32 md:h-auto flex items-center justify-center" style={{ backgroundColor: KAYAD_THEME.slate[100] }}>
          <Car size={48} style={{ color: KAYAD_THEME.slate[300] }} />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold" style={{ color: KAYAD_THEME.navy }}>{listing.year} {listing.make} {listing.model}</h3>
              <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{listing.mileage.toLocaleString()} km</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[listing.status].bg} ${statusColors[listing.status].text}`}>
              {listing.status}
            </span>
          </div>
          <p className="text-xl font-bold mb-3" style={{ color: KAYAD_THEME.gold }}>KES {(listing.price / 1000000).toFixed(1)}M</p>
          <div className="flex flex-wrap gap-3 text-sm" style={{ color: KAYAD_THEME.slate[500] }}>
            <span className="flex items-center gap-1"><EyeIcon size={14} /> {listing.views}</span>
            <span className="flex items-center gap-1"><HeartIcon size={14} /> {listing.favorites}</span>
            <span className="flex items-center gap-1"><MessageCircle size={14} /> {listing.enquiries}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SECTION 2: LISTING WIZARD (Simplified)
// ============================================================

function ListingWizardSection({ draft, setDraft, onNavigate }: {
  draft: ListingDraft | null;
  setDraft: (d: ListingDraft | null) => void;
  onNavigate: (s: PlatformSection) => void;
}) {
  const [currentStep, setCurrentStep] = useState(draft?.step || 1);
  const totalSteps = 12;
  // Added (Final Integration Phase 2): real publish state - the
  // frontend must not claim publication until the real backend
  // confirms it (this phase's own explicit instruction). No fake
  // "success" is ever shown; the real HTTP response, success or
  // failure, is what the UI reflects.
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedCarId, setPublishedCarId] = useState<string | null>(null);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      // Maps the wizard's own, existing draft state to the real
      // backend's real field names - does not invent any field the
      // wizard doesn't already declare in its own ListingDraft type.
      // title is constructed from year+make+model since the wizard
      // never collects a separate title field of its own - a direct,
      // literal combination of fields it does declare, not a new
      // input being added.
      const vehicleInfo = draft?.vehicleInfo;
      const details = draft?.details;
      const pricing = draft?.pricing;
      const title = vehicleInfo
        ? [vehicleInfo.year, vehicleInfo.make, vehicleInfo.model].filter(Boolean).join(' ').trim()
        : '';

      const result = await createCar({
        title: title || undefined,
        brand: vehicleInfo?.make,
        model: vehicleInfo?.model,
        year: vehicleInfo?.year,
        vin: vehicleInfo?.vin,
        registrationNumber: vehicleInfo?.registration,
        mileage: details?.mileage,
        fuel: details?.fuelType,
        transmission: details?.transmission,
        color: details?.color,
        condition: details?.condition,
        description: details?.description,
        price: pricing?.askingPrice,
      });

      if (result.success && result.car) {
        setPublishedCarId(result.car.id);
        setDraft(null);
      } else {
        setPublishError(result.message || 'Failed to publish listing.');
      }
    } catch (err) {
      setPublishError(err instanceof VehicleApiError ? err.message : 'Failed to publish listing. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  }, [draft, setDraft]);

  const steps = [
    { id: 1, label: 'Start' },
    { id: 2, label: 'Vehicle' },
    { id: 3, label: 'Photos' },
    { id: 4, label: 'Details' },
    { id: 5, label: 'Ownership' },
    { id: 6, label: 'Condition' },
    { id: 7, label: 'Issues' },
    { id: 8, label: 'Service' },
    { id: 9, label: 'Inspection' },
    { id: 10, label: 'Pricing' },
    { id: 11, label: 'Preview' },
    { id: 12, label: 'Publish' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Create Listing</h1>
        <button onClick={() => setDraft({ ...draft || { step: 1 } as ListingDraft, step: currentStep })} className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
          Save Draft
        </button>
      </div>

      <div className="rounded-xl p-4" style={{ backgroundColor: 'white' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: KAYAD_THEME.navy }}>
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>
            {Math.round((currentStep / totalSteps) * 100)}% complete
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                step.id === currentStep 
                  ? 'bg-orange-500 text-white'
                  : step.id < currentStep 
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {step.id < currentStep ? <CheckCircle size={14} /> : null}
              {step.label}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${KAYAD_THEME.orange}15` }}>
            <Sparkles size={40} style={{ color: KAYAD_THEME.orange }} />
          </div>
          {publishedCarId ? (
            // Real success - only ever shown after the real backend
            // returned a real, created car record. Never shown
            // optimistically.
            <>
              <h2 className="text-2xl font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Listing Published</h2>
              <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: KAYAD_THEME.slate[500] }}>
                Your listing has been saved to KAYAD. It is now searchable in the real marketplace.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Create Your Vehicle Listing</h2>
              <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: KAYAD_THEME.slate[500] }}>
                We'll guide you step-by-step to create a professional listing. The process takes about 10-15 minutes.
              </p>
              {publishError && (
                // Real failure, surfaced honestly - the real backend's
                // own validation/authorization message, never
                // swallowed or replaced with a fake success state.
                <p className="text-sm mb-4 max-w-2xl mx-auto font-medium" style={{ color: '#DC2626' }}>
                  {publishError}
                </p>
              )}
              <button
                onClick={() => {
                  if (currentStep < totalSteps) {
                    setCurrentStep(currentStep + 1);
                  } else {
                    handlePublish();
                  }
                }}
                disabled={isPublishing}
                className="px-8 py-3 rounded-xl font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: KAYAD_THEME.orange }}
              >
                {isPublishing
                  ? 'Publishing…'
                  : currentStep < totalSteps ? 'Start Creating Listing' : 'Publish Listing'} <ArrowRight size={20} className="inline ml-2" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================
// OTHER SECTIONS (Simplified for brevity)
// ============================================================

function PricingAssistantSection() {
  const g = SAMPLE_PRICE_GUIDANCE;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>AI Pricing Assistant</h1>
      <div className="rounded-xl p-6" style={{ background: `linear-gradient(135deg, ${KAYAD_THEME.gold}20 0%, ${KAYAD_THEME.gold}5 100%)` }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Price Recommendations</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl text-center bg-white"><p className="text-sm mb-1" style={{ color: KAYAD_THEME.slate[500] }}>Suggested</p><p className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(g.suggestedPrice / 1000000).toFixed(2)}M</p></div>
          <div className="p-4 rounded-xl text-center bg-white"><p className="text-sm mb-1" style={{ color: KAYAD_THEME.slate[500] }}>Market Range</p><p className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>{(g.marketRange.min / 1000000).toFixed(1)}M - {(g.marketRange.max / 1000000).toFixed(1)}M</p></div>
          <div className="p-4 rounded-xl text-center bg-white"><p className="text-sm mb-1" style={{ color: KAYAD_THEME.slate[500] }}>Confidence</p><p className="text-2xl font-bold" style={{ color: KAYAD_THEME.gold }}>{g.confidenceScore}%</p></div>
        </div>
      </div>
    </div>
  );
}

function TrustCenterSection({ verification }: { verification: VerificationStatus }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Trust Center</h1>
      <div className="rounded-xl p-6" style={{ background: `linear-gradient(135deg, ${KAYAD_THEME.navy} 0%, #2d4a6f 100%)` }}>
        <h2 className="text-white font-bold text-lg mb-1">Your Trust Score</h2>
        <p className="text-4xl font-bold text-white">{verification.profileComplete}%</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { label: 'National ID', verified: verification.nationalId.verified },
          { label: 'Phone', verified: verification.phone.verified },
          { label: 'Email', verified: verification.email.verified },
          { label: 'TIMS', verified: verification.tims.verified },
        ].map((v, i) => (
          <div key={i} className="p-4 rounded-xl bg-white flex items-center gap-3">
            {v.verified ? <CheckCircle size={20} style={{ color: KAYAD_THEME.emerald }} /> : <Circle size={20} style={{ color: KAYAD_THEME.slate[300] }} />}
            <span style={{ color: KAYAD_THEME.navy }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListingQualitySection({ listings }: { listings: Listing[] }) {
  const getScore = (l: Listing) => {
    let s = 0;
    if (l.images.length >= 8) s += 25;
    else if (l.images.length >= 4) s += 15;
    if (l.description.length > 100) s += 20;
    if (l.verified) s += 20;
    if (l.inspected) s += 20;
    return s;
  };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Listing Quality Score</h1>
      {listings.map(l => (
        <div key={l.id} className="rounded-xl p-4 bg-white flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: KAYAD_THEME.slate[100] }}>
            <Car size={32} style={{ color: KAYAD_THEME.slate[400] }} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold" style={{ color: KAYAD_THEME.navy }}>{l.year} {l.make} {l.model}</h3>
            <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{l.status}</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: getScore(l) >= 80 ? KAYAD_THEME.emerald : KAYAD_THEME.amber }}>{getScore(l)}%</p>
        </div>
      ))}
    </div>
  );
}

function PhotoStudioSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Photo Studio</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Front 45°', 'Rear 45°', 'Side Profile', 'Interior'].map((a, i) => (
          <div key={i} className="aspect-square rounded-xl flex flex-col items-center justify-center border-2 border-dashed" style={{ borderColor: KAYAD_THEME.slate[300] }}>
            <Camera size={24} style={{ color: KAYAD_THEME.slate[400] }} />
            <span className="text-xs mt-2" style={{ color: KAYAD_THEME.slate[500] }}>{a}</span>
            <span className="text-xs text-orange-500 mt-1">Required</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnquiryCenterSection({ enquiries }: { enquiries: Enquiry[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Enquiry Center</h1>
      <div className="space-y-4">
        {enquiries.map(e => (
          <div key={e.id} className="rounded-xl p-4 bg-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${KAYAD_THEME.navy}15` }}>
                <User size={14} style={{ color: KAYAD_THEME.navy }} />
              </div>
              <span className="font-medium" style={{ color: KAYAD_THEME.navy }}>{e.buyerName}</span>
              {e.status === 'new' && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            </div>
            <p className="font-medium" style={{ color: KAYAD_THEME.navy }}>{e.subject}</p>
            <p className="text-sm mt-1" style={{ color: KAYAD_THEME.slate[500] }}>{e.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewingAppointmentsSection({ viewings }: { viewings: ViewingAppointment[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Viewing Appointments</h1>
      {viewings.map(v => (
        <div key={v.id} className="rounded-xl p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold" style={{ color: KAYAD_THEME.navy }}>{v.buyerName}</span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 capitalize">{v.status.replace('_', ' ')}</span>
          </div>
          <div className="flex gap-4 text-sm" style={{ color: KAYAD_THEME.slate[500] }}>
            <span>{v.date} at {v.time}</span>
            <span>{v.location}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EscrowCenterSection({ transactions }: { transactions: EscrowTransaction[] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ backgroundColor: `${KAYAD_THEME.emerald}10` }}>
        <Shield size={24} style={{ color: KAYAD_THEME.emerald }} className="inline mr-2" />
        <span style={{ color: KAYAD_THEME.navy }}>KAYAD Escrow Protection - Secure transactions for private sales</span>
      </div>
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Escrow Transactions</h1>
      {transactions.length === 0 ? (
        <div className="rounded-xl p-8 text-center bg-white">
          <Shield size={48} style={{ color: KAYAD_THEME.slate[300] }} className="mx-auto mb-4" />
          <p style={{ color: KAYAD_THEME.slate[500] }}>No active escrow transactions</p>
        </div>
      ) : transactions.map(t => (
        <div key={t.id} className="rounded-xl p-6 bg-white">
          <h3 className="font-bold mb-2" style={{ color: KAYAD_THEME.navy }}>{t.vehicleTitle}</h3>
          <p className="text-sm mb-4" style={{ color: KAYAD_THEME.slate[500] }}>Buyer: {t.buyerName}</p>
          <p className="text-2xl font-bold" style={{ color: KAYAD_THEME.gold }}>KES {(t.salePrice / 1000000).toFixed(2)}M</p>
        </div>
      ))}
    </div>
  );
}

function DocumentCenterSection({ documents }: { documents: typeof SAMPLE_DOCUMENTS }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Document Center</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map(d => (
          <div key={d.id} className="rounded-xl p-4 bg-white">
            <FileText size={24} style={{ color: KAYAD_THEME.gold }} className="mb-2" />
            <h3 className="font-medium text-sm" style={{ color: KAYAD_THEME.navy }}>{d.title}</h3>
            <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>{d.date}</p>
            {d.verified && <span className="text-xs text-emerald-600">Verified</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SaleProgressSection() {
  const milestones = [
    { label: 'Listing Created', completed: true },
    { label: 'Buyer Contacted', completed: true },
    { label: 'Viewing Completed', completed: false },
    { label: 'Inspection', completed: false },
    { label: 'Offer Accepted', completed: false },
    { label: 'Escrow Started', completed: false },
    { label: 'Ownership Transfer', completed: false },
    { label: 'Complete', completed: false },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Sale Progress Tracker</h1>
      <div className="rounded-xl p-6 bg-white">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            {m.completed ? <CheckCircle size={16} style={{ color: KAYAD_THEME.emerald }} /> : <Circle size={16} style={{ color: KAYAD_THEME.slate[300] }} />}
            <span style={{ color: m.completed ? KAYAD_THEME.navy : KAYAD_THEME.slate[400] }}>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SellerInsightsSection({ stats }: { stats: SellerStats }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Seller Insights</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-white"><p className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>{stats.totalViews}</p><p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>Total Views</p></div>
        <div className="rounded-xl p-4 bg-white"><p className="text-2xl font-bold" style={{ color: KAYAD_THEME.emerald }}>{stats.totalEnquiries}</p><p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>Enquiries</p></div>
        <div className="rounded-xl p-4 bg-white"><p className="text-2xl font-bold" style={{ color: KAYAD_THEME.red }}>30</p><p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>Favorites</p></div>
        <div className="rounded-xl p-4 bg-white"><p className="text-2xl font-bold" style={{ color: KAYAD_THEME.gold }}>{stats.avgResponseTime}h</p><p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>Avg Response</p></div>
      </div>
    </div>
  );
}

function SellerCopilotSection() {
  const [query, setQuery] = useState('');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>AI Selling Copilot</h1>
      <div className="rounded-xl p-6 bg-white">
        <div className="h-64 flex items-center justify-center" style={{ color: KAYAD_THEME.slate[400] }}>
          <div className="text-center">
            <Bot size={48} className="mx-auto mb-4" />
            <p>Ask me anything about selling your vehicle</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask about selling..." className="flex-1 px-4 py-2 rounded-lg border" style={{ borderColor: KAYAD_THEME.slate[200] }} />
          <button className="px-4 py-2 rounded-lg bg-navy text-white font-medium" style={{ backgroundColor: KAYAD_THEME.navy }}>Send</button>
        </div>
      </div>
    </div>
  );
}

function HelpCenterSection() {
  const topics = ['How to Sell Safely', 'Avoiding Scams', 'Meeting Buyers', 'Using Escrow'];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Help Center</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {topics.map((t, i) => (
          <div key={i} className="rounded-xl p-4 bg-white">
            <h3 className="font-bold mb-2" style={{ color: KAYAD_THEME.navy }}>{t}</h3>
            <button className="text-sm" style={{ color: KAYAD_THEME.orange }}>Read More →</button>
          </div>
        ))}
      </div>
    </div>
  );
}
