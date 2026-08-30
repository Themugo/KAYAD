// ============================================================
// KAYAD BUYER PLATFORM - COMPLETE OWNERSHIP COMPANION
// Sections 1-18: Discovery → Purchase → Ownership → Upgrade
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  // Navigation & Layout
  Home, Warehouse, Heart, ShoppingCart, ClipboardCheck, DollarSign, FileText, Clock,
  Bell, TrendingUp, Award, Bot, MessageSquare, Settings, ChevronRight, Menu, X,
  User, LogOut, Moon, Sun, Globe, Shield, BellRing, Search, Plus, Minus,
  // Vehicle & Warehouse
  Car, Circle, Fuel, Gauge, Wrench, Calendar, MapPin, Star, Trophy,
  // Status & Health
  CheckCircle, AlertCircle, XCircle, Clock3, Package, Truck, Key, ShieldCheck,
  // Documents
  File, FileCheck, Upload, Download, Eye, Trash2, Share2, Copy,
  // Finance
  CreditCard, Building, Receipt, PiggyBank, Percent, Banknote,
  // Communication
  MessageCircle, Mail, Phone, Bell as BellIcon, CalendarCheck, Users,
  // Actions
  PlusCircle, Settings2, ExternalLink, Filter, SortAsc, Grid, List,
  // Value & Resale
  TrendingDown, BarChart3, Sparkles, ArrowUpRight, RefreshCw, Battery,
} from 'lucide-react';

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  registration: string;
  colour: string;
  mileage: number;
  fuelType: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';
  transmission: 'Automatic' | 'Manual';
  purchasePrice: number;
  currentValue: number;
  valueChange: number;
  purchaseDate: string;
  healthScore: number;
  inspectionGrade: string;
  images: string[];
  vin: string;
}

interface WatchlistItem {
  id: string;
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  price: number;
  image: string;
  addedDate: string;
  priceHistory: { date: string; price: number }[];
  availabilityAlert: boolean;
  priceAlert: boolean;
  inspectionAvailable: boolean;
  auctionReminder: boolean;
}

interface PurchaseJourney {
  id: string;
  vehicleId: string;
  vehicleName: string;
  status: 'viewed' | 'contacted' | 'inspection_booked' | 'finance_applied' | 'offer_submitted' | 'reserved' | 'purchased' | 'delivered' | 'ownership_transferred';
  statusDate: string;
  notes: string;
  dealer: string;
  price: number;
}

interface InspectionRecord {
  id: string;
  vehicleId: string;
  date: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  type: string;
  inspector: string;
  location: string;
  report?: string;
  certificate?: string;
  recommendations: string[];
  grade: string;
  cost: number;
}

interface FinanceAccount {
  id: string;
  vehicleId: string;
  type: 'loan' | 'lease' | 'hire_purchase';
  provider: string;
  accountNumber: string;
  totalAmount: number;
  monthlyPayment: number;
  remainingBalance: number;
  interestRate: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'paid_off' | 'defaulted';
  nextPaymentDate: string;
  documents: string[];
}

interface Document {
  id: string;
  vehicleId: string;
  type: 'sale_agreement' | 'inspection_report' | 'invoice' | 'receipt' | 'warranty' | 'insurance' | 'logbook' | 'registration' | 'service_record';
  title: string;
  date: string;
  fileUrl: string;
  fileSize: string;
  verified: boolean;
}

interface TimelineEvent {
  id: string;
  vehicleId: string;
  type: 'purchase' | 'service' | 'inspection' | 'insurance' | 'repair' | 'accessory' | 'resale_valuation' | 'finance' | 'registration';
  title: string;
  description: string;
  date: string;
  amount?: number;
  mileage?: number;
  documents?: string[];
}

interface ServiceReminder {
  id: string;
  vehicleId: string;
  type: 'oil_service' | 'brake_check' | 'tyres' | 'battery' | 'insurance_renewal' | 'inspection_renewal' | 'warranty_expiry' | 'general_service';
  title: string;
  description: string;
  dueDate: string;
  dueMileage?: number;
  currentMileage: number;
  urgent: boolean;
  completed: boolean;
  estimatedCost?: number;
}

interface Expense {
  id: string;
  vehicleId: string;
  category: 'fuel' | 'maintenance' | 'insurance' | 'parking' | 'repair' | 'loan_payment' | 'accessory' | 'tax' | 'other';
  title: string;
  amount: number;
  date: string;
  receipt?: string;
  recurring: boolean;
}

interface ResaleValuation {
  vehicleId: string;
  currentMarketValue: number;
  tradeInValue: number;
  recommendedAskingPrice: number;
  marketDemand: 'high' | 'medium' | 'low';
  bestListingTime: string;
  priceTrend: 'increasing' | 'stable' | 'decreasing';
  comparableVehicles: number;
  daysOnMarket: number;
  lastUpdated: string;
}

interface RewardPoint {
  id: string;
  type: 'inspection_discount' | 'dealer_offer' | 'finance_benefit' | 'referral_reward' | 'event_invitation';
  title: string;
  description: string;
  points: number;
  expiryDate: string;
  redeemed: boolean;
}

interface Message {
  id: string;
  sender: 'dealer' | 'system' | 'inspection' | 'finance' | 'support';
  senderName: string;
  subject: string;
  preview: string;
  content: string;
  date: string;
  read: boolean;
  vehicleId?: string;
  actionRequired: boolean;
  actions?: { label: string; url: string }[];
}

interface Notification {
  id: string;
  type: 'appointment' | 'reminder' | 'alert' | 'update' | 'message' | 'system';
  title: string;
  message: string;
  date: string;
  read: boolean;
  actionUrl?: string;
}

// ============================================================
// SAMPLE DATA
// ============================================================

const SAMPLE_USER = {
  name: 'James Karanja',
  email: 'james.karanja@email.com',
  phone: '+254 712 345 678',
  memberSince: '2021-03-15',
  tier: 'Gold' as 'Bronze' | 'Silver' | 'Gold' | 'Platinum',
  totalPurchases: 2,
  loyaltyPoints: 2450,
};

const SAMPLE_VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    make: 'Toyota',
    model: 'Land Cruiser GX-R',
    year: 2022,
    registration: 'KBZ 123A',
    colour: 'Pearl White',
    mileage: 45230,
    fuelType: 'Diesel',
    transmission: 'Automatic',
    purchasePrice: 8500000,
    currentValue: 7800000,
    valueChange: -8.2,
    purchaseDate: '2022-06-15',
    healthScore: 92,
    inspectionGrade: 'A-',
    images: [],
    vin: 'JTMCVREV0LD123456',
  },
  {
    id: 'v2',
    make: 'Mercedes-Benz',
    model: 'C-Class C300 AMG',
    year: 2023,
    registration: 'KBZ 456B',
    colour: 'Obsidian Black',
    mileage: 18000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    purchasePrice: 6200000,
    currentValue: 5800000,
    valueChange: -6.5,
    purchaseDate: '2023-01-20',
    healthScore: 95,
    inspectionGrade: 'A',
    images: [],
    vin: 'WDD2050231R123456',
  },
];

const SAMPLE_WATCHLIST: WatchlistItem[] = [
  {
    id: 'w1',
    vehicleId: 'w-v1',
    make: 'BMW',
    model: 'X5 xDrive40i',
    year: 2023,
    price: 8500000,
    image: '',
    addedDate: '2024-01-15',
    priceHistory: [
      { date: '2024-01-15', price: 8800000 },
      { date: '2024-02-01', price: 8650000 },
      { date: '2024-02-15', price: 8500000 },
    ],
    availabilityAlert: true,
    priceAlert: true,
    inspectionAvailable: true,
    auctionReminder: false,
  },
  {
    id: 'w2',
    vehicleId: 'w-v2',
    make: 'Audi',
    model: 'Q7 55 TFSI',
    year: 2022,
    price: 7200000,
    image: '',
    addedDate: '2024-02-01',
    priceHistory: [
      { date: '2024-02-01', price: 7200000 },
    ],
    availabilityAlert: false,
    priceAlert: true,
    inspectionAvailable: true,
    auctionReminder: true,
  },
];

const SAMPLE_PURCHASE_JOURNEYS: PurchaseJourney[] = [
  {
    id: 'p1',
    vehicleId: 'v1',
    vehicleName: '2022 Toyota Land Cruiser GX-R',
    status: 'ownership_transferred',
    statusDate: '2022-06-20',
    notes: 'Smooth transaction with full documentation',
    dealer: 'KAYAD Premium Dealers',
    price: 8500000,
  },
  {
    id: 'p2',
    vehicleId: 'v2',
    vehicleName: '2023 Mercedes-Benz C-Class C300 AMG',
    status: 'ownership_transferred',
    statusDate: '2023-01-25',
    notes: 'Finance approved, competitive rate',
    dealer: 'AutoHub Kenya',
    price: 6200000,
  },
];

const SAMPLE_INSPECTIONS: InspectionRecord[] = [
  {
    id: 'i1',
    vehicleId: 'v1',
    date: '2024-03-15',
    status: 'upcoming',
    type: 'Full Inspection',
    inspector: 'KAYAD Certified Inspector',
    location: 'KAYAD Inspection Center, Nairobi',
    recommendations: [],
    grade: '',
    cost: 25000,
  },
  {
    id: 'i2',
    vehicleId: 'v2',
    date: '2024-02-10',
    status: 'completed',
    type: 'Pre-purchase Inspection',
    inspector: 'KAYAD Certified Inspector',
    location: 'AutoHub Kenya Showroom',
    report: '/reports/i2.pdf',
    certificate: '/certificates/i2.pdf',
    recommendations: ['Minor brake pad wear detected', 'Recommend cabin filter replacement'],
    grade: 'A',
    cost: 20000,
  },
];

