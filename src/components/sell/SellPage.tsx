import { useState } from 'react';
import { 
  ShieldCheck, 
  Store, 
  User, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Building2, 
  CheckCircle2, 
  Sparkles, 
  Phone, 
  Mail, 
  MapPin, 
  Car,
  Lock,
  Search,
  Globe2,
  FileCheck2,
  Award
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Button } from '../ui/Button';

type AccountType = 'private' | 'dealer';

export const SellPage: React.FC = () => {
  const { navigateTo } = useMarketplace();
  const { openAuthModal, login } = useAuth();

  // Step state: 1 = Choose Account Type, 2 = Your Details
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedType, setSelectedType] = useState<AccountType>('private');

  // Step 2 Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: 'Nairobi',
    businessName: '',
    carTitle: '',
    price: '',
    year: '2022',
    mileage: '',
    fuel: 'Petrol'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleContinue = () => {
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);

      // Auto login user with the onboarded role (seller or dealer)
      const targetRole: UserRole = selectedType === 'dealer' ? 'dealer' : 'seller';
      const userEmail = formData.email.trim() || `seller_${Date.now()}@kayad.co.ke`;
      login(userEmail, targetRole);

      setTimeout(() => {
        navigateTo('dashboard');
      }, 1800);
    }, 1000);
  };

  return (
    <div className="pt-3 sm:pt-5 pb-10 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-5 sm:space-y-6 bg-[#FCF9F4] text-[#1E3063] font-sans">
      
      {/* 1. Top Hero Section */}
      <div className="p-5 sm:p-7 rounded-2xl bg-[#1E3063] text-white border border-white/20 shadow-lg relative overflow-hidden text-center space-y-4">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-96 bg-[#00C9CE]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00C9CE]/20 text-[#00C9CE] text-xs font-black uppercase tracking-wider border border-[#00C9CE]/40">
            <Sparkles className="w-4 h-4 text-[#00C9CE]" />
            <span>KAYAD SELLER ONBOARDING EXPERIENCE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-serif tracking-tight text-white">
            Sell Your Vehicle with Confidence
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed max-w-2xl mx-auto">
            Connect directly with thousands of pre-verified buyers across Kenya. Benefit from CBK-regulated Escrow Vault payment protection, standardized 150-point inspection certification, and nationwide marketplace exposure.
          </p>

          {/* Value Props Bar */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left text-xs max-w-2xl mx-auto">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00C9CE] shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">Escrow Vault</span>
                <span className="text-[9px] text-slate-300 block">Guaranteed funds</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2">
              <User className="w-4 h-4 text-[#2ECC71] shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">Verified Buyers</span>
                <span className="text-[9px] text-slate-300 block">Pre-qualified leads</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#00C9CE] shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">150-Pt Audits</span>
                <span className="text-[9px] text-slate-300 block">Certified reports</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-[#00C9CE] shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">Nationwide Reach</span>
                <span className="text-[9px] text-slate-300 block">All 47 counties</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Stepper Header */}
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#E2D8C7] -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-1 bg-[#00C9CE] -translate-y-1/2 z-0 transition-all duration-300"
            style={{ width: currentStep === 1 ? '0%' : '100%' }}
          />

          {/* Step 1 Indicator */}
          <button
            onClick={() => setCurrentStep(1)}
            className="relative z-10 flex items-center gap-3 bg-[#FCF9F4] pr-4 group cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-black text-sm transition-all ${
              currentStep === 1 
                ? 'bg-[#1E3063] text-[#00C9CE] ring-4 ring-[#00C9CE]/30 shadow-md' 
                : 'bg-[#00C9CE] text-[#1E3063]'
            }`}>
              1
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-[10px] font-black uppercase text-[#00C9CE] tracking-wider block">Step 01</span>
              <span className={`text-xs font-bold font-serif ${currentStep === 1 ? 'text-[#1E3063]' : 'text-[#6B7A99]'}`}>
                Select Seller Type
              </span>
            </div>
          </button>

          {/* Step 2 Indicator */}
          <button
            onClick={() => setCurrentStep(2)}
            className="relative z-10 flex items-center gap-3 bg-[#FCF9F4] pl-4 group cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-black text-sm transition-all ${
              currentStep === 2 
                ? 'bg-[#1E3063] text-[#00C9CE] ring-4 ring-[#00C9CE]/30 shadow-md' 
                : 'bg-[#E2D8C7] text-[#6B7A99]'
            }`}>
              2
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-[10px] font-black uppercase text-[#6B7A99] tracking-wider block">Step 02</span>
              <span className={`text-xs font-bold font-serif ${currentStep === 2 ? 'text-[#1E3063]' : 'text-[#6B7A99]'}`}>
                Seller Onboarding Profile
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Step Content */}
      {currentStep === 1 ? (
        /* STEP 1: Choose Account Type */
        <div className="p-6 sm:p-10 rounded-3xl bg-white border border-[#E2D8C7] shadow-sm space-y-8">
          <div className="text-center space-y-1.5 border-b border-[#E8E1D5] pb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E3063] font-serif tracking-tight">
              Select Your Seller Onboarding Path
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7A99] font-medium">
              Position your sales channel according to your scale — individual owner or professional dealer.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Private Seller Card */}
            <div 
              onClick={() => setSelectedType('private')}
              className={`p-6 sm:p-8 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-6 ${
                selectedType === 'private'
                  ? 'border-[#00C9CE] bg-[#F0FCFC] shadow-lg ring-2 ring-[#00C9CE]/20'
                  : 'border-[#E2D8C7] bg-[#F6F1E8]/50 hover:border-[#1E3063]/30'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#1E3063] text-[#00C9CE] flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  {selectedType === 'private' && (
                    <div className="w-7 h-7 rounded-full bg-[#00C9CE] text-[#1E3063] flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-[#1E3063] font-serif">
                      Private Seller
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-[#1E3063]/10 text-[#1E3063] text-[9px] font-extrabold uppercase">Individual Owner</span>
                  </div>
                  <p className="text-xs text-[#3D4F6F] font-medium leading-relaxed mt-1">
                    Ideal for individual vehicle owners seeking a safe, professional sales process with full escrow protection. No business registration required.
                  </p>
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 pt-2 border-t border-[#E8E1D5]">
                  <li className="flex items-center gap-2.5 text-xs text-[#1E3063] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#00C9CE] shrink-0" />
                    <span>List up to 3 personal vehicles concurrently</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-xs text-[#1E3063] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#00C9CE] shrink-0" />
                    <span>CBK-regulated Escrow Vault payment protection</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-xs text-[#1E3063] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#00C9CE] shrink-0" />
                    <span>Free KAYAD Verified Listing Certification Badge</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-xs text-[#1E3063] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#00C9CE] shrink-0" />
                    <span>Direct encrypted buyer messaging & offer management</span>
                  </li>
                </ul>
              </div>

              {/* Price Tag */}
              <div className="pt-4 border-t border-[#E8E1D5]">
                <span className="text-xs font-black text-[#1E3063] uppercase tracking-wider block">
                  Zero Monthly Subscriptions · Standard Escrow Safety
                </span>
              </div>
            </div>

            {/* Verified Dealer Card */}
            <div 
              onClick={() => setSelectedType('dealer')}
              className={`p-6 sm:p-8 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-6 ${
                selectedType === 'dealer'
                  ? 'border-[#1E3063] bg-[#121D33] text-white shadow-xl ring-2 ring-[#00C9CE]/30'
                  : 'border-[#E2D8C7] bg-[#F6F1E8]/50 hover:border-[#1E3063]/30'
              }`}
            >
              {/* Popular Badge */}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 rounded-full bg-[#2ECC71] text-[#121D33] text-[10px] font-black uppercase tracking-wider shadow-sm">
                  Recommended for Showrooms
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    selectedType === 'dealer' ? 'bg-[#00C9CE] text-[#1E3063]' : 'bg-[#1E3063] text-[#00C9CE]'
                  }`}>
                    <Store className="w-6 h-6" />
                  </div>
                  {selectedType === 'dealer' && (
                    <div className="w-7 h-7 rounded-full bg-[#2ECC71] text-[#121D33] flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-xl font-black font-serif ${selectedType === 'dealer' ? 'text-white' : 'text-[#1E3063]'}`}>
                      Verified Dealership
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${selectedType === 'dealer' ? 'bg-[#00C9CE]/20 text-[#00C9CE]' : 'bg-[#1E3063]/10 text-[#1E3063]'}`}>Pro Inventory</span>
                  </div>
                  <p className={`text-xs font-medium leading-relaxed mt-1 ${selectedType === 'dealer' ? 'text-slate-300' : 'text-[#3D4F6F]'}`}>
                    Designed for commercial dealerships & showroom managers requiring full inventory scaling, auction marketplace listing, and priority search placement.
                  </p>
                </div>

                {/* Features List */}
                <ul className={`space-y-2.5 pt-2 border-t ${selectedType === 'dealer' ? 'border-white/10' : 'border-[#E8E1D5]'}`}>
                  <li className={`flex items-center gap-2.5 text-xs font-semibold ${selectedType === 'dealer' ? 'text-slate-200' : 'text-[#1E3063]'}`}>
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0" />
                    <span>Unlimited vehicle inventory listings</span>
                  </li>
                  <li className={`flex items-center gap-2.5 text-xs font-semibold ${selectedType === 'dealer' ? 'text-slate-200' : 'text-[#1E3063]'}`}>
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0" />
                    <span>KAYAD Auction & Marketplace channel access</span>
                  </li>
                  <li className={`flex items-center gap-2.5 text-xs font-semibold ${selectedType === 'dealer' ? 'text-slate-200' : 'text-[#1E3063]'}`}>
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0" />
                    <span>Priority placement in buyer search results</span>
                  </li>
                  <li className={`flex items-center gap-2.5 text-xs font-semibold ${selectedType === 'dealer' ? 'text-slate-200' : 'text-[#1E3063]'}`}>
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0" />
                    <span>Verified Dealership Trust Badge & Showroom Page</span>
                  </li>
                  <li className={`flex items-center gap-2.5 text-xs font-semibold ${selectedType === 'dealer' ? 'text-slate-200' : 'text-[#1E3063]'}`}>
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0" />
                    <span>Dedicated KAYAD Account Manager & Bulk Upload tools</span>
                  </li>
                </ul>
              </div>

              {/* Price Tag */}
              <div className={`pt-4 border-t ${selectedType === 'dealer' ? 'border-white/10' : 'border-[#E8E1D5]'}`}>
                <span className={`text-xs font-black uppercase tracking-wider block ${selectedType === 'dealer' ? 'text-[#00C9CE]' : 'text-[#1E3063]'}`}>
                  100% Free Onboarding · Full Pro Inventory Access Included
                </span>
              </div>
            </div>

          </div>

          {/* Footer Bar */}
          <div className="pt-6 border-t border-[#E8E1D5] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => openAuthModal()}
              className="text-xs font-bold text-[#1E3063] hover:text-[#00C9CE] underline cursor-pointer"
            >
              Already registered on KAYAD? Sign In to Seller Portal
            </button>

            <Button
              variant="primary"
              onClick={handleContinue}
              className="w-full sm:w-auto bg-[#1E3063] hover:bg-[#0B1628] text-white font-black text-xs py-3.5 px-10 uppercase tracking-wider shadow-md cursor-pointer"
              rightIcon={<ArrowRight className="w-4 h-4 text-[#00C9CE]" />}
            >
              Proceed to Onboarding Profile
            </Button>
          </div>
        </div>
      ) : (
        /* STEP 2: Your Details */
        <div className="p-6 sm:p-10 rounded-3xl bg-white border border-[#E2D8C7] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8E1D5] pb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-[#00C9CE] tracking-widest block">
                {selectedType === 'dealer' ? 'DEALERSHIP ONBOARDING PROFILE' : 'PRIVATE SELLER ONBOARDING PROFILE'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1E3063] font-serif tracking-tight">
                Enter Seller Verification Details
              </h2>
            </div>

            <button
              onClick={() => setCurrentStep(1)}
              className="px-3 py-1.5 rounded-xl border border-[#E2D8C7] bg-[#F6F1E8] text-xs font-bold text-[#1E3063] flex items-center gap-1.5 hover:bg-[#E2D8C7] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          {isSuccess ? (
            <div className="p-8 rounded-3xl bg-[#2ECC71]/20 border border-[#2ECC71]/40 text-[#121D33] text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-[#2ECC71] mx-auto" />
              <h3 className="text-xl font-extrabold font-serif">Seller Profile Onboarded Successfully!</h3>
              <p className="text-xs font-semibold">
                Your {selectedType === 'dealer' ? 'Dealership' : 'Private Seller'} account is verified. Redirecting to your KAYAD Seller Dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitDetails} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    {selectedType === 'dealer' ? 'Registered Business / Showroom Name *' : 'Full Legal Name *'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6B7A99] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder={selectedType === 'dealer' ? 'Apex Luxury Motors Ltd' : 'John Mwangi'}
                      className="w-full pl-10 pr-4 py-3 bg-[#F6F1E8] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    Phone Number (M-Pesa Registered) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#6B7A99] absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+254 700 000 000"
                      className="w-full pl-10 pr-4 py-3 bg-[#F6F1E8] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    Official Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#6B7A99] absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="seller@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-[#F6F1E8] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    Primary Region / County
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#6B7A99] absolute left-3.5 top-3.5" />
                    <select
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-[#F6F1E8] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                    >
                      <option value="Nairobi">Nairobi Metropolitan</option>
                      <option value="Mombasa">Mombasa & Coast</option>
                      <option value="Kisumu">Kisumu & Western</option>
                      <option value="Nakuru">Nakuru & Rift Valley</option>
                      <option value="Eldoret">Eldoret & North Rift</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Optional First Listing Section */}
              <div className="p-5 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="w-5 h-5 text-[#00C9CE]" />
                    <h4 className="text-sm font-extrabold text-[#1E3063] font-serif">
                      First Vehicle Preview (Optional)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-[#6B7A99] uppercase bg-white px-2 py-0.5 rounded border border-[#E2D8C7]">
                    Fast-Track Verification
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B7A99] uppercase mb-1">Make & Model</label>
                    <input
                      type="text"
                      value={formData.carTitle}
                      onChange={e => setFormData({ ...formData, carTitle: e.target.value })}
                      placeholder="e.g. Toyota Land Cruiser Prado"
                      className="w-full px-3 py-2 bg-white border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#6B7A99] uppercase mb-1">Asking Price (KES)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      placeholder="6500000"
                      className="w-full px-3 py-2 bg-white border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#6B7A99] uppercase mb-1">Year of Manufacture</label>
                    <input
                      type="text"
                      value={formData.year}
                      onChange={e => setFormData({ ...formData, year: e.target.value })}
                      placeholder="2021"
                      className="w-full px-3 py-2 bg-white border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-xs text-[#6B7A99] font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#2ECC71]" />
                  Protected under Central Bank of Kenya ring-fenced escrow guidelines
                </p>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="primary"
                  className="w-full sm:w-auto bg-[#1E3063] hover:bg-[#0B1628] text-white font-black text-xs py-3.5 px-8 uppercase tracking-wider shadow-md cursor-pointer"
                >
                  {isSubmitting ? 'Onboarding Seller Account...' : 'Complete Seller Onboarding'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
