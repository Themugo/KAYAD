// ============================================================
// KAYAD FINANCE MARKETPLACE - AUTOMOTIVE FINANCING ECOSYSTEM
// Connecting buyers with verified financial institutions
// ============================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Warehouse, Heart, ShoppingCart, ClipboardCheck, DollarSign, FileText, Clock,
  Bell, TrendingUp, Award, Bot, MessageSquare, Settings, ChevronRight, Menu, X,
  User, LogOut, Moon, Sun, Globe, Shield, BellRing, Search, Plus, Minus,
  Car, Camera, Image, Gauge, Wrench, Calendar, MapPin, Star, Trophy,
  CheckCircle, AlertCircle, XCircle, Clock3, Package, Truck, Key, ShieldCheck,
  Check, Circle, ArrowRight, ArrowLeft, PlusCircle, MinusCircle,
  File, FileCheck, Upload, Download, Eye, Trash2, Share2, Copy, FileUp,
  CreditCard, Building, Receipt, PiggyBank, Percent, TrendingDown,
  BarChart3, Sparkles, ArrowUpRight, RefreshCw, DollarSign as DollarSignIcon,
  MessageCircle, Mail, Phone, Bell as BellIcon, CalendarCheck, Users,
  BadgeCheck, BadgeDollarSign, ShieldAlert, ShieldCheck as ShieldCheckVerified,
  PlusCircle as PlusCircleIcon, Settings2, ExternalLink, Filter, SortAsc, Grid, List,
  Eye as EyeIcon, Heart as HeartIcon, MessageSquare as MessageSquareIcon, Timer, TrendingUp as TrendingUpIcon,
  Lightbulb, Target, Zap,
  HelpCircle, BookOpen, AlertTriangle, Info, ExternalLink as ExternalLinkIcon,
  Phone as PhoneIcon, Mail as MailIcon,
  Calendar as CalendarIcon, MapPin as MapPinIcon, Clock as ClockIcon,
  UserCheck, CheckCircle2,
  // Finance specific
  Calculator, Landmark, Wallet, Handshake, FileBadge, Users as UsersIcon,
  TrendingDown as TrendingDownIcon, PieChart, BarChart, Activity,
  ShieldCheck as ShieldCheckIcon, Lock, Unlock, EyeOff, Building2,
  CreditCard as CreditCardIcon, Banknote, ScrollText, Scale,
  Briefcase, GraduationCap, Factory, Truck as TruckIcon,
  Umbrella, HeartPulse, ShieldPlus, AlertTriangle as AlertTriangleIcon,
} from 'lucide-react';

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface FinancePartner {
  id: string;
  name: string;
  type: 'bank' | 'sacco' | 'microfinance' | 'leasing' | 'manufacturer';
  logo: string;
  products: string[];
  interestRateMin: number;
  interestRateMax: number;
  approvalSpeed: 'instant' | 'fast' | 'standard';
  minDeposit: number;
  minIncome: number;
  rating: number;
  reviews: number;
  features: string[];
  eligible: boolean;
}

interface LoanScenario {
  id: string;
  vehiclePrice: number;
  deposit: number;
  loanAmount: number;
  interestRate: number;
  term: number;
  monthlyPayment: number;
  totalInterest: number;
  insuranceEstimate: number;
  processingFees: number;
  totalCost: number;
}

interface PreQualification {
  monthlyIncome: number;
  employmentType: 'salaried' | 'self-employed' | 'business-owner' | 'contractor';
  existingLoans: number;
  depositAvailable: number;
  creditHistory: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  approvalLikelihood: number;
  suggestedLenders: string[];
  recommendedDeposit: number;
}

interface FinanceApplication {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehiclePrice: number;
  loanAmount: number;
  lenders: string[];
  status: 'submitted' | 'documents_verified' | 'under_review' | 'credit_assessment' | 'conditional_approval' | 'approved' | 'rejected' | 'dealer_notified' | 'completed';
  submittedAt: string;
  offers: LenderOffer[];
  documents: Document[];
}

interface LenderOffer {
  lenderId: string;
  lenderName: string;
  interestRate: number;
  monthlyPayment: number;
  term: number;
  totalCost: number;
  approved: boolean;
  conditions?: string[];
}

interface Document {
  id: string;
  type: 'national_id' | 'kra_pin' | 'payslip' | 'bank_statement' | 'business_reg' | 'employment_letter' | 'proof_address' | 'other';
  name: string;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  uploadedAt?: string;
  verifiedAt?: string;
}

interface InsuranceQuote {
  id: string;
  provider: string;
  type: 'comprehensive' | 'third_party' | 'asset_protection' | 'credit_life' | 'gap_cover' | 'roadside';
  premium: number;
  coverage: number;
  features: string[];
}

// ============================================================
// SAMPLE DATA
// ============================================================

const FINANCE_PARTNERS: FinancePartner[] = [
  {
    id: 'equity',
    name: 'a partner bank',
    type: 'bank',
    logo: '🏦',
    products: ['Personal Loans', 'Asset Finance', 'Business Loans'],
    interestRateMin: 12,
    interestRateMax: 18,
    approvalSpeed: 'fast',
    minDeposit: 10,
    minIncome: 50000,
    rating: 4.5,
    reviews: 1250,
    features: ['Mobile banking', 'Instant notifications', 'Flexible terms'],
    eligible: true,
  },
  {
    id: 'kcb',
    name: 'another partner bank Bank',
    type: 'bank',
    logo: '🏛️',
    products: ['Vehicle Finance', 'Asset Loans', 'Salary Advance'],
    interestRateMin: 11,
    interestRateMax: 16,
    approvalSpeed: 'fast',
    minDeposit: 10,
    minIncome: 60000,
    rating: 4.3,
    reviews: 980,
    features: ['Low rates', 'Long terms', 'Insurance included'],
    eligible: true,
  },
  {
    id: 'stima',
    name: 'Stima SACCO',
    type: 'sacco',
    logo: '🤝',
    products: ['Vehicle Loans', 'Emergency Loans', 'Savings'],
    interestRateMin: 8,
    interestRateMax: 12,
    approvalSpeed: 'standard',
    minDeposit: 15,
    minIncome: 30000,
    rating: 4.7,
    reviews: 2100,
    features: ['Low interest', 'Member benefits', 'Dividends'],
    eligible: true,
  },
  {
    id: 'faulu',
    name: 'Faulu Kenya',
    type: 'microfinance',
    logo: '💰',
    products: ['MSME Finance', 'Asset Loans', 'Group Lending'],
    interestRateMin: 15,
    interestRateMax: 22,
    approvalSpeed: 'fast',
    minDeposit: 20,
    minIncome: 25000,
    rating: 4.1,
    reviews: 650,
    features: ['Small business focus', 'Flexible collateral', 'Quick approval'],
    eligible: true,
  },
  {
    id: 'toyota-finance',
    name: 'Toyota Financial',
    type: 'manufacturer',
    logo: '🚗',
    products: ['Toyota Finance', 'Balloon Financing', 'Leasing'],
    interestRateMin: 9,
    interestRateMax: 14,
    approvalSpeed: 'instant',
    minDeposit: 15,
    minIncome: 80000,
    rating: 4.8,
    reviews: 3200,
    features: ['Balloon options', 'Insurance packages', 'Toyota verified'],
    eligible: false,
  },
  {
    id: 'alpher',
    name: 'Alpher Capital',
    type: 'leasing',
    logo: '📊',
    products: ['Operating Lease', 'Finance Lease', 'Fleet Management'],
    interestRateMin: 10,
    interestRateMax: 15,
    approvalSpeed: 'standard',
    minDeposit: 20,
    minIncome: 150000,
    rating: 4.4,
    reviews: 420,
    features: ['Corporate leasing', 'Fleet discounts', 'Maintenance included'],
    eligible: true,
  },
];