const SAMPLE_FINANCE: FinanceAccount[] = [
  {
    id: 'f1',
    vehicleId: 'v2',
    type: 'hire_purchase',
    provider: 'a partner bank',
    accountNumber: 'HP-2023-001234',
    totalAmount: 6200000,
    monthlyPayment: 145000,
    remainingBalance: 4350000,
    interestRate: 14.5,
    startDate: '2023-01-25',
    endDate: '2026-01-25',
    status: 'active',
    nextPaymentDate: '2024-04-25',
    documents: ['loan_agreement.pdf', 'insurance.pdf'],
  },
];

const SAMPLE_DOCUMENTS: Document[] = [
  { id: 'd1', vehicleId: 'v1', type: 'sale_agreement', title: 'Sale Agreement - Toyota Land Cruiser', date: '2022-06-15', fileUrl: '/docs/d1.pdf', fileSize: '245 KB', verified: true },
  { id: 'd2', vehicleId: 'v1', type: 'inspection_report', title: 'Inspection Report - Toyota Land Cruiser', date: '2024-02-10', fileUrl: '/docs/d2.pdf', fileSize: '1.2 MB', verified: true },
  { id: 'd3', vehicleId: 'v2', type: 'warranty', title: 'Extended Warranty - Mercedes-Benz', date: '2023-01-25', fileUrl: '/docs/d3.pdf', fileSize: '890 KB', verified: true },
  { id: 'd4', vehicleId: 'v2', type: 'insurance', title: 'Insurance Certificate - Mercedes-Benz', date: '2024-01-20', fileUrl: '/docs/d4.pdf', fileSize: '156 KB', verified: true },
  { id: 'd5', vehicleId: 'v1', type: 'logbook', title: 'Logbook - Toyota Land Cruiser', date: '2022-06-20', fileUrl: '/docs/d5.pdf', fileSize: '2.1 MB', verified: true },
];

const SAMPLE_TIMELINE: TimelineEvent[] = [
  { id: 't1', vehicleId: 'v1', type: 'purchase', title: 'Vehicle Purchased', description: 'Toyota Land Cruiser GX-R purchased from KAYAD Premium Dealers', date: '2022-06-15', amount: 8500000, mileage: 0 },
  { id: 't2', vehicleId: 'v1', type: 'registration', title: 'Vehicle Registered', description: 'Number plates KBZ 123A issued', date: '2022-06-20', mileage: 150 },
  { id: 't3', vehicleId: 'v1', type: 'service', title: 'First Service', description: 'Initial service at 5,000 km', date: '2022-09-15', amount: 18000, mileage: 5000 },
  { id: 't4', vehicleId: 'v1', type: 'inspection', title: 'Annual Inspection', description: 'Full inspection completed - Grade A-', date: '2024-02-10', amount: 25000, mileage: 42000 },
  { id: 't5', vehicleId: 'v1', type: 'insurance', title: 'Insurance Renewal', description: 'Annual comprehensive insurance renewed', date: '2024-02-15', amount: 85000 },
];

const SAMPLE_REMINDERS: ServiceReminder[] = [
  { id: 'r1', vehicleId: 'v1', type: 'oil_service', title: 'Oil Change Due', description: 'Oil and filter change recommended', dueDate: '2024-04-15', currentMileage: 45230, urgent: false, completed: false, estimatedCost: 12000 },
  { id: 'r2', vehicleId: 'v2', type: 'insurance_renewal', title: 'Insurance Renewal', description: 'Comprehensive insurance expires', dueDate: '2024-04-20', currentMileage: 18000, urgent: true, completed: false, estimatedCost: 75000 },
  { id: 'r3', vehicleId: 'v1', type: 'inspection_renewal', title: 'Road Inspection Due', description: 'Annual roadworthiness certificate expires', dueDate: '2024-06-15', currentMileage: 45230, urgent: false, completed: false, estimatedCost: 5000 },
  { id: 'r4', vehicleId: 'v2', type: 'brake_check', title: 'Brake Inspection', description: 'Check brake pads and discs', dueDate: '2024-05-01', currentMileage: 18000, urgent: false, completed: false, estimatedCost: 25000 },
  { id: 'r5', vehicleId: 'v1', type: 'warranty_expiry', title: 'Warranty Expiry', description: 'Manufacturer warranty expires', dueDate: '2025-06-15', currentMileage: 45230, urgent: false, completed: false },
];

const SAMPLE_EXPENSES: Expense[] = [
  { id: 'e1', vehicleId: 'v1', category: 'fuel', title: 'Fuel - Shell Petrol Station', amount: 8500, date: '2024-03-01', recurring: true },
  { id: 'e2', vehicleId: 'v1', category: 'maintenance', title: 'Oil Change - Toyota Service', amount: 12000, date: '2024-02-15', recurring: false },
  { id: 'e3', vehicleId: 'v2', category: 'insurance', title: 'Annual Insurance Premium', amount: 75000, date: '2024-01-20', recurring: true },
  { id: 'e4', vehicleId: 'v2', category: 'loan_payment', title: 'the partner bank HP Monthly Payment', amount: 145000, date: '2024-03-01', recurring: true },
  { id: 'e5', vehicleId: 'v1', category: 'parking', title: 'Monthly Parking - Westlands', amount: 8000, date: '2024-03-01', recurring: true },
];

const SAMPLE_RESALE: Record<string, ResaleValuation> = {
  'v1': {
    vehicleId: 'v1',
    currentMarketValue: 7200000,
    tradeInValue: 6500000,
    recommendedAskingPrice: 7500000,
    marketDemand: 'medium',
    bestListingTime: 'March 2024',
    priceTrend: 'stable',
    comparableVehicles: 12,
    daysOnMarket: 0,
    lastUpdated: '2024-03-15',
  },
  'v2': {
    vehicleId: 'v2',
    currentMarketValue: 5400000,
    tradeInValue: 5000000,
    recommendedAskingPrice: 5600000,
    marketDemand: 'high',
    bestListingTime: 'April 2024',
    priceTrend: 'increasing',
    comparableVehicles: 8,
    daysOnMarket: 0,
    lastUpdated: '2024-03-15',
  },
};

const SAMPLE_REWARDS: RewardPoint[] = [
  { id: 'rp1', type: 'inspection_discount', title: '20% Off Next Inspection', description: 'Use code KAYAD20 for your next vehicle inspection', points: 500, expiryDate: '2024-04-30', redeemed: false },
  { id: 'rp2', type: 'dealer_offer', title: 'KSh 50,000 Off New Toyota', description: 'Exclusive offer from KAYAD Toyota Partners', points: 1000, expiryDate: '2024-05-15', redeemed: false },
  { id: 'rp3', type: 'referral_reward', title: 'Referral Bonus Earned', description: 'Your referral earned 500 points', points: 500, expiryDate: '2024-12-31', redeemed: true },
];

const SAMPLE_MESSAGES: Message[] = [
  { id: 'm1', sender: 'dealer', senderName: 'KAYAD Premium Dealers', subject: 'Your Toyota Land Cruiser Service Reminder', preview: 'Dear James, this is a reminder that your Toyota Land Cruiser is due for its 45,000 km service...', content: '', date: '2024-03-15', read: false, vehicleId: 'v1', actionRequired: true, actions: [{ label: 'Book Service', url: '/book-service' }] },
  { id: 'm2', sender: 'system', senderName: 'KAYAD System', subject: 'Inspection Report Ready', preview: 'Your inspection report for Mercedes-Benz C-Class is now available for download.', content: '', date: '2024-03-10', read: true, vehicleId: 'v2', actionRequired: false },
  { id: 'm3', sender: 'finance', senderName: 'a partner bank', subject: 'Upcoming Loan Payment', preview: 'Your monthly payment of KSh 145,000 is due on April 25, 2024.', content: '', date: '2024-03-15', read: false, vehicleId: 'v2', actionRequired: true, actions: [{ label: 'Make Payment', url: '/finance' }] },
];

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'reminder', title: 'Service Reminder', message: 'Toyota Land Cruiser oil change due in 30 days', date: '2024-03-15', read: false, actionUrl: '/reminders' },
  { id: 'n2', type: 'alert', title: 'Price Alert', message: 'BMW X5 in your watchlist dropped by KSh 150,000', date: '2024-03-14', read: false },
  { id: 'n3', type: 'appointment', title: 'Inspection Tomorrow', message: 'Your vehicle inspection is scheduled for tomorrow at 10:00 AM', date: '2024-03-14', read: true, actionUrl: '/inspections' },
];

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

type PlatformSection = 'home' | 'garage' | 'watchlist' | 'purchase' | 'inspections' | 
  'finance' | 'documents' | 'timeline' | 'reminders' | 'expenses' | 'resale' | 
  'rewards' | 'copilot' | 'messages' | 'settings';

interface BuyerPlatformProps {
  onNavigate?: (section: string) => void;
}

