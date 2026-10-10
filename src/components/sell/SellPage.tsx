import type { FC } from 'react';
import { buildAuthPath } from '../../utils/authIntent';
import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Button } from '../ui/Button';

type AccountType = 'private' | 'dealer';

export const SellPage: FC = () => {
  const navigate = useNavigate();

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

      // This form doesn't collect a password, so we can't create a real
      // session here. Send the user to real registration to finish
      // creating their account instead of faking a login.
      setTimeout(() => {
        navigate(buildAuthPath('register', { intent: 'seller' }));
      }, 1800);
    }, 1000);
  };

  return (
    <div className="pt-3 sm:pt-5 pb-10 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-5 sm:space-y-6 bg-[#F6FAF9] text-[#176B87] font-sans">

      {/* 1. Top Hero Section */}
      <div className="p-5 sm:p-7 rounded-2xl bg-[#176B87] text-white border border-white/20 shadow-lg relative overflow-hidden text-center space-y-4">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-96 bg-[#13B8A6]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#13B8A6]/20 text-[#13B8A6] text-xs font-black uppercase tracking-wider border border-[#13B8A6]/40">
            <Sparkles className="w-4 h-4 text-[#13B8A6]" />
            <span>KAYAD SELLER ONBOARDING EXPERIENCE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-serif tracking-tight text-white">
            Sell Your Vehicle with Confidence
          </h1>

          <p className="text-xs sm:text-sm text-[#DDF4F0] font-medium leading-relaxed max-w-2xl mx-auto">
            Connect directly with thousands of pre-verified buyers across Kenya. Benefit from Escrow payment protection on approved listings, access to independent pre-purchase inspection, and nationwide marketplace exposure.
          </p>

          {/* Value Props Bar */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left text-xs max-w-2xl mx-auto">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#13B8A6] shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">Escrow Vault</span>
                <span className="text-[9px] text-[#BDE5DE] block">Guaranteed funds</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2">
              <User className="w-4 h-4 text-[#13B8A6] shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">Verified Buyers</span>
                <span className="text-[9px] text-[#BDE5DE] block">Pre-qualified leads</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#13B8A6] shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">Inspections</span>
                <span className="text-[9px] text-[#BDE5DE] block">Certified reports</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-[#13B8A6] shrink-0" />
              <div>
                <span className="font-bold text-white block text-[11px]">Nationwide Reach</span>
                <span className="text-[9px] text-[#BDE5DE] block">All 47 counties</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Stepper Header */}
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#D7E7E4] -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 left-0 h-1 bg-[#13B8A6] -translate-y-1/2 z-0 transition-all duration-300"
            style={{ width: currentStep === 1 ? '0%' : '100%' }}
          />

          {/* Step 1 Indicator */}
          <button
            onClick={() => setCurrentStep(1)}
            className="relative z-10 flex items-center gap-3 bg-[#F6FAF9] pr-4 group cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-black text-sm transition-all ${
              currentStep === 1
                ? 'bg-[#176B87] text-[#13B8A6] ring-4 ring-[#13B8A6]/30 shadow-md'
                : 'bg-[#13B8A6] text-[#176B87]'
            }`}>
              1
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-[10px] font-black uppercase text-[#13B8A6] tracking-wider block">Step 01</span>
              <span className={`text-xs font-bold font-serif ${currentStep === 1 ? 'text-[#176B87]' : 'text-[#64748b]'}`}>
                Select Seller Type
              </span>
            </div>
          </button>

          {/* Step 2 Indicator */}
          <button
            onClick={() => setCurrentStep(2)}
            className="relative z-10 flex items-center gap-3 bg-[#F6FAF9] pl-4 group cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-black text-sm transition-all ${
              currentStep === 2
                ? 'bg-[#176B87] text-[#13B8A6] ring-4 ring-[#13B8A6]/30 shadow-md'
                : 'bg-[#D7E7E4] text-[#64748b]'
            }`}>
              2
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-[10px] font-black uppercase text-[#64748b] tracking-wider block">Step 02</span>
              <span className={`text-xs font-bold font-serif ${currentStep === 2 ? 'text-[#176B87]' : 'text-[#64748b]'}`}>
                Seller Onboarding Profile
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Step Content */}
      {currentStep === 1 ? (
        /* STEP 1: Choose Account Type */
        <div className="p-6 sm:p-10 rounded-3xl bg-white border border-[#D7E7E4] shadow-sm space-y-8">
          <div className="text-center space-y-1.5 border-b border-[#D7E7E4] pb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-[#176B87] font-serif tracking-tight">
              Select Your Seller Onboarding Path
            </h2>
            <p className="text-xs sm:text-sm text-[#64748b] font-medium">
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
                  ? 'border-[#13B8A6] bg-[#E8FDFF] shadow-lg ring-2 ring-[#13B8A6]/20'
                  : 'border-[#D7E7E4] bg-[#EEF7F5]/50 hover:border-[#176B87]/30'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#176B87] text-[#13B8A6] flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  {selectedType === 'private' && (
                    <div className="w-7 h-7 rounded-full bg-[#13B8A6] text-[#176B87] flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-[#176B87] font-serif">
                      Private Seller
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-[#176B87]/10 text-[#176B87] text-[9px] font-extrabold uppercase">Individual Owner</span>
                  </div>
                  <p className="text-xs text-[#176b87] font-medium leading-relaxed mt-1">
                    Ideal for individual vehicle owners seeking a safe, professional sales process with full escrow protection. No business registration required.
                  </p>
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 pt-2 border-t border-[#D7E7E4]">
                  <li className="flex items-center gap-2.5 text-xs text-[#176B87] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#13B8A6] shrink-0" />
                    <span>List up to 3 personal vehicles concurrently</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-xs text-[#176B87] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#13B8A6] shrink-0" />
                    <span>Escrow payment protection on approved listings</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-xs text-[#176B87] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#13B8A6] shrink-0" />
                    <span>Free KAYAD Verified Listing Certification Badge</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-xs text-[#176B87] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#13B8A6] shrink-0" />
                    <span>Direct encrypted buyer messaging & offer management</span>
                  </li>
                </ul>
              </div>

              {/* Price Tag */}
              <div className="pt-4 border-t border-[#D7E7E4]">
                <span className="text-xs font-black text-[#176B87] uppercase tracking-wider block">
                  Zero Monthly Subscriptions · Standard Escrow Safety
                </span>
              </div>
            </div>

            {/* Verified Dealer Card */}
            <div
              onClick={() => setSelectedType('dealer')}
              className={`p-6 sm:p-8 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-6 ${
                selectedType === 'dealer'
                  ? 'border-[#176B87] bg-[#0A3340] text-white shadow-xl ring-2 ring-[#13B8A6]/30'
                  : 'border-[#D7E7E4] bg-[#EEF7F5]/50 hover:border-[#176B87]/30'
              }`}
            >
              {/* Popular Badge */}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 rounded-full bg-[#13B8A6] text-[#0A3340] text-[10px] font-black uppercase tracking-wider shadow-sm">
                  Recommended for Showrooms
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    selectedType === 'dealer' ? 'bg-[#13B8A6] text-[#176B87]' : 'bg-[#176B87] text-[#13B8A6]'
                  }`}>
                    <Store className="w-6 h-6" />
                  </div>
                  {selectedType === 'dealer' && (
                    <div className="w-7 h-7 rounded-full bg-[#13B8A6] text-[#0A3340] flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-xl font-black font-serif ${selectedType === 'dealer' ? 'text-white' : 'text-[#176B87]'}`}>
                      Verified Dealership
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${selectedType === 'dealer' ? 'bg-[#13B8A6]/20 text-[#13B8A6]' : 'bg-[#176B87]/10 text-[#176B87]'}`}>Pro Inventory</span>
                  </div>
                  <p className={`text-xs font-medium leading-relaxed mt-1 ${selectedType === 'dealer' ? 'text-[#BDE5DE]' : 'text-[#176b87]'}`}>
                    Designed for commercial dealerships & showroom managers requiring full inventory scaling, auction marketplace listing, and priority search placement.
                  </p>
                </div>

                {/* Features List */}
                <ul className={`space-y-2.5 pt-2 border-t ${selectedType === 'dealer' ? 'border-white/10' : 'border-[#D7E7E4]'}`}>
                  <li className={`flex items-center gap-2.5 text-xs font-semibold ${selectedType === 'dealer' ? 'text-[#DDF4F0]' : 'text-[#176B87]'}`}>
                    <CheckCircle2 className="w-4 h-4 text-[#13B8A6] shrink-0" />
                    <span>Unlimited vehicle inventory listings</span>
                  </li>
                  <li className={`flex items-center gap-2.5 text-xs font-semibold ${selectedType === 'dealer' ? 'text-[#DDF4F0]' : 'text-[#176B87]'}`}>
                    <CheckCircle2 className="w-4 h-4 text-[#13B8A6] shrink-0" />
                    <span>KAYAD Auction & Marketplace channel access</span>
                  </li>
                  <li className={`flex items-center gap-2.5 text-xs font-semibold ${selectedType === 'dealer' ? 'text-[#DDF4F0]' : 'text-[#176B87]'}`}>
                    <CheckCircle2 className="w-4 h-4 text-[#13B8A6] shrink-0" />
                    <span>Priority placement in buyer search results</span>
                  </li>
                  <li className={`flex items-center gap-2.5 text-xs font-semibold ${selectedType === 'dealer' ? 'text-[#DDF4F0]' : 'text-[#176B87]'}`}>
                    <CheckCircle2 className="w-4 h-4 text-[#13B8A6] shrink-0" />
                    <span>Verified Dealership Trust Badge & Showroom Page</span>
                  </li>
                  <li className={`flex items-center gap-2.5 text-xs font-semibold ${selectedType === 'dealer' ? 'text-[#DDF4F0]' : 'text-[#176B87]'}`}>
                    <CheckCircle2 className="w-4 h-4 text-[#13B8A6] shrink-0" />
                    <span>Dedicated KAYAD Account Manager & Bulk Upload tools</span>
                  </li>
                </ul>
              </div>

              {/* Price Tag */}
              <div className={`pt-4 border-t ${selectedType === 'dealer' ? 'border-white/10' : 'border-[#D7E7E4]'}`}>
                <span className={`text-xs font-black uppercase tracking-wider block ${selectedType === 'dealer' ? 'text-[#13B8A6]' : 'text-[#176B87]'}`}>
                  100% Free Onboarding · Full Pro Inventory Access Included
                </span>
              </div>
            </div>

          </div>

          {/* Footer Bar */}
          <div className="pt-6 border-t border-[#D7E7E4] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => navigate('/sign-in')}
              className="text-xs font-bold text-[#176B87] hover:text-[#13B8A6] underline cursor-pointer"
            >
              Already registered on KAYAD? Sign In to Seller Portal
            </button>

            <Button
              variant="primary"
              onClick={handleContinue}
              className="w-full sm:w-auto bg-[#176B87] hover:bg-[#0A3340] text-white font-black text-xs py-3.5 px-10 uppercase tracking-wider shadow-md cursor-pointer"
              rightIcon={<ArrowRight className="w-4 h-4 text-[#13B8A6]" />}
            >
              Proceed to Onboarding Profile
            </Button>
          </div>
        </div>
      ) : (
        /* STEP 2: Your Details */
        <div className="p-6 sm:p-10 rounded-3xl bg-white border border-[#D7E7E4] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#D7E7E4] pb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-[#13B8A6] tracking-widest block">
                {selectedType === 'dealer' ? 'DEALERSHIP ONBOARDING PROFILE' : 'PRIVATE SELLER ONBOARDING PROFILE'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#176B87] font-serif tracking-tight">
                Enter Seller Verification Details
              </h2>
            </div>

            <button
              onClick={() => setCurrentStep(1)}
              className="px-3 py-1.5 rounded-xl border border-[#D7E7E4] bg-[#EEF7F5] text-xs font-bold text-[#176B87] flex items-center gap-1.5 hover:bg-[#D7E7E4] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          {isSuccess ? (
            <div className="p-8 rounded-3xl bg-[#13B8A6]/20 border border-[#13B8A6]/40 text-[#0A3340] text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-[#13B8A6] mx-auto" />
              <h3 className="text-xl font-extrabold font-serif">Seller Profile Onboarded Successfully!</h3>
              <p className="text-xs font-semibold">
                Your {selectedType === 'dealer' ? 'Dealership' : 'Private Seller'} account is verified. Redirecting to your KAYAD Seller Dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitDetails} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#176B87] uppercase tracking-wider mb-1.5">
                    {selectedType === 'dealer' ? 'Registered Business / Showroom Name *' : 'Full Legal Name *'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#64748b] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder={selectedType === 'dealer' ? 'Apex Luxury Motors Ltd' : 'John Mwangi'}
                      className="w-full pl-10 pr-4 py-3 bg-[#EEF7F5] border border-[#D7E7E4] rounded-xl text-xs font-bold text-[#176B87] focus:outline-none focus:ring-2 focus:ring-[#13B8A6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#176B87] uppercase tracking-wider mb-1.5">
                    Phone Number (M-Pesa Registered) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#64748b] absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+254 700 000 000"
                      className="w-full pl-10 pr-4 py-3 bg-[#EEF7F5] border border-[#D7E7E4] rounded-xl text-xs font-bold text-[#176B87] focus:outline-none focus:ring-2 focus:ring-[#13B8A6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#176B87] uppercase tracking-wider mb-1.5">
                    Official Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748b] absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="seller@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-[#EEF7F5] border border-[#D7E7E4] rounded-xl text-xs font-bold text-[#176B87] focus:outline-none focus:ring-2 focus:ring-[#13B8A6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#176B87] uppercase tracking-wider mb-1.5">
                    Primary Region / County
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#64748b] absolute left-3.5 top-3.5" />
                    <select
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-[#EEF7F5] border border-[#D7E7E4] rounded-xl text-xs font-bold text-[#176B87] focus:outline-none focus:ring-2 focus:ring-[#13B8A6]"
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
              <div className="p-5 rounded-2xl bg-[#EEF7F5] border border-[#D7E7E4] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="w-5 h-5 text-[#13B8A6]" />
                    <h4 className="text-sm font-extrabold text-[#176B87] font-serif">
                      First Vehicle Preview (Optional)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase bg-white px-2 py-0.5 rounded border border-[#D7E7E4]">
                    Fast-Track Verification
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748b] uppercase mb-1">Make & Model</label>
                    <input
                      type="text"
                      value={formData.carTitle}
                      onChange={e => setFormData({ ...formData, carTitle: e.target.value })}
                      placeholder="e.g. Toyota Land Cruiser Prado"
                      className="w-full px-3 py-2 bg-white border border-[#D7E7E4] rounded-xl text-xs font-bold text-[#176B87]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#64748b] uppercase mb-1">Asking Price (KES)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      placeholder="6500000"
                      className="w-full px-3 py-2 bg-white border border-[#D7E7E4] rounded-xl text-xs font-bold text-[#176B87]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#64748b] uppercase mb-1">Year of Manufacture</label>
                    <input
                      type="text"
                      value={formData.year}
                      onChange={e => setFormData({ ...formData, year: e.target.value })}
                      placeholder="2021"
                      className="w-full px-3 py-2 bg-white border border-[#D7E7E4] rounded-xl text-xs font-bold text-[#176B87]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-xs text-[#64748b] font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#13B8A6]" />
                  Escrow is offered only to approved sellers and vehicles
                </p>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="primary"
                  className="w-full sm:w-auto bg-[#176B87] hover:bg-[#0A3340] text-white font-black text-xs py-3.5 px-8 uppercase tracking-wider shadow-md cursor-pointer"
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