const SAMPLE_APPLICATION: FinanceApplication = {
  id: 'app-001',
  vehicleId: 'v1',
  vehicleTitle: '2022 Toyota Corolla',
  vehiclePrice: 2100000,
  loanAmount: 1800000,
  lenders: ['equity', 'kcb', 'stima'],
  status: 'under_review',
  submittedAt: '2024-03-10T09:30:00Z',
  offers: [
    { lenderId: 'equity', lenderName: 'a partner bank', interestRate: 14, monthlyPayment: 43500, term: 48, totalCost: 2088000, approved: true },
    { lenderId: 'kcb', lenderName: 'another partner bank Bank', interestRate: 12.5, monthlyPayment: 42500, term: 48, totalCost: 2040000, approved: true },
  ],
  documents: [
    { id: 'd1', type: 'national_id', name: 'National ID', status: 'verified', verifiedAt: '2024-03-10' },
    { id: 'd2', type: 'kra_pin', name: 'KRA PIN Certificate', status: 'verified', verifiedAt: '2024-03-10' },
    { id: 'd3', type: 'payslip', name: 'Latest Payslip', status: 'verified', verifiedAt: '2024-03-11' },
    { id: 'd4', type: 'bank_statement', name: '6-Month Bank Statement', status: 'uploaded' },
    { id: 'd5', type: 'employment_letter', name: 'Employment Letter', status: 'pending' },
  ],
};

const SAMPLE_DOCUMENTS: Document[] = [
  { id: 'd1', type: 'national_id', name: 'National ID', status: 'verified', verifiedAt: '2024-03-10' },
  { id: 'd2', type: 'kra_pin', name: 'KRA PIN Certificate', status: 'verified', verifiedAt: '2024-03-10' },
  { id: 'd3', type: 'payslip', name: 'Latest Payslip (March 2024)', status: 'uploaded', uploadedAt: '2024-03-12' },
  { id: 'd4', type: 'bank_statement', name: '6-Month Bank Statement', status: 'pending' },
  { id: 'd5', type: 'employment_letter', name: 'Employment Letter', status: 'pending' },
  { id: 'd6', type: 'proof_address', name: 'Utility Bill', status: 'pending' },
];