export default function BuyerPlatform({ onNavigate }: BuyerPlatformProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<PlatformSection>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSectionChange = useCallback((section: PlatformSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    if (onNavigate) onNavigate(section);
  }, [onNavigate]);

  const unreadMessages = SAMPLE_MESSAGES.filter(m => !m.read).length;
  const unreadNotifications = SAMPLE_NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 sticky top-0 h-screen`}
        style={{ backgroundColor: KAYAD_THEME.navy }}
      >
        <SidebarContent 
          activeSection={activeSection} 
          onSectionChange={handleSectionChange}
          sidebarOpen={sidebarOpen}
          unreadMessages={unreadMessages}
          unreadNotifications={unreadNotifications}
        />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: KAYAD_THEME.navy }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
              <Car size={18} style={{ color: KAYAD_THEME.navy }} />
            </div>
            <span className="text-white font-bold">KAYAD</span>
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
                sidebarOpen={true}
                unreadMessages={unreadMessages}
                unreadNotifications={unreadNotifications}
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
              {activeSection === 'home' && <BuyerHome user={SAMPLE_USER} vehicles={SAMPLE_VEHICLES} onNavigate={handleSectionChange} />}
              {activeSection === 'garage' && <GarageSection vehicles={SAMPLE_VEHICLES} selectedVehicle={selectedVehicle} onSelectVehicle={setSelectedVehicle} />}
              {activeSection === 'watchlist' && <WatchlistSection items={SAMPLE_WATCHLIST} />}
              {activeSection === 'purchase' && <PurchaseJourneySection journeys={SAMPLE_PURCHASE_JOURNEYS} />}
              {activeSection === 'inspections' && <InspectionsSection inspections={SAMPLE_INSPECTIONS} />}
              {activeSection === 'finance' && <FinanceSection accounts={SAMPLE_FINANCE} />}
              {activeSection === 'documents' && <DocumentsSection documents={SAMPLE_DOCUMENTS} />}
              {activeSection === 'timeline' && <TimelineSection events={SAMPLE_TIMELINE} vehicles={SAMPLE_VEHICLES} />}
              {activeSection === 'reminders' && <RemindersSection reminders={SAMPLE_REMINDERS} vehicles={SAMPLE_VEHICLES} />}
              {activeSection === 'expenses' && <ExpensesSection expenses={SAMPLE_EXPENSES} vehicles={SAMPLE_VEHICLES} />}
              {activeSection === 'resale' && <ResaleCenterSection valuations={SAMPLE_RESALE} vehicles={SAMPLE_VEHICLES} />}
              {activeSection === 'rewards' && <RewardsSection rewards={SAMPLE_REWARDS} userPoints={SAMPLE_USER.loyaltyPoints} />}
              {activeSection === 'copilot' && <AICopilotSection vehicles={SAMPLE_VEHICLES} />}
              {activeSection === 'messages' && <MessagesSection messages={SAMPLE_MESSAGES} />}
              {activeSection === 'settings' && <SettingsSection user={SAMPLE_USER} />}
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
  sidebarOpen, 
  unreadMessages,
  unreadNotifications 
}: { 
  activeSection: PlatformSection;
  onSectionChange: (s: PlatformSection) => void;
  sidebarOpen: boolean;
  unreadMessages: number;
  unreadNotifications: number;
}) {
  const navItems: { id: PlatformSection; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'garage', label: 'My Garage', icon: <Warehouse size={20} /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Heart size={20} /> },
    { id: 'purchase', label: 'Purchase Journey', icon: <ShoppingCart size={20} /> },
    { id: 'inspections', label: 'Inspections', icon: <ClipboardCheck size={20} /> },
    { id: 'finance', label: 'Finance', icon: <DollarSign size={20} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={20} /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock size={20} /> },
    { id: 'reminders', label: 'Reminders', icon: <Bell size={20} /> },
    { id: 'expenses', label: 'Expenses', icon: <BarChart3 size={20} /> },
    { id: 'resale', label: 'Resale Center', icon: <TrendingUp size={20} /> },
    { id: 'rewards', label: 'Rewards', icon: <Award size={20} />, badge: 2 },
    { id: 'copilot', label: 'AI Copilot', icon: <Bot size={20} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={20} />, badge: unreadMessages },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`p-4 border-b ${sidebarOpen ? '' : 'flex justify-center'}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center flex-shrink-0">
            <Car size={24} style={{ color: KAYAD_THEME.navy }} />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-white font-bold text-lg">KAYAD</h1>
              <p className="text-white/60 text-xs">Buyer Platform</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${
                activeSection === item.id 
                  ? 'bg-gold/20 text-gold' 
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              {item.badge && item.badge > 0 && (
                <span className={`absolute ${sidebarOpen ? 'right-3' : 'top-1 right-1'} w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* User Profile */}
      <div className={`p-4 border-t ${sidebarOpen ? '' : 'flex justify-center'}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center'}`}>
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
            <User size={20} className="text-gold" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">James K.</p>
              <p className="text-gold text-xs">Gold Member</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 1: BUYER HOME
// ============================================================

function BuyerHome({ user, vehicles, onNavigate }: { user: typeof SAMPLE_USER; vehicles: Vehicle[]; onNavigate: (s: PlatformSection) => void }) {
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  
  const quickActions = [
    { label: 'Browse Vehicles', icon: <Car size={24} />, color: KAYAD_THEME.navy, section: 'home' as PlatformSection },
    { label: 'Book Inspection', icon: <ClipboardCheck size={24} />, color: KAYAD_THEME.emerald, section: 'inspections' as PlatformSection },
    { label: 'View Documents', icon: <FileText size={24} />, color: KAYAD_THEME.gold, section: 'documents' as PlatformSection },
    { label: 'Track Expenses', icon: <BarChart3 size={24} />, color: '#8B5CF6', section: 'expenses' as PlatformSection },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 lg:p-8"
        style={{ background: `linear-gradient(135deg, ${KAYAD_THEME.navy} 0%, ${KAYAD_THEME.navyLight} 100%)` }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              {greeting}, {user.name.split(' ')[0]} 👋
            </h1>
            <p className="text-white/70">Your automotive companion for the complete ownership journey</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <p className="text-gold text-2xl font-bold">{user.loyaltyPoints.toLocaleString()}</p>
              <p className="text-white/60 text-xs">Loyalty Points</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <QuickStat icon={<Car size={20} />} value={vehicles.length.toString()} label="My Vehicles" color={KAYAD_THEME.gold} />
          <QuickStat icon={<Heart size={20} />} value="2" label="Watchlist" color={KAYAD_THEME.red} />
          <QuickStat icon={<Bell size={20} />} value="3" label="Reminders" color={KAYAD_THEME.amber} />
          <QuickStat icon={<Clock size={20} />} value="2" label="Journeys" color={KAYAD_THEME.emerald} />
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, i) => (
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

      {/* My Vehicles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: KAYAD_THEME.navy }}>My Vehicles</h2>
          <button onClick={() => onNavigate('garage')} className="text-sm font-medium flex items-center gap-1" style={{ color: KAYAD_THEME.gold }}>
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {vehicles.map((vehicle, i) => (
            <VehicleOverviewCard key={vehicle.id} vehicle={vehicle} delay={i * 0.1} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {/* Upcoming Reminders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: KAYAD_THEME.navy }}>Upcoming Reminders</h2>
          <button onClick={() => onNavigate('reminders')} className="text-sm font-medium flex items-center gap-1" style={{ color: KAYAD_THEME.gold }}>
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'white' }}>
          {[
            { icon: <Shield size={20} />, title: 'Insurance Renewal', vehicle: 'Mercedes-Benz C-Class', date: 'Apr 20, 2024', urgent: true, color: KAYAD_THEME.red },
            { icon: <Wrench size={20} />, title: 'Oil Change Due', vehicle: 'Toyota Land Cruiser', date: 'Apr 15, 2024', urgent: false, color: KAYAD_THEME.amber },
            { icon: <ClipboardCheck size={20} />, title: 'Road Inspection', vehicle: 'Toyota Land Cruiser', date: 'Jun 15, 2024', urgent: false, color: KAYAD_THEME.navy },
          ].map((reminder, i) => (
            <div 
              key={i}
              className="flex items-center gap-4 p-4 border-b last:border-0"
              style={{ borderColor: KAYAD_THEME.slate[100] }}
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${reminder.color}15` }}
              >
                <div style={{ color: reminder.color }}>{reminder.icon}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate" style={{ color: KAYAD_THEME.navy }}>{reminder.title}</p>
                  {reminder.urgent && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Urgent</span>
                  )}
                </div>
                <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>{reminder.vehicle} • {reminder.date}</p>
              </div>
              <ChevronRight size={16} style={{ color: KAYAD_THEME.slate[400] }} />
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Actions */}
      <div>
        <h2 className="text-xl font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Recommended Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <ActionCard 
            icon={<Sparkles size={24} />}
            title="Get AI Insights"
            description="Get personalized recommendations for your vehicles"
            buttonLabel="Ask Copilot"
            onClick={() => onNavigate('copilot')}
          />
          <ActionCard 
            icon={<TrendingUp size={24} />}
            title="Check Resale Value"
            description="See current market value of your vehicles"
            buttonLabel="View Valuations"
            onClick={() => onNavigate('resale')}
          />
          <ActionCard 
            icon={<Award size={24} />}
            title="Claim Rewards"
            description="You have exclusive offers waiting"
            buttonLabel="View Rewards"
            badge="2"
            onClick={() => onNavigate('rewards')}
          />
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

function VehicleOverviewCard({ vehicle, delay, onNavigate }: { vehicle: Vehicle; delay: number; onNavigate: (s: PlatformSection) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'white' }}
    >
      <div className="h-32 flex items-center justify-center" style={{ backgroundColor: KAYAD_THEME.slate[100] }}>
        <Car size={64} style={{ color: KAYAD_THEME.slate[300] }} />
      </div>
      <div className="p-4">
        <h3 className="font-bold" style={{ color: KAYAD_THEME.navy }}>{vehicle.year} {vehicle.make} {vehicle.model}</h3>
        <p className="text-sm mb-3" style={{ color: KAYAD_THEME.slate[500] }}>{vehicle.registration} • {vehicle.mileage.toLocaleString()} km</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Current Value</p>
            <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(vehicle.currentValue / 1000000).toFixed(1)}M</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Health Score</p>
            <p className="font-bold" style={{ color: KAYAD_THEME.emerald }}>{vehicle.healthScore}%</p>
          </div>
        </div>
        <button 
          onClick={() => onNavigate('garage')}
          className="w-full mt-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: KAYAD_THEME.navy }}
        >
          View Details
        </button>
      </div>
    </motion.div>
  );
}

function ActionCard({ icon, title, description, buttonLabel, badge, onClick }: {
  icon: React.ReactNode; title: string; description: string; buttonLabel: string; badge?: string; onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4"
      style={{ backgroundColor: 'white' }}
    >
      <div className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: `${KAYAD_THEME.gold}20` }}>
        <div style={{ color: KAYAD_THEME.gold }}>{icon}</div>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-bold" style={{ color: KAYAD_THEME.navy }}>{title}</h3>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">{badge}</span>
        )}
      </div>
      <p className="text-sm mb-4" style={{ color: KAYAD_THEME.slate[500] }}>{description}</p>
      <button 
        onClick={onClick}
        className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}
      >
        {buttonLabel}
      </button>
    </motion.div>
  );
}

