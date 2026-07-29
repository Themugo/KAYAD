import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import { 
  CheckCircle2, 
  MapPin, 
  Lock, 
  MessageSquare, 
  Heart,
  FileCheck,
  ShieldCheck,
  Landmark,
  Calculator,
  Gauge,
  Fuel,
  Sliders,
  Sparkles,
  Phone,
  Mail,
  Zap,
  Info,
  ChevronRight,
  ChevronLeft,
  Shield,
  Star,
  Award,
  Clock,
  ArrowRight,
  SearchX,
  AlertCircle
} from 'lucide-react';
import { Modal, Badge, Button, Card, LazyImage } from './ui';
import TrustBadgeMatrix from './TrustBadgeMatrix';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  notFoundId?: string | null;
  allVehicles?: Vehicle[];
  onClose: () => void;
  onStartEscrow: (vehicle: Vehicle) => void;
  onContactSeller: (vehicle: Vehicle) => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  notFoundId,
  allVehicles = [],
  onClose,
  onStartEscrow,
  onContactSeller,
  isSaved,
  onToggleSave,
  onSelectVehicle
}) => {
  // If no vehicle and no notFoundId, do not render modal
  if (!vehicle && !notFoundId) return null;

  // Render 404 Vehicle Not Found state if invalid ID
  if (!vehicle && notFoundId) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Vehicle Not Found" maxWidth="2xl">
        <div className="p-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <SearchX className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="danger" size="md">
              <AlertCircle className="w-3.5 h-3.5" /> 404 Listing Unavailable
            </Badge>
            <h3 className="text-2xl font-extrabold text-[#1E3063] font-display">
              Vehicle Listing #{notFoundId} Not Found
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              The requested vehicle listing could not be found or may have been sold, unlisted, or completed through the KAYAD Escrow Vault.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs text-slate-700 space-y-2 max-w-md mx-auto">
            <p className="font-bold text-[#1E3063]">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Browse active verified inventory in the marketplace</li>
              <li>Filter by make, model, county, or budget</li>
              <li>Contact support if you hold an active escrow deposit for this listing</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button variant="primary" size="md" onClick={onClose}>
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Browse Active Marketplace</span>
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Safety check (Guaranteed vehicle exists below)
  if (!vehicle) return null;

  // Related / Similar vehicles (excluding current vehicle)
  const relatedVehicles = allVehicles
    .filter((v) => v.id !== vehicle.id && (v.make === vehicle.make || v.bodyStyle === vehicle.bodyStyle))
    .slice(0, 3);

  // Active Image State for Interactive Gallery
  const allImages = [vehicle.image, ...(vehicle.additionalImages || [])];
  const [activeImage, setActiveImage] = useState<string>(vehicle.image);

  // Sync active image when vehicle changes
  useEffect(() => {
    setActiveImage(vehicle.image);
  }, [vehicle]);

  // Tabbed Section Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'inspection' | 'finance' | 'seller'>('overview');

  // Financing Calculator State
  const [depositPercent, setDepositPercent] = useState<number>(20); // 20% down
  const [loanTermMonths, setLoanTermMonths] = useState<number>(36); // 36 months

  // Calculate finance numbers
  const price = vehicle.price;
  const depositAmount = (price * depositPercent) / 100;
  const loanPrincipal = Math.max(0, price - depositAmount);
  const annualInterestRate = 0.13; // 13% p.a. asset financing estimate
  const monthlyInterestRate = annualInterestRate / 12;
  const monthlyPayment = loanPrincipal > 0 
    ? (loanPrincipal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths)) / (Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1)
    : 0;

  const isPrivateSeller = vehicle?.sellerType === 'Private Seller';
  const isVerifiedDealer = vehicle?.sellerType === 'Verified Dealer';
  const isEscrowActive = isPrivateSeller || (isVerifiedDealer && Boolean(vehicle?.escrowEligible));
  const isInspectionActive = Boolean(vehicle?.inspectionPassed);
  const isFinanceActive = Boolean(vehicle?.financeAvailable);

  const modalTitle = (
    <div className="flex items-center justify-between w-full pr-8">
      <div className="flex items-center gap-2 flex-wrap">
        {vehicle?.verified && (
          <Badge variant="verified" size="md">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            {vehicle.sellerType}
          </Badge>
        )}
        {isInspectionActive && (
          <Badge variant="success" size="md">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            150-Pt Inspected
          </Badge>
        )}
        {isEscrowActive && (
          <Badge variant="escrow" size="md">
            <Lock className="w-4 h-4 text-amber-500" />
            {isPrivateSeller ? 'Escrow Mandatory' : 'Escrow Vault Enabled'}
          </Badge>
        )}
      </div>

      <button
        onClick={() => onToggleSave(vehicle.id)}
        className={`p-2 rounded-full border transition-all ${
          isSaved ? 'bg-rose-50 text-rose-600 border-rose-200' : 'text-slate-500 border-slate-200 hover:bg-slate-50'
        }`}
        title="Save Vehicle"
      >
        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
      </button>
    </div>
  );

  return (
    <Modal isOpen={!!vehicle} onClose={onClose} title={modalTitle} maxWidth="5xl">
      <div className="space-y-6 pb-20 md:pb-0 relative">
        
        {/* 1. TRUST MATRIX HEADER */}
        <TrustBadgeMatrix vehicle={vehicle} variant="full" />

        {/* 2. GALLERY & TOP SHOWROOM BANNER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Interactive Media Gallery (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 relative group shadow-md">
              <LazyImage 
                src={activeImage} 
                alt={vehicle.title} 
                wrapperClassName="w-full h-full"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Gallery Prev / Next Touch Overlay Controls */}
              {allImages.length > 1 && (
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIdx = allImages.indexOf(activeImage);
                      const prevIdx = (currentIdx - 1 + allImages.length) % allImages.length;
                      setActiveImage(allImages[prevIdx]);
                    }}
                    className="pointer-events-auto w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIdx = allImages.indexOf(activeImage);
                      const nextIdx = (currentIdx + 1) % allImages.length;
                      setActiveImage(allImages[nextIdx]);
                    }}
                    className="pointer-events-auto w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              )}
              
              {/* Location Floating Tag */}
              <span className="absolute bottom-3 left-3 bg-[#1E3063]/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 backdrop-blur-md shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {vehicle.location} ({vehicle.county})
              </span>

              {/* Image Counter Badge */}
              <span className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full backdrop-blur-md">
                📷 {allImages.indexOf(activeImage) + 1} / {allImages.length} Photos
              </span>
            </div>

            {/* Thumbnail Gallery Switcher */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`h-20 w-28 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImage === img ? 'border-[#1E3063] ring-2 ring-[#1E3063]/30 scale-95' : 'border-slate-200 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <LazyImage src={img} alt={`Vehicle view ${idx + 1}`} wrapperClassName="w-full h-full" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & High-Convert Buy Card (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="verified">
                  {vehicle.condition || 'Foreign Used'}
                </Badge>
                <Badge variant="neutral">
                  {vehicle.sellerType}
                </Badge>
                <span className="text-xs text-amber-600 font-bold flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 fill-current text-amber-500" /> {vehicle.sellerRating} / 5.0
                </span>
              </div>

              <h2 className="text-2xl font-black text-[#1E3063] font-display leading-snug">
                {vehicle.title}
              </h2>

              {/* Price Banner */}
              <div className="mt-3 p-4 bg-white border border-amber-300 rounded-xl space-y-1.5 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-[#1E3063] font-display">
                    Ksh {vehicle.price.toLocaleString()}
                  </span>
                  {vehicle.marketPriceAvg && (
                    <span className="text-xs text-slate-400 line-through font-semibold">
                      Ksh {vehicle.marketPriceAvg.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Verified Market Value • Logbook Clearance Certified
                </div>
              </div>

              {/* Monthly Finance Quick Indicator */}
              {vehicle.financeAvailable && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-bold">
                    <Landmark className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Est. Finance Installment:</span>
                  </div>
                  <span className="font-extrabold text-blue-900 font-display text-sm">
                    Ksh {Math.round(monthlyPayment).toLocaleString()} / mo
                  </span>
                </div>
              )}
            </div>

            {/* Quick Spec Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Year / Mileage</p>
                <p className="font-bold text-slate-800 mt-0.5">{vehicle.year} • {vehicle.mileage.toLocaleString()} km</p>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Fuel & Engine</p>
                <p className="font-bold text-slate-800 mt-0.5">{vehicle.fuelType} • {vehicle.engineSize || 'N/A'}</p>
              </div>
            </div>

            {/* Primary Action CTAs */}
            <div className="space-y-2 pt-2">
              {isEscrowActive ? (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => onStartEscrow(vehicle)}
                  className="shadow-md"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Start Escrow Protected Purchase</span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => onContactSeller(vehicle)}
                  className="shadow-md"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>Contact Dealer Direct ({vehicle.sellerName})</span>
                </Button>
              )}

              {isEscrowActive && (
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => onContactSeller(vehicle)}
                >
                  <MessageSquare className="w-4 h-4 text-[#1E3063]" />
                  <span>Message Seller ({vehicle.sellerName})</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 3. SHOWROOM TABBED NAVIGATION BAR */}
        <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none pt-2">
          {[
            { id: 'overview', label: 'Overview & Specs', icon: <Info className="w-4 h-4" />, show: true },
            { id: 'inspection', label: '150-Pt Inspection Audit', icon: <FileCheck className="w-4 h-4 text-emerald-600" />, show: isInspectionActive },
            { id: 'finance', label: 'Asset Financing Calculator', icon: <Calculator className="w-4 h-4 text-blue-600" />, show: isFinanceActive },
            { id: 'seller', label: 'Seller & Escrow Info', icon: <ShieldCheck className="w-4 h-4 text-amber-500" />, show: true }
          ].filter(tab => tab.show).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-[#1E3063] text-[#1E3063] bg-amber-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 4. TAB CONTENT PANELS */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider font-display">
                Vehicle Description & Condition
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {vehicle.description || 'Pristine condition verified vehicle with original logbook and zero accident history.'}
              </p>
            </div>

            {/* Structured Specifications Matrix */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider font-display">
                Detailed Vehicle Specifications
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Registration Year</p>
                  <p className="font-extrabold text-[#1E3063] text-sm">{vehicle.year}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Mileage</p>
                  <p className="font-extrabold text-[#1E3063] text-sm">{vehicle.mileage.toLocaleString()} km</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Fuel Type</p>
                  <p className="font-extrabold text-[#1E3063] text-sm">{vehicle.fuelType}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Transmission</p>
                  <p className="font-extrabold text-[#1E3063] text-sm">{vehicle.transmission}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Engine Capacity</p>
                  <p className="font-extrabold text-[#1E3063] text-sm">{vehicle.engineSize || 'N/A'}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Drive Type</p>
                  <p className="font-extrabold text-[#1E3063] text-sm">{vehicle.driveType || '2WD'}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Body Style</p>
                  <p className="font-extrabold text-[#1E3063] text-sm">{vehicle.bodyStyle || 'SUV'}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Condition</p>
                  <p className="font-extrabold text-[#1E3063] text-sm">{vehicle.condition}</p>
                </div>
              </div>
            </div>

            {/* Features & Options */}
            {vehicle.features && vehicle.features.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider font-display">
                  Included Factory Features & Extras
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {vehicle.features.map((feat, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: 150-Point Inspection Report */}
        {activeTab === 'inspection' && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-emerald-950 text-base font-display">150-Point KAYAD Technical Audit Certificate</h3>
                    <p className="text-xs text-emerald-800">Inspected by Certified Automotive Engineers in {vehicle.county}</p>
                  </div>
                </div>
                <Badge variant="success" size="md">
                  ✓ PASSED & CERTIFIED
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
                  <p className="font-extrabold text-[#1E3063] flex items-center justify-between">
                    <span>1. Engine & Mechanical</span>
                    <span className="text-emerald-700">100% OK</span>
                  </p>
                  <p className="text-slate-500">Compression test passed, zero oil leaks, cooling system pressure test verified.</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
                  <p className="font-extrabold text-[#1E3063] flex items-center justify-between">
                    <span>2. Transmission & Drivetrain</span>
                    <span className="text-emerald-700">100% OK</span>
                  </p>
                  <p className="text-slate-500">Smooth gear shifts, torque converter functional, differential fluid verified.</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
                  <p className="font-extrabold text-[#1E3063] flex items-center justify-between">
                    <span>3. Chassis & Structural Integrity</span>
                    <span className="text-emerald-700">CLEAR</span>
                  </p>
                  <p className="text-slate-500">No frame distortion, zero structural accident history, suspension bushings intact.</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
                  <p className="font-extrabold text-[#1E3063] flex items-center justify-between">
                    <span>4. NTSA Logbook Verification</span>
                    <span className="text-emerald-700">AUTHENTIC</span>
                  </p>
                  <p className="text-slate-500">Logbook VIN and engine number match TIMS database. Zero bank liens or encumbrances.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Asset Financing Calculator */}
        {activeTab === 'finance' && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-blue-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-blue-950 text-base font-display">Asset Financing Estimate</h3>
                    <p className="text-xs text-blue-800">Pre-approved by NCBA, Co-operative Bank & Stanbic Kenya</p>
                  </div>
                </div>
                <Badge variant="success" size="md">
                  Pre-Approval Eligible
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Controls */}
                <div className="space-y-4 bg-white p-4 rounded-xl border border-blue-200">
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Deposit Percentage Down</span>
                      <span className="text-blue-900 font-extrabold">{depositPercent}% (Ksh {depositAmount.toLocaleString()})</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      step={5}
                      value={depositPercent}
                      onChange={(e) => setDepositPercent(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Repayment Period (Months)</span>
                      <span className="text-blue-900 font-extrabold">{loanTermMonths} Months ({(loanTermMonths / 12).toFixed(1)} Yrs)</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={48}
                      step={6}
                      value={loanTermMonths}
                      onChange={(e) => setLoanTermMonths(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Monthly Calculation Output */}
                <div className="bg-gradient-to-br from-[#1E3063] to-[#17244B] text-white p-5 rounded-xl space-y-3 flex flex-col justify-between shadow-md">
                  <div>
                    <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">Estimated Monthly Installment</p>
                    <p className="text-3xl font-black text-white font-display mt-1">
                      Ksh {Math.round(monthlyPayment).toLocaleString()} <span className="text-xs font-normal text-slate-300">/ month</span>
                    </p>
                    <p className="text-[11px] text-slate-300 mt-2">
                      Total Financed Amount: Ksh {loanPrincipal.toLocaleString()}
                    </p>
                  </div>

                  <Button
                    variant="accent"
                    size="md"
                    onClick={() => onStartEscrow(vehicle)}
                    fullWidth
                  >
                    <span>Apply for Pre-Approved Asset Loan</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Seller & Escrow Vault */}
        {activeTab === 'seller' && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Seller Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1E3063] text-amber-400 font-black text-xl flex items-center justify-center font-display">
                    {vehicle.sellerName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#1E3063] text-base font-display">{vehicle.sellerName}</h4>
                    <p className="text-xs text-slate-500 font-medium">{vehicle.sellerType} • {vehicle.county}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 border-t border-b border-slate-100 py-3">
                  <p className="flex items-center justify-between">
                    <span>Seller Rating Score:</span>
                    <strong className="text-amber-600">★ {vehicle.sellerRating} / 5.0</strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Average Response Time:</span>
                    <strong className="text-emerald-700">{vehicle.responseTime || '< 15 mins'}</strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Physical Yard Location:</span>
                    <strong className="text-slate-800">{vehicle.location}</strong>
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => onContactSeller(vehicle)}
                >
                  <MessageSquare className="w-4 h-4 text-[#1E3063]" />
                  <span>Start Direct Inquiry with Seller</span>
                </Button>
              </div>

              {/* Escrow Explanation Card */}
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[#17244B] font-extrabold text-sm font-display">
                  <Lock className="w-5 h-5 text-amber-600" />
                  <span>How KAYAD Escrow Vault Protects You</span>
                </div>
                <div className="space-y-2 text-slate-700 leading-normal">
                  <p className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-[#17244B] font-black text-[10px] flex items-center justify-center shrink-0">1</span>
                    <span>Your funds are deposited securely into the bank-backed KAYAD Escrow Vault.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-[#17244B] font-black text-[10px] flex items-center justify-center shrink-0">2</span>
                    <span>You physically inspect the vehicle and verify NTSA TIMS logbook transfer.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-[#17244B] font-black text-[10px] flex items-center justify-center shrink-0">3</span>
                    <span>Funds are released to the seller ONLY after you click confirm in your buyer portal.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Related & Similar Verified Vehicles */}
        {relatedVehicles.length > 0 && (
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider font-display flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Similar Verified Listings in East Africa
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedVehicles.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectVehicle ? onSelectVehicle(rel) : null}
                  className="p-3 bg-slate-50 hover:bg-amber-50/80 transition-all cursor-pointer rounded-xl border border-slate-200 text-xs flex gap-3 items-center group"
                >
                  <LazyImage src={rel.image} alt={rel.title} wrapperClassName="w-16 h-12 rounded-lg shrink-0 overflow-hidden" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-[#1E3063] truncate group-hover:text-amber-700">{rel.title}</p>
                    <p className="text-[11px] font-bold text-slate-800">Ksh {rel.price.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{rel.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default VehicleDetailModal;