const INSURANCE_PROVIDERS: InsuranceQuote[] = [
  { id: 'i1', provider: 'Jubilee Insurance', type: 'comprehensive', premium: 85000, coverage: 2500000, features: ['Full coverage', 'Roadside assistance', 'Passenger cover'] },
  { id: 'i2', provider: 'APA Insurance', type: 'comprehensive', premium: 78000, coverage: 2500000, features: ['Comprehensive', 'Windscreen cover', 'Theft protection'] },
  { id: 'i3', provider: 'Britam', type: 'third_party', premium: 15000, coverage: 1000000, features: ['Third party liability', 'Legal costs'] },
  { id: 'i4', provider: 'Madison Insurance', type: 'credit_life', premium: 25000, coverage: 2000000, features: ['Death cover', 'Disability cover', 'Job loss cover'] },
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
  emeraldDark: '#059669',
  amber: '#F59E0B',
  red: '#EF4444',
  orange: '#F97316',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
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

type FinanceSection = 
  | 'home' 
  | 'marketplace' 
  | 'calculator' 
  | 'pre-qualification' 
  | 'application' 
  | 'tracker' 
  | 'documents' 
  | 'bank-portal' 
  | 'dealer-center' 
  | 'leasing' 
  | 'insurance' 
  | 'advisor' 
  | 'admin' 
  | 'compliance' 
  | 'analytics'
  | 'help';

export default function FinanceMarketplace() {
  const [activeSection, setActiveSection] = useState<FinanceSection>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSectionChange = useCallback((section: FinanceSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  }, []);

  const activeApplications = 1;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-screen" style={{ backgroundColor: KAYAD_THEME.navy }}>
        <SidebarContent 
          activeSection={activeSection} 
          onSectionChange={handleSectionChange}
          activeApplications={activeApplications}
        />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: KAYAD_THEME.navy }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: KAYAD_THEME.gold }}>
              <DollarSignIcon size={18} style={{ color: KAYAD_THEME.navy }} />
            </div>
            <span className="text-white font-bold">Finance</span>
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
                activeApplications={activeApplications}
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
              {activeSection === 'home' && <FinanceHomeSection onNavigate={handleSectionChange} />}
              {activeSection === 'marketplace' && <MarketplaceSection partners={FINANCE_PARTNERS} />}
              {activeSection === 'calculator' && <CalculatorSection />}
              {activeSection === 'pre-qualification' && <PreQualificationSection />}
              {activeSection === 'application' && <ApplicationSection vehiclePrice={2500000} />}
              {activeSection === 'tracker' && <TrackerSection application={SAMPLE_APPLICATION} />}
              {activeSection === 'documents' && <DocumentVaultSection documents={SAMPLE_DOCUMENTS} />}
              {activeSection === 'bank-portal' && <BankPortalSection />}
              {activeSection === 'dealer-center' && <DealerFinanceCenterSection />}
              {activeSection === 'leasing' && <LeasingCenterSection />}
              {activeSection === 'insurance' && <InsuranceSection providers={INSURANCE_PROVIDERS} />}
              {activeSection === 'advisor' && <FinanceAdvisorSection />}
              {activeSection === 'admin' && <AdminSection />}
              {activeSection === 'compliance' && <ComplianceSection />}
              {activeSection === 'analytics' && <AnalyticsSection />}
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
  activeApplications,
}: { 
  activeSection: FinanceSection;
  onSectionChange: (s: FinanceSection) => void;
  activeApplications: number;
}) {
  const navItems: { id: FinanceSection; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Finance Home', icon: <Home size={20} /> },
    { id: 'marketplace', label: 'Finance Marketplace', icon: <Landmark size={20} /> },
    { id: 'calculator', label: 'Calculator', icon: <Calculator size={20} /> },
    { id: 'pre-qualification', label: 'Pre-Qualification', icon: <ShieldCheckIcon size={20} /> },
    { id: 'application', label: 'Apply Now', icon: <FileBadge size={20} /> },
    { id: 'tracker', label: 'Application Tracker', icon: <Activity size={20} />, badge: activeApplications },
    { id: 'documents', label: 'Document Vault', icon: <FileText size={20} /> },
    { id: 'insurance', label: 'Insurance', icon: <Umbrella size={20} /> },
    { id: 'advisor', label: 'AI Advisor', icon: <Bot size={20} /> },
    { id: 'leasing', label: 'Leasing Center', icon: <Briefcase size={20} /> },
    { id: 'dealer-center', label: 'Dealer Finance', icon: <Building2 size={20} /> },
    { id: 'bank-portal', label: 'Bank Portal', icon: <Landmark size={20} /> },
    { id: 'analytics', label: 'Analytics', icon: <PieChart size={20} /> },
    { id: 'admin', label: 'Admin', icon: <Settings size={20} /> },
    { id: 'compliance', label: 'Compliance', icon: <Scale size={20} /> },
    { id: 'help', label: 'Help', icon: <HelpCircle size={20} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: KAYAD_THEME.gold }}>
            <DollarSignIcon size={24} style={{ color: KAYAD_THEME.navy }} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">KAYAD</h1>
            <p className="text-white/60 text-xs">Finance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <div className="space-y-1">
          {navItems.filter(item => item.id !== 'help').map(item => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${
                activeSection === item.id 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute right-3 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Stats */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheckVerified size={16} style={{ color: KAYAD_THEME.emerald }} />
            <span className="text-white/70 text-xs">KAYAD Finance</span>
          </div>
          <p className="text-white text-sm font-medium">Connecting buyers with 50+ lenders</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 1: FINANCE HOME
// ============================================================

function FinanceHomeSection({ onNavigate }: { onNavigate: (s: FinanceSection) => void }) {
  const benefits = [
    { icon: <Landmark size={24} />, title: 'Compare Multiple Lenders', desc: 'One application, multiple offers from banks, SACCOs, and more' },
    { icon: <Shield size={24} />, title: 'Secure & Transparent', desc: 'Clear terms, no hidden fees, data protected' },
    { icon: <Clock size={24} />, title: 'Fast Approvals', desc: 'Get approved in as little as 24 hours' },
    { icon: <Calculator size={24} />, title: 'Smart Calculator', desc: 'Know your monthly payment before you apply' },
  ];

  const faqs = [
    { q: 'How does KAYAD Finance work?', a: 'KAYAD connects you with verified financial institutions. You submit one application, and we share it with lenders who compete for your business.' },
    { q: 'Does KAYAD lend money?', a: 'No. KAYAD is a marketplace platform. We connect buyers with banks, SACCOs, and other lenders. We do not provide loans ourselves.' },
    { q: 'What types of financing are available?', a: 'We partner with lenders offering hire purchase, asset finance, balloon financing, leasing, and more.' },
    { q: 'How long does approval take?', a: 'Approval times vary by lender. Some offer instant decisions while others take 1-3 business days.' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 lg:p-12"
        style={{ background: `linear-gradient(135deg, ${KAYAD_THEME.emerald} 0%, ${KAYAD_THEME.emeraldDark} 100%)` }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <DollarSignIcon size={40} color="white" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Finance Your Vehicle with Confidence
          </h1>
          <p className="text-lg text-white/80 mb-8">
            East Africa's leading automotive financing marketplace. Compare offers from banks, 
            SACCOs, and lenders. One application, multiple approvals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => onNavigate('pre-qualification')}
              className="px-8 py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: KAYAD_THEME.navy }}
            >
              Check Eligibility
            </button>
            <button 
              onClick={() => onNavigate('calculator')}
              className="px-8 py-3 rounded-xl font-bold"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              Calculate Payment
            </button>
          </div>
        </div>
      </motion.div>

      {/* How It Works */}
      <div>
        <h2 className="text-2xl font-bold text-center mb-6" style={{ color: KAYAD_THEME.navy }}>How KAYAD Finance Works</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { step: 1, label: 'Choose Vehicle' },
            { step: 2, label: 'Check Eligibility' },
            { step: 3, label: 'Compare Offers' },
            { step: 4, label: 'Get Approved' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold text-white" style={{ backgroundColor: KAYAD_THEME.emerald }}>
                {item.step}
              </div>
              <p className="font-medium" style={{ color: KAYAD_THEME.navy }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div>
        <h2 className="text-2xl font-bold mb-6" style={{ color: KAYAD_THEME.navy }}>Why Use KAYAD Finance?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-4"
              style={{ backgroundColor: 'white' }}
            >
              <div className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: `${KAYAD_THEME.emerald}15` }}>
                <div style={{ color: KAYAD_THEME.emerald }}>{benefit.icon}</div>
              </div>
              <h3 className="font-bold mb-1" style={{ color: KAYAD_THEME.navy }}>{benefit.title}</h3>
              <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{benefit.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Partner Types */}
      <div>
        <h2 className="text-2xl font-bold mb-6" style={{ color: KAYAD_THEME.navy }}>Our Partner Network</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: <Building size={32} />, label: 'Banks' },
            { icon: <UsersIcon size={32} />, label: 'SACCOs' },
            { icon: <PiggyBank size={32} />, label: 'Microfinance' },
            { icon: <TruckIcon size={32} />, label: 'Leasing' },
            { icon: <Car size={32} />, label: 'Manufacturer' },
          ].map((type, i) => (
            <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: 'white' }}>
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                <div style={{ color: KAYAD_THEME.navy }}>{type.icon}</div>
              </div>
              <p className="font-medium" style={{ color: KAYAD_THEME.navy }}>{type.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Finance Types */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: KAYAD_THEME.navy }}>Financing Options Available</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Hire Purchase', desc: 'Own the vehicle after final payment', icon: <Handshake size={24} /> },
            { title: 'Asset Finance', desc: 'Finance the vehicle as an asset', icon: <Building size={24} /> },
            { title: 'Balloon Financing', desc: 'Lower monthly payments with final balloon', icon: <TrendingDownIcon size={24} /> },
            { title: 'Operating Lease', desc: 'Lease with option to buy', icon: <Briefcase size={24} /> },
          ].map((option, i) => (
            <div key={i} className="p-4 rounded-xl border" style={{ borderColor: KAYAD_THEME.slate[200] }}>
              <div className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center" style={{ backgroundColor: `${KAYAD_THEME.blue}15` }}>
                <div style={{ color: KAYAD_THEME.blue }}>{option.icon}</div>
              </div>
              <h3 className="font-bold mb-1" style={{ color: KAYAD_THEME.navy }}>{option.title}</h3>
              <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{option.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: KAYAD_THEME.navy }}>Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
              <summary className="font-medium cursor-pointer" style={{ color: KAYAD_THEME.navy }}>{faq.q}</summary>
              <p className="mt-2 text-sm" style={{ color: KAYAD_THEME.slate[600] }}>{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: `${KAYAD_THEME.navy}10` }}>
        <Calculator size={48} style={{ color: KAYAD_THEME.navy }} className="mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2" style={{ color: KAYAD_THEME.navy }}>Ready to Find Your Best Rate?</h3>
        <p className="mb-4" style={{ color: KAYAD_THEME.slate[600] }}>Check your eligibility in 2 minutes with no impact on your credit score</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={() => onNavigate('pre-qualification')}
            className="px-8 py-3 rounded-xl font-bold text-white"
            style={{ backgroundColor: KAYAD_THEME.emerald }}
          >
            Start Pre-Qualification
          </button>
          <button 
            onClick={() => onNavigate('marketplace')}
            className="px-8 py-3 rounded-xl font-bold"
            style={{ backgroundColor: 'white', color: KAYAD_THEME.navy }}
          >
            View All Lenders
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 2: FINANCE MARKETPLACE
// ============================================================

function MarketplaceSection({ partners }: { partners: FinancePartner[] }) {
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rate' | 'rating' | 'speed'>('rate');

  const filteredPartners = partners
    .filter(p => filterType === 'all' || p.type === filterType)
    .sort((a, b) => {
      if (sortBy === 'rate') return a.interestRateMin - b.interestRateMin;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'speed') {
        const speedOrder = { instant: 0, fast: 1, standard: 2 };
        return speedOrder[a.approvalSpeed] - speedOrder[b.approvalSpeed];
      }
      return 0;
    });

  const typeLabels: Record<string, string> = {
    bank: 'Bank',
    sacco: 'SACCO',
    microfinance: 'Microfinance',
    leasing: 'Leasing',
    manufacturer: 'Manufacturer',
  };

  const typeColors: Record<string, string> = {
    bank: KAYAD_THEME.blue,
    sacco: KAYAD_THEME.emerald,
    microfinance: KAYAD_THEME.orange,
    leasing: KAYAD_THEME.purple,
    manufacturer: KAYAD_THEME.navy,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Finance Marketplace</h1>
          <p style={{ color: KAYAD_THEME.slate[500] }}>Compare {partners.length} verified lenders</p>
        </div>
        <button className="px-6 py-2 rounded-xl font-bold text-white" style={{ backgroundColor: KAYAD_THEME.emerald }}>
          Apply Now
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 rounded-lg border outline-none"
          style={{ borderColor: KAYAD_THEME.slate[200] }}
        >
          <option value="all">All Types</option>
          <option value="bank">Banks</option>
          <option value="sacco">SACCOs</option>
          <option value="microfinance">Microfinance</option>
          <option value="leasing">Leasing</option>
          <option value="manufacturer">Manufacturer</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'rate' | 'rating' | 'speed')}
          className="px-4 py-2 rounded-lg border outline-none"
          style={{ borderColor: KAYAD_THEME.slate[200] }}
        >
          <option value="rate">Sort by Rate</option>
          <option value="rating">Sort by Rating</option>
          <option value="speed">Sort by Speed</option>
        </select>
      </div>

      {/* Partner Cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {filteredPartners.map((partner) => (
          <motion.div
            key={partner.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4"
            style={{ backgroundColor: 'white' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                {partner.logo}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold" style={{ color: KAYAD_THEME.navy }}>{partner.name}</h3>
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${typeColors[partner.type]}15`, color: typeColors[partner.type] }}
                    >
                      {typeLabels[partner.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={14} style={{ color: KAYAD_THEME.amber }} fill={KAYAD_THEME.amber} />
                    <span className="text-sm font-medium" style={{ color: KAYAD_THEME.navy }}>{partner.rating}</span>
                    <span className="text-xs" style={{ color: KAYAD_THEME.slate[400] }}>({partner.reviews})</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Interest Rate</p>
                    <p className="font-bold" style={{ color: KAYAD_THEME.emerald }}>{partner.interestRateMin}-{partner.interestRateMax}%</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Min Deposit</p>
                    <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>{partner.minDeposit}%</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Approval</p>
                    <p className="font-bold capitalize" style={{ color: partner.approvalSpeed === 'instant' ? KAYAD_THEME.emerald : KAYAD_THEME.navy }}>
                      {partner.approvalSpeed}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {partner.products.slice(0, 3).map((product, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: KAYAD_THEME.slate[100], color: KAYAD_THEME.slate[600] }}>
                      {product}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button 
                    className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: partner.eligible ? KAYAD_THEME.emerald : KAYAD_THEME.slate[400] }}
                    disabled={!partner.eligible}
                  >
                    {partner.eligible ? 'Apply Now' : 'Not Eligible'}
                  </button>
                  <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                    Details
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 3: FINANCE CALCULATOR
// ============================================================

function CalculatorSection() {
  const [vehiclePrice, setVehiclePrice] = useState(2000000);
  const [deposit, setDeposit] = useState(20);
  const [interestRate, setInterestRate] = useState(14);
  const [term, setTerm] = useState(48);
  const [insurance, setInsurance] = useState(80000);

  const loanAmount = vehiclePrice - (vehiclePrice * deposit / 100);
  const monthlyRate = interestRate / 100 / 12;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
  const totalInterest = (monthlyPayment * term) - loanAmount;
  const processingFees = loanAmount * 0.02;
  const totalCost = vehiclePrice + totalInterest + insurance + processingFees;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Finance Calculator</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
            <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Your Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>
                  Vehicle Price (KES)
                </label>
                <input
                  type="number"
                  value={vehiclePrice}
                  onChange={(e) => setVehiclePrice(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border outline-none"
                  style={{ borderColor: KAYAD_THEME.slate[200] }}
                />
              </div>

              <div>
                <label className="flex justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: KAYAD_THEME.navy }}>Deposit</span>
                  <span className="text-sm font-bold" style={{ color: KAYAD_THEME.emerald }}>{deposit}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: KAYAD_THEME.navy }}>Interest Rate</span>
                  <span className="text-sm font-bold" style={{ color: KAYAD_THEME.emerald }}>{interestRate}%</span>
                </label>
                <input
                  type="range"
                  min="8"
                  max="24"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: KAYAD_THEME.navy }}>Loan Term</span>
                  <span className="text-sm font-bold" style={{ color: KAYAD_THEME.emerald }}>{term} months</span>
                </label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={term}
                  onChange={(e) => setTerm(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>
                  Annual Insurance (KES)
                </label>
                <input
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border outline-none"
                  style={{ borderColor: KAYAD_THEME.slate[200] }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
            <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Your Payment Summary</h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: `${KAYAD_THEME.emerald}10` }}>
                <p className="text-sm mb-1" style={{ color: KAYAD_THEME.slate[500] }}>Monthly Payment</p>
                <p className="text-4xl font-bold" style={{ color: KAYAD_THEME.emerald }}>
                  KES {Math.round(monthlyPayment).toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                  <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Loan Amount</p>
                  <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(loanAmount / 1000000).toFixed(2)}M</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                  <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Total Interest</p>
                  <p className="font-bold" style={{ color: KAYAD_THEME.amber }}>KES {(totalInterest / 1000000).toFixed(2)}M</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                  <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Processing Fees</p>
                  <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(processingFees / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                  <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Total Cost</p>
                  <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(totalCost / 1000000).toFixed(2)}M</p>
                </div>
              </div>

              <button className="w-full py-3 rounded-xl font-bold text-white" style={{ backgroundColor: KAYAD_THEME.emerald }}>
                Apply for This Finance
              </button>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ backgroundColor: `${KAYAD_THEME.blue}10` }}>
            <div className="flex items-center gap-2 mb-2">
              <Info size={16} style={{ color: KAYAD_THEME.blue }} />
              <span className="font-medium" style={{ color: KAYAD_THEME.blue }}>Calculation Note</span>
            </div>
            <p className="text-sm" style={{ color: KAYAD_THEME.slate[600] }}>
              This is an estimate. Actual rates may vary based on your credit profile 
              and the specific lender's terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 4: PRE-QUALIFICATION
// ============================================================

function PreQualificationSection() {
  const [monthlyIncome, setMonthlyIncome] = useState(150000);
  const [employmentType, setEmploymentType] = useState('salaried');
  const [existingLoans, setExistingLoans] = useState(0);
  const [depositAvailable, setDepositAvailable] = useState(400000);
  const [creditHistory, setCreditHistory] = useState('good');
  const [checked, setChecked] = useState(false);

  const calculateLikelihood = () => {
    let score = 50;
    if (monthlyIncome >= 100000) score += 20;
    else if (monthlyIncome >= 50000) score += 10;
    if (employmentType === 'salaried') score += 15;
    if (existingLoans === 0) score += 10;
    else if (existingLoans > monthlyIncome * 0.3) score -= 20;
    if (creditHistory === 'excellent') score += 10;
    else if (creditHistory === 'good') score += 5;
    else if (creditHistory === 'poor') score -= 15;
    return Math.min(100, Math.max(0, score));
  };

  const likelihood = checked ? calculateLikelihood() : 0;
  const maxLoan = monthlyIncome * 12;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Pre-Qualification Check</h1>
      <p style={{ color: KAYAD_THEME.slate[500] }}>Check your eligibility with no impact on your credit score</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
            <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Your Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>
                  Monthly Income (KES)
                </label>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border outline-none"
                  style={{ borderColor: KAYAD_THEME.slate[200] }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>
                  Employment Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['salaried', 'self-employed', 'business-owner', 'contractor'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setEmploymentType(type)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium capitalize ${
                        employmentType === type ? 'text-white' : ''
                      }`}
                      style={{ 
                        backgroundColor: employmentType === type ? KAYAD_THEME.emerald : KAYAD_THEME.warmBeige,
                        color: employmentType === type ? 'white' : KAYAD_THEME.navy,
                      }}
                    >
                      {type.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>
                  Existing Monthly Loan Payments (KES)
                </label>
                <input
                  type="number"
                  value={existingLoans}
                  onChange={(e) => setExistingLoans(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border outline-none"
                  style={{ borderColor: KAYAD_THEME.slate[200] }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>
                  Available Deposit (KES)
                </label>
                <input
                  type="number"
                  value={depositAvailable}
                  onChange={(e) => setDepositAvailable(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border outline-none"
                  style={{ borderColor: KAYAD_THEME.slate[200] }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>
                  Credit History
                </label>
                <select
                  value={creditHistory}
                  onChange={(e) => setCreditHistory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border outline-none"
                  style={{ borderColor: KAYAD_THEME.slate[200] }}
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {checked && (
            <>
              <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
                <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Your Results</h2>
                
                <div className="text-center mb-6">
                  <div className="relative w-32 h-32 mx-auto">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="56" strokeWidth="12" fill="none" style={{ stroke: KAYAD_THEME.slate[200] }} />
                      <circle 
                        cx="64" cy="64" r="56" 
                        strokeWidth="12" 
                        fill="none"
                        style={{ 
                          stroke: likelihood >= 70 ? KAYAD_THEME.emerald : likelihood >= 40 ? KAYAD_THEME.amber : KAYAD_THEME.red,
                          strokeDasharray: `${(likelihood / 100) * 352} 352`,
                          transition: 'stroke-dasharray 0.5s ease'
                        }} 
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold" style={{ color: likelihood >= 70 ? KAYAD_THEME.emerald : likelihood >= 40 ? KAYAD_THEME.amber : KAYAD_THEME.red }}>
                        {likelihood}%
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 font-medium" style={{ color: KAYAD_THEME.navy }}>
                    {likelihood >= 70 ? 'High Approval Likelihood' : likelihood >= 40 ? 'Moderate Approval Likelihood' : 'Low Approval Likelihood'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg flex justify-between" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                    <span style={{ color: KAYAD_THEME.slate[500] }}>Estimated Max Loan</span>
                    <span className="font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(maxLoan / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="p-3 rounded-lg flex justify-between" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                    <span style={{ color: KAYAD_THEME.slate[500] }}>Recommended Deposit</span>
                    <span className="font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(Math.round(maxLoan * 0.15 / 1000) * 1000).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ backgroundColor: `${KAYAD_THEME.emerald}10` }}>
                <h3 className="font-bold mb-2" style={{ color: KAYAD_THEME.emerald }}>Suggested Lenders</h3>
                <div className="space-y-2">
                  {['a partner bank', 'another partner bank', 'Stima SACCO'].map((name, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle size={16} style={{ color: KAYAD_THEME.emerald }} />
                      <span style={{ color: KAYAD_THEME.navy }}>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <button 
            onClick={() => setChecked(true)}
            className="w-full py-3 rounded-xl font-bold text-white"
            style={{ backgroundColor: KAYAD_THEME.emerald }}
          >
            Check My Eligibility
          </button>

          <div className="rounded-xl p-4" style={{ backgroundColor: `${KAYAD_THEME.blue}10` }}>
            <div className="flex items-center gap-2 mb-2">
              <Lock size={16} style={{ color: KAYAD_THEME.blue }} />
              <span className="font-medium" style={{ color: KAYAD_THEME.blue }}>Soft Check Only</span>
            </div>
            <p className="text-sm" style={{ color: KAYAD_THEME.slate[600] }}>
              This pre-qualification uses a soft credit check that doesn't affect your credit score.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 5: APPLICATION
// ============================================================

function ApplicationSection({ vehiclePrice }: { vehiclePrice: number }) {
  const [step, setStep] = useState(1);
  const [selectedLenders, setSelectedLenders] = useState<string[]>(['equity', 'kcb']);

  const lenders = [
    { id: 'equity', name: 'a partner bank', rate: '12-16%' },
    { id: 'kcb', name: 'another partner bank Bank', rate: '11-15%' },
    { id: 'stima', name: 'Stima SACCO', rate: '8-12%' },
    { id: 'faulu', name: 'Faulu Kenya', rate: '15-20%' },
  ];

  const toggleLender = (id: string) => {
    setSelectedLenders(prev => 
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Apply for Finance</h1>

      {/* Progress */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'white' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: KAYAD_THEME.navy }}>Step {step} of 4</span>
          <span className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{Math.round((step / 4) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_THEME.slate[200] }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(step / 4) * 100}%`, backgroundColor: KAYAD_THEME.emerald }} />
        </div>
      </div>

      {step === 1 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
          <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Select Lenders</h2>
          <p className="mb-4" style={{ color: KAYAD_THEME.slate[500] }}>Choose one or more lenders to receive your application</p>
          <div className="space-y-3">
            {lenders.map((lender) => (
              <button
                key={lender.id}
                onClick={() => toggleLender(lender.id)}
                className={`w-full p-4 rounded-xl flex items-center justify-between transition-colors ${
                  selectedLenders.includes(lender.id) ? 'border-2' : ''
                }`}
                style={{ 
                  borderColor: selectedLenders.includes(lender.id) ? KAYAD_THEME.emerald : KAYAD_THEME.slate[200],
                  backgroundColor: selectedLenders.includes(lender.id) ? `${KAYAD_THEME.emerald}10` : 'white',
                }}
              >
                <div className="flex items-center gap-3">
                  {selectedLenders.includes(lender.id) ? (
                    <CheckCircle size={20} style={{ color: KAYAD_THEME.emerald }} />
                  ) : (
                    <Circle size={20} style={{ color: KAYAD_THEME.slate[300] }} />
                  )}
                  <span className="font-medium" style={{ color: KAYAD_THEME.navy }}>{lender.name}</span>
                </div>
                <span className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{lender.rate}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
          <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Vehicle Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>Vehicle Price (KES)</label>
              <input type="number" defaultValue={vehiclePrice} className="w-full px-4 py-3 rounded-xl border outline-none" style={{ borderColor: KAYAD_THEME.slate[200] }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>Deposit (KES)</label>
              <input type="number" placeholder="0" className="w-full px-4 py-3 rounded-xl border outline-none" style={{ borderColor: KAYAD_THEME.slate[200] }} />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
          <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Personal Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>Full Name</label>
              <input type="text" placeholder="Enter your full name" className="w-full px-4 py-3 rounded-xl border outline-none" style={{ borderColor: KAYAD_THEME.slate[200] }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>Phone Number</label>
              <input type="tel" placeholder="+254" className="w-full px-4 py-3 rounded-xl border outline-none" style={{ borderColor: KAYAD_THEME.slate[200] }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>Email</label>
              <input type="email" placeholder="email@example.com" className="w-full px-4 py-3 rounded-xl border outline-none" style={{ borderColor: KAYAD_THEME.slate[200] }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>Monthly Income</label>
              <input type="number" placeholder="KES" className="w-full px-4 py-3 rounded-xl border outline-none" style={{ borderColor: KAYAD_THEME.slate[200] }} />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
          <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Review & Submit</h2>
          <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
            <h3 className="font-medium mb-2" style={{ color: KAYAD_THEME.navy }}>Application Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span style={{ color: KAYAD_THEME.slate[500] }}>Lenders Selected:</span>
              <span style={{ color: KAYAD_THEME.navy }}>{selectedLenders.length}</span>
              <span style={{ color: KAYAD_THEME.slate[500] }}>Vehicle Price:</span>
              <span style={{ color: KAYAD_THEME.navy }}>KES {vehiclePrice.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle size={20} style={{ color: KAYAD_THEME.emerald }} />
            <p className="text-sm" style={{ color: KAYAD_THEME.slate[600] }}>
              By submitting, you consent to KAYAD sharing your information with selected lenders for the purpose of processing your finance application.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button 
          onClick={() => setStep(Math.max(1, step - 1))}
          className="px-6 py-2 rounded-xl font-medium"
          style={{ backgroundColor: KAYAD_THEME.slate[100], color: KAYAD_THEME.navy }}
          disabled={step === 1}
        >
          <ArrowLeft size={16} className="inline mr-2" /> Back
        </button>
        <button 
          onClick={() => setStep(Math.min(4, step + 1))}
          className="px-6 py-2 rounded-xl font-bold text-white"
          style={{ backgroundColor: KAYAD_THEME.emerald }}
        >
          {step === 4 ? 'Submit Application' : 'Continue'} <ArrowRight size={16} className="inline ml-2" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 6: APPLICATION TRACKER
// ============================================================

function TrackerSection({ application }: { application: FinanceApplication }) {
  const statusSteps = [
    { key: 'submitted', label: 'Submitted', completed: true, date: 'Mar 10' },
    { key: 'documents_verified', label: 'Documents Verified', completed: true, date: 'Mar 11' },
    { key: 'under_review', label: 'Under Review', completed: true, date: 'Mar 12' },
    { key: 'credit_assessment', label: 'Credit Assessment', completed: true, date: 'Mar 13' },
    { key: 'conditional_approval', label: 'Conditional Approval', completed: false },
    { key: 'approved', label: 'Approved', completed: false },
    { key: 'dealer_notified', label: 'Dealer Notified', completed: false },
    { key: 'completed', label: 'Vehicle Collection', completed: false },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Application Tracker</h1>

      {/* Application Summary */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: KAYAD_THEME.navy }}>{application.vehicleTitle}</h2>
            <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>Application #{application.id}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700 capitalize">
            {application.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Vehicle Price</p>
            <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(application.vehiclePrice / 1000000).toFixed(2)}M</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Loan Amount</p>
            <p className="font-bold" style={{ color: KAYAD_THEME.emerald }}>KES {(application.loanAmount / 1000000).toFixed(2)}M</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Submitted</p>
            <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>{application.submittedAt.split('T')[0]}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <h3 className="font-bold mb-6" style={{ color: KAYAD_THEME.navy }}>Application Progress</h3>
        
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ backgroundColor: KAYAD_THEME.slate[200] }} />
          
          <div className="space-y-6">
            {statusSteps.map((step, i) => (
              <div key={step.key} className="flex items-start gap-4 relative">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center z-10"
                  style={{ 
                    backgroundColor: step.completed ? KAYAD_THEME.emerald : 'white',
                    border: `2px solid ${step.completed ? KAYAD_THEME.emerald : KAYAD_THEME.slate[300]}`
                  }}
                >
                  {step.completed && <Check size={14} color="white" />}
                </div>
                <div className="flex-1 pt-1">
                  <p className={`font-medium ${step.completed ? '' : 'text-slate-400'}`} style={{ color: step.completed ? KAYAD_THEME.navy : undefined }}>
                    {step.label}
                  </p>
                  {step.date && (
                    <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{step.date}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Offers */}
      {application.offers.length > 0 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
          <h3 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Lender Offers</h3>
          <div className="space-y-3">
            {application.offers.map((offer) => (
              <div key={offer.lenderId} className="p-4 rounded-xl border" style={{ borderColor: offer.approved ? KAYAD_THEME.emerald : KAYAD_THEME.slate[200] }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold" style={{ color: KAYAD_THEME.navy }}>{offer.lenderName}</span>
                  {offer.approved && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Approved</span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Rate</p>
                    <p className="font-bold" style={{ color: KAYAD_THEME.emerald }}>{offer.interestRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Monthly</p>
                    <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>KES {offer.monthlyPayment.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Term</p>
                    <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>{offer.term} mo</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: KAYAD_THEME.slate[500] }}>Total</p>
                    <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(offer.totalCost / 1000000).toFixed(2)}M</p>
                  </div>
                </div>
                {offer.approved && (
                  <button className="mt-3 w-full py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_THEME.emerald }}>
                    Select This Offer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION 7: DOCUMENT VAULT
// ============================================================

function DocumentVaultSection({ documents }: { documents: Document[] }) {
  const docIcons: Record<string, React.ReactNode> = {
    national_id: <CreditCardIcon size={24} />,
    kra_pin: <ScrollText size={24} />,
    payslip: <Receipt size={24} />,
    bank_statement: <Banknote size={24} />,
    business_reg: <Building size={24} />,
    employment_letter: <FileText size={24} />,
    proof_address: <MapPin size={24} />,
  };

  const docLabels: Record<string, string> = {
    national_id: 'National ID',
    kra_pin: 'KRA PIN',
    payslip: 'Payslip',
    bank_statement: 'Bank Statement',
    business_reg: 'Business Registration',
    employment_letter: 'Employment Letter',
    proof_address: 'Proof of Address',
  };

  const statusColors: Record<string, string> = {
    pending: KAYAD_THEME.slate[400],
    uploaded: KAYAD_THEME.amber,
    verified: KAYAD_THEME.emerald,
    rejected: KAYAD_THEME.red,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Document Vault</h1>
          <p style={{ color: KAYAD_THEME.slate[500] }}>Securely upload and manage your documents</p>
        </div>
        <button className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2" style={{ backgroundColor: KAYAD_THEME.emerald }}>
          <Upload size={18} /> Upload Document
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div key={doc.id} className="rounded-xl p-4" style={{ backgroundColor: 'white' }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                <div style={{ color: KAYAD_THEME.navy }}>{docIcons[doc.type]}</div>
              </div>
              <div className="flex-1">
                <h3 className="font-medium" style={{ color: KAYAD_THEME.navy }}>{docLabels[doc.type]}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[doc.status] }} />
                  <span className="text-xs capitalize" style={{ color: statusColors[doc.status] }}>{doc.status.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {doc.status === 'pending' ? (
                <button className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                  Upload
                </button>
              ) : (
                <button className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                  View
                </button>
              )}
              {doc.status !== 'pending' && (
                <button className="px-3 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                  <Download size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Area */}
      <div className="rounded-xl p-8 border-2 border-dashed text-center" style={{ borderColor: KAYAD_THEME.slate[300] }}>
        <FileUp size={48} style={{ color: KAYAD_THEME.slate[400] }} className="mx-auto mb-4" />
        <h3 className="font-bold mb-2" style={{ color: KAYAD_THEME.navy }}>Upload Additional Documents</h3>
        <p className="text-sm mb-4" style={{ color: KAYAD_THEME.slate[500] }}>Drag and drop files here or click to browse (PDF, JPG, PNG)</p>
        <button className="px-6 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_THEME.navy }}>
          Select Files
        </button>
      </div>

      {/* Security Notice */}
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: `${KAYAD_THEME.emerald}10` }}>
        <ShieldCheckVerified size={24} style={{ color: KAYAD_THEME.emerald }} />
        <div>
          <p className="font-medium" style={{ color: KAYAD_THEME.emerald }}>Your Documents Are Secure</p>
          <p className="text-sm" style={{ color: KAYAD_THEME.slate[600] }}>All documents are encrypted and stored securely. Only authorized lenders can access them with your consent.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 8: BANK PORTAL (Simplified)
// ============================================================

function BankPortalSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Bank Portal</h1>
      
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: 'New Applications', value: '12', color: KAYAD_THEME.amber },
          { label: 'Under Review', value: '8', color: KAYAD_THEME.blue },
          { label: 'Approved Today', value: '3', color: KAYAD_THEME.emerald },
          { label: 'Total Portfolio', value: 'KES 450M', color: KAYAD_THEME.navy },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl p-4" style={{ backgroundColor: 'white' }}>
            <p className="text-sm mb-1" style={{ color: KAYAD_THEME.slate[500] }}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Recent Applications</h2>
        <div className="space-y-3">
          {[
            { name: 'James M.', amount: '2.1M', status: 'New', score: 85 },
            { name: 'Sarah K.', amount: '1.8M', status: 'Reviewing', score: 72 },
            { name: 'David O.', amount: '2.5M', status: 'Approved', score: 91 },
          ].map((app, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
              <div>
                <p className="font-medium" style={{ color: KAYAD_THEME.navy }}>{app.name}</p>
                <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{app.amount}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{app.status}</span>
                <span className="text-sm font-medium">{app.score}/100</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 9: DEALER FINANCE CENTER (Simplified)
// ============================================================

function DealerFinanceCenterSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Dealer Finance Center</h1>
      
      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Customer Finance Applications</h2>
        <div className="space-y-3">
          {[
            { customer: 'Robert N.', vehicle: '2022 Toyota Corolla', stage: 'Credit Assessment', progress: 60 },
            { customer: 'Mary W.', vehicle: '2021 Honda Civic', stage: 'Awaiting Documents', progress: 40 },
            { customer: 'Peter K.', vehicle: '2023 Nissan X-Trail', stage: 'Approved', progress: 100 },
          ].map((app, i) => (
            <div key={i} className="p-4 rounded-lg border" style={{ borderColor: KAYAD_THEME.slate[200] }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium" style={{ color: KAYAD_THEME.navy }}>{app.customer}</span>
                <span className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{app.vehicle}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{app.stage}</span>
                <span className="text-sm font-medium" style={{ color: KAYAD_THEME.emerald }}>{app.progress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_THEME.slate[200] }}>
                <div className="h-full rounded-full" style={{ width: `${app.progress}%`, backgroundColor: KAYAD_THEME.emerald }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: `${KAYAD_THEME.purple}10` }}>
        <Building2 size={48} style={{ color: KAYAD_THEME.purple }} className="mx-auto mb-4" />
        <h3 className="font-bold mb-2" style={{ color: KAYAD_THEME.navy }}>Finance Conversion Rate</h3>
        <p className="text-3xl font-bold" style={{ color: KAYAD_THEME.purple }}>23%</p>
        <p className="text-sm mt-2" style={{ color: KAYAD_THEME.slate[500] }}>of your customers apply for financing</p>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 10: LEASING CENTER (Placeholder)
// ============================================================

function LeasingCenterSection() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: `${KAYAD_THEME.amber}10` }}>
        <Briefcase size={64} style={{ color: KAYAD_THEME.amber }} className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2" style={{ color: KAYAD_THEME.navy }}>Leasing Center</h1>
        <p className="text-lg mb-4" style={{ color: KAYAD_THEME.slate[600] }}>
          Corporate leasing and fleet management coming soon
        </p>
        <div className="max-w-2xl mx-auto">
          <h3 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Upcoming Features</h3>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              'Operating Lease',
              'Finance Lease',
              'Corporate Fleet Leasing',
              'Employee Vehicle Leasing',
              'Lease-to-Own',
              'Residual Value Management',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2">
                <Clock size={16} style={{ color: KAYAD_THEME.amber }} />
                <span style={{ color: KAYAD_THEME.navy }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <button className="mt-6 px-6 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_THEME.amber, color: 'white' }}>
          Get Notified When Available
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 11: INSURANCE (Simplified)
// ============================================================

function InsuranceSection({ providers }: { providers: InsuranceQuote[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Insurance Add-ons</h1>
      <p style={{ color: KAYAD_THEME.slate[500] }}>Compare insurance quotes alongside your finance</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Shield size={24} />, label: 'Comprehensive', desc: 'Full coverage protection' },
          { icon: <ShieldPlus size={24} />, label: 'Third Party', desc: 'Basic liability cover' },
          { icon: <HeartPulse size={24} />, label: 'Credit Life', desc: 'Payment protection' },
          { icon: <AlertTriangleIcon size={24} />, label: 'Gap Cover', desc: 'Cover vehicle gap' },
        ].map((type, i) => (
          <button key={i} className="rounded-xl p-4 text-left" style={{ backgroundColor: 'white' }}>
            <div className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center" style={{ backgroundColor: `${KAYAD_THEME.blue}15` }}>
              <div style={{ color: KAYAD_THEME.blue }}>{type.icon}</div>
            </div>
            <h3 className="font-bold mb-1" style={{ color: KAYAD_THEME.navy }}>{type.label}</h3>
            <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{type.desc}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Available Quotes</h2>
        <div className="space-y-4">
          {providers.map((quote) => (
            <div key={quote.id} className="p-4 rounded-xl border" style={{ borderColor: KAYAD_THEME.slate[200] }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold" style={{ color: KAYAD_THEME.navy }}>{quote.provider}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">{quote.type.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>Annual Premium</p>
                  <p className="text-xl font-bold" style={{ color: KAYAD_THEME.emerald }}>KES {quote.premium.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>Coverage</p>
                  <p className="font-bold" style={{ color: KAYAD_THEME.navy }}>KES {(quote.coverage / 1000000).toFixed(1)}M</p>
                </div>
              </div>
              <button className="mt-3 w-full py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
                Get Quote
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 12: AI FINANCE ADVISOR
// ============================================================

function FinanceAdvisorSection() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: "Hello! I'm your KAYAD Finance Advisor. I can help you understand financing options, choose the right lender, calculate payments, and explain financial terms. What would you like to know?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const suggestedQuestions = [
    "What deposit should I save?",
    "Which bank suits me?",
    "Explain balloon financing",
    "How do I improve my credit score?",
  ];

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const userMessage = { role: 'user' as const, content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `Based on your situation, here are my recommendations:

• For your income level, aim to save at least 15-20% deposit
• Banks like Equity and another partner bank offer competitive rates for your profile
• Balloon financing can reduce monthly payments by 20-30%
• Consider Stima SACCO if you want lower rates and are a member

Would you like me to compare specific lenders or calculate payments?`
      }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>AI Finance Advisor</h1>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'white' }}>
        <div className="h-80 overflow-y-auto p-4 space-y-4">
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
                  backgroundColor: msg.role === 'user' ? KAYAD_THEME.emerald : KAYAD_THEME.warmBeige,
                  color: msg.role === 'user' ? 'white' : KAYAD_THEME.navy,
                }}
              >
                {msg.role === 'ai' && <Bot size={18} style={{ color: KAYAD_THEME.emerald }} className="inline mr-2" />}
                <span className="whitespace-pre-wrap text-sm">{msg.content}</span>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t" style={{ borderColor: KAYAD_THEME.slate[200] }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about financing..."
              className="flex-1 px-4 py-2 rounded-lg border outline-none"
              style={{ borderColor: KAYAD_THEME.slate[200] }}
            />
            <button 
              onClick={handleSend}
              className="px-4 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: KAYAD_THEME.emerald }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestedQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => { setQuery(q); }}
            className="px-4 py-2 rounded-full text-sm font-medium"
            style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 13: ADMIN (Simplified)
// ============================================================

function AdminSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Admin Control Panel</h1>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: <Building size={24} />, label: 'Manage Partners', desc: 'Add, edit, or remove lenders' },
          { icon: <ScrollText size={24} />, label: 'Interest Rules', desc: 'Set rate assumptions' },
          { icon: <UsersIcon size={24} />, label: 'Lead Routing', desc: 'Configure partner routing' },
          { icon: <FileText size={24} />, label: 'Required Docs', desc: 'Document requirements' },
          { icon: <Shield size={24} />, label: 'Eligibility Rules', desc: 'Credit score thresholds' },
          { icon: <AlertTriangle size={24} />, label: 'Compliance', desc: 'Notices and disclosures' },
        ].map((item, i) => (
          <button key={i} className="rounded-xl p-4 text-left" style={{ backgroundColor: 'white' }}>
            <div className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center" style={{ backgroundColor: `${KAYAD_THEME.navy}15` }}>
              <div style={{ color: KAYAD_THEME.navy }}>{item.icon}</div>
            </div>
            <h3 className="font-bold mb-1" style={{ color: KAYAD_THEME.navy }}>{item.label}</h3>
            <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 14: COMPLIANCE (Simplified)
// ============================================================

function ComplianceSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Compliance Center</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {[
          { icon: <Lock size={24} />, title: 'Data Privacy', desc: 'GDPR and local data protection compliance' },
          { icon: <ShieldCheckVerified size={24} />, title: 'Consent Management', desc: 'User consent tracking and management' },
          { icon: <ScrollText size={24} />, title: 'Audit Logs', desc: 'Complete activity logging and monitoring' },
          { icon: <Scale size={24} />, title: 'Financial Disclosures', desc: 'Interest rate and fee transparency' },
          { icon: <AlertTriangle size={24} />, title: 'Responsible Lending', desc: 'Creditworthiness assessment notices' },
          { icon: <UsersIcon size={24} />, title: 'Role-Based Access', desc: 'Granular permission controls' },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-4 flex gap-4" style={{ backgroundColor: 'white' }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_THEME.emerald}15` }}>
              <div style={{ color: KAYAD_THEME.emerald }}>{item.icon}</div>
            </div>
            <div>
              <h3 className="font-bold mb-1" style={{ color: KAYAD_THEME.navy }}>{item.title}</h3>
              <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 15: ANALYTICS (Simplified)
