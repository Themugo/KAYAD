import React, { useState, useMemo } from 'react';
import { Vehicle, Mechanic, InspectionBooking, InspectionReport, InspectionPayment, InspectionRating, InspectionCategoryDetail } from '../../../types';
import PrePurchaseInspectionPortal from './PrePurchaseInspectionPortal';
import { 
  INITIAL_MECHANICS, 
  INITIAL_INSPECTION_REPORTS, 
  INITIAL_INSPECTION_BOOKINGS, 
  INITIAL_INSPECTION_PAYMENTS, 
  INITIAL_INSPECTION_RATINGS 
} from '../../../data/mockInspections';
import { ShieldCheck, Search, MapPin, Star, CheckCircle2, Clock, FileCheck, Award, Wrench, Calendar, PlusCircle, X, Download, Eye, Sparkles, Check, ThumbsUp, Activity, Navigation, User } from 'lucide-react';
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, LazyImage, Modal } from '../../../components/ui';

interface InspectionsViewProps {
  vehicles: Vehicle[];
  initialSelectedVehicle?: Vehicle | null;
  onViewVehicleDetails?: (vehicleId: string) => void;
}

export const InspectionsView: React.FC<InspectionsViewProps> = ({ 
  vehicles, 
  initialSelectedVehicle,
  onViewVehicleDetails 
}) => {
  // State
  const [mechanics] = useState<Mechanic[]>(INITIAL_MECHANICS);
  const [reports, setReports] = useState<InspectionReport[]>(INITIAL_INSPECTION_REPORTS);
  const [bookings, setBookings] = useState<InspectionBooking[]>(INITIAL_INSPECTION_BOOKINGS);
  const [payments] = useState<InspectionPayment[]>(INITIAL_INSPECTION_PAYMENTS);
  const [ratings, setRatings] = useState<InspectionRating[]>(INITIAL_INSPECTION_RATINGS);

  // Top-Level Mode: 'buyer_marketplace' | 'mechanic_portal'
  const [viewMode, setViewMode] = useState<'buyer_marketplace' | 'mechanic_portal'>('buyer_marketplace');

  // Active Main Navigation Sub-Tab
  const [activeTab, setActiveTab] = useState<'marketplace' | 'packages' | 'reports' | 'bookings' | 'reviews' | 'coverage'>('marketplace');

  // Search & Filters for Mechanics
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [countyFilter, setCountyFilter] = useState<string>('All');
  const [specializationFilter, setSpecializationFilter] = useState<string>('All');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [packageTypeFilter, setPackageTypeFilter] = useState<string>('All');

  // Selected items & Modals
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [selectedReport, setSelectedReport] = useState<InspectionReport | null>(null);
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [bookingStep, setBookingStep] = useState<number>(1);

  // Booking Form State
  const [targetVehicleId, setTargetVehicleId] = useState<string>(initialSelectedVehicle?.id || (vehicles[0]?.id || 'custom'));
  const [customVehicleTitle, setCustomVehicleTitle] = useState<string>('');
  const [customVehicleLocation, setCustomVehicleLocation] = useState<string>('Westlands, Nairobi');
  const [customVehicleVin, setCustomVehicleVin] = useState<string>('');
  const [chosenMechanicId, setChosenMechanicId] = useState<string>(mechanics[0]?.id || '');
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('2026-08-05');
  const [scheduledTime, setScheduledTime] = useState<string>('10:00 AM');
  const [packageType, setPackageType] = useState<InspectionBooking['packageType']>('150-Point Comprehensive');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card' | 'escrow'>('mpesa');
  const [newBookingId, setNewBookingId] = useState<string | null>(null);

  // Helpful votes state
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});
  const [votedItems, setVotedItems] = useState<Record<string, boolean>>({});

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Inspection Package Definitions
  const inspectionPackages = [
    {
      id: '50-Point Essential',
      name: '50-Point Essential Roadworthy Assessment',
      pointsCount: 50,
      price: 7500,
      duration: '45 mins',
      popular: false,
      description: 'Core safety check for budget vehicles and city daily drivers. Covers brakes, lights, fluid levels, tires, and basic OBD diagnostics.',
      idealFor: 'Local city hatchbacks & daily commuters under Ksh 1.5M',
      features: [
        'Brake pad thickness & rotor inspection',
        'Tire tread depth & pressure analysis',
        'Basic OBD-II ECU diagnostic trouble scan',
        'Engine oil & coolant fluid leak audit',
        'Exterior lights & horn operation',
        'Digital summary report (PDF)'
      ]
    },
    {
      id: '150-Point Comprehensive',
      name: '150-Point Comprehensive Pre-Purchase Audit',
      pointsCount: 150,
      price: 12000,
      duration: '90 mins',
      popular: true,
      description: 'The gold-standard pre-purchase inspection in East Africa. Exhaustive 150-point technical audit covering engine compression, transmission shifting, chassis rails, paint thickness micron test, and NTSA TIMS logbook verification.',
      idealFor: 'SUV buyers, foreign-used imports, and cars over Ksh 2M',
      features: [
        'Full 150-point technical & mechanical audit',
        'Cylinder compression & blow-by check',
        'Paint micron thickness & collision repair test',
        'Undercarriage & chassis rail alignment inspection',
        'Deep ECU multi-module scanner diagnostic',
        'VIN, Chassis stamp & NTSA Logbook verification',
        'High-speed road test (0-80 km/h braking & vibration)',
        'Comprehensive digital report with high-res photos'
      ]
    },
    {
      id: 'VIP Import Audit',
      name: 'VIP Foreign Import & Port Clearance Audit',
      pointsCount: 180,
      price: 15000,
      duration: '120 mins',
      popular: false,
      description: 'Specialized inspection for direct Japanese & UK foreign imports at Mombasa Port or Bonded Warehouses. Includes Japanese auction sheet verification, saltwater rust inspection, and KRA duty document matching.',
      idealFor: 'Buyers purchasing newly arrived foreign-used imports',
      features: [
        'Japanese auction sheet & genuine mileage cross-check',
        'Mombasa Port saltwater corrosion & rust audit',
        'KRA customs entry document & VIN matching',
        'Hybrid/EV battery State of Health (SOH) telemetry',
        '180-point mechanical & electrical inspection',
        'Priority 2-hour digital report delivery',
        'Direct phone consultation with Senior Inspector'
      ]
    },
    {
      id: 'Luxury German Audit',
      name: 'German Luxury & European Vehicle Audit',
      pointsCount: 195,
      price: 16500,
      duration: '120 mins',
      popular: false,
      description: 'Tailored specifically for Mercedes-Benz, BMW, Audi, Porsche, and Land Rover. Includes specialized Bosch OBD-II live stream data, air suspension pressure testing, and timing chain tensioner checks.',
      idealFor: 'Mercedes-Benz, BMW, Audi, Range Rover & Porsche buyers',
      features: [
        'Specialized German diagnostic scanner live stream',
        'Air suspension & hydraulic leak stress test',
        'Double-clutch (DSG/PDK) transmission health check',
        'Turbocharger wastegate & intercooler inspection',
        'Electronic control unit (ECU) flash history audit',
        'Comprehensive 195-point luxury inspection report'
      ]
    },
    {
      id: 'Commercial Fleet Audit',
      name: 'Commercial & Fleet Pickups/Vans Audit',
      pointsCount: 160,
      price: 14000,
      duration: '100 mins',
      popular: false,
      description: 'Rigorous technical evaluation for commercial Toyota Hilux, Isuzu D-Max, Land Cruiser Workmates, and fleet vans operating on rough East African roads.',
      idealFor: 'Business fleets, agriculture pickups, and commercial transport',
      features: [
        'Heavy-duty leaf spring & suspension stress test',
        '4WD transfer case & diff lock engagement check',
        'Diesel fuel injector balance & turbo boost test',
        'Payload capacity & towing hitch integrity audit',
        'NTSA speed governor & commercial compliance check'
      ]
    }
  ];

  // Calculated Pricing for Selected Booking Package
  const currentPackagePrice = useMemo(() => {
    const pkg = inspectionPackages.find(p => p.id === packageType);
    return pkg ? pkg.price : 12000;
  }, [packageType]);

  const platformCommission = Math.round(currentPackagePrice * 0.15); // 15% KAYAD platform fee
  const netMechanicFee = currentPackagePrice - platformCommission; // 85% paid to independent inspector

  // Counties List
  const availableCounties = ['All', 'Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Eldoret', 'Machakos', 'Kajiado', 'Kisumu', 'Kilifi', 'Kwale'];
  const specializationOptions = ['All', 'Toyota 4x4', 'German Luxury', 'Subaru AWD', 'Diesel Turbo Systems', 'Hybrid Diagnostics', 'Commercial Fleet', 'Foreign Import Audit'];

  // Filtered Mechanics List
  const filteredMechanics = useMemo(() => {
    return mechanics.filter(mech => {
      const matchesSearch = searchQuery === '' || 
        mech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mech.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mech.specializations.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCounty = countyFilter === 'All' || mech.counties.includes(countyFilter);

      const matchesSpecialization = specializationFilter === 'All' || 
        mech.specializations.some(s => s.toLowerCase().includes(specializationFilter.toLowerCase()));

      const matchesRating = mech.rating >= minRatingFilter;

      return matchesSearch && matchesCounty && matchesSpecialization && matchesRating;
    });
  }, [mechanics, searchQuery, countyFilter, specializationFilter, minRatingFilter]);

  // Launch Booking Modal for a specific mechanic
  const handleOpenBooking = (mechanic?: Mechanic, vehicle?: Vehicle) => {
    if (mechanic) {
      setChosenMechanicId(mechanic.id);
    }
    if (vehicle) {
      setTargetVehicleId(vehicle.id);
    }
    setBookingStep(1);
    setShowBookingModal(true);
  };

  // Submit New Booking
  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName || !buyerPhone || !buyerEmail) {
      showToast('Please fill in your contact information');
      return;
    }

    const mech = mechanics.find(m => m.id === chosenMechanicId) || mechanics[0];
    const targetVeh = vehicles.find(v => v.id === targetVehicleId);
    const vehicleTitle = targetVeh ? targetVeh.title : (customVehicleTitle || '2021 Vehicle Audit');
    const vehicleLocation = targetVeh ? targetVeh.location : customVehicleLocation;

    const generatedId = `INSP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const newBooking: InspectionBooking = {
      id: generatedId,
      vehicleId: targetVehicleId !== 'custom' ? targetVehicleId : undefined,
      vehicleTitle,
      vehicleLocation,
      buyerName,
      buyerPhone,
      buyerEmail,
      mechanicId: mech.id,
      mechanicName: mech.name,
      scheduledDate,
      scheduledTime,
      packageType,
      totalFee: currentPackagePrice,
      platformCommission,
      netMechanicFee,
      status: 'Scheduled',
      paymentStatus: 'Escrow Held',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setBookings([newBooking, ...bookings]);
    setNewBookingId(generatedId);
    setBookingStep(7); // Jump to Confirmation / Stepper step
    showToast(`Inspection booked with ${mech.name}. Funds held in KAYAD Escrow.`);
  };

  // Upvote helpful review
  const handleToggleHelpful = (ratingId: string) => {
    setVotedItems(prev => {
      const wasVoted = prev[ratingId];
      const newVoted = !wasVoted;
      
      setHelpfulVotes(votes => ({
        ...votes,
        [ratingId]: (votes[ratingId] || 0) + (newVoted ? 1 : -1)
      }));

      return { ...prev, [ratingId]: newVoted };
    });
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 pb-16 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E3063] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Mode Switcher Banner */}
      <div className="bg-[#101935] border-b border-amber-400/30 px-4 py-3 text-xs shadow-md rounded-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-black text-xs uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded border border-white/15">
              KAYAD Inspection Ecosystem
            </span>
            <span className="text-slate-300 text-[11px] hidden md:inline font-semibold">
              Independent Mechanics & Buyer Directory
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode('buyer_marketplace')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'buyer_marketplace'
                  ? 'bg-amber-400 text-[#101935] shadow-sm font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buyer Inspector Directory</span>
            </button>

            <button
              onClick={() => setViewMode('mechanic_portal')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'mechanic_portal'
                  ? 'bg-[#1E3063] text-white border border-amber-400/50 shadow-sm font-black'
                  : 'text-amber-300 hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>Pre-Purchase Inspection Portal</span>
              <span className="text-[9px] bg-emerald-500 text-white font-black px-1.5 py-0.2 rounded-full">
                MECHANIC OS
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Independent Mechanic Portal OS if selected */}
      {viewMode === 'mechanic_portal' ? (
        <PrePurchaseInspectionPortal
          currentMechanic={mechanics[0]}
          onNavigateToMarketplace={() => setViewMode('buyer_marketplace')}
        />
      ) : (
        <>
      {/* Hero Header Banner */}
      <div className="bg-[#1E3063] text-white pt-8 pb-10 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Wrench className="w-3 h-3" /> Independent Inspector Marketplace
                </span>
                <span className="text-[10px] font-semibold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                  East Africa Wide
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white">
                Find Certified Independent Vehicle Inspectors
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Choose from verified independent mechanics across East Africa. Book on-site 150-point pre-purchase audits, diagnostic scanner checks, and foreign import clearance certificates.
              </p>
            </div>

            {/* Quick CTAs */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button 
                variant="accent" 
                size="md"
                onClick={() => handleOpenBooking()}
                className="font-bold shadow-lg"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" /> Book Inspection Now
              </Button>
              <Button 
                variant="outline" 
                size="md"
                onClick={() => setActiveTab('reports')}
                className="text-white border-white/30 hover:bg-white/10"
              >
                <FileCheck className="w-4 h-4 mr-1.5 text-emerald-400" /> View Sample Reports
              </Button>
            </div>
          </div>

          {/* CRITICAL BUSINESS MODEL TRANSPARENCY BANNER */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 font-bold border border-amber-400/30">
                1
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Independent Certified Mechanics</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Inspectors are independent qualified professionals, not KAYAD employees.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 font-bold border border-emerald-400/30">
                2
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Buyer Chooses Inspector</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Compare ratings, specializations, pricing & availability freely before booking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0 font-bold border border-blue-400/30">
                3
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Protected Escrow Payment</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Funds held safely in KAYAD Escrow until the digital report is delivered.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-400/20 text-rose-300 flex items-center justify-center shrink-0 font-bold border border-rose-400/30">
                4
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">15% Transparent Platform Fee</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  KAYAD facilitates transactions & earns 15% commission per completed audit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="sticky top-14 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none text-xs font-bold">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'marketplace'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Find Inspector</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                {filteredMechanics.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('packages')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'packages'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4 text-emerald-500" />
              <span>Inspection Packages</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileCheck className="w-4 h-4 text-blue-500" />
              <span>Digital Reports</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                150-Point
              </span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Bookings Tracker</span>
              {bookings.filter(b => b.status !== 'Completed').length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                  {bookings.filter(b => b.status !== 'Completed').length} Active
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Verified Reviews</span>
            </button>

            <button
              onClick={() => setActiveTab('coverage')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'coverage'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>Regional Map & Coverage</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* TAB 1: MECHANIC MARKETPLACE HOMEPAGE */}
        {activeTab === 'marketplace' && (
          <div className="space-y-8 animate-fade-in">
            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Input
                    placeholder="Search mechanic name, diagnostic lab, Toyota 4x4, German luxury..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search className="w-4 h-4 text-slate-400" />}
                    className="w-full"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* County Selector */}
                <div className="w-full sm:w-48">
                  <select
                    value={countyFilter}
                    onChange={(e) => setCountyFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#1E3063] focus:outline-none"
                  >
                    <option value="All">All Regions / Counties</option>
                    {availableCounties.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Specialization Selector */}
                <div className="w-full sm:w-56">
                  <select
                    value={specializationFilter}
                    onChange={(e) => setSpecializationFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#1E3063] focus:outline-none"
                  >
                    <option value="All">All Specializations</option>
                    {specializationOptions.filter(s => s !== 'All').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Minimum Rating Selector */}
                <div className="w-full sm:w-40">
                  <select
                    value={minRatingFilter}
                    onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#1E3063] focus:outline-none"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={4.5}>4.5 ★ & Above</option>
                    <option value={4.8}>4.8 ★ & Above</option>
                    <option value={4.9}>4.9 ★ Top Rated</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Summary */}
              {(searchQuery || countyFilter !== 'All' || specializationFilter !== 'All' || minRatingFilter > 0) && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-400">Filters applied:</span>
                    {searchQuery && (
                      <Badge variant="neutral">Query: "{searchQuery}"</Badge>
                    )}
                    {countyFilter !== 'All' && (
                      <Badge variant="verified">County: {countyFilter}</Badge>
                    )}
                    {specializationFilter !== 'All' && (
                      <Badge variant="neutral">Spec: {specializationFilter}</Badge>
                    )}
                    {minRatingFilter > 0 && (
                      <Badge variant="accent">Min {minRatingFilter} ★</Badge>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCountyFilter('All');
                      setSpecializationFilter('All');
                      setMinRatingFilter(0);
                    }}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Recently Completed Inspections Live Ticker / Highlights */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-[#1E3063] font-display">Recently Completed Platform Inspections</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">Live Updates</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reports.slice(0, 3).map((rep) => (
                  <div 
                    key={rep.id} 
                    onClick={() => setSelectedReport(rep)}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#1E3063]/40 cursor-pointer transition-all space-y-2 hover:shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{rep.id}</span>
                      <Badge variant={rep.verdict.includes('Passed') ? 'success' : 'warning'}>
                        {rep.verdict}
                      </Badge>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 truncate">{rep.vehicleTitle}</h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span className="truncate">Inspector: <strong className="text-slate-700">{rep.mechanicName}</strong></span>
                      <span className="font-black text-[#1E3063] font-mono">{rep.overallScore}/100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Independent Mechanic Cards Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#1E3063] font-display">
                    Certified Independent Inspectors ({filteredMechanics.length})
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Select an inspector to view complete credentials or book a 150-point pre-purchase audit.
                  </p>
                </div>
              </div>

              {filteredMechanics.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                  <Wrench className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-700">No independent inspectors match your filters</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Try broadening your county or specialization filter settings to explore certified mechanics nearby.
                  </p>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setCountyFilter('All');
                      setSpecializationFilter('All');
                      setMinRatingFilter(0);
                    }}
                  >
                    Reset Search Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {filteredMechanics.map((mech) => (
                    <Card key={mech.id} hoverable className="flex flex-col justify-between border-slate-200/80">
                      <div className="p-5 space-y-4">
                        {/* Card Header: Avatar, Name, Badge, Rating */}
                        <div className="flex items-start gap-4">
                          <LazyImage
                            src={mech.avatar}
                            alt={mech.name}
                            wrapperClassName="w-16 h-16 rounded-2xl shrink-0 border border-slate-200"
                            className="w-full h-full object-cover"
                          />

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Independent Inspector
                              </span>
                              {mech.verified && (
                                <Badge variant="verified" size="sm">NTSA Verified</Badge>
                              )}
                            </div>

                            <h3 className="text-base font-bold text-[#1E3063] font-display truncate">
                              {mech.name}
                            </h3>

                            <p className="text-xs text-slate-500 font-semibold truncate">
                              {mech.companyName}
                            </p>

                            <div className="flex items-center gap-3 text-xs pt-1">
                              <div className="flex items-center gap-1 font-bold text-slate-800">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>{mech.rating.toFixed(2)}</span>
                                <span className="text-slate-400 text-[11px]">({mech.reviewsCount} reviews)</span>
                              </div>

                              <span className="text-slate-300">•</span>

                              <span className="text-slate-600 font-medium">
                                <strong>{mech.inspectionsCompleted}</strong> Audits
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Location & Experience */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate">{mech.counties.slice(0, 2).join(', ')}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{mech.yearsExperience} Years Exp.</span>
                          </div>
                        </div>

                        {/* Specializations Badges */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Specializations:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {mech.specializations.map((spec, i) => (
                              <span key={i} className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200/60">
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Bio snippet */}
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {mech.bio}
                        </p>
                      </div>

                      {/* Card Footer: Price & Actions */}
                      <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Inspection Fee:</span>
                          <span className="text-sm font-extrabold text-[#1E3063] font-mono">
                            From Ksh {mech.baseFee.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => setSelectedMechanic(mech)}
                          >
                            <User className="w-3.5 h-3.5 mr-1 text-slate-600" /> View Profile
                          </Button>

                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleOpenBooking(mech)}
                          >
                            <Calendar className="w-3.5 h-3.5 mr-1" /> Book Inspector
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Standard Inspection Packages Section */}
            <div className="space-y-4 pt-6">
              <div>
                <h2 className="text-xl font-bold text-[#1E3063] font-display">Popular Inspection Packages</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Standardized technical evaluation packages available across all certified independent inspectors.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {inspectionPackages.slice(0, 3).map((pkg) => (
                  <Card key={pkg.id} className={`flex flex-col justify-between ${pkg.popular ? 'border-2 border-[#1E3063] shadow-lg' : ''}`}>
                    <div className="p-5 space-y-4">
                      {pkg.popular && (
                        <span className="bg-[#1E3063] text-amber-300 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full w-max flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Most Popular Choice
                        </span>
                      )}

                      <div>
                        <h3 className="text-base font-extrabold text-[#1E3063] font-display">{pkg.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">{pkg.description}</p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fixed Price:</span>
                          <span className="text-xl font-black text-[#1E3063] font-mono">Ksh {pkg.price.toLocaleString()}</span>
                        </div>
                        <Badge variant="verified">{pkg.pointsCount}-Point Audit</Badge>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Includes:</span>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                          {pkg.features.map((feat, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <Button 
                        variant={pkg.popular ? 'primary' : 'secondary'} 
                        fullWidth
                        onClick={() => {
                          setPackageType(pkg.id as any);
                          handleOpenBooking();
                        }}
                      >
                        Select {pkg.pointsCount}-Point Package
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INSPECTION PACKAGES */}
        {activeTab === 'packages' && (
          <div className="space-y-6 animate-fade-in">
            <PageHeader
              badgeIcon={<Award className="w-4 h-4 text-emerald-600" />}
              badgeText="Standardized Technical Audits"
              title="KAYAD Inspection Packages & Transparent Pricing"
              description="Every independent mechanic on KAYAD adheres to standardized point-by-point diagnostic protocols. Select the package that matches your vehicle category."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inspectionPackages.map((pkg) => (
                <Card key={pkg.id} className="flex flex-col justify-between hover:shadow-card-hover transition-all">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                        {pkg.duration} On-Site
                      </span>
                      {pkg.popular && (
                        <Badge variant="verified">Top Buyer Choice</Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-[#1E3063] font-display">{pkg.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pkg.description}</p>
                    </div>

                    <div className="bg-[#FDFBF7] p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Package Fee:</span>
                        <span className="text-2xl font-black text-[#1E3063] font-mono">Ksh {pkg.price.toLocaleString()}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {pkg.pointsCount} Checkpoints
                      </span>
                    </div>

                    <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 font-medium">
                      <strong>Best suited for:</strong> {pkg.idealFor}
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Key Diagnostic Features:</span>
                      <ul className="space-y-2 text-xs text-slate-600">
                        {pkg.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => {
                        setPackageType(pkg.id as any);
                        handleOpenBooking();
                      }}
                    >
                      Book {pkg.name}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: DIGITAL REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fade-in">
            <PageHeader
              badgeIcon={<FileCheck className="w-4 h-4 text-emerald-600" />}
              badgeText="150-Point Digital Certificates"
              title="Verified Inspection Reports"
              description="Explore real digital inspection reports recently issued by independent mechanics on KAYAD. Click any report to examine itemized 150-point diagnostics, paint micron measurements, and OBD trouble codes."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((rep) => (
                <Card key={rep.id} hoverable className="flex flex-col justify-between">
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#1E3063] bg-slate-100 px-2.5 py-1 rounded-md">
                        {rep.id}
                      </span>
                      <Badge variant={rep.verdict.includes('Passed') ? 'success' : 'warning'}>
                        {rep.verdict}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-800 line-clamp-1">{rep.vehicleTitle}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-rose-500" /> {rep.vehicleLocation}
                      </p>
                    </div>

                    <div className="bg-[#1E3063] text-white p-4 rounded-xl flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Health Score</span>
                        <span className="text-2xl font-black font-mono text-amber-300">{rep.overallScore}/100</span>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[10px] text-slate-300 block">VIN & Logbook</span>
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Matched
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Inspector:</span>
                        <strong className="text-slate-800">{rep.mechanicName}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Inspection Date:</span>
                        <span className="font-semibold">{rep.inspectionDate}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic line-clamp-3">
                      "{rep.inspectorSummary}"
                    </p>
                  </div>

                  <div className="p-5 pt-0">
                    <Button 
                      variant="primary" 
                      fullWidth
                      onClick={() => setSelectedReport(rep)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> View Full 150-Point Report
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BOOKINGS TRACKER */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-fade-in">
            <PageHeader
              badgeIcon={<Clock className="w-4 h-4 text-amber-500" />}
              badgeText="Real-Time Tracker"
              title="Inspection Bookings & Escrow Status"
              description="Track scheduled and completed vehicle inspections. Funds remain securely locked in KAYAD Escrow until you approve the inspector's digital report."
            />

            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#1E3063]" /> Active & Completed Inspection Bookings ({bookings.length})
                </CardTitle>

                <Button variant="accent" size="sm" onClick={() => handleOpenBooking()}>
                  <PlusCircle className="w-4 h-4 mr-1" /> New Inspection Request
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Vehicle & Location</TableHead>
                      <TableHead>Independent Inspector</TableHead>
                      <TableHead>Schedule & Package</TableHead>
                      <TableHead>Escrow & Fee</TableHead>
                      <TableHead>Progress Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono font-bold text-[#1E3063]">
                          {b.id}
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-slate-800 text-xs">{b.vehicleTitle}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-rose-500" /> {b.vehicleLocation}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-slate-800 text-xs">{b.mechanicName}</div>
                          <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Independent Inspector
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs font-medium text-slate-700">{b.scheduledDate} ({b.scheduledTime})</div>
                          <div className="text-[10px] text-slate-500 font-bold">{b.packageType}</div>
                        </TableCell>

                        <TableCell>
                          <div className="font-mono font-extrabold text-[#1E3063] text-xs">
                            Ksh {b.totalFee.toLocaleString()}
                          </div>
                          <Badge variant={b.paymentStatus === 'Released to Mechanic' ? 'success' : 'escrow'}>
                            {b.paymentStatus}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant={b.status === 'Completed' ? 'success' : 'verified'}>
                            {b.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          {b.reportId ? (
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => {
                                const rep = reports.find(r => r.id === b.reportId);
                                if (rep) setSelectedReport(rep);
                                else showToast('Report file loading...');
                              }}
                            >
                              <FileCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> View Report
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium italic">
                              Inspector En-Route
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 5: VERIFIED REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 animate-fade-in">
            <PageHeader
              badgeIcon={<Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
              badgeText="Marketplace Feedback"
              title="Verified Buyer Reviews"
              description="Read genuine reviews from vehicle buyers who booked independent mechanics on KAYAD. Every review is linked to a completed inspection booking."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ratings.map((rate) => {
                const mech = mechanics.find(m => m.id === rate.mechanicId);
                const voteCount = (helpfulVotes[rate.id] || 0) + 12; // base count + votes
                const isVoted = votedItems[rate.id];

                return (
                  <Card key={rate.id} className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1E3063] text-amber-300 font-bold flex items-center justify-center text-sm">
                          {rate.buyerName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{rate.buyerName}</h4>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 w-max mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Escrow Buyer
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{rate.rating}.0</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      "{rate.comment}"
                    </p>

                    <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 text-slate-500">
                      <span>Inspector: <strong className="text-slate-800">{mech?.name || 'Independent Inspector'}</strong></span>

                      <button
                        onClick={() => handleToggleHelpful(rate.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-[11px] font-bold ${
                          isVoted 
                            ? 'bg-[#1E3063] text-white border-[#1E3063]' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <ThumbsUp className={`w-3 h-3 ${isVoted ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span>Helpful ({voteCount})</span>
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: REGIONAL COVERAGE MAP */}
        {activeTab === 'coverage' && (
          <div className="space-y-6 animate-fade-in">
            <PageHeader
              badgeIcon={<MapPin className="w-4 h-4 text-rose-500" />}
              badgeText="Regional Distribution"
              title="Mechanic Marketplace Regional Coverage"
              description="Independent certified inspectors on KAYAD cover major automotive hubs and ports across Kenya and East Africa."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coverage Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'Nairobi Metro', count: '14 Independent Inspectors', radius: '50 km radius', hubs: 'Westlands, Karen, Thika Road, Industrial Area' },
                  { name: 'Mombasa Coastal Region', count: '8 Port Inspectors', radius: '75 km radius', hubs: 'Mombasa Port Yard, Nyali, Kilifi, Kwale' },
                  { name: 'Nakuru & Central Rift', count: '6 Certified Inspectors', radius: '60 km radius', hubs: 'Nakuru City, Naivasha, Gilgil' },
                  { name: 'Eldoret & North Rift', count: '5 Fleet Specialists', radius: '80 km radius', hubs: 'Eldoret, Kitale, Uasin Gishu' },
                  { name: 'Kiambu & Mt. Kenya', count: '7 Mobile Inspectors', radius: '45 km radius', hubs: 'Ruiru, Thika, Kiambu Town' },
                  { name: 'Kisumu & Western Region', count: '4 Vehicle Auditors', radius: '70 km radius', hubs: 'Kisumu Port, Kakamega, Bungoma' }
                ].map((region, i) => (
                  <Card key={i} className="p-5 space-y-3 border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <h4 className="text-sm font-bold text-[#1E3063] font-display">{region.name}</h4>
                      </div>
                      <Badge variant="verified">{region.radius}</Badge>
                    </div>

                    <p className="text-xs font-bold text-emerald-700">{region.count}</p>
                    <p className="text-xs text-slate-500"><strong>Key Hubs:</strong> {region.hubs}</p>

                    <Button 
                      variant="secondary" 
                      size="sm"
                      fullWidth
                      onClick={() => {
                        setCountyFilter(region.name.split(' ')[0]);
                        setActiveTab('marketplace');
                      }}
                    >
                      Filter Inspectors in {region.name.split(' ')[0]}
                    </Button>
                  </Card>
                ))}
              </div>

              {/* On-Site Travel Policy Card */}
              <Card className="p-6 bg-[#1E3063] text-white space-y-4">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <Navigation className="w-4 h-4" /> Mobile Inspector Policy
                </div>

                <h3 className="text-lg font-bold font-display">Where do inspections happen?</h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Independent mechanics on KAYAD are 100% mobile equipped. They travel directly to:
                </p>

                <ul className="space-y-2 text-xs text-slate-200">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Dealer Showrooms & Used Car Lots:</strong> On-site audit prior to payment.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Private Seller Residences:</strong> Convenient meeting at seller’s estate or workplace.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Mombasa Port & CFS Yards:</strong> Direct import clearance before duty release.</span>
                  </li>
                </ul>

                <Button 
                  variant="accent"
                  fullWidth
                  onClick={() => handleOpenBooking()}
                  className="font-bold shadow-md mt-2"
                >
                  Book On-Site Inspection
                </Button>
              </Card>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================== */}
      {/* MODAL 1: MECHANIC PROFILE MODAL */}
      {/* ========================================================================== */}
      {selectedMechanic && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedMechanic(null)}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Header: Avatar, Name, Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <LazyImage
                  src={selectedMechanic.avatar}
                  alt={selectedMechanic.name}
                  wrapperClassName="w-20 h-20 rounded-2xl shrink-0 border-2 border-[#1E3063]"
                  className="w-full h-full object-cover"
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                      Independent Inspector
                    </span>
                    <Badge variant="verified">NTSA Class A</Badge>
                  </div>

                  <h2 className="text-xl font-extrabold text-[#1E3063] font-display">{selectedMechanic.name}</h2>
                  <p className="text-xs text-slate-600 font-semibold">{selectedMechanic.companyName} • {selectedMechanic.title}</p>
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="flex items-center gap-1 text-sm font-bold text-slate-800 justify-end">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{selectedMechanic.rating.toFixed(2)}</span>
                  <span className="text-slate-400 text-xs font-normal">({selectedMechanic.reviewsCount} reviews)</span>
                </div>
                <div className="text-xs font-mono font-black text-[#1E3063]">
                  From Ksh {selectedMechanic.baseFee.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Bio & Certifications */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#1E3063] uppercase tracking-wider">Inspector Bio & Background</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    {selectedMechanic.bio}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#1E3063] uppercase tracking-wider">Certifications & Licenses</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMechanic.certifications.map((cert, i) => (
                      <span key={i} className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-600" /> {cert}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#1E3063] uppercase tracking-wider">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMechanic.specializations.map((spec, i) => (
                      <span key={i} className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-xl border border-slate-200">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-[#1E3063] uppercase tracking-wider">Coverage & Details</h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Counties Covered:</span>
                    <span className="font-semibold text-slate-800">{selectedMechanic.counties.join(', ')}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Experience:</span>
                    <span className="font-semibold text-slate-800">{selectedMechanic.yearsExperience} Years Technical Auditing</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inspections Completed:</span>
                    <span className="font-semibold text-slate-800">{selectedMechanic.inspectionsCompleted} Audits</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Days:</span>
                    <span className="font-semibold text-slate-800">{selectedMechanic.availableDays.join(', ')}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    const mech = selectedMechanic;
                    setSelectedMechanic(null);
                    handleOpenBooking(mech);
                  }}
                  className="font-bold shadow-md"
                >
                  Book Inspection with {selectedMechanic.name.split(' ')[0]}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================== */}
      {/* MODAL 2: 150-POINT DIGITAL REPORT VIEWER MODAL */}
      {/* ========================================================================== */}
      {selectedReport && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReport(null)}
          maxWidth="5xl"
          title={
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <span>Official KAYAD 150-Point Inspection Certificate ({selectedReport.id})</span>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Header: Vehicle & Verdict */}
            <div className="bg-[#1E3063] text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  Inspection ID: {selectedReport.id} • {selectedReport.inspectionDate}
                </span>
                <h2 className="text-2xl font-extrabold font-display text-white mt-1">
                  {selectedReport.vehicleTitle}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Inspected by Independent Inspector: <strong>{selectedReport.mechanicName}</strong> ({selectedReport.mechanicCompany})
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl border border-white/20">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Overall Score</span>
                  <span className="text-3xl font-black font-mono text-amber-300">{selectedReport.overallScore}/100</span>
                </div>

                <div className="border-l border-white/20 pl-4 text-right">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Verdict</span>
                  <Badge variant={selectedReport.verdict.includes('Passed') ? 'success' : 'warning'}>
                    {selectedReport.verdict}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Legal VIN & Logbook Verification Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>VIN Number Verified & Clean</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Chassis Stamped Rail Matched</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>NTSA Logbook Owner Matched</span>
              </div>
            </div>

            {/* Itemized 150-Point Category Scores */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#1E3063] font-display uppercase tracking-wider">
                Detailed 150-Point Technical Category Breakdown
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.entries(selectedReport.categoryScores) as [string, InspectionCategoryDetail][]).map(([catKey, catDetail]) => {
                  const titles: Record<string, string> = {
                    engineAndDrivetrain: 'Engine & Drivetrain Compression',
                    transmissionAndClutch: 'Transmission & Gear shifting',
                    suspensionAndSteering: 'Suspension, Shocks & Steering',
                    brakesAndTires: 'Brakes & Tire Tread Depth',
                    electricalAndDiagnostics: 'Electrical & OBD-II ECU Telemetry',
                    bodyworkAndChassisFrame: 'Paint Micron & Frame Alignment',
                    interiorAndHVAC: 'Interior, Climate & Safety Airbags'
                  };

                  return (
                    <div key={catKey} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1E3063]">{titles[catKey] || catKey}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-700">{catDetail.score}%</span>
                          <Badge variant={catDetail.status === 'Pass' ? 'success' : 'warning'}>
                            {catDetail.status}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {catDetail.notes}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inspector Summary */}
            <div className="space-y-2 bg-[#FDFBF7] p-5 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-[#1E3063] uppercase tracking-wider">Inspector Final Summary</h4>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                "{selectedReport.inspectorSummary}"
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                Official digital report generated by KAYAD Independent Inspector Network.
              </span>

              <div className="flex items-center gap-3">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => showToast('PDF Report download started')}
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download PDF Certificate
                </Button>

                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => {
                    setSelectedReport(null);
                    showToast('Direct Escrow purchase initiated for this vehicle');
                  }}
                >
                  Proceed to Escrow Purchase
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================== */}
      {/* MODAL 3: 7-STEP GUIDED BOOKING JOURNEY MODAL */}
      {/* ========================================================================== */}
      {showBookingModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowBookingModal(false)}
          maxWidth="3xl"
          title={
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-500" />
              <span>Book Independent Vehicle Inspection</span>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Stepper Progress Indicator */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-bold">
              {[
                { step: 1, label: 'Inspector' },
                { step: 2, label: 'Vehicle' },
                { step: 3, label: 'Package' },
                { step: 4, label: 'Schedule' },
                { step: 5, label: 'Details' },
                { step: 6, label: 'Escrow' },
                { step: 7, label: 'Confirmed' }
              ].map((s) => (
                <div 
                  key={s.step} 
                  className={`flex items-center gap-1.5 ${
                    bookingStep === s.step 
                      ? 'text-[#1E3063] font-extrabold' 
                      : bookingStep > s.step 
                        ? 'text-emerald-700' 
                        : 'text-slate-400'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    bookingStep === s.step 
                      ? 'bg-[#1E3063] text-white' 
                      : bookingStep > s.step 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-200 text-slate-600'
                  }`}>
                    {bookingStep > s.step ? '✓' : s.step}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              ))}
            </div>

            {/* STEP 1: CHOOSE MECHANIC */}
            {bookingStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#1E3063] font-display">Step 1: Choose Your Preferred Independent Inspector</h3>
                <p className="text-xs text-slate-500">
                  Select an inspector based on location, specializations, and reviews. KAYAD facilitates the booking.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {mechanics.map((mech) => (
                    <div
                      key={mech.id}
                      onClick={() => setChosenMechanicId(mech.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                        chosenMechanicId === mech.id
                          ? 'border-2 border-[#1E3063] bg-amber-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <LazyImage
                          src={mech.avatar}
                          alt={mech.name}
                          wrapperClassName="w-12 h-12 rounded-xl shrink-0 border border-slate-200"
                          className="w-full h-full object-cover"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{mech.name}</h4>
                          <p className="text-[11px] text-slate-500 truncate">{mech.companyName}</p>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 mt-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{mech.rating.toFixed(2)}</span>
                            <span className="text-slate-400">({mech.reviewsCount})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <Button variant="primary" onClick={() => setBookingStep(2)}>
                    Next: Select Vehicle →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT VEHICLE */}
            {bookingStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#1E3063] font-display">Step 2: Select Vehicle to Inspect</h3>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 block">KAYAD Marketplace Vehicles:</label>
                  <select
                    value={targetVehicleId}
                    onChange={(e) => setTargetVehicleId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1E3063]"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title} — Ksh {v.price.toLocaleString()} ({v.location})
                      </option>
                    ))}
                    <option value="custom">+ Other Vehicle (Custom Entrance)</option>
                  </select>
                </div>

                {targetVehicleId === 'custom' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <Input
                      label="Custom Vehicle Make, Model & Year"
                      placeholder="e.g. 2020 Toyota Land Cruiser Prado"
                      value={customVehicleTitle}
                      onChange={(e) => setCustomVehicleTitle(e.target.value)}
                    />
                    <Input
                      label="Vehicle Inspection Address / Location"
                      placeholder="e.g. Westlands, Nairobi or Mombasa Port CFS"
                      value={customVehicleLocation}
                      onChange={(e) => setCustomVehicleLocation(e.target.value)}
                    />
                    <Input
                      label="VIN / Chassis Number (Optional)"
                      placeholder="e.g. JTEEE05J..."
                      value={customVehicleVin}
                      onChange={(e) => setCustomVehicleVin(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button variant="secondary" onClick={() => setBookingStep(1)}>
                    ← Back
                  </Button>
                  <Button variant="primary" onClick={() => setBookingStep(3)}>
                    Next: Choose Package →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: CHOOSE PACKAGE */}
            {bookingStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#1E3063] font-display">Step 3: Select Technical Inspection Package</h3>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {inspectionPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => setPackageType(pkg.id as any)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all space-y-1 ${
                        packageType === pkg.id
                          ? 'border-2 border-[#1E3063] bg-amber-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#1E3063]">{pkg.name}</h4>
                        <span className="text-sm font-black font-mono text-[#1E3063]">
                          Ksh {pkg.price.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{pkg.description}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button variant="secondary" onClick={() => setBookingStep(2)}>
                    ← Back
                  </Button>
                  <Button variant="primary" onClick={() => setBookingStep(4)}>
                    Next: Schedule Date →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: SCHEDULE DATE & TIME */}
            {bookingStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#1E3063] font-display">Step 4: Choose Inspection Date & Time</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Preferred Date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Time Slot</label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1E3063]"
                    >
                      <option value="09:00 AM">Morning Slot (09:00 AM)</option>
                      <option value="11:00 AM">Late Morning Slot (11:00 AM)</option>
                      <option value="02:00 PM">Afternoon Slot (02:00 PM)</option>
                      <option value="04:00 PM">Late Afternoon Slot (04:00 PM)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button variant="secondary" onClick={() => setBookingStep(3)}>
                    ← Back
                  </Button>
                  <Button variant="primary" onClick={() => setBookingStep(5)}>
                    Next: Your Contact Details →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5: CONTACT DETAILS */}
            {bookingStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#1E3063] font-display">Step 5: Your Contact Details</h3>

                <div className="space-y-3">
                  <Input
                    label="Full Buyer Name"
                    placeholder="e.g. James Mwangi"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                  />
                  <Input
                    label="Phone Number (M-Pesa registered)"
                    placeholder="e.g. +254 712 345 678"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                  />
                  <Input
                    label="Email Address (For PDF Report Delivery)"
                    placeholder="e.g. james@example.com"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                  />
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button variant="secondary" onClick={() => setBookingStep(4)}>
                    ← Back
                  </Button>
                  <Button variant="primary" onClick={() => setBookingStep(6)}>
                    Next: Platform Escrow & Payment →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 6: PAYMENT & ESCROW */}
            {bookingStep === 6 && (
              <form onSubmit={handleConfirmBooking} className="space-y-4">
                <h3 className="text-base font-bold text-[#1E3063] font-display">Step 6: Protected Escrow Payment</h3>

                {/* Transparent Price Breakdown */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Inspection Package ({packageType}):</span>
                    <strong className="text-slate-800">Ksh {currentPackagePrice.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Facilitation Commission (15%):</span>
                    <strong className="text-emerald-700">Ksh {platformCommission.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Net Independent Inspector Payout (85%):</span>
                    <strong className="text-slate-800">Ksh {netMechanicFee.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-[#1E3063]">
                    <span>Total Held in Platform Escrow Vault:</span>
                    <span className="font-mono text-amber-600">Ksh {currentPackagePrice.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Your payment will be held safely in KAYAD Escrow. Funds are only released to the mechanic after the digital inspection report is delivered.
                  </span>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button variant="secondary" type="button" onClick={() => setBookingStep(5)}>
                    ← Back
                  </Button>
                  <Button variant="accent" type="submit" className="font-bold shadow-md">
                    Confirm & Deposit to Escrow Vault
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 7: CONFIRMATION & LIVE STEPPER */}
            {bookingStep === 7 && (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-[#1E3063] font-display">Inspection Request Confirmed!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Booking Reference: <strong className="font-mono text-slate-800">{newBookingId || 'INSP-2026-9005'}</strong>
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scheduled Date:</span>
                    <strong className="text-slate-800">{scheduledDate} ({scheduledTime})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Escrow Vault Deposit:</span>
                    <strong className="text-emerald-700">Ksh {currentPackagePrice.toLocaleString()} Held</strong>
                  </div>
                </div>

                <Button 
                  variant="primary"
                  onClick={() => {
                    setShowBookingModal(false);
                    setActiveTab('bookings');
                  }}
                >
                  Track Progress in Bookings Tracker →
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
        </>
      )}
    </div>
  );
};

export default InspectionsView;