// ============================================================
// SECTION 2: GARAGE
// ============================================================

function GarageSection({ vehicles, selectedVehicle, onSelectVehicle }: { 
  vehicles: Vehicle[]; 
  selectedVehicle: string | null;
  onSelectVehicle: (id: string | null) => void;
}) {
  const vehicle = vehicles.find(v => v.id === selectedVehicle) || vehicles[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>My Garage</h1>
        <button className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2" style={{ backgroundColor: KAYAD_THEME.emerald }}>
          <Plus size={18} /> Add Vehicle
        </button>
      </div>

      {/* Vehicle Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {vehicles.map(v => (
          <button
            key={v.id}
            onClick={() => onSelectVehicle(v.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedVehicle === v.id || (!selectedVehicle && v.id === vehicles[0]?.id)
                ? 'text-white'
                : ''
            }`}
            style={{
              backgroundColor: selectedVehicle === v.id || (!selectedVehicle && v.id === vehicles[0]?.id) 
                ? KAYAD_THEME.navy 
                : 'white',
              color: selectedVehicle === v.id || (!selectedVehicle && v.id === vehicles[0]?.id) 
                ? 'white' 
                : KAYAD_THEME.navy,
            }}
          >
            {v.make} {v.model}
          </button>
        ))}
      </div>

      {vehicle && <VehicleDetailCard vehicle={vehicle} />}
    </div>
  );
}

function VehicleDetailCard({ vehicle }: { vehicle: Vehicle }) {
  const resale = SAMPLE_RESALE[vehicle.id];
  
  const stats = [
    { label: 'Mileage', value: `${vehicle.mileage.toLocaleString()} km`, icon: <Gauge size={20} /> },
    { label: 'Health Score', value: `${vehicle.healthScore}%`, icon: <ShieldCheck size={20} />, color: KAYAD_THEME.emerald },
    { label: 'Inspection', value: vehicle.inspectionGrade, icon: <ClipboardCheck size={20} /> },
    { label: 'Fuel Type', value: vehicle.fuelType, icon: <Fuel size={20} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'white' }}
      >
        <div className="h-48 flex items-center justify-center" style={{ backgroundColor: KAYAD_THEME.slate[100] }}>
          <Car size={120} style={{ color: KAYAD_THEME.slate[300] }} />
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h2>
              <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>
                {vehicle.registration} • {vehicle.colour} • {vehicle.transmission}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
              Grade {vehicle.inspectionGrade}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map(stat => (
              <div key={stat.label} className="p-4 rounded-xl" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                <div className="flex items-center gap-2 mb-2">
                  <div style={{ color: stat.color || KAYAD_THEME.navy }}>{stat.icon}</div>
                  <span className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>{stat.label}</span>
                </div>
                <p className="text-lg font-bold" style={{ color: stat.color || KAYAD_THEME.navy }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Value & Ownership */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
              <p className="text-xs mb-1" style={{ color: KAYAD_THEME.slate[500] }}>Current Value</p>
              <p className="text-xl font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(vehicle.currentValue / 1000000).toFixed(1)}M</p>
              <p className="text-xs" style={{ color: vehicle.valueChange < 0 ? KAYAD_THEME.red : KAYAD_THEME.emerald }}>
                {vehicle.valueChange > 0 ? '+' : ''}{vehicle.valueChange}% from purchase
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
              <p className="text-xs mb-1" style={{ color: KAYAD_THEME.slate[500] }}>Purchase Price</p>
              <p className="text-xl font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(vehicle.purchasePrice / 1000000).toFixed(1)}M</p>
              <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>{vehicle.purchaseDate}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
              <p className="text-xs mb-1" style={{ color: KAYAD_THEME.slate[500] }}>Resale Value (Est.)</p>
              <p className="text-xl font-bold" style={{ color: KAYAD_THEME.gold }}>KES {(resale?.recommendedAskingPrice / 1000000).toFixed(1)}M</p>
              <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Recommended asking price</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Add Photo', icon: <Plus size={20} />, color: KAYAD_THEME.navy },
          { label: 'Service History', icon: <Wrench size={20} />, color: KAYAD_THEME.emerald },
          { label: 'Insurance', icon: <Shield size={20} />, color: KAYAD_THEME.amber },
          { label: 'Documents', icon: <FileText size={20} />, color: KAYAD_THEME.gold },
        ].map(action => (
          <button
            key={action.label}
            className="p-4 rounded-xl text-center transition-all hover:shadow-md"
            style={{ backgroundColor: 'white' }}
          >
            <div 
              className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center"
              style={{ backgroundColor: `${action.color}15` }}
            >
              <div style={{ color: action.color }}>{action.icon}</div>
            </div>
            <p className="text-sm font-medium" style={{ color: KAYAD_THEME.navy }}>{action.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 3: MY WATCHLIST
// ============================================================

function WatchlistSection({ items }: { items: WatchlistItem[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>My Watchlist</h1>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg" style={{ backgroundColor: 'white' }}>
            <Grid size={20} style={{ color: KAYAD_THEME.navy }} />
          </button>
          <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
            <List size={20} style={{ color: KAYAD_THEME.slate[400] }} />
          </button>
        </div>
      </div>

      {/* Collections */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button className="px-4 py-2 rounded-lg font-medium whitespace-nowrap" style={{ backgroundColor: KAYAD_THEME.navy, color: 'white' }}>
          All ({items.length})
        </button>
        <button className="px-4 py-2 rounded-lg font-medium whitespace-nowrap" style={{ backgroundColor: 'white', color: KAYAD_THEME.navy }}>
          Saved for Later
        </button>
        <button className="px-4 py-2 rounded-lg font-medium whitespace-nowrap" style={{ backgroundColor: 'white', color: KAYAD_THEME.navy }}>
          Auctions
        </button>
        <button className="px-4 py-2 rounded-lg font-medium whitespace-nowrap" style={{ backgroundColor: 'white', color: KAYAD_THEME.navy }}>
          Price Drops
        </button>
      </div>

      {/* Watchlist Items */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'white' }}
          >
            <div className="h-40 flex items-center justify-center" style={{ backgroundColor: KAYAD_THEME.slate[100] }}>
              <Car size={64} style={{ color: KAYAD_THEME.slate[300] }} />
            </div>
            <div className="p-4">
              <h3 className="font-bold mb-1" style={{ color: KAYAD_THEME.navy }}>{item.year} {item.make} {item.model}</h3>
              <p className="text-2xl font-bold mb-3" style={{ color: KAYAD_THEME.gold }}>KES {(item.price / 1000000).toFixed(1)}M</p>
              
              {/* Alerts */}
              <div className="flex flex-wrap gap-2 mb-4">
                {item.priceAlert && <AlertBadge label="Price Alert" color={KAYAD_THEME.emerald} />}
                {item.inspectionAvailable && <AlertBadge label="Inspection Ready" color={KAYAD_THEME.navy} />}
                {item.auctionReminder && <AlertBadge label="Auction" color={KAYAD_THEME.amber} />}
              </div>

              {/* Price Trend */}
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: KAYAD_THEME.slate[500] }}>Added {item.addedDate}</span>
                <span className="flex items-center gap-1" style={{ color: item.priceHistory.length > 1 && item.priceHistory[item.priceHistory.length - 1].price < item.priceHistory[0].price ? KAYAD_THEME.emerald : KAYAD_THEME.slate[500] }}>
                  {item.priceHistory.length > 1 && item.priceHistory[item.priceHistory.length - 1].price < item.priceHistory[0].price 
                    ? <TrendingDown size={14} /> 
                    : <TrendingUp size={14} />}
                  KES {(Math.abs(item.priceHistory[0].price - item.priceHistory[item.priceHistory.length - 1].price) / 1000).toFixed(0)}K
                </span>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: KAYAD_THEME.navy }}>View</button>
                <button className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>Compare</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AlertBadge({ label, color }: { label: string; color: string }) {
  return (
    <span 
      className="px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {label}
    </span>
  );
}

// ============================================================
// SECTION 4: PURCHASE JOURNEY
// ============================================================

function PurchaseJourneySection({ journeys }: { journeys: PurchaseJourney[] }) {
  const stages = ['viewed', 'contacted', 'inspection_booked', 'finance_applied', 'offer_submitted', 'reserved', 'purchased', 'delivered', 'ownership_transferred'];
  const stageLabels: Record<string, string> = {
    viewed: 'Viewed',
    contacted: 'Contacted',
    inspection_booked: 'Inspection Booked',
    finance_applied: 'Finance Applied',
    offer_submitted: 'Offer Submitted',
    reserved: 'Reserved',
    purchased: 'Purchased',
    delivered: 'Delivered',
    ownership_transferred: 'Ownership Transferred',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Purchase Journeys</h1>

      {journeys.map((journey, i) => {
        const currentIndex = stages.indexOf(journey.status);
        
        return (
          <motion.div
            key={journey.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl p-6"
            style={{ backgroundColor: 'white' }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg mb-1" style={{ color: KAYAD_THEME.navy }}>{journey.vehicleName}</h3>
                <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>
                  {journey.dealer} • KES {(journey.price / 1000000).toFixed(1)}M
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
                Completed
              </span>
            </div>

            {/* Journey Timeline */}
            <div className="relative">
              <div className="absolute top-4 left-0 right-0 h-0.5" style={{ backgroundColor: KAYAD_THEME.slate[200] }} />
              <div 
                className="absolute top-4 left-0 h-0.5 transition-all"
                style={{ 
                  backgroundColor: KAYAD_THEME.gold,
                  width: `${(currentIndex / (stages.length - 1)) * 100}%`
                }}
              />
              <div className="flex justify-between relative">
                {stages.map((stage, idx) => (
                  <div key={stage} className="flex flex-col items-center">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors"
                      style={{
                        backgroundColor: idx <= currentIndex ? KAYAD_THEME.gold : KAYAD_THEME.slate[200],
                        color: idx <= currentIndex ? 'white' : KAYAD_THEME.slate[400],
                      }}
                    >
                      {idx < currentIndex ? (
                        <CheckCircle size={16} />
                      ) : (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <span 
                      className="text-xs mt-2 text-center hidden lg:block"
                      style={{ 
                        color: idx <= currentIndex ? KAYAD_THEME.navy : KAYAD_THEME.slate[400],
                        maxWidth: '80px'
                      }}
                    >
                      {stageLabels[stage]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t" style={{ borderColor: KAYAD_THEME.slate[100] }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: KAYAD_THEME.slate[500] }}>Completed on {journey.statusDate}</span>
                <button className="font-medium flex items-center gap-1" style={{ color: KAYAD_THEME.gold }}>
                  View Details <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================
// SECTION 5: MY INSPECTIONS
// ============================================================

function InspectionsSection({ inspections }: { inspections: InspectionRecord[] }) {
  const upcoming = inspections.filter(i => i.status === 'upcoming');
  const completed = inspections.filter(i => i.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>My Inspections</h1>
        <button className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2" style={{ backgroundColor: KAYAD_THEME.emerald }}>
          <Plus size={18} /> Book Inspection
        </button>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: KAYAD_THEME.navy }}>Upcoming Inspections</h2>
          <div className="space-y-4">
            {upcoming.map(inspection => (
              <InspectionCard key={inspection.id} inspection={inspection} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: KAYAD_THEME.navy }}>Completed Inspections</h2>
        <div className="space-y-4">
          {completed.map(inspection => (
            <InspectionCard key={inspection.id} inspection={inspection} />
          ))}
        </div>
      </div>
    </div>
  );
}

function InspectionCard({ inspection }: { inspection: InspectionRecord }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4"
      style={{ backgroundColor: 'white' }}
    >
      <div className="flex items-start gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: inspection.status === 'upcoming' ? `${KAYAD_THEME.amber}15` : `${KAYAD_THEME.emerald}15` }}
        >
          {inspection.status === 'upcoming' 
            ? <Calendar size={24} style={{ color: KAYAD_THEME.amber }} />
            : <ClipboardCheck size={24} style={{ color: KAYAD_THEME.emerald }} />
          }
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold" style={{ color: KAYAD_THEME.navy }}>{inspection.type}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              inspection.status === 'upcoming' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {inspection.status === 'upcoming' ? 'Upcoming' : 'Completed'}
            </span>
          </div>
          <p className="text-sm mb-2" style={{ color: KAYAD_THEME.slate[500] }}>
            {inspection.date} • {inspection.location}
          </p>
          
          {inspection.status === 'completed' && inspection.grade && (
            <div className="flex items-center gap-4 mb-2">
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">
                Grade {inspection.grade}
              </span>
              <span className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>KES {inspection.cost.toLocaleString()}</span>
            </div>
          )}

          {inspection.status === 'upcoming' && (
            <div className="text-sm font-medium" style={{ color: KAYAD_THEME.gold }}>
              KES {inspection.cost.toLocaleString()}
            </div>
          )}

          {inspection.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: KAYAD_THEME.slate[100] }}>
              <p className="text-xs font-medium mb-2" style={{ color: KAYAD_THEME.slate[500] }}>Recommendations:</p>
              <ul className="text-sm space-y-1">
                {inspection.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-center gap-2" style={{ color: KAYAD_THEME.navy }}>
                    <CheckCircle size={14} style={{ color: KAYAD_THEME.amber }} />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {inspection.report && (
              <button className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                <FileText size={14} /> View Report
              </button>
            )}
            {inspection.certificate && (
              <button className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                <ShieldCheck size={14} /> Certificate
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SECTION 6: MY FINANCE
// ============================================================

function FinanceSection({ accounts }: { accounts: FinanceAccount[] }) {
  const totalRemaining = accounts.reduce((sum, a) => sum + a.remainingBalance, 0);
  const totalMonthly = accounts.reduce((sum, a) => sum + a.monthlyPayment, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>My Finance</h1>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_THEME.navy }}>
          <p className="text-white/70 text-sm mb-1">Total Outstanding</p>
          <p className="text-white text-2xl font-bold">KES {(totalRemaining / 1000000).toFixed(1)}M</p>
        </div>
        <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_THEME.gold }}>
          <p className="text-navy/70 text-sm mb-1">Monthly Payments</p>
          <p className="text-navy text-2xl font-bold">KES {totalMonthly.toLocaleString()}</p>
        </div>
        <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
          <p className="text-slate-500 text-sm mb-1">Active Accounts</p>
          <p className="text-navy text-2xl font-bold">{accounts.filter(a => a.status === 'active').length}</p>
        </div>
      </div>

      {/* Finance Accounts */}
      <div className="space-y-4">
        {accounts.map(account => {
          const vehicle = SAMPLE_VEHICLES.find(v => v.id === account.vehicleId);
          const progress = ((account.totalAmount - account.remainingBalance) / account.totalAmount) * 100;
          
          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-6"
              style={{ backgroundColor: 'white' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building size={20} style={{ color: KAYAD_THEME.navy }} />
                    <h3 className="font-semibold" style={{ color: KAYAD_THEME.navy }}>{account.provider}</h3>
                  </div>
                  <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>
                    {account.type.replace('_', ' ').toUpperCase()} • {account.accountNumber}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  account.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {account.status.replace('_', ' ')}
                </span>
              </div>

              <p className="font-medium mb-3" style={{ color: KAYAD_THEME.navy }}>
                {vehicle?.year} {vehicle?.make} {vehicle?.model}
              </p>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: KAYAD_THEME.slate[500] }}>Paid: KES {((account.totalAmount - account.remainingBalance) / 1000000).toFixed(1)}M</span>
                  <span style={{ color: KAYAD_THEME.slate[500] }}>Remaining: KES {(account.remainingBalance / 1000000).toFixed(1)}M</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_THEME.slate[200] }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: KAYAD_THEME.gold }} />
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Interest Rate</p>
                  <p className="font-semibold" style={{ color: KAYAD_THEME.navy }}>{account.interestRate}%</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Monthly Payment</p>
                  <p className="font-semibold" style={{ color: KAYAD_THEME.navy }}>KES {account.monthlyPayment.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Next Payment</p>
                  <p className="font-semibold" style={{ color: KAYAD_THEME.amber }}>{account.nextPaymentDate}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Completion</p>
                  <p className="font-semibold" style={{ color: KAYAD_THEME.navy }}>{account.endDate}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: KAYAD_THEME.navy }}>
                  Make Payment
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                  View Statement
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 7: MY DOCUMENTS
// ============================================================

function DocumentsSection({ documents }: { documents: Document[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  
  const filteredDocs = filter ? documents.filter(d => d.type === filter) : documents;
  
  const typeLabels: Record<string, string> = {
    sale_agreement: 'Sale Agreement',
    inspection_report: 'Inspection Report',
    invoice: 'Invoice',
    receipt: 'Receipt',
    warranty: 'Warranty',
    insurance: 'Insurance',
    logbook: 'Logbook',
    registration: 'Registration',
    service_record: 'Service Record',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    sale_agreement: <File size={20} />,
    inspection_report: <ClipboardCheck size={20} />,
    invoice: <Receipt size={20} />,
    warranty: <ShieldCheck size={20} />,
    insurance: <Shield size={20} />,
    logbook: <FileText size={20} />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Document Vault</h1>
        <button className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2" style={{ backgroundColor: KAYAD_THEME.emerald }}>
          <Upload size={18} /> Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter(null)}
          className="px-4 py-2 rounded-lg font-medium whitespace-nowrap"
          style={{ backgroundColor: !filter ? KAYAD_THEME.navy : 'white', color: !filter ? 'white' : KAYAD_THEME.navy }}
        >
          All ({documents.length})
        </button>
        {Object.entries(typeLabels).slice(0, 5).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className="px-4 py-2 rounded-lg font-medium whitespace-nowrap"
            style={{ backgroundColor: filter === type ? KAYAD_THEME.navy : 'white', color: filter === type ? 'white' : KAYAD_THEME.navy }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc, i) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-4"
            style={{ backgroundColor: 'white' }}
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${KAYAD_THEME.gold}15` }}
              >
                <div style={{ color: KAYAD_THEME.gold }}>{typeIcons[doc.type] || <File size={20} />}</div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate mb-1" style={{ color: KAYAD_THEME.navy }}>{doc.title}</h3>
                <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>{doc.date} • {doc.fileSize}</p>
                <div className="flex items-center gap-2 mt-2">
                  {doc.verified && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: KAYAD_THEME.emerald }}>
                      <ShieldCheck size={12} /> Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                <Eye size={14} /> View
              </button>
              <button className="px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                <Download size={14} />
              </button>
              <button className="px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                <Share2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 8: OWNERSHIP TIMELINE
// ============================================================

function TimelineSection({ events, vehicles }: { events: TimelineEvent[]; vehicles: Vehicle[] }) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const vehicleEvents = selectedVehicle 
    ? events.filter(e => e.vehicleId === selectedVehicle)
    : events;

  const eventIcons: Record<string, React.ReactNode> = {
    purchase: <ShoppingCart size={16} />,
    service: <Wrench size={16} />,
    inspection: <ClipboardCheck size={16} />,
    insurance: <Shield size={16} />,
    repair: <Settings2 size={16} />,
    accessory: <Star size={16} />,
    resale_valuation: <TrendingUp size={16} />,
    finance: <CreditCard size={16} />,
    registration: <FileCheck size={16} />,
  };

  const eventColors: Record<string, string> = {
    purchase: KAYAD_THEME.emerald,
    service: KAYAD_THEME.amber,
    inspection: KAYAD_THEME.navy,
    insurance: KAYAD_THEME.gold,
    repair: KAYAD_THEME.red,
    accessory: '#8B5CF6',
    resale_valuation: KAYAD_THEME.gold,
    finance: '#0EA5E9',
    registration: KAYAD_THEME.emerald,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Ownership Timeline</h1>

      {/* Vehicle Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedVehicle(null)}
          className="px-4 py-2 rounded-lg font-medium whitespace-nowrap"
          style={{ backgroundColor: !selectedVehicle ? KAYAD_THEME.navy : 'white', color: !selectedVehicle ? 'white' : KAYAD_THEME.navy }}
        >
          All Vehicles
        </button>
        {vehicles.map(v => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicle(v.id)}
            className="px-4 py-2 rounded-lg font-medium whitespace-nowrap"
            style={{ backgroundColor: selectedVehicle === v.id ? KAYAD_THEME.navy : 'white', color: selectedVehicle === v.id ? 'white' : KAYAD_THEME.navy }}
          >
            {v.make} {v.model}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {vehicleEvents.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-4 mb-6 last:mb-0"
          >
            {/* Timeline Line */}
            <div className="flex flex-col items-center">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center z-10"
                style={{ backgroundColor: `${eventColors[event.type]}20` }}
              >
                <div style={{ color: eventColors[event.type] }}>{eventIcons[event.type]}</div>
              </div>
              {i < vehicleEvents.length - 1 && (
                <div className="w-0.5 flex-1 mt-2" style={{ backgroundColor: KAYAD_THEME.slate[200] }} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="rounded-xl p-4" style={{ backgroundColor: 'white' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold" style={{ color: KAYAD_THEME.navy }}>{event.title}</h3>
                    <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{event.description}</p>
                  </div>
                  <span className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{event.date}</span>
                </div>
                {event.amount && (
                  <p className="font-semibold mt-2" style={{ color: KAYAD_THEME.navy }}>
                    KES {event.amount.toLocaleString()}
                  </p>
                )}
                {event.mileage !== undefined && (
                  <p className="text-xs mt-1" style={{ color: KAYAD_THEME.slate[500] }}>
                    Mileage: {event.mileage.toLocaleString()} km
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 9: SERVICE REMINDERS
// ============================================================

function RemindersSection({ reminders, vehicles }: { reminders: ServiceReminder[]; vehicles: Vehicle[] }) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  
  const filteredReminders = selectedVehicle 
    ? reminders.filter(r => r.vehicleId === selectedVehicle)
    : reminders;

  const urgentReminders = filteredReminders.filter(r => r.urgent && !r.completed);
  const upcomingReminders = filteredReminders.filter(r => !r.urgent && !r.completed);
  const completedReminders = filteredReminders.filter(r => r.completed);

  const typeIcons: Record<string, React.ReactNode> = {
    oil_service: <Fuel size={20} />,
    brake_check: <Settings2 size={20} />,
    tyres: <Circle size={20} />,
    battery: <Battery size={20} />,
    insurance_renewal: <Shield size={20} />,
    inspection_renewal: <ClipboardCheck size={20} />,
    warranty_expiry: <ShieldCheck size={20} />,
    general_service: <Wrench size={20} />,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Service Reminders</h1>

      {/* Vehicle Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedVehicle(null)}
          className="px-4 py-2 rounded-lg font-medium whitespace-nowrap"
          style={{ backgroundColor: !selectedVehicle ? KAYAD_THEME.navy : 'white', color: !selectedVehicle ? 'white' : KAYAD_THEME.navy }}
        >
          All ({reminders.length})
        </button>
        {vehicles.map(v => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicle(v.id)}
            className="px-4 py-2 rounded-lg font-medium whitespace-nowrap"
            style={{ backgroundColor: selectedVehicle === v.id ? KAYAD_THEME.navy : 'white', color: selectedVehicle === v.id ? 'white' : KAYAD_THEME.navy }}
          >
            {v.make} {v.model}
          </button>
        ))}
      </div>

      {/* Urgent */}
      {urgentReminders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: KAYAD_THEME.red }}>
            <AlertCircle size={20} /> Urgent
          </h2>
          <div className="space-y-3">
            {urgentReminders.map(reminder => (
              <ReminderCard key={reminder.id} reminder={reminder} vehicle={vehicles.find(v => v.id === reminder.vehicleId)} urgent />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingReminders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3" style={{ color: KAYAD_THEME.navy }}>Upcoming</h2>
          <div className="space-y-3">
            {upcomingReminders.map(reminder => (
              <ReminderCard key={reminder.id} reminder={reminder} vehicle={vehicles.find(v => v.id === reminder.vehicleId)} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedReminders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3" style={{ color: KAYAD_THEME.slate[500] }}>Completed</h2>
          <div className="space-y-3">
            {completedReminders.map(reminder => (
              <ReminderCard key={reminder.id} reminder={reminder} vehicle={vehicles.find(v => v.id === reminder.vehicleId)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReminderCard({ reminder, vehicle, urgent }: { reminder: ServiceReminder; vehicle?: Vehicle; urgent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 ${reminder.completed ? 'opacity-60' : ''}`}
      style={{ backgroundColor: 'white', borderLeft: urgent ? `4px solid ${KAYAD_THEME.red}` : 'none' }}
    >
      <div className="flex items-start gap-4">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: urgent ? `${KAYAD_THEME.red}15` : `${KAYAD_THEME.navy}15` }}
        >
          <div style={{ color: urgent ? KAYAD_THEME.red : KAYAD_THEME.navy }}>
            {reminder.type === 'oil_service' && <Fuel size={20} />}
            {reminder.type === 'brake_check' && <Settings2 size={20} />}
            {reminder.type === 'tyres' && <Circle size={20} />}
            {reminder.type === 'battery' && <Battery size={20} />}
            {reminder.type === 'insurance_renewal' && <Shield size={20} />}
            {reminder.type === 'inspection_renewal' && <ClipboardCheck size={20} />}
            {reminder.type === 'warranty_expiry' && <ShieldCheck size={20} />}
            {reminder.type === 'general_service' && <Wrench size={20} />}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold" style={{ color: KAYAD_THEME.navy }}>{reminder.title}</h3>
              <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>
                {vehicle?.make} {vehicle?.model} • Due {reminder.dueDate}
              </p>
            </div>
            {reminder.completed ? (
              <CheckCircle size={20} style={{ color: KAYAD_THEME.emerald }} />
            ) : (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgent ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                {urgent ? 'Urgent' : 'Due Soon'}
              </span>
            )}
          </div>
          {reminder.estimatedCost && (
            <p className="text-sm mt-2" style={{ color: KAYAD_THEME.slate[500] }}>
              Est. cost: KES {reminder.estimatedCost.toLocaleString()}
            </p>
          )}
          {!reminder.completed && (
            <div className="flex gap-2 mt-3">
              <button className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: KAYAD_THEME.navy }}>
                Book Now
              </button>
              <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                Remind Later
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SECTION 10: EXPENSE TRACKER
// ============================================================

function ExpensesSection({ expenses, vehicles }: { expenses: Expense[]; vehicles: Vehicle[] }) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const filteredExpenses = expenses.filter(e => 
    (!selectedVehicle || e.vehicleId === selectedVehicle) &&
    (!selectedCategory || e.category === selectedCategory)
  );

  const totalMonthly = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const categoryColors: Record<string, string> = {
    fuel: KAYAD_THEME.emerald,
    maintenance: KAYAD_THEME.amber,
    insurance: KAYAD_THEME.navy,
    parking: KAYAD_THEME.slate[500],
    repair: KAYAD_THEME.red,
    loan_payment: KAYAD_THEME.gold,
    accessory: '#8B5CF6',
    tax: KAYAD_THEME.red,
    other: KAYAD_THEME.slate[400],
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    fuel: <Fuel size={16} />,
    maintenance: <Wrench size={16} />,
    insurance: <Shield size={16} />,
    parking: <MapPin size={16} />,
    repair: <Settings2 size={16} />,
    loan_payment: <CreditCard size={16} />,
    accessory: <Star size={16} />,
    tax: <Receipt size={16} />,
    other: <File size={16} />,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Expense Tracker</h1>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_THEME.navy }}>
          <p className="text-white/70 text-sm mb-1">Total Expenses</p>
          <p className="text-white text-2xl font-bold">KES {totalMonthly.toLocaleString()}</p>
        </div>
        <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
          <p className="text-slate-500 text-sm mb-1">Transactions</p>
          <p className="text-navy text-2xl font-bold">{filteredExpenses.length}</p>
        </div>
        <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
          <p className="text-slate-500 text-sm mb-1">Categories</p>
          <p className="text-navy text-2xl font-bold">{Object.keys(byCategory).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedVehicle(null)}
          className="px-4 py-2 rounded-lg font-medium whitespace-nowrap"
          style={{ backgroundColor: !selectedVehicle ? KAYAD_THEME.navy : 'white', color: !selectedVehicle ? 'white' : KAYAD_THEME.navy }}
        >
          All Vehicles
        </button>
        {vehicles.map(v => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicle(v.id)}
            className="px-4 py-2 rounded-lg font-medium whitespace-nowrap"
            style={{ backgroundColor: selectedVehicle === v.id ? KAYAD_THEME.navy : 'white', color: selectedVehicle === v.id ? 'white' : KAYAD_THEME.navy }}
          >
            {v.make} {v.model}
          </button>
        ))}
      </div>

      {/* Category Breakdown */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(byCategory).map(([category, amount]) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4"
            style={{ backgroundColor: 'white' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${categoryColors[category]}15` }}
              >
                <div style={{ color: categoryColors[category] }}>{categoryIcons[category]}</div>
              </div>
              <span className="font-medium capitalize" style={{ color: KAYAD_THEME.navy }}>
                {category.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xl font-bold" style={{ color: KAYAD_THEME.navy }}>
              KES {amount.toLocaleString()}
            </p>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_THEME.slate[200] }}>
              <div 
                className="h-full rounded-full"
                style={{ width: `${(amount / totalMonthly) * 100}%`, backgroundColor: categoryColors[category] }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Expenses */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: KAYAD_THEME.navy }}>Recent Expenses</h2>
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'white' }}>
          {filteredExpenses.map((expense, i) => (
            <div 
              key={expense.id}
              className="flex items-center gap-4 p-4 border-b last:border-0"
              style={{ borderColor: KAYAD_THEME.slate[100] }}
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${categoryColors[expense.category]}15` }}
              >
                <div style={{ color: categoryColors[expense.category] }}>{categoryIcons[expense.category]}</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ color: KAYAD_THEME.navy }}>{expense.title}</p>
                <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>{expense.date}</p>
              </div>
              <p className="font-semibold" style={{ color: KAYAD_THEME.navy }}>
                KES {expense.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 11: RESALE CENTER
// ============================================================

function ResaleCenterSection({ valuations, vehicles }: { valuations: Record<string, ResaleValuation>; vehicles: Vehicle[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Resale Center</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {vehicles.map((vehicle, i) => {
          const valuation = valuations[vehicle.id];
          if (!valuation) return null;
          
          return (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'white' }}
            >
              <div className="p-6">
                <h3 className="font-bold text-lg mb-1" style={{ color: KAYAD_THEME.navy }}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-sm mb-4" style={{ color: KAYAD_THEME.slate[500] }}>{vehicle.registration}</p>

                {/* Value Estimate */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs mb-1" style={{ color: KAYAD_THEME.slate[500] }}>Market Value</p>
                    <p className="font-bold text-lg" style={{ color: KAYAD_THEME.navy }}>KES {(valuation.currentMarketValue / 1000000).toFixed(1)}M</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs mb-1" style={{ color: KAYAD_THEME.slate[500] }}>Trade-in</p>
                    <p className="font-bold text-lg" style={{ color: KAYAD_THEME.amber }}>KES {(valuation.tradeInValue / 1000000).toFixed(1)}M</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs mb-1" style={{ color: KAYAD_THEME.slate[500] }}>Asking Price</p>
                    <p className="font-bold text-lg" style={{ color: KAYAD_THEME.gold }}>KES {(valuation.recommendedAskingPrice / 1000000).toFixed(1)}M</p>
                  </div>
                </div>

                {/* Market Indicators */}
                <div className="flex gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    valuation.marketDemand === 'high' ? 'bg-emerald-100 text-emerald-700' :
                    valuation.marketDemand === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {valuation.marketDemand.charAt(0).toUpperCase() + valuation.marketDemand.slice(1)} Demand
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    valuation.priceTrend === 'increasing' ? 'bg-emerald-100 text-emerald-700' :
                    valuation.priceTrend === 'decreasing' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {valuation.priceTrend === 'increasing' ? '↗' : valuation.priceTrend === 'decreasing' ? '↘' : '→'} {valuation.priceTrend}
                  </span>
                </div>

                <p className="text-sm mb-4" style={{ color: KAYAD_THEME.slate[500] }}>
                  Best time to list: <span className="font-medium" style={{ color: KAYAD_THEME.navy }}>{valuation.bestListingTime}</span>
                </p>

                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: KAYAD_THEME.navy }}>
                    Create Listing
                  </button>
                  <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                    Detailed Report
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 12: BUYER REWARDS
// ============================================================

function RewardsSection({ rewards, userPoints }: { rewards: RewardPoint[]; userPoints: number }) {
  const availableRewards = rewards.filter(r => !r.redeemed);
  const redeemedRewards = rewards.filter(r => r.redeemed);

  const rewardColors: Record<string, string> = {
    inspection_discount: KAYAD_THEME.emerald,
    dealer_offer: KAYAD_THEME.navy,
    finance_benefit: KAYAD_THEME.gold,
    referral_reward: '#8B5CF6',
    event_invitation: KAYAD_THEME.amber,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Buyer Rewards</h1>

      {/* Points Summary */}
      <div className="rounded-2xl p-6" style={{ background: `linear-gradient(135deg, ${KAYAD_THEME.gold} 0%, ${KAYAD_THEME.amber} 100%)` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-navy/70 text-sm mb-1">Your Points Balance</p>
            <p className="text-navy text-4xl font-bold">{userPoints.toLocaleString()}</p>
          </div>
          <Trophy size={48} style={{ color: KAYAD_THEME.navy, opacity: 0.3 }} />
        </div>
        <p className="text-navy/70 text-sm mt-4">
          Earn more points with every purchase, inspection, and referral
        </p>
      </div>

      {/* Available Rewards */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: KAYAD_THEME.navy }}>Available Rewards ({availableRewards.length})</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {availableRewards.map(reward => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-4"
              style={{ backgroundColor: 'white' }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${rewardColors[reward.type]}15` }}
                >
                  <Award size={24} style={{ color: rewardColors[reward.type] }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1" style={{ color: KAYAD_THEME.navy }}>{reward.title}</h3>
                  <p className="text-sm mb-3" style={{ color: KAYAD_THEME.slate[500] }}>{reward.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: KAYAD_THEME.gold }}>
                      {reward.points} points
                    </span>
                    <button className="px-4 py-1.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: KAYAD_THEME.navy }}>
                      Redeem
                    </button>
                  </div>
                  <p className="text-xs mt-2" style={{ color: KAYAD_THEME.slate[400] }}>
                    Expires {reward.expiryDate}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Redeemed */}
      {redeemedRewards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: KAYAD_THEME.slate[500] }}>Redeemed Rewards</h2>
          <div className="space-y-3">
            {redeemedRewards.map(reward => (
              <div key={reward.id} className="flex items-center gap-4 p-4 rounded-xl opacity-60" style={{ backgroundColor: 'white' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${rewardColors[reward.type]}15` }}>
                  <CheckCircle size={20} style={{ color: KAYAD_THEME.emerald }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: KAYAD_THEME.navy }}>{reward.title}</p>
                  <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{reward.points} points used</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION 13: AI BUYER COPILOT
// ============================================================

function AICopilotSection({ vehicles }: { vehicles: Vehicle[] }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: "Hello! I'm your KAYAD AI Buyer Copilot. I can help you with questions about your vehicles, ownership costs, maintenance, resale value, and more. What would you like to know?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const suggestedQuestions = [
    "Which of my saved vehicles offers the best value?",
    "When should I sell my car?",
    "What maintenance is due?",
    "Estimate annual ownership costs",
    "Compare my vehicle to newer models",
    "Recommend an upgrade",
  ];

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const userMessage = { role: 'user' as const, content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `Based on your ${vehicles[0]?.make} ${vehicles[0]?.model}, here's what I found:\n\n• Your vehicle has a health score of ${vehicles[0]?.healthScore}%\n• Current resale value is approximately KES ${((vehicles[0]?.currentValue || 0) / 1000000).toFixed(1)}M\n• Recommended next service: Oil change within 2,000 km\n\nWould you like me to book a service appointment?`
      }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>AI Buyer Copilot</h1>

      {/* Chat Interface */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'white' }}>
        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'text-white rounded-br-sm' 
                    : 'rounded-bl-sm'
                }`}
                style={{ 
                  backgroundColor: msg.role === 'user' ? KAYAD_THEME.navy : KAYAD_THEME.warmBeige,
                  color: msg.role === 'user' ? 'white' : KAYAD_THEME.navy,
                }}
              >
                <div className="flex items-start gap-2">
                  {msg.role === 'ai' && <Bot size={18} style={{ color: KAYAD_THEME.gold }} className="flex-shrink-0 mt-0.5" />}
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t" style={{ borderColor: KAYAD_THEME.slate[200] }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about your vehicles..."
              className="flex-1 px-4 py-2 rounded-lg border outline-none focus:ring-2"
              style={{ 
                borderColor: KAYAD_THEME.slate[200],
                ['--tw-ring-color' as any]: KAYAD_THEME.gold,
              }}
            />
            <button 
              onClick={handleSend}
              className="px-4 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: KAYAD_THEME.navy }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Questions */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: KAYAD_THEME.navy }}>Suggested Questions</h2>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => { setQuery(q); }}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors hover:scale-105"
              style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 14: COMMUNICATION CENTER
// ============================================================

function MessagesSection({ messages }: { messages: Message[] }) {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const unread = messages.filter(m => !m.read).length;

  const messageColors: Record<string, string> = {
    dealer: KAYAD_THEME.navy,
    system: KAYAD_THEME.slate[500],
    inspection: KAYAD_THEME.emerald,
    finance: KAYAD_THEME.gold,
    support: '#8B5CF6',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Messages</h1>
        {unread > 0 && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500 text-white">
            {unread} unread
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1 rounded-xl overflow-hidden" style={{ backgroundColor: 'white' }}>
          <div className="p-4 border-b" style={{ borderColor: KAYAD_THEME.slate[100] }}>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: KAYAD_THEME.slate[400] }} />
              <input
                type="text"
                placeholder="Search messages..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border outline-none"
                style={{ borderColor: KAYAD_THEME.slate[200] }}
              />
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: KAYAD_THEME.slate[100] }}>
            {messages.map(msg => (
              <button
                key={msg.id}
                onClick={() => setSelectedMessage(msg.id)}
                className={`w-full p-4 text-left transition-colors ${
                  selectedMessage === msg.id ? '' : 'hover:bg-slate-50'
                } ${!msg.read ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${messageColors[msg.sender]}15` }}
                  >
                    <MessageCircle size={14} style={{ color: messageColors[msg.sender] }} />
                  </div>
                  <span className="font-medium text-sm truncate" style={{ color: KAYAD_THEME.navy }}>
                    {msg.senderName}
                  </span>
                  {!msg.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                </div>
                <p className="text-sm font-medium truncate mb-1" style={{ color: KAYAD_THEME.navy }}>{msg.subject}</p>
                <p className="text-xs truncate" style={{ color: KAYAD_THEME.slate[500] }}>{msg.preview}</p>
                <p className="text-xs mt-1" style={{ color: KAYAD_THEME.slate[400] }}>{msg.date}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2 rounded-xl" style={{ backgroundColor: 'white' }}>
          {selectedMessage ? (
            <MessageDetail 
              message={messages.find(m => m.id === selectedMessage)!}
              color={messageColors[messages.find(m => m.id === selectedMessage)?.sender || 'system']}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <MessageSquare size={48} style={{ color: KAYAD_THEME.slate[300] }} className="mx-auto mb-4" />
                <p style={{ color: KAYAD_THEME.slate[500] }}>Select a message to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageDetail({ message, color }: { message: Message; color: string }) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b" style={{ borderColor: KAYAD_THEME.slate[100] }}>
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <MessageCircle size={18} style={{ color }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: KAYAD_THEME.navy }}>{message.senderName}</p>
            <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{message.date}</p>
          </div>
        </div>
        <h2 className="text-xl font-bold" style={{ color: KAYAD_THEME.navy }}>{message.subject}</h2>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto">
        <p className="whitespace-pre-wrap" style={{ color: KAYAD_THEME.navy }}>{message.preview}</p>
        
        {message.actions && message.actions.length > 0 && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: KAYAD_THEME.slate[100] }}>
            <p className="text-sm font-medium mb-3" style={{ color: KAYAD_THEME.navy }}>Actions Available:</p>
            <div className="flex gap-2">
              {message.actions.map((action, i) => (
                <a
                  key={i}
                  href={action.url}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: KAYAD_THEME.navy }}
                >
                  {action.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 15: SETTINGS & PRIVACY
// ============================================================

function SettingsSection({ user }: { user: typeof SAMPLE_USER }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Settings & Privacy</h1>

      {/* Profile */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: KAYAD_THEME.navy }}>Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center">
            <User size={32} style={{ color: KAYAD_THEME.gold }} />
          </div>
          <div>
            <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>{user.name}</p>
            <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gold/20 text-gold">
              {user.tier} Member
            </span>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: KAYAD_THEME.navy }}>Full Name</label>
            <input
              type="text"
              defaultValue={user.name}
              className="w-full px-4 py-2 rounded-lg border outline-none"
              style={{ borderColor: KAYAD_THEME.slate[200] }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: KAYAD_THEME.navy }}>Phone</label>
            <input
              type="text"
              defaultValue={user.phone}
              className="w-full px-4 py-2 rounded-lg border outline-none"
              style={{ borderColor: KAYAD_THEME.slate[200] }}
            />
          </div>
        </div>
        <button className="mt-4 px-6 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_THEME.navy }}>
          Save Changes
        </button>
      </div>

      {/* Notifications */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: KAYAD_THEME.navy }}>Notifications</h2>
        <div className="space-y-4">
          {[
            { label: 'Email notifications', enabled: true },
            { label: 'SMS notifications', enabled: true },
            { label: 'Push notifications', enabled: false },
            { label: 'Price alerts', enabled: true },
            { label: 'Service reminders', enabled: true },
            { label: 'New listings', enabled: false },
          ].map((setting, i) => (
            <div key={i} className="flex items-center justify-between">
              <span style={{ color: KAYAD_THEME.navy }}>{setting.label}</span>
              <button 
                className={`w-12 h-6 rounded-full transition-colors relative ${setting.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${setting.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: KAYAD_THEME.navy }}>Privacy & Security</h2>
        <div className="space-y-4">
          <button className="w-full flex items-center justify-between p-4 rounded-lg transition-colors hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <Shield size={20} style={{ color: KAYAD_THEME.navy }} />
              <span style={{ color: KAYAD_THEME.navy }}>Change Password</span>
            </div>
            <ChevronRight size={16} style={{ color: KAYAD_THEME.slate[400] }} />
          </button>
          <button className="w-full flex items-center justify-between p-4 rounded-lg transition-colors hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} style={{ color: KAYAD_THEME.navy }} />
              <span style={{ color: KAYAD_THEME.navy }}>Two-Factor Authentication</span>
            </div>
            <span className="text-sm px-2 py-1 rounded bg-slate-100" style={{ color: KAYAD_THEME.slate[500] }}>Disabled</span>
          </button>
          <button className="w-full flex items-center justify-between p-4 rounded-lg transition-colors hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <Globe size={20} style={{ color: KAYAD_THEME.navy }} />
              <span style={{ color: KAYAD_THEME.navy }}>Connected Services</span>
            </div>
            <ChevronRight size={16} style={{ color: KAYAD_THEME.slate[400] }} />
          </button>
          <button className="w-full flex items-center justify-between p-4 rounded-lg transition-colors hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <LogOut size={20} style={{ color: KAYAD_THEME.red }} />
              <span style={{ color: KAYAD_THEME.red }}>Delete Account</span>
            </div>
            <ChevronRight size={16} style={{ color: KAYAD_THEME.slate[400] }} />
          </button>
        </div>
      </div>
    </div>
  );
}