// ============================================================

function AnalyticsSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Finance Analytics</h1>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: '1,247', change: '+12%', positive: true },
          { label: 'Approval Rate', value: '68%', change: '+5%', positive: true },
          { label: 'Avg Loan Size', value: 'KES 1.8M', change: '+8%', positive: true },
          { label: 'Processing Time', value: '2.3 days', change: '-15%', positive: true },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl p-4" style={{ backgroundColor: 'white' }}>
            <p className="text-sm mb-1" style={{ color: KAYAD_THEME.slate[500] }}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>{stat.value}</p>
            <span className="text-sm font-medium" style={{ color: stat.positive ? KAYAD_THEME.emerald : KAYAD_THEME.red }}>
              {stat.change} vs last month
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <h2 className="font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Partner Performance</h2>
        <div className="space-y-3">
          {[
            { name: 'a partner bank', applications: 342, approval: '72%', volume: 'KES 580M' },
            { name: 'another partner bank Bank', applications: 298, approval: '75%', volume: 'KES 520M' },
            { name: 'Stima SACCO', applications: 256, approval: '82%', volume: 'KES 380M' },
            { name: 'Faulu Kenya', applications: 189, approval: '65%', volume: 'KES 240M' },
          ].map((partner, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
              <span className="font-medium" style={{ color: KAYAD_THEME.navy }}>{partner.name}</span>
              <div className="flex gap-6 text-sm">
                <span style={{ color: KAYAD_THEME.slate[500] }}>{partner.applications} apps</span>
                <span style={{ color: KAYAD_THEME.emerald }}>{partner.approval}</span>
                <span className="font-medium" style={{ color: KAYAD_THEME.navy }}>{partner.volume}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
