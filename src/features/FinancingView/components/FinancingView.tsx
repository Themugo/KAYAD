import React, { useState, useMemo, useRef } from 'react';
import { Vehicle } from '../../../types';
import BankFinancingPortal from './BankFinancingPortal';
import { Calculator, ArrowRight, Landmark, CheckCircle2, Percent, FileCheck, Sparkles, ShieldCheck, Building2, Clock, ChevronDown, ChevronUp, UploadCloud, FileText, Info, X, Car, HelpCircle, UserCheck, Sliders, DollarSign, Briefcase, FileSpreadsheet, CheckSquare, Square } from 'lucide-react';
import { StatWidget, Card, Badge, Button, LazyImage } from '../../../components/ui';

interface FinancingViewProps {
  vehicles?: Vehicle[];
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
}

export type ApplicationStatus = 
  | 'Draft'
  | 'Submitted'
  | 'Documents Requested'
  | 'Under Review'
  | 'Conditionally Approved'
  | 'Approved'
  | 'Declined'
  | 'Completed';

export interface PartnerBank {
  id: string;
  name: string;
  shortName: string;
  logoBg: string;
  rateRange: string;
  baseRate: number; // e.g. 12.5
  maxFinancing: string; // e.g. 85%
  minDepositPercent: number; // e.g. 15
  maxTermMonths: number; // e.g. 60
  approvalTime: string; // e.g. 24 Hours
  earlyRepaymentPolicy: string;
  eligibilitySummary: string;
  badge: string;
  features: string[];
}

export const FinancingView: React.FC<FinancingViewProps> = ({
  vehicles = [],
  onQuickViewVehicle
}) => {
  // Mode Switcher: 'buyer' | 'bank_portal'
  const [financingViewMode, setFinancingViewMode] = useState<'buyer' | 'bank_portal'>('buyer');

  // Calculator State
  const [vehiclePrice, setVehiclePrice] = useState<number>(3500000);
  const [depositPercent, setDepositPercent] = useState<number>(20);
  const [tenureMonths, setTenureMonths] = useState<number>(36);
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(13.0);
  const [employmentType, setEmploymentType] = useState<'salaried' | 'self_employed' | 'sme'>('salaried');

  // Comparison State
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>(['ncba', 'equity', 'kcb']);
  
  // Application Form State
  const [activeTab, setActiveTab] = useState<'calculator' | 'lenders' | 'comparison' | 'tracker' | 'eligibility'>('calculator');
  const [selectedBankForApply, setSelectedBankForApply] = useState<PartnerBank | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [applicationSuccess, setApplicationSuccess] = useState<boolean>(false);

  // Active Application Tracker State (Single active status)
  const [currentAppStatus, setCurrentAppStatus] = useState<ApplicationStatus>('Under Review');
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({
    nationalId: true,
    payslips: true,
    bankStatements: false,
    employmentLetter: false
  });

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Ref for smooth scrolling
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Calculations
  const depositAmount = (vehiclePrice * depositPercent) / 100;
  const loanAmount = Math.max(0, vehiclePrice - depositAmount);
  const monthlyInterestRate = (annualInterestRate / 100) / 12;
  
  const estimatedMonthly = useMemo(() => {
    if (loanAmount <= 0) return 0;
    if (monthlyInterestRate === 0) return loanAmount / tenureMonths;
    return Math.round(
      (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureMonths)) /
      (Math.pow(1 + monthlyInterestRate, tenureMonths) - 1)
    );
  }, [loanAmount, monthlyInterestRate, tenureMonths]);

  const totalRepayment = estimatedMonthly * tenureMonths;
  const totalInterest = Math.max(0, totalRepayment - loanAmount);

  // Partner Banks Dataset
  const partnerBanks: PartnerBank[] = useMemo(() => [
    {
      id: 'ncba',
      name: 'NCBA Drive Asset Finance',
      shortName: 'NCBA Bank',
      logoBg: 'bg-[#1E3063] text-[#F3EFE6]',
      rateRange: '12.5% - 13.0% p.a.',
      baseRate: 12.5,
      maxFinancing: '85% LTV',
      minDepositPercent: 15,
      maxTermMonths: 60,
      approvalTime: '< 24 Hours',
      earlyRepaymentPolicy: 'Zero Penalty (0%)',
      eligibilitySummary: 'Salaried & Corporate SMEs, Min income Ksh 50k/mo',
      badge: 'Preferred Partner',
      features: ['Up to 85% Financing', 'Zero early repayment fees', 'Joint NTSA Logbook Registration']
    },
    {
      id: 'equity',
      name: 'Equity Bank Vehicle Financing',
      shortName: 'Equity Bank',
      logoBg: 'bg-[#C85A32] text-white',
      rateRange: '12.8% - 13.5% p.a.',
      baseRate: 12.8,
      maxFinancing: '80% LTV',
      minDepositPercent: 20,
      maxTermMonths: 48,
      approvalTime: '24 - 48 Hours',
      earlyRepaymentPolicy: '0.5% Settlement Fee',
      eligibilitySummary: 'Salaried, Business Owners & Farmers, Min income Ksh 40k/mo',
      badge: 'Express Pre-Check',
      features: ['Fast paperless pre-approval', 'Flexible repayment schedules', 'Covers insurance premium financing']
    },
    {
      id: 'kcb',
      name: 'KCB Auto Loan Express',
      shortName: 'KCB Bank',
      logoBg: 'bg-[#15803D] text-white',
      rateRange: '13.0% - 13.8% p.a.',
      baseRate: 13.0,
      maxFinancing: '80% LTV',
      minDepositPercent: 20,
      maxTermMonths: 60,
      approvalTime: '< 24 Hours',
      earlyRepaymentPolicy: 'Zero Penalty (0%)',
      eligibilitySummary: 'Civil Servants & Salaried Employees, Min income Ksh 45k/mo',
      badge: 'Government Special',
      features: ['Dedicated check-off for public servants', 'Instant CRB status check', 'Up to 5 year loan tenure']
    },
    {
      id: 'stanbic',
      name: 'Stanbic Vehicle & Asset Solutions',
      shortName: 'Stanbic Bank',
      logoBg: 'bg-[#17244B] text-amber-300',
      rateRange: '13.2% - 14.0% p.a.',
      baseRate: 13.2,
      maxFinancing: '85% LTV',
      minDepositPercent: 15,
      maxTermMonths: 60,
      approvalTime: '36 Hours',
      earlyRepaymentPolicy: '1.0% Settlement Fee',
      eligibilitySummary: 'Corporate Executives & Registered SMEs, Min income Ksh 60k/mo',
      badge: 'High-Value Preferred',
      features: ['Dedicated Asset Manager', 'Custom residual value options', 'Includes GPS tracker installation']
    },
    {
      id: 'absa',
      name: 'Absa Auto Finance Direct',
      shortName: 'Absa Bank',
      logoBg: 'bg-[#C85A32]/90 text-white',
      rateRange: '13.5% - 14.2% p.a.',
      baseRate: 13.5,
      maxFinancing: '80% LTV',
      minDepositPercent: 20,
      maxTermMonths: 48,
      approvalTime: '48 Hours',
      earlyRepaymentPolicy: 'Zero Penalty (0%)',
      eligibilitySummary: 'Private Sector Employees & SMEs, Min income Ksh 50k/mo',
      badge: 'KRA Integrated',
      features: ['Direct KRA & TIMS verification', 'Comprehensive Insurance Bundle', 'No hidden appraisal costs']
    }
  ], []);

  // Filtered compare list
  const comparedBanks = useMemo(() => {
    return partnerBanks.filter(b => selectedBankIds.includes(b.id));
  }, [partnerBanks, selectedBankIds]);

  const toggleCompareBank = (id: string) => {
    if (selectedBankIds.includes(id)) {
      if (selectedBankIds.length <= 1) return; // Keep at least 1
      setSelectedBankIds(prev => prev.filter(i => i !== id));
    } else {
      if (selectedBankIds.length >= 4) {
        setSelectedBankIds(prev => [...prev.slice(1), id]);
      } else {
        setSelectedBankIds(prev => [...prev, id]);
      }
    }
  };

  const scrollToCalculator = () => {
    calculatorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenApply = (bank: PartnerBank) => {
    setSelectedBankForApply(bank);
    setIsApplyModalOpen(true);
    setApplicationSuccess(false);
  };

  const handleDocToggle = (docKey: string) => {
    setUploadedDocs(prev => ({ ...prev, [docKey]: !prev[docKey] }));
  };

  // Recently Financed Vehicles (Sample fallback if vehicles list is small)
  const financedVehicles = useMemo(() => {
    if (vehicles && vehicles.length >= 3) {
      return vehicles.slice(0, 3);
    }
    return [
      {
        id: 'fin-01',
        title: '2021 Toyota Prado VX 2.8L Diesel',
        make: 'Toyota',
        model: 'Prado',
        year: 2021,
        price: 7800000,
        image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
        location: 'Nairobi',
        county: 'Nairobi County',
        mileage: 42000,
        fuelType: 'Diesel',
        transmission: 'Automatic',
        condition: 'Foreign Used',
        verified: true,
        sellerName: 'Simba Caetano Motors',
        sellerType: 'Verified Dealer',
        sellerRating: 4.9,
        financedBank: 'NCBA Drive'
      },
      {
        id: 'fin-02',
        title: '2020 Subaru Forester 2.0i Eyesight',
        make: 'Subaru',
        model: 'Forester',
        year: 2020,
        price: 3450000,
        image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
        location: 'Mombasa',
        county: 'Mombasa County',
        mileage: 58000,
        fuelType: 'Petrol',
        transmission: 'Automatic',
        condition: 'Foreign Used',
        verified: true,
        sellerName: 'Coastal Premium Auto',
        sellerType: 'Verified Dealer',
        sellerRating: 4.8,
        financedBank: 'Equity Bank'
      },
      {
        id: 'fin-03',
        title: '2019 Mazda CX-5 2.2L Skyactiv-D',
        make: 'Mazda',
        model: 'CX-5',
        year: 2019,
        price: 2950000,
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
        location: 'Nakuru',
        county: 'Nakuru County',
        mileage: 64000,
        fuelType: 'Diesel',
        transmission: 'Automatic',
        condition: 'Locally Used',
        verified: true,
        sellerName: 'Rift Valley Motors',
        sellerType: 'Verified Dealer',
        sellerRating: 4.7,
        financedBank: 'KCB Auto'
      }
    ];
  }, [vehicles]);

  // FAQs
  const faqs = [
    {
      q: "Is KAYAD a direct lender or bank?",
      a: "KAYAD is an independent automotive fintech marketplace. We are NOT a lender. We partner with top-tier Central Bank regulated financial institutions (NCBA, KCB, Equity, Stanbic, Absa) to enable transparent rate comparison, instant affordability calculation, and direct pre-qualified application routing."
    },
    {
      q: "How long does the loan approval process take?",
      a: "Online pre-qualification is instant (< 2 minutes). Once you choose a lender and upload required identification and proof of income, partner banks provide formal conditional approval within 24 to 48 hours."
    },
    {
      q: "Can I settle my vehicle loan early without penalties?",
      a: "Yes! Major partners like NCBA and KCB offer 0% penalty for early settlement. Other lenders charge a nominal 0.5% - 1% processing fee on the remaining balance. Always check individual lender policies in our comparison tool."
    },
    {
      q: "What insurance requirements apply to financed cars?",
      a: "All partner financial institutions require Comprehensive Motor Insurance with joint logbook interest endorsement until the loan balance is fully settled."
    },
    {
      q: "How is the NTSA vehicle logbook transferred during financing?",
      a: "During the loan term, NTSA TIMS registers joint ownership between the financing bank and the buyer. Upon final loan payment, the bank issues a clear discharge letter and full ownership is transferred exclusively to you."
    }
  ];

  // All 8 required application statuses
  const statusFlow: { status: ApplicationStatus; label: string; desc: string; step: number }[] = [
    { status: 'Draft', label: '1. Draft', desc: 'Calculator inputs saved; choosing partner lender', step: 1 },
    { status: 'Submitted', label: '2. Submitted', desc: 'Pre-approval application routed to lender desk', step: 2 },
    { status: 'Documents Requested', label: '3. Docs Requested', desc: 'Lender underwriting requesting certified statements', step: 3 },
    { status: 'Under Review', label: '4. Under Review', desc: 'Bank credit committee evaluating debt-to-income ratio', step: 4 },
    { status: 'Conditionally Approved', label: '5. Conditional Approval', desc: 'Lender issued term sheet pending physical audit', step: 5 },
    { status: 'Approved', label: '6. Approved', desc: 'Full credit approval granted; loan contract ready', step: 6 },
    { status: 'Declined', label: '7. Declined', desc: 'Application failed lender eligibility criteria', step: 7 },
    { status: 'Completed', label: '8. Completed', desc: 'Logbook endorsed & funds disbursed to vehicle seller', step: 8 }
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Mode Switcher Banner */}
      <div className="bg-[#101935] border-b border-amber-400/30 px-4 py-3 text-xs shadow-md rounded-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-black text-xs uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded border border-white/15">
              KAYAD Financing Ecosystem
            </span>
            <span className="text-slate-300 text-[11px] hidden md:inline font-semibold">
              Buyer Auto Loans & Bank Underwriting Portal
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setFinancingViewMode('buyer')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                financingViewMode === 'buyer'
                  ? 'bg-amber-400 text-[#101935] shadow-sm font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Buyer Rate Calculator</span>
            </button>

            <button
              onClick={() => setFinancingViewMode('bank_portal')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                financingViewMode === 'bank_portal'
                  ? 'bg-[#1E3063] text-white border border-amber-400/50 shadow-sm font-black'
                  : 'text-amber-300 hover:text-white'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Bank & Finance Portal</span>
              <span className="text-[9px] bg-emerald-500 text-white font-black px-1.5 py-0.2 rounded-full">
                BANK OFFICER SUITE
              </span>
            </button>
          </div>
        </div>
      </div>

      {financingViewMode === 'bank_portal' ? (
        <BankFinancingPortal onNavigateToBuyerFinancing={() => setFinancingViewMode('buyer')} />
      ) : (
        <>
      {/* ==========================================
          1. HERO SECTION
          ========================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17244B] via-[#1E3063] to-slate-900 text-white p-8 sm:p-12 border border-amber-400/20 shadow-lg">
        {/* Subtle Decorative Backdrop Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          {/* KAYAD Marketplace Position Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-extrabold text-amber-300 shadow-xs">
            <Landmark className="w-4 h-4 text-amber-400" />
            <span>Independent Vehicle Financing Marketplace Partner</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight">
            Vehicle Financing Made Simple
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
            Compare trusted lenders across East Africa. Calculate monthly payments instantly.
          </p>

          {/* ONE CLEAR PRIMARY CTA */}
          <div className="pt-2 flex items-center gap-4 flex-wrap">
            <Button
              variant="accent"
              size="lg"
              onClick={scrollToCalculator}
              className="shadow-md text-sm font-black tracking-wide"
            >
              <CheckCircle2 className="w-5 h-5 text-[#17244B]" />
              <span>Check Your Eligibility</span>
            </Button>

            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Pre-approval in &lt; 2 minutes • Non-binding estimates
            </span>
          </div>
        </div>
      </div>

      {/* ==========================================
          2. KPI STATS BAR
          ========================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          label="Maximum Financing LTV"
          value="Up to 85%"
          trend="15% - 20% Min Down Payment"
          trendType="positive"
          icon={<Percent className="w-4 h-4 text-emerald-600" />}
        />

        <StatWidget
          label="Partner Bank Rates"
          value="12.5% - 14.0%"
          trend="Reducing Balance p.a."
          trendType="positive"
          icon={<Landmark className="w-4 h-4 text-blue-500" />}
        />

        <StatWidget
          label="Approval Decision Time"
          value="24 - 48 Hours"
          trend="Direct Digital Routing"
          trendType="neutral"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        />

        <StatWidget
          label="Logbook Requirement"
          value="Joint NTSA TIMS"
          trend="Protected Asset Transfer"
          trendType="positive"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      {/* NAVIGATION SUB-TABS */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none pt-2">
        {[
          { id: 'calculator', label: '1. Finance Calculator', icon: <Calculator className="w-4 h-4" /> },
          { id: 'lenders', label: '2. Partner Banks', icon: <Landmark className="w-4 h-4" /> },
          { id: 'comparison', label: `3. Compare Offers (${selectedBankIds.length})`, icon: <Sliders className="w-4 h-4" /> },
          { id: 'tracker', label: '4. Application Journey', icon: <Clock className="w-4 h-4" /> },
          { id: 'eligibility', label: '5. Eligibility & Docs', icon: <FileCheck className="w-4 h-4 text-emerald-600" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#1E3063] text-[#1E3063] bg-amber-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==========================================
          3. FINANCE CALCULATOR (Interactive & Precise)
          ========================================== */}
      <div ref={calculatorRef} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-500" />
            Interactive Vehicle Finance Estimator
          </h2>
          <Badge variant="verified" size="sm">
            Backend-Synced Estimator
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Card (7 Cols) */}
          <Card className="lg:col-span-7 p-6 space-y-6 bg-white border-slate-200 shadow-xs">
            
            {/* Employment Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider font-display">
                Employment / Income Category
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'salaried', label: 'Salaried Employee', icon: <Briefcase className="w-3.5 h-3.5" /> },
                  { id: 'self_employed', label: 'Self-Employed', icon: <UserCheck className="w-3.5 h-3.5" /> },
                  { id: 'sme', label: 'SME / Company', icon: <Building2 className="w-3.5 h-3.5" /> }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setEmploymentType(type.id as any)}
                    className={`p-3 rounded-xl font-bold border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      employmentType === type.id
                        ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {type.icon}
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Price Slider & Direct Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-600">Vehicle Purchase Price (Ksh)</span>
                <div className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-normal">Ksh</span>
                  <input
                    type="number"
                    min={500000}
                    max={25000000}
                    step={100000}
                    value={vehiclePrice}
                    onChange={(e) => setVehiclePrice(Math.max(0, Number(e.target.value)))}
                    className="w-28 text-right font-black text-[#1E3063] bg-transparent outline-none text-sm"
                  />
                </div>
              </div>
              <input
                type="range"
                min={1000000}
                max={15000000}
                step={250000}
                value={vehiclePrice}
                onChange={(e) => setVehiclePrice(Number(e.target.value))}
                className="w-full accent-[#1E3063] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>Ksh 1,000,000</span>
                <span>Ksh 8,000,000</span>
                <span>Ksh 15,000,000+</span>
              </div>
            </div>

            {/* Deposit Percent Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Down Payment Deposit ({depositPercent}%)</span>
                <span className="text-emerald-700 font-black text-sm">Ksh {depositAmount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={depositPercent}
                onChange={(e) => setDepositPercent(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>10% (Min)</span>
                <span>20% (Standard)</span>
                <span>50% (High Deposit)</span>
              </div>
            </div>

            {/* Loan Tenure Pills */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Loan Repayment Term</span>
                <span className="text-[#1E3063] font-black text-sm">{tenureMonths} Months ({(tenureMonths / 12).toFixed(1)} Yrs)</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {[12, 24, 36, 48, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setTenureMonths(m)}
                    className={`py-2.5 rounded-xl font-extrabold border transition-all cursor-pointer ${
                      tenureMonths === m
                        ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Rate Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Benchmark Interest Rate (% p.a.)</span>
                <span className="text-blue-900 font-black text-sm">{annualInterestRate.toFixed(1)}% p.a.</span>
              </div>
              <input
                type="range"
                min={11.5}
                max={16.0}
                step={0.1}
                value={annualInterestRate}
                onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

          </Card>

          {/* Results Display Panel (5 Cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#1E3063] via-[#17244B] to-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6 border border-amber-400/30">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Calculated Monthly Payment
                </span>
                <Badge variant="accent" size="sm">
                  Reducing Balance
                </Badge>
              </div>

              {/* ESTIMATED MONTHLY PAYMENT */}
              <div>
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Estimated Installment</p>
                <div className="text-4xl font-black font-display text-white mt-1">
                  Ksh {estimatedMonthly.toLocaleString()} <span className="text-xs font-normal text-slate-300">/ mo</span>
                </div>
              </div>

              {/* BREAKDOWN METRICS */}
              <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Financed Principal (Loan):</span>
                  <span className="font-extrabold text-white">Ksh {loanAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Down Payment Deposit:</span>
                  <span className="font-extrabold text-emerald-400">Ksh {depositAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Total Interest:</span>
                  <span className="font-extrabold text-amber-300">Ksh {totalInterest.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10">
                  <span className="text-slate-300 font-bold">Estimated Total Cost:</span>
                  <span className="font-black text-white text-sm">Ksh {totalRepayment.toLocaleString()}</span>
                </div>
              </div>

              {/* CLEAR ESTIMATE DISCLAIMER */}
              <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Estimates only.</strong> Final loan terms, interest rates, and limits are subject to underwriting approval by your chosen bank.
                </span>
              </div>
            </div>

            <Button
              variant="accent"
              size="lg"
              fullWidth
              onClick={() => {
                setActiveTab('lenders');
              }}
              className="shadow-md"
            >
              <span>Compare Lenders for this Plan</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

        </div>
      </div>

      {/* ==========================================
          4. LENDER MARKETPLACE (Partner Institutions Grid)
          ========================================== */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-500" />
              Verified Financial Partner Institutions
            </h2>
            <p className="text-xs text-slate-500 font-medium">Select a partner bank to apply or add up to 4 for side-by-side comparison</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('comparison')}
          >
            <Sliders className="w-4 h-4 text-[#1E3063]" />
            <span>View Comparison Matrix ({selectedBankIds.length})</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {partnerBanks.map((bank) => {
            const isCompared = selectedBankIds.includes(bank.id);
            // Estimate monthly for this specific bank rate
            const bankMonthlyRate = (bank.baseRate / 100) / 12;
            const bankMonthly = loanAmount > 0 
              ? Math.round((loanAmount * bankMonthlyRate * Math.pow(1 + bankMonthlyRate, tenureMonths)) / (Math.pow(1 + bankMonthlyRate, tenureMonths) - 1))
              : 0;

            return (
              <Card 
                key={bank.id} 
                className={`p-6 space-y-5 transition-all relative border flex flex-col justify-between ${
                  isCompared ? 'border-[#1E3063] ring-1 ring-[#1E3063]/20 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-4">
                  
                  {/* Bank Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl font-black text-xs flex items-center justify-center font-display shadow-xs ${bank.logoBg}`}>
                        {bank.shortName.substring(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[#1E3063] text-sm font-display">{bank.name}</h3>
                        <p className="text-[11px] text-slate-500 font-medium">{bank.approvalTime} Turnaround</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleCompareBank(bank.id)}
                      className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                        isCompared ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={isCompared ? 'Remove from comparison' : 'Add to comparison'}
                    >
                      {isCompared ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Main Rate & Monthly Highlight */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase">Interest Rate Range</span>
                      <span className="text-base font-black text-[#1E3063] font-display">{bank.rateRange}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1 border-t border-slate-200/60">
                      <span className="text-xs text-slate-600 font-bold">Est. Monthly ({tenureMonths}m):</span>
                      <span className="text-sm font-black text-emerald-700 font-display">Ksh {bankMonthly.toLocaleString()} / mo</span>
                    </div>
                  </div>

                  {/* Institution Metrics */}
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Max Financing:</span>
                      <strong className="text-slate-800">{bank.maxFinancing}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Min Deposit Required:</span>
                      <strong className="text-slate-800">{bank.minDepositPercent}% Down</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Early Repayment Policy:</span>
                      <strong className="text-emerald-700 font-extrabold">{bank.earlyRepaymentPolicy}</strong>
                    </div>
                  </div>

                  {/* Eligibility Summary */}
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[11px] text-slate-700 space-y-1">
                    <p className="font-extrabold text-[#1E3063] flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-amber-600" /> Eligibility Criteria:
                    </p>
                    <p className="text-slate-600 leading-snug">{bank.eligibilitySummary}</p>
                  </div>

                </div>

                {/* Card Action */}
                <div className="pt-4 border-t border-slate-100">
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => handleOpenApply(bank)}
                  >
                    <span>Apply with {bank.shortName}</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          5. COMPARE FINANCING OFFERS (Side-by-side Matrix)
          ========================================== */}
      {activeTab === 'comparison' && (
        <div className="space-y-4 pt-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-500" />
              Side-by-Side Offer Comparison Matrix
            </h2>
            <span className="text-xs text-slate-500 font-semibold">Showing {comparedBanks.length} selected lenders</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 font-bold text-slate-300 w-44">Feature / Term</th>
                    {comparedBanks.map((b) => (
                      <th key={b.id} className="p-4 font-black font-display text-sm text-amber-300 min-w-[200px]">
                        {b.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  
                  {/* Row 1: Estimated Monthly Payment */}
                  <tr className="bg-amber-50/40 font-bold">
                    <td className="p-4 text-[#1E3063]">Est. Monthly Payment ({tenureMonths}m)</td>
                    {comparedBanks.map((b) => {
                      const bankMonthlyRate = (b.baseRate / 100) / 12;
                      const bankMonthly = loanAmount > 0 
                        ? Math.round((loanAmount * bankMonthlyRate * Math.pow(1 + bankMonthlyRate, tenureMonths)) / (Math.pow(1 + bankMonthlyRate, tenureMonths) - 1))
                        : 0;
                      return (
                        <td key={b.id} className="p-4 font-black text-emerald-800 text-sm font-display">
                          Ksh {bankMonthly.toLocaleString()} / mo
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 2: Interest Rate Range */}
                  <tr>
                    <td className="p-4 font-bold text-[#1E3063]">Interest Rate Range</td>
                    {comparedBanks.map((b) => (
                      <td key={b.id} className="p-4 font-extrabold text-slate-900">
                        {b.rateRange}
                      </td>
                    ))}
                  </tr>

                  {/* Row 3: Max Loan Term */}
                  <tr>
                    <td className="p-4 font-bold text-[#1E3063]">Max Repayment Term</td>
                    {comparedBanks.map((b) => (
                      <td key={b.id} className="p-4 font-medium text-slate-700">
                        Up to {b.maxTermMonths} Months
                      </td>
                    ))}
                  </tr>

                  {/* Row 4: Minimum Deposit */}
                  <tr>
                    <td className="p-4 font-bold text-[#1E3063]">Deposit Required</td>
                    {comparedBanks.map((b) => (
                      <td key={b.id} className="p-4 font-medium text-slate-700">
                        {b.minDepositPercent}% (Ksh {((vehiclePrice * b.minDepositPercent) / 100).toLocaleString()})
                      </td>
                    ))}
                  </tr>

                  {/* Row 5: Processing Time */}
                  <tr>
                    <td className="p-4 font-bold text-[#1E3063]">Approval Processing Time</td>
                    {comparedBanks.map((b) => (
                      <td key={b.id} className="p-4 font-semibold text-amber-900">
                        {b.approvalTime}
                      </td>
                    ))}
                  </tr>

                  {/* Row 6: Early Repayment Policy */}
                  <tr>
                    <td className="p-4 font-bold text-[#1E3063]">Early Settlement Fee</td>
                    {comparedBanks.map((b) => (
                      <td key={b.id} className="p-4 font-extrabold text-emerald-700">
                        {b.earlyRepaymentPolicy}
                      </td>
                    ))}
                  </tr>

                  {/* Row 7: Action CTA */}
                  <tr className="bg-slate-50">
                    <td className="p-4 font-bold text-[#1E3063]">Select Offer</td>
                    {comparedBanks.map((b) => (
                      <td key={b.id} className="p-4">
                        <Button
                          variant="accent"
                          size="sm"
                          fullWidth
                          onClick={() => handleOpenApply(b)}
                        >
                          <span>Apply Now</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    ))}
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          6. APPLICATION JOURNEY & STATUS TRACKER
          ========================================== */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Application Journey & Live Tracker
            </h2>
            <p className="text-xs text-slate-500 font-medium">Track your active pre-qualification status through the 6-step KAYAD routing pipeline</p>
          </div>
          
          {/* Status Simulator dropdown for interactive demo */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold px-1">Simulate Status:</span>
            <select
              value={currentAppStatus}
              onChange={(e) => setCurrentAppStatus(e.target.value as ApplicationStatus)}
              className="text-xs font-bold text-[#1E3063] bg-white border border-slate-300 rounded-lg px-2.5 py-1 outline-none cursor-pointer"
            >
              {statusFlow.map((s) => (
                <option key={s.status} value={s.status}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 6-Step Visual Process Journey */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {[
            { step: 1, title: 'Choose Vehicle', desc: 'Select verified listing' },
            { step: 2, title: 'Compare Lenders', desc: 'Find best bank rates' },
            { step: 3, title: 'Submit App', desc: 'Routed to credit desk' },
            { step: 4, title: 'Document Audit', desc: 'Income & ID verified' },
            { step: 5, title: 'Approval', desc: 'Pre-approval issued' },
            { step: 6, title: 'Disbursement', desc: 'Logbook joint transfer' }
          ].map((item) => {
            const currentStepNum = statusFlow.find(s => s.status === currentAppStatus)?.step || 4;
            const isCompleted = currentStepNum > item.step;
            const isCurrent = currentStepNum === item.step;

            return (
              <div 
                key={item.step} 
                className={`p-3.5 rounded-2xl border transition-all ${
                  isCurrent 
                    ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-md ring-2 ring-amber-400/50' 
                    : isCompleted 
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-200' 
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-6 h-6 rounded-full font-black text-[11px] flex items-center justify-center ${
                    isCurrent ? 'bg-amber-400 text-[#17244B]' : isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isCompleted ? '✓' : item.step}
                  </span>
                  {isCurrent && <span className="text-[10px] font-black uppercase text-amber-300">ACTIVE</span>}
                </div>
                <p className="font-extrabold text-xs">{item.title}</p>
                <p className={`text-[10px] mt-0.5 ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* SINGLE ACTIVE APPLICATION STATUS BANNER (Never multiple active statuses) */}
        <Card className="p-6 bg-slate-50 border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#1E3063] text-amber-400 font-black">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Active Application Ref #KYD-FIN-8892</p>
                <h3 className="text-base font-extrabold text-[#1E3063] font-display">
                  NCBA Drive Asset Finance Request
                </h3>
              </div>
            </div>

            <Badge variant={
              currentAppStatus === 'Approved' || currentAppStatus === 'Completed' ? 'success' :
              currentAppStatus === 'Declined' ? 'danger' : 'escrow'
            } size="md">
              Current Status: {currentAppStatus}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
              <p className="text-slate-400 font-semibold">Target Vehicle</p>
              <p className="font-extrabold text-[#1E3063]">Ksh {vehiclePrice.toLocaleString()} Vehicle Asset</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
              <p className="text-slate-400 font-semibold">Requested Loan Amount</p>
              <p className="font-extrabold text-emerald-700">Ksh {loanAmount.toLocaleString()} ({100 - depositPercent}% LTV)</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
              <p className="text-slate-400 font-semibold">Estimated Monthly Installment</p>
              <p className="font-extrabold text-blue-900">Ksh {estimatedMonthly.toLocaleString()} / mo ({tenureMonths}m)</p>
            </div>
          </div>

          {/* Status Message Guidance */}
          <div className="p-4 bg-white rounded-xl border border-amber-200 text-xs text-slate-700 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[#1E3063]">
                {currentAppStatus === 'Under Review' && 'Your application is currently under review with NCBA Credit Underwriters.'}
                {currentAppStatus === 'Draft' && 'Your calculator inputs are saved. Click Apply to submit to partner banks.'}
                {currentAppStatus === 'Submitted' && 'Application received. Upload requested documents below to expedite review.'}
                {currentAppStatus === 'Documents Requested' && 'Please upload your 6-month certified bank statement to complete credit audit.'}
                {currentAppStatus === 'Conditionally Approved' && 'Congratulations! Conditional term sheet issued pending vehicle physical inspection.'}
                {currentAppStatus === 'Approved' && 'Final approval granted! Check your email for loan contract signing details.'}
                {currentAppStatus === 'Declined' && 'Lender declined current terms. Consider increasing down payment deposit.'}
                {currentAppStatus === 'Completed' && 'Loan disbursed and vehicle logbook endorsed. Drive away safely!'}
              </p>
              <p className="text-slate-500">
                KAYAD lead desk updates your portal status automatically as bank underwriters process your file.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ==========================================
          7. SECURE DOCUMENT UPLOAD MODULE
          ========================================== */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Secure Underwriting Document Center
          </h2>
          <Badge variant="verified" size="sm">
            256-Bit Bank Encryption
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {[
            { key: 'nationalId', title: 'National ID / Passport', req: 'Both front & back copy', desc: 'Required for identity verification' },
            { key: 'payslips', title: 'Proof of Income / Payslips', req: 'Latest 3 months', desc: 'Required for salaried applicants' },
            { key: 'bankStatements', title: 'Certified Bank Statements', req: '6 months stamped PDF', desc: 'Required for credit scoring' },
            { key: 'employmentLetter', title: 'Employment / Contract Letter', req: 'HR Stamped', desc: 'Confirms job stability' }
          ].map((doc) => {
            const isUploaded = uploadedDocs[doc.key];

            return (
              <Card key={doc.key} className="p-5 space-y-4 bg-white border-slate-200 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-slate-100 text-[#1E3063]">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <Badge variant={isUploaded ? 'success' : 'neutral'} size="sm">
                      {isUploaded ? 'Verified ✓' : 'Pending'}
                    </Badge>
                  </div>
                  <h3 className="font-extrabold text-[#1E3063] text-sm">{doc.title}</h3>
                  <p className="text-[11px] font-bold text-amber-900">{doc.req}</p>
                  <p className="text-slate-500 text-[11px]">{doc.desc}</p>
                </div>

                <Button
                  variant={isUploaded ? 'outline' : 'primary'}
                  size="sm"
                  fullWidth
                  onClick={() => handleDocToggle(doc.key)}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isUploaded ? 'Replace Document' : 'Upload Document'}</span>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          8. ELIGIBILITY GUIDANCE
          ========================================== */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-amber-500" />
          General Partner Lender Eligibility Guidance
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          
          <Card className="p-5 space-y-3 bg-white border-slate-200">
            <div className="flex items-center gap-2 font-extrabold text-[#1E3063] text-sm font-display">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              General Requirements
            </div>
            <ul className="space-y-2 text-slate-600 list-disc list-inside">
              <li>Kenyan Citizen or legal East Africa Resident</li>
              <li>Minimum 21 years of age (max 65 at loan maturity)</li>
              <li>Valid KRA PIN Certificate & National ID</li>
              <li>Clean Credit Reference Bureau (CRB) standing</li>
            </ul>
          </Card>

          <Card className="p-5 space-y-3 bg-white border-slate-200">
            <div className="flex items-center gap-2 font-extrabold text-[#1E3063] text-sm font-display">
              <DollarSign className="w-4 h-4 text-blue-600" />
              Income & Down Payment
            </div>
            <ul className="space-y-2 text-slate-600 list-disc list-inside">
              <li>Minimum Net Salary: Ksh 45,000 / month</li>
              <li>Total debt-to-income ratio must not exceed 50%</li>
              <li>Down payment deposit: 15% - 20% minimum</li>
              <li>Comprehensive insurance policy required</li>
            </ul>
          </Card>

          <Card className="p-5 space-y-3 bg-white border-slate-200">
            <div className="flex items-center gap-2 font-extrabold text-[#1E3063] text-sm font-display">
              <Briefcase className="w-4 h-4 text-amber-600" />
              Supported Employment
            </div>
            <ul className="space-y-2 text-slate-600 list-disc list-inside">
              <li>Permanent Salaried Corporate Employees</li>
              <li>Civil Servants & Public Sector Officers</li>
              <li>Registered SME Directors & Business Owners</li>
              <li>Agricultural Producers with 12m Bank History</li>
            </ul>
          </Card>

        </div>
      </div>

      {/* ==========================================
          9. RECENTLY FINANCED VEHICLES
          ========================================== */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
              <Car className="w-5 h-5 text-amber-500" />
              Recently Financed Vehicles on KAYAD
            </h2>
            <p className="text-xs text-slate-500 font-medium">Real marketplace vehicles funded through our partner bank network (Privacy Protected)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {financedVehicles.map((vh) => (
            <Card key={vh.id} className="p-4 space-y-3 bg-white border-slate-200 hover:shadow-md transition-all">
              <div className="h-44 rounded-xl overflow-hidden relative bg-slate-900">
                <LazyImage src={vh.image} alt={vh.title} wrapperClassName="w-full h-full" className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2">
                  <Badge variant="verified" size="sm">
                    <Landmark className="w-3.5 h-3.5 text-amber-400" />
                    Financed via {vh.financedBank || 'Partner Bank'}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-[#1E3063] text-sm line-clamp-1">{vh.title}</h3>
                <p className="text-xs font-black text-[#1E3063] mt-0.5">Ksh {vh.price.toLocaleString()}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span>{vh.location}</span>
                <span className="text-emerald-700 font-bold">✓ Funded & Delivered</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ==========================================
          10. FREQUENTLY ASKED QUESTIONS (FAQ)
          ========================================== */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-500" />
          Frequently Asked Questions About Vehicle Financing
        </h2>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;

            return (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between font-bold text-xs text-[#1E3063] hover:bg-slate-50 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black flex items-center justify-center">?</span>
                    {faq.q}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="p-4 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          MOBILE STICKY APPLY BAR
          ========================================== */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#17244B] text-white p-3 border-t border-amber-400/20 lg:hidden shadow-lg flex items-center justify-between">
        <div>
          <p className="text-[10px] text-amber-400 font-bold uppercase">Est. Monthly</p>
          <p className="text-base font-black font-display text-white">Ksh {estimatedMonthly.toLocaleString()} / mo</p>
        </div>

        <Button
          variant="accent"
          size="sm"
          onClick={scrollToCalculator}
        >
          <span>Calculate & Apply</span>
          <ArrowRight className="w-4 h-4 text-[#17244B]" />
        </Button>
      </div>

      {/* ==========================================
          MODAL: APPLY WITH LENDER FORM
          ========================================== */}
      {isApplyModalOpen && selectedBankForApply && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-xl w-full p-6 space-y-6 bg-white relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsApplyModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-slate-200 pb-3 space-y-1">
              <Badge variant="verified" size="sm">
                Direct Lender Pre-Qualification Route
              </Badge>
              <h3 className="text-xl font-black text-[#1E3063] font-display">
                Apply for Pre-Approval with {selectedBankForApply.name}
              </h3>
              <p className="text-xs text-slate-500">
                Fast-track lead submission to {selectedBankForApply.shortName} asset financing desk.
              </p>
            </div>

            {applicationSuccess ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-emerald-950 font-display">Pre-Approval Lead Submitted!</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed max-w-sm mx-auto">
                    Your pre-qualification file has been securely routed to <strong>{selectedBankForApply.shortName}</strong>. A dedicated bank asset officer will call you within 2 business hours.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsApplyModalOpen(false)}
                >
                  Return to Financing Marketplace
                </Button>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setApplicationSuccess(true);
                  setCurrentAppStatus('Submitted');
                }} 
                className="space-y-4 text-xs"
              >
                {/* Summary Box */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Vehicle Asset Value:</span>
                    <span className="text-[#1E3063] font-black">Ksh {vehiclePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Deposit ({depositPercent}%):</span>
                    <span className="text-emerald-700 font-black">Ksh {depositAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Loan Amount ({tenureMonths}m):</span>
                    <span className="text-blue-900 font-black">Ksh {loanAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-emerald-800 pt-2 border-t border-slate-200 text-sm">
                    <span>Est. Monthly Installment:</span>
                    <span>Ksh {estimatedMonthly.toLocaleString()} / mo</span>
                  </div>
                </div>

                {/* Form Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700">Full Official Name (as on ID)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Mwangi Kimani"
                      className="w-full mt-1 p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#1E3063]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700">Phone Number (M-Pesa)</label>
                      <input
                        type="tel"
                        required
                        placeholder="0712 345 678"
                        className="w-full mt-1 p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#1E3063]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">KRA PIN Number</label>
                      <input
                        type="text"
                        required
                        placeholder="A012345678Z"
                        className="w-full mt-1 p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#1E3063]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Monthly Gross Income (Ksh)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 120000"
                      className="w-full mt-1 p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#1E3063]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="accent"
                    size="lg"
                    fullWidth
                    type="submit"
                  >
                    <span>Submit Pre-Approval Lead to {selectedBankForApply.shortName}</span>
                    <ArrowRight className="w-4 h-4 text-[#17244B]" />
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
        </>
      )}

    </div>
  );
};

export default FinancingView;
