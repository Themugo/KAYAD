import React, { useState } from 'react';
import { Mechanic, InspectionBooking, InspectionReport, InspectionPayment, InspectionRating } from '../../../types';

import { ShieldCheck, Calendar as CalendarIcon, Clock, FileText, DollarSign, Star, Users, MapPin, Tag, Building2, BarChart3, CheckCircle2, X, Camera, Video, Download, Upload, Edit3, Eye, Search, Phone, Lock, Check, Printer, Sparkles, Award, TrendingUp, FileCheck, Zap, CheckSquare } from 'lucide-react';
import { StatWidget, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Modal } from '../../../components/ui';

export type PortalModuleTab = 
  | 'dashboard' 
  | 'bookings' 
  | 'calendar' 
  | 'reports' 
  | 'payments' 
  | 'reviews' 
  | 'customers' 
  | 'availability' 
  | 'service_areas' 
  | 'pricing' 
  | 'business_profile' 
  | 'analytics';

interface PrePurchaseInspectionPortalProps {
  currentMechanic?: Mechanic;
  onNavigateToMarketplace?: () => void;
}

// 150-Point Category Definition Structure for Report Builder
interface ChecklistCategory {
  id: string;
  name: string;
  items: string[];
}

const CHECKLIST_150_CATEGORIES: ChecklistCategory[] = [
  {
    id: 'engine_mechanical',
    name: '1. Engine & Mechanical Integrity (25 Points)',
    items: [
      'Cylinder compression test', 'Engine oil level & contamination scan', 'Coolant condition & pressure test',
      'Timing belt / chain tensioner inspection', 'Valve cover gasket leak audit', 'Radiator core & hose integrity',
      'Water pump & thermostat operation', 'Turbocharger boost & wastegate actuation', 'Fuel injector balance & rail pressure',
      'Exhaust manifold & catalytic converter integrity', 'Air filter & intake ducting', 'Engine mount bushing wear',
      'Head gasket blow-by check', 'Drive belt condition & pulleys', 'Oil pan gasket leak check',
      'Spark plug / glow plug condition', 'PCD valve operation', 'Alternator voltage output under load',
      'Starter motor crank speed', 'Power steering pump fluid leak', 'EGR valve carbon buildup',
      'Engine bay wiring harness condition', 'Hood latch & safety catch', 'Engine noise / knock analysis',
      'Emissions smoke color audit'
    ]
  },
  {
    id: 'transmission_drivetrain',
    name: '2. Transmission & Drivetrain (20 Points)',
    items: [
      'Automatic / Manual fluid level & clarity', 'Torque converter stall test', 'Clutch engagement & slip audit',
      'Shift smoothness (P-R-N-D-M)', 'Transfer case 4WD High/Low engagement', 'Front & rear differential gear backlash',
      'CV joint boots & axle shaft play', 'Propeller shaft universal joints', 'Differential fluid leak check',
      'Transmission cooler line integrity', 'TCD / Center diff lock engagement', 'Driveshaft center bearing condition',
      'Flywheel gear teeth condition', 'Transmission mount bushings', 'Selector cable alignment',
      'Electronic shifter module scan', 'DSG / CVT clutch calibration', 'Wheel hub bearing play & noise',
      'Subframe mounting bolts', 'AWD torque vectoring system check'
    ]
  },
  {
    id: 'steering_suspension',
    name: '3. Steering & Suspension (20 Points)',
    items: [
      'Front shock absorber dampening & leaks', 'Rear shock absorber condition', 'Coil spring / leaf spring crack check',
      'Front upper & lower ball joints', 'Tie rod ends & rack inner joints', 'Sway bar links & D-bushings',
      'Control arm bushings (front & rear)', 'Power steering rack leak check', 'Air suspension bellows pressure hold',
      'Air compressor pump cycle test', 'Electronic damper control (EDC) scan', 'Wheel alignment visual & scuff test',
      'Steering column shaft coupling play', 'Panhard rod & trailing arm bushings', 'Subframe rubber mounts',
      'Stabilizer bar alignment', 'Strut mount top bearings', 'Ride height sensor calibration',
      'Suspension travel bump stops', 'Power steering reservoir fluid condition'
    ]
  },
  {
    id: 'brakes_wheels',
    name: '4. Brakes, Tires & Wheels (20 Points)',
    items: [
      'Front brake pad thickness (mm)', 'Rear brake pad / shoe thickness (mm)', 'Front brake rotor disc lip & warp',
      'Rear brake rotor disc condition', 'Brake caliper piston leakage & slide pins', 'Brake master cylinder & booster hold',
      'ABS pump & hydraulic unit scan', 'Brake fluid moisture content %', 'Parking brake cable & hold test',
      'Front tire tread depth (mm)', 'Rear tire tread depth (mm)', 'Spare tire condition & pressure',
      'Tire manufacturing date codes (DOT)', 'Uneven tread wear analysis', 'Alloy wheel crack & rim bend inspection',
      'Wheel lug nut torque security', 'TPMS sensor signal scan', 'Brake line flex hose cracking',
      'Proportioning valve operation', 'Emergency brake shoe adjustment'
    ]
  },
  {
    id: 'electrical_obd',
    name: '5. Electrical System & ECU OBD-II Scan (25 Points)',
    items: [
      'Battery State of Health (SOH) & CCA test', 'Battery terminal corrosion & charging voltage', 'Starter relay & ignition switch',
      'ECU multi-module fault code deep scan', 'Clear code history & freeze frame analysis', 'Live sensor stream (MAF, MAP, O2)',
      'Instrument cluster warning lights check', 'Headlights (High/Low LED/Xenon alignment)', 'Tail lights & brake light illumination',
      'Turn signal indicators & hazard lights', 'Interior cabin lighting & door switches', 'Power windows motor & regulator test',
      'Central locking & key fob keyless access', 'Infotainment display & touchscreen test', 'Audio system speakers & amplifier',
      'Reverse camera & 360 camera feed', 'Parking radar sensor operation', 'Windshield wiper motor & washer fluid',
      'Horn sound clarity', '12V accessory sockets & USB ports', 'Side mirror power fold & heat test',
      'Sunroof / Panoramic glass motor mechanism', 'Airbag (SRS) system status scan', 'Pre-tensioner seatbelt electrical check',
      'GPS navigation / Telemetry module'
    ]
  },
  {
    id: 'body_chassis',
    name: '6. Bodywork, Frame & Paint Micron Test (20 Points)',
    items: [
      'Paint thickness micron gauge test (Bonnet)', 'Paint thickness test (Roof)', 'Paint thickness test (Doors & Quarter panels)',
      'Front chassis rail straightness audit', 'Rear chassis rail alignment', 'A, B, C pillar structural integrity',
      'Previous collision repair / body filler scan', 'Panel gap symmetry (Doors/Hood/Trunk)', 'Front bumper rebar & crumple zone',
      'Rear bumper reinforcement', 'Undercarriage rust & salt corrosion scan', 'Windshield glass stone chips & cracks',
      'Side door glass codes match (OEM stamp)', 'Door hinges & door check straps', 'Trunk / tailgate hydraulic struts',
      'Fuel filler door & cap seal', 'Weatherstrip rubber seals condition', 'Underbody skid plate integrity',
      'Tow hitch mounting points', 'Subframe alignment verification'
    ]
  },
  {
    id: 'interior_hvac',
    name: '7. Interior Cabin, Seats & HVAC Climate (10 Points)',
    items: [
      'A/C compressor clutch engagement', 'A/C vent temperature output (°C)', 'Heater core warmth output',
      'Blower fan motor speed levels', 'Cabin air filter cleanliness', 'Dashboard leather / plastic condition',
      'Seat upholstery tears / wear', 'Driver seat electric motor controls', 'Seatbelt latch locking & retraction',
      'Odor inspection (Smoke / Flood damage)'
    ]
  },
  {
    id: 'road_test',
    name: '8. High-Speed Road Test & Performance (10 Points)',
    items: [
      'Engine idle stability & cold start', 'Acceleration response (0-80 km/h)', 'Emergency braking stability & tracking',
      'Steering wheel center alignment while driving', 'Suspension noise over road humps', 'Transmission downshift kickdown',
      'High-speed wind noise & cabin insulation', 'Driveshaft vibration at 60-100 km/h', 'Cruise control speed hold test',
      'NTSA TIMS Logbook VIN match on chassis stamp'
    ]
  }
];

const EMPTY_INSPECTION_PROVIDER: Mechanic = {
  id: '', name: '', avatar: '', companyName: '', title: '', counties: [], rating: 0,
  reviewsCount: 0, inspectionsCompleted: 0, baseFee: 0, specializations: [], certifications: [],
  yearsExperience: 0, bio: '', phone: '', email: '', availableDays: [], verified: false
};

export const PrePurchaseInspectionPortal: React.FC<PrePurchaseInspectionPortalProps> = ({
  currentMechanic = EMPTY_INSPECTION_PROVIDER,
  onNavigateToMarketplace
}) => {
  // Toast Alert
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Active Module State (12 Modules)
  const [activeTab, setActiveTab] = useState<PortalModuleTab>('dashboard');

  // Bookings State
  const [bookings, setBookings] = useState<InspectionBooking[]>([]);
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>('All');
  const [bookingSearch, setBookingSearch] = useState<string>('');

  // Reports State
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [selectedReportForView, setSelectedReportForView] = useState<InspectionReport | null>(null);

  // Payments State
  const [payments, setPayments] = useState<InspectionPayment[]>([]);

  // Ratings & Reviews State
  const [ratings, setRatings] = useState<InspectionRating[]>([]);

  // Availability Settings State
  const [availableDays, setAvailableDays] = useState<string[]>(currentMechanic.availableDays);
  const [emergencyPortAudit, setEmergencyPortAudit] = useState<boolean>(false);
  const [dailyAuditLimit, setDailyAuditLimit] = useState<number>(3);

  // Service Areas State
  const [coveredCounties, setCoveredCounties] = useState<string[]>(currentMechanic.counties);

  // Pricing Rates State
  const [packageRates, setPackageRates] = useState({
    essential: 7500,
    comprehensive: 12000,
    vipImport: 15000,
    germanLuxury: 16500,
    commercial: 14000
  });

  // Business Profile Info
  const [businessName, setBusinessName] = useState<string>(currentMechanic.companyName);
  const [inspectorName, setInspectorName] = useState<string>(currentMechanic.name);
  const [inspectorPhone, setInspectorPhone] = useState<string>(currentMechanic.phone);
  const [inspectorEmail, setInspectorEmail] = useState<string>(currentMechanic.email);
  const [ntsaLicense, setNtsaLicense] = useState<string>('NTSA-MEC-2026-88019');
  const [kraPin, setKraPin] = useState<string>('A019882341M');

  // =========================================================
  // REPORT BUILDER STATE (150-Point Audit Engine)
  // =========================================================
  const [showReportBuilderModal, setShowReportBuilderModal] = useState<boolean>(false);
  const [activeBookingForReport, setActiveBookingForReport] = useState<InspectionBooking | null>(null);

  // Builder Vehicle Details
  const [builderVehicleTitle, setBuilderVehicleTitle] = useState<string>('');
  const [builderVin, setBuilderVin] = useState<string>('');
  const [builderRegNo, setBuilderRegNo] = useState<string>('');
  const [builderOdometer, setBuilderOdometer] = useState<number>(0);
  const [builderBuyerName, setBuilderBuyerName] = useState<string>('');
  const [builderBuyerPhone, setBuilderBuyerPhone] = useState<string>('');
  const [builderOverallScore, setBuilderOverallScore] = useState<number>(0);
  const [builderVerdict, setBuilderVerdict] = useState<InspectionReport['verdict']>('Passed (Clean Certification)');
  const [builderSummary, setBuilderSummary] = useState<string>('');

  // 150-Point Items State (Item key -> 'Pass' | 'Attention' | 'Fail')
  const [itemStatuses, setItemStatuses] = useState<Record<string, 'Pass' | 'Attention' | 'Fail'>>({});

  // Photos Upload State
  const [photosList, setPhotosList] = useState<string[]>([
    'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800'
  ]);
  const [newPhotoUrlInput, setNewPhotoUrlInput] = useState<string>('');

  // Video Clips State
  const [videoList, setVideoList] = useState<{ title: string; url: string }[]>([]);
  const [newVideoTitle, setNewVideoTitle] = useState<string>('');
  const [newVideoUrl, setNewVideoUrl] = useState<string>('');

  // Digital Signature State
  const [signatureText, setSignatureText] = useState<string>('');
  const [isSignatureConfirmed, setIsSignatureConfirmed] = useState<boolean>(false);

  // PDF Certificate Print Preview Modal State
  const [showPdfCertificateModal, setShowPdfCertificateModal] = useState<boolean>(false);
  const [pdfReportData, setPdfReportData] = useState<InspectionReport | null>(null);

  // Helper to pre-fill all 150 points with 'Pass'
  const handlePassAll150Points = () => {
    const updated: Record<string, 'Pass' | 'Attention' | 'Fail'> = {};
    CHECKLIST_150_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        updated[item] = 'Pass';
      });
    });
    setItemStatuses(updated);
    showToast('Marked all 150 diagnostic inspection points as PASSED');
  };

  // Launch Report Builder for a specific booking
  const handleLaunchReportBuilder = (booking?: InspectionBooking) => {
    if (booking) {
      setActiveBookingForReport(booking);
      setBuilderVehicleTitle(booking.vehicleTitle);
      setBuilderBuyerName(booking.buyerName);
      setBuilderBuyerPhone(booking.buyerPhone);
    }
    handlePassAll150Points();
    setShowReportBuilderModal(true);
  };

  // Add Photo to Builder
  const handleAddPhoto = () => {
    if (!newPhotoUrlInput) {
      showToast('Please enter a photo image URL or select a sample photo');
      return;
    }
    setPhotosList([...photosList, newPhotoUrlInput]);
    setNewPhotoUrlInput('');
    showToast('Inspection photo added to report gallery');
  };

  // Add Video to Builder
  const handleAddVideo = () => {
    if (!newVideoTitle) return;
    setVideoList([...videoList, { title: newVideoTitle, url: newVideoUrl || 'https://youtube.com/watch?v=sample-inspection' }]);
    setNewVideoTitle('');
    setNewVideoUrl('');
    showToast('Inspection video clip added to report');
  };

  // Save & Publish 150-Point Report
  const handleSaveAndPublishReport = () => {
    const generatedId = `REP-150-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport: InspectionReport = {
      id: generatedId,
      bookingId: activeBookingForReport?.id || 'INSP-2026-901',
      vehicleTitle: builderVehicleTitle,
      vehicleLocation: activeBookingForReport?.vehicleLocation || 'Westlands, Nairobi',
      mechanicId: currentMechanic.id,
      mechanicName: currentMechanic.name,
      mechanicCompany: currentMechanic.companyName,
      overallScore: builderOverallScore,
      verdict: builderVerdict,
      vinVerified: true,
      chassisVerified: true,
      logbookOwnerMatch: true,
      inspectionDate: new Date().toISOString().split('T')[0],
      categoryScores: {
        engineAndDrivetrain: { score: 95, status: 'Pass', notes: 'Excellent cylinder compression, zero oil leaks.' },
        transmissionAndClutch: { score: 92, status: 'Pass', notes: 'Smooth gear shifts under load.' },
        suspensionAndSteering: { score: 88, status: 'Pass', notes: 'Slight wear on front stabilizer bushings.' },
        brakesAndTires: { score: 90, status: 'Pass', notes: 'Brake pads at 8mm, tires at 75% tread.' },
        electricalAndDiagnostics: { score: 96, status: 'Pass', notes: 'Zero active ECU diagnostic trouble codes.' },
        bodyworkAndChassisFrame: { score: 94, status: 'Pass', notes: 'Factory paint thickness (100-120 microns).' },
        interiorAndHVAC: { score: 90, status: 'Pass', notes: 'A/C blows cold at 4.2°C.' }
      },
      obdDiagnosticCodes: ['P0000 (System Normal - No Faults Detected)'],
      inspectorSummary: builderSummary,
      photos: photosList
    };

    setReports([newReport, ...reports]);

    // Update booking status if applicable
    if (activeBookingForReport) {
      setBookings(prev => prev.map(b => b.id === activeBookingForReport.id ? { ...b, status: 'Completed', reportId: generatedId } : b));
    }

    setShowReportBuilderModal(false);
    setPdfReportData(newReport);
    setShowPdfCertificateModal(true);
    showToast(`150-Point Audit Report #${generatedId} published & digital certificate generated!`);
  };

  // Navigation Module Definitions (12 Modules)
  const portalModules: { id: PortalModuleTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: '1. Dashboard Overview', icon: <BarChart3 className="w-4 h-4 text-amber-500" /> },
    { id: 'bookings', label: `2. Bookings Intake (${bookings.length})`, icon: <CalendarIcon className="w-4 h-4 text-blue-500" /> },
    { id: 'calendar', label: '3. Inspection Calendar', icon: <Clock className="w-4 h-4 text-emerald-600" /> },
    { id: 'reports', label: `4. 150-Pt Report Builder (${reports.length})`, icon: <FileCheck className="w-4 h-4 text-[#1E3063]" /> },
    { id: 'payments', label: '5. Payments & Escrow', icon: <DollarSign className="w-4 h-4 text-emerald-600" /> },
    { id: 'reviews', label: `6. Reviews (${ratings.length})`, icon: <Star className="w-4 h-4 text-amber-400" /> },
    { id: 'customers', label: '7. Customer CRM', icon: <Users className="w-4 h-4 text-indigo-600" /> },
    { id: 'availability', label: '8. Availability & Capacity', icon: <Clock className="w-4 h-4 text-purple-600" /> },
    { id: 'service_areas', label: `9. Service Areas (${coveredCounties.length})`, icon: <MapPin className="w-4 h-4 text-rose-500" /> },
    { id: 'pricing', label: '10. Package Pricing', icon: <Tag className="w-4 h-4 text-[#1E3063]" /> },
    { id: 'business_profile', label: '11. Business Profile', icon: <Building2 className="w-4 h-4 text-[#1E3063]" /> },
    { id: 'analytics', label: '12. Revenue Analytics', icon: <TrendingUp className="w-4 h-4 text-emerald-600" /> }
  ];

  // Calculated Stats
  const totalGrossEarnings = payments.reduce((sum, p) => sum + p.grossAmount, 0);
  const totalNetEarnings = payments.reduce((sum, p) => sum + p.mechanicPayout, 0);
  const pendingEscrowVault = bookings
    .filter(b => b.paymentStatus === 'Escrow Held')
    .reduce((sum, b) => sum + b.netMechanicFee, 0);

  return (
    <div className="space-y-6 relative pb-16">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[#1E3063] text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-extrabold">{toast}</span>
        </div>
      )}

      {/* ==========================================
          HEADER & PORTAL BANNER
          ========================================== */}
      <div className="bg-gradient-to-r from-[#101935] via-[#1E3063] to-[#101935] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-400/20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="accent" size="md" className="bg-amber-400 text-[#17244B] font-black">
                <ShieldCheck className="w-3.5 h-3.5 text-[#17244B]" /> Pre-Purchase Inspection Portal
              </Badge>
              <Badge variant="verified" size="md" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">
                <Award className="w-3.5 h-3.5 text-emerald-400" /> NTSA TIMS Audited & KRA Licensed
              </Badge>
              <span className="text-xs text-amber-300 font-bold bg-white/10 px-3 py-1 rounded-full">
                {currentMechanic.companyName}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              Independent Pre-Purchase Inspection OS
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Operating <strong className="text-amber-400">{currentMechanic.name}</strong> • Completed <strong className="text-emerald-400">{currentMechanic.inspectionsCompleted} Vehicle Audits</strong> with {currentMechanic.rating}★ rating across East Africa.
            </p>
          </div>

          {/* Direct Actions Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="accent"
              size="sm"
              onClick={() => handleLaunchReportBuilder()}
              className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-black shadow-md"
            >
              <FileCheck className="w-4 h-4 text-[#17244B]" />
              <span>Launch 150-Point Report Builder</span>
            </Button>

            {onNavigateToMarketplace && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onNavigateToMarketplace}
                className="bg-white/10 text-white hover:bg-white/20 border-white/20 font-bold"
              >
                <Eye className="w-4 h-4 text-slate-300" />
                <span>View Public Inspector Profile</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          12-MODULE NAVIGATION TABS BAR
          ========================================== */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 py-2 px-2 rounded-2xl shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {portalModules.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#1E3063] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================
          MODULE 1: DASHBOARD
          ========================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Metrics Widgets */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <StatWidget
              label="Net Payout Earnings"
              value={`Ksh ${(totalNetEarnings / 1000).toFixed(0)}k`}
              trend="85% Mechanic Fee"
              trendType="positive"
              icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
            />
            <StatWidget
              label="Total Audits Done"
              value={`${currentMechanic.inspectionsCompleted}`}
              trend="150-Point Certified"
              trendType="positive"
              icon={<FileCheck className="w-4 h-4 text-[#1E3063]" />}
            />
            <StatWidget
              label="Escrow Vault Hold"
              value={`Ksh ${pendingEscrowVault.toLocaleString()}`}
              trend="Pending Report Signoff"
              trendType="neutral"
              icon={<Lock className="w-4 h-4 text-amber-500" />}
            />
            <StatWidget
              label="Customer Rating"
              value={`${currentMechanic.rating} ★`}
              trend={`From ${currentMechanic.reviewsCount} Reviews`}
              trendType="positive"
              icon={<Star className="w-4 h-4 text-amber-400" />}
            />
            <StatWidget
              label="Active Bookings"
              value={`${bookings.filter(b => b.status !== 'Completed').length}`}
              trend="Requires Action"
              trendType="positive"
              icon={<CalendarIcon className="w-4 h-4 text-blue-500" />}
            />
            <StatWidget
              label="NTSA Audit Status"
              value="Verified Tech"
              trend="KRA Compliant"
              trendType="positive"
              icon={<Award className="w-4 h-4 text-emerald-600" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Operational Console (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Quick Actions Card */}
              <Card className="p-5 bg-white border-slate-200 space-y-4">
                <h3 className="text-sm font-black text-[#1E3063] font-display flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Pre-Purchase Quick Actions
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <button
                    onClick={() => handleLaunchReportBuilder()}
                    className="p-3 bg-amber-50 hover:bg-amber-100 text-[#17244B] font-extrabold rounded-xl border border-amber-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <FileCheck className="w-5 h-5 text-amber-600" />
                    <span>Create 150-Point Audit</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="p-3 bg-blue-50 hover:bg-blue-100 text-[#17244B] font-extrabold rounded-xl border border-blue-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    <span>Manage Intake Bookings</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('payments')}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 text-[#17244B] font-extrabold rounded-xl border border-emerald-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <span>Request Escrow Payout</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('availability')}
                    className="p-3 bg-purple-50 hover:bg-purple-100 text-[#17244B] font-extrabold rounded-xl border border-purple-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span>Adjust Working Schedule</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('pricing')}
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 text-[#17244B] font-extrabold rounded-xl border border-indigo-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <Tag className="w-5 h-5 text-indigo-600" />
                    <span>Update Inspection Rates</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('business_profile')}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-[#17244B] font-extrabold rounded-xl border border-slate-300 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <Building2 className="w-5 h-5 text-slate-700" />
                    <span>Workshop Credentials</span>
                  </button>
                </div>
              </Card>

              {/* Today's Scheduled Mobile Audits */}
              <Card className="p-5 bg-white border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" /> Scheduled Inspection Queue
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('bookings')}>
                    View All ({bookings.length})
                  </Button>
                </div>

                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div key={b.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#1E3063]">{b.vehicleTitle}</span>
                          <Badge variant="warning" size="sm">{b.packageType}</Badge>
                        </div>
                        <p className="text-slate-600">Client: <strong>{b.buyerName}</strong> ({b.buyerPhone})</p>
                        <p className="text-slate-500 font-medium flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3 h-3 text-rose-500" /> {b.vehicleLocation} • {b.scheduledDate} @ {b.scheduledTime}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => handleLaunchReportBuilder(b)}
                        >
                          <FileCheck className="w-3.5 h-3.5 text-[#17244B]" /> Start 150-Pt Report
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Side Escrow & Recent Reports (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Escrow Vault Holding Card */}
              <Card className="p-5 bg-gradient-to-br from-white via-emerald-50/30 to-amber-50/20 border-emerald-300 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <Badge variant="escrow" size="sm">
                    <Lock className="w-3.5 h-3.5 text-amber-500" /> Protected KAYAD Escrow
                  </Badge>
                  <span className="text-[10px] font-extrabold text-emerald-800">15% Fee Automatically Deducted</span>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-600 font-bold">Total Net Escrow Funds Secured</p>
                  <p className="text-2xl font-black text-emerald-700 font-display">Ksh {pendingEscrowVault.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-500">Funds are released instantly to your M-PESA paybill upon client digital report delivery.</p>
                </div>

                <Button variant="primary" size="sm" fullWidth onClick={() => setActiveTab('payments')}>
                  Manage Financial Payouts
                </Button>
              </Card>

              {/* Recent Reports Released */}
              <Card className="p-5 bg-white border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" /> Published Audit Certificates
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('reports')}>
                    View Reports
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {reports.slice(0, 3).map((r) => (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-black text-[#1E3063]">{r.vehicleTitle}</span>
                        <p className="text-[11px] text-slate-500">Overall Diagnostic Score: <strong className="text-emerald-700">{r.overallScore}%</strong></p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPdfReportData(r);
                          setShowPdfCertificateModal(true);
                        }}
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" /> Certificate
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODULE 2: BOOKINGS INTAKE MANAGEMENT
          ========================================== */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-[#1E3063] text-base font-display">
                  Client Inspection Intake & Booking Queue ({bookings.length})
                </h3>
                <p className="text-xs text-slate-500">Manage incoming pre-purchase audit requests from vehicle buyers and dealerships.</p>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Input
                  placeholder="Search buyer name, vehicle, phone..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                  className="w-full md:w-64"
                />

                <Button variant="accent" size="md" onClick={() => handleLaunchReportBuilder()}>
                  <FileCheck className="w-4 h-4 text-[#17244B]" /> New Audit Report
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Vehicle & Location</TableHead>
                  <TableHead>Buyer / Contact</TableHead>
                  <TableHead>Inspection Package</TableHead>
                  <TableHead>Net Mechanic Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs font-bold text-slate-600">{b.id}</TableCell>
                    <TableCell>
                      <p className="font-bold text-[#1E3063] text-xs">{b.vehicleTitle}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" /> {b.vehicleLocation}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-800 text-xs">{b.buyerName}</p>
                      <p className="text-[11px] text-slate-500">{b.buyerPhone}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning" size="sm">{b.packageType}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-black text-emerald-700 text-xs">Ksh {b.netMechanicFee.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">15% Platform fee deducted</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={b.status === 'Completed' ? 'success' : 'escrow'} size="sm">
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => handleLaunchReportBuilder(b)}
                      >
                        <FileCheck className="w-3.5 h-3.5 text-[#17244B]" /> Start Audit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 3: INSPECTION CALENDAR
          ========================================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-emerald-600" /> Inspection Field Schedule & Mobile Routes
                </h3>
                <p className="text-xs text-slate-500">Plan mobile yard visits across East African county locations.</p>
              </div>

              <Button variant="outline" size="sm" onClick={() => showToast('Added buffer time between Nairobi & Naivasha appointments')}>
                + Add Workshop Maintenance Blockout
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 text-xs">
              {['Mon (Aug 3)', 'Tue (Aug 4)', 'Wed (Aug 5)', 'Thu (Aug 6)', 'Fri (Aug 7)', 'Sat (Aug 8)', 'Sun (Aug 9)'].map((day, idx) => (
                <div key={day} className={`p-3 rounded-2xl border min-h-[160px] space-y-2 ${idx === 2 ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="font-black text-[#1E3063] text-[11px] text-center pb-2 border-b border-slate-200">{day}</p>

                  {idx === 2 && (
                    <div className="p-2 bg-white rounded-xl border border-amber-300 text-[10px] space-y-1 shadow-2xs">
                      <p className="font-bold text-[#1E3063]">10:00 AM - Prado TX-L Audit</p>
                      <p className="text-slate-500">Westlands Yard</p>
                      <Badge variant="escrow" size="sm">Confirmed</Badge>
                    </div>
                  )}

                  {idx === 4 && (
                    <div className="p-2 bg-white rounded-xl border border-blue-300 text-[10px] space-y-1 shadow-2xs">
                      <p className="font-bold text-[#1E3063]">02:30 PM - Subaru Outback</p>
                      <p className="text-slate-500">Kilimani Yard</p>
                      <Badge variant="warning" size="sm">150-Point Audit</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 4: INSPECTION REPORTS & 150-POINT BUILDER
          ========================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-500" /> Digital Inspection Reports & Certificates ({reports.length})
              </h3>
              <p className="text-xs text-slate-500">Build, sign, and issue official 150-point technical audit certificates.</p>
            </div>

            <Button
              variant="accent"
              size="md"
              onClick={() => handleLaunchReportBuilder()}
              className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-black shadow-md"
            >
              <FileCheck className="w-4 h-4 text-[#17244B]" />
              <span>Launch 150-Point Report Builder</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((r) => (
              <Card key={r.id} className="p-5 space-y-4 hover:border-amber-400 transition-all shadow-card">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="verified" size="sm">150-Point Verified</Badge>
                    <h4 className="font-black text-[#1E3063] text-sm mt-1">{r.vehicleTitle}</h4>
                    <p className="text-xs text-slate-500">Issued: {r.inspectionDate} • ID: {r.id}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-700 font-display">{r.overallScore}%</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Overall Score</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-200">
                  <p className="font-bold text-[#1E3063]">Verdict: <span className="text-emerald-700">{r.verdict}</span></p>
                  <p className="text-slate-600 line-clamp-2 text-[11px]">{r.inspectorSummary}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 font-bold">{r.photos.length} High-Res Photos attached</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPdfReportData(r);
                      setShowPdfCertificateModal(true);
                    }}
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" /> Print PDF Certificate
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          MODULE 5: PAYMENTS & ESCROW VAULT
          ========================================== */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="p-5 bg-white border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-500">Gross Inspection Revenue</span>
              <p className="text-2xl font-black text-[#1E3063] font-display">Ksh {totalGrossEarnings.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400">Total client bookings value</p>
            </Card>

            <Card className="p-5 bg-white border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-500">KAYAD Platform Commission (15%)</span>
              <p className="text-2xl font-black text-amber-600 font-display">Ksh {Math.round(totalGrossEarnings * 0.15).toLocaleString()}</p>
              <p className="text-[11px] text-slate-400">Auditing platform support fee</p>
            </Card>

            <Card className="p-5 bg-emerald-50 border-emerald-300 space-y-2">
              <span className="text-xs font-bold text-emerald-800">Net Mechanic Earnings (85%)</span>
              <p className="text-2xl font-black text-emerald-700 font-display">Ksh {totalNetEarnings.toLocaleString()}</p>
              <Button variant="accent" size="sm" className="mt-2" onClick={() => showToast('M-PESA payout request of Ksh 10,200 submitted to finance!')}>
                Request M-PESA Payout
              </Button>
            </Card>
          </div>

          <Card className="p-5 space-y-4">
            <h3 className="font-black text-[#1E3063] text-sm font-display">Payout History Ledger</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Ref</TableHead>
                  <TableHead>Client & Vehicle</TableHead>
                  <TableHead>Gross Amount</TableHead>
                  <TableHead>KAYAD Fee (15%)</TableHead>
                  <TableHead>Net Payout</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-bold text-slate-600">{p.payoutRef}</TableCell>
                    <TableCell>
                      <p className="font-bold text-[#1E3063] text-xs">{p.vehicleTitle}</p>
                      <p className="text-[11px] text-slate-500">{p.buyerName}</p>
                    </TableCell>
                    <TableCell className="text-xs">Ksh {p.grossAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-amber-600">-Ksh {p.kayadCommission.toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-black text-emerald-700">Ksh {p.mechanicPayout.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="success" size="sm">{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 6: REVIEWS & QUALITY BADGING
          ========================================== */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Customer Ratings & Inspection Reviews ({ratings.length})
                </h3>
                <p className="text-xs text-slate-500">Verified reviews from vehicle buyers who booked pre-purchase audits.</p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-[#1E3063] font-display">{currentMechanic.rating}</span>
                <p className="text-xs text-amber-500 font-bold">★★★★★ Master Inspector</p>
              </div>
            </div>

            <div className="space-y-4">
              {ratings.map((r) => (
                <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-[#1E3063]">{r.buyerName}</span>
                    <span className="text-amber-500 font-bold">{r.rating} ★ ({r.date})</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">"{r.comment}"</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 7: CUSTOMER CRM DIRECTORY
          ========================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" /> Customer CRM Directory
            </h3>

            <div className="space-y-3">
              <p className="text-sm text-slate-500 py-6 text-center">Customer records are shown here only when returned by the inspection backend.</p>
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 8: AVAILABILITY & CAPACITY
          ========================================== */}
      {activeTab === 'availability' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" /> Working Days & Mobile Capacity Settings
            </h3>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="font-extrabold text-[#1E3063]">Active Days Available for Audits</label>
                <div className="flex gap-2 flex-wrap">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                    const active = availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          setAvailableDays(prev => active ? prev.filter(d => d !== day) : [...prev, day]);
                          showToast(`Updated schedule for ${day}`);
                        }}
                        className={`px-3 py-2 rounded-xl font-bold cursor-pointer transition-all ${
                          active ? 'bg-[#1E3063] text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-purple-900">Emergency Mobile Port Dispatch (Mombasa / Warehouses)</span>
                  <input
                    type="checkbox"
                    checked={emergencyPortAudit}
                    onChange={(e) => setEmergencyPortAudit(e.target.checked)}
                    className="w-4 h-4 accent-[#1E3063] cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-purple-800">Allows car buyers importing vehicles to request rapid 2-hour port clearance audits.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 9: SERVICE AREAS
          ========================================== */}
      {activeTab === 'service_areas' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500" /> County & Regional Coverage Areas
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {['Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Eldoret', 'Machakos', 'Kajiado', 'Kisumu'].map((county) => {
                const active = coveredCounties.includes(county);
                return (
                  <div
                    key={county}
                    onClick={() => {
                      setCoveredCounties(prev => active ? prev.filter(c => c !== county) : [...prev, county]);
                      showToast(`Toggled coverage for ${county}`);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer font-bold transition-all flex justify-between items-center ${
                      active ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{county}</span>
                    {active && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 10: PACKAGE PRICING
          ========================================== */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#1E3063]" /> Inspection Package Pricing Controls
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="font-bold text-[#1E3063]">50-Point Essential Audit</p>
                <Input
                  type="number"
                  value={packageRates.essential}
                  onChange={(e) => setPackageRates({ ...packageRates, essential: Number(e.target.value) })}
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 space-y-2">
                <p className="font-bold text-[#1E3063]">150-Point Comprehensive Audit</p>
                <Input
                  type="number"
                  value={packageRates.comprehensive}
                  onChange={(e) => setPackageRates({ ...packageRates, comprehensive: Number(e.target.value) })}
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-300 space-y-2">
                <p className="font-bold text-[#1E3063]">VIP Foreign Import Audit</p>
                <Input
                  type="number"
                  value={packageRates.vipImport}
                  onChange={(e) => setPackageRates({ ...packageRates, vipImport: Number(e.target.value) })}
                />
              </div>
            </div>

            <Button variant="accent" size="md" onClick={() => showToast('Saved updated inspection rates to KAYAD marketplace profile!')}>
              Save Pricing Changes
            </Button>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 11: BUSINESS PROFILE
          ========================================== */}
      {activeTab === 'business_profile' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1E3063]" /> Independent Mechanic Business Profile
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Workshop / Company Name</label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Lead Mechanic / Inspector Name</label>
                <Input value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Phone Number</label>
                <Input value={inspectorPhone} onChange={(e) => setInspectorPhone(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email Address</label>
                <Input value={inspectorEmail} onChange={(e) => setInspectorEmail(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">NTSA License Number</label>
                <Input value={ntsaLicense} onChange={(e) => setNtsaLicense(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">KRA PIN Number</label>
                <Input value={kraPin} onChange={(e) => setKraPin(e.target.value)} />
              </div>
            </div>

            <Button variant="primary" size="md" onClick={() => showToast('Updated business profile credentials!')}>
              Update Profile Credentials
            </Button>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 12: REVENUE ANALYTICS
          ========================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 space-y-3">
              <h3 className="font-black text-[#1E3063] text-sm font-display">Pass vs Fail Diagnostic Ratio</h3>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between font-bold">
                  <span>Passed Audit (Clean)</span>
                  <span className="text-emerald-700">72%</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Minor Defects Noted</span>
                  <span className="text-amber-600">21%</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Failed / Critical Faults</span>
                  <span className="text-rose-600">7%</span>
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="font-black text-[#1E3063] text-sm font-display">Most Popular Inspected Vehicle Makes</h3>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs font-bold">
                <div className="flex justify-between">
                  <span>Toyota (Prado, Land Cruiser, RAV4)</span>
                  <span>45%</span>
                </div>
                <div className="flex justify-between">
                  <span>Subaru (Outback, Forester)</span>
                  <span>25%</span>
                </div>
                <div className="flex justify-between">
                  <span>Mercedes-Benz & German Luxury</span>
                  <span>18%</span>
                </div>
                <div className="flex justify-between">
                  <span>Nissan & Commercial Pickups</span>
                  <span>12%</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 1: INTERACTIVE 150-POINT REPORT BUILDER & DIGITAL SIGNATURE
          ==================================================================== */}
      {showReportBuilderModal && (
        <Modal
          isOpen={showReportBuilderModal}
          onClose={() => setShowReportBuilderModal(false)}
          title="150-Point Pre-Purchase Audit Builder"
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs max-h-[80vh] overflow-y-auto pr-2">
            {/* Header info bar */}
            <div className="p-4 bg-[#1E3063] text-white rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <Badge variant="accent" size="md" className="bg-amber-400 text-[#17244B]">
                  Standard 150-Point Pre-Purchase Checklist
                </Badge>
                <Button variant="outline" size="sm" onClick={handlePassAll150Points} className="text-white border-white/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Pass All 150 Points
                </Button>
              </div>
              <h3 className="text-lg font-black">{builderVehicleTitle}</h3>
              <p className="text-slate-300 text-[11px]">Client: {builderBuyerName} ({builderBuyerPhone})</p>
            </div>

            {/* Vehicle Spec inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="font-bold text-slate-700">VIN / Chassis No.</label>
                <Input value={builderVin} onChange={(e) => setBuilderVin(e.target.value)} />
              </div>
              <div>
                <label className="font-bold text-slate-700">Registration No.</label>
                <Input value={builderRegNo} onChange={(e) => setBuilderRegNo(e.target.value)} />
              </div>
              <div>
                <label className="font-bold text-slate-700">Odometer (km)</label>
                <Input type="number" value={builderOdometer} onChange={(e) => setBuilderOdometer(Number(e.target.value))} />
              </div>
              <div>
                <label className="font-bold text-slate-700">Overall Score (%)</label>
                <Input type="number" value={builderOverallScore} onChange={(e) => setBuilderOverallScore(Number(e.target.value))} />
              </div>
            </div>

            {/* 150-Point Checklist accordion / categories */}
            <div className="space-y-4">
              <h4 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" /> 150 Diagnostic Items Categorized
              </h4>

              {CHECKLIST_150_CATEGORIES.map((cat) => (
                <div key={cat.id} className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                  <h5 className="font-extrabold text-[#1E3063] text-xs bg-slate-100 p-2 rounded-xl">{cat.name}</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.items.map((item) => {
                      const status = itemStatuses[item] || 'Pass';
                      return (
                        <div key={item} className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-[11px]">
                          <span className="font-medium text-slate-800 pr-2">{item}</span>
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setItemStatuses({ ...itemStatuses, [item]: 'Pass' })}
                              className={`px-2 py-0.5 rounded font-bold ${status === 'Pass' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                            >
                              Pass
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemStatuses({ ...itemStatuses, [item]: 'Attention' })}
                              className={`px-2 py-0.5 rounded font-bold ${status === 'Attention' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                            >
                              Warn
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemStatuses({ ...itemStatuses, [item]: 'Fail' })}
                              className={`px-2 py-0.5 rounded font-bold ${status === 'Fail' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                            >
                              Fail
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Media Uploads: Photos & Video Clips */}
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <h4 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-500" /> Photo & Video Upload Attachments
              </h4>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter photo URL (e.g. engine bay, chassis rail)..."
                    value={newPhotoUrlInput}
                    onChange={(e) => setNewPhotoUrlInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="accent" size="sm" onClick={handleAddPhoto}>
                    <Upload className="w-3.5 h-3.5 text-[#17244B]" /> Add Photo
                  </Button>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {photosList.map((photo, i) => (
                    <div key={i} className="relative w-20 h-16 rounded-xl overflow-hidden border border-slate-300">
                      <img src={photo} alt="Inspection photo" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPhotosList(photosList.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-rose-600 text-white p-0.5 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Video title (e.g. Engine rev sound test)..."
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="secondary" size="sm" onClick={handleAddVideo}>
                    <Video className="w-3.5 h-3.5 text-blue-600" /> Attach Video Link
                  </Button>
                </div>

                <div className="space-y-1">
                  {videoList.map((v, i) => (
                    <div key={i} className="p-2 bg-blue-50 rounded-xl text-[11px] font-bold text-blue-900 flex justify-between items-center">
                      <span>🎬 {v.title}</span>
                      <a href={v.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Preview</a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Digital Signature Canvas Simulation */}
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <h4 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" /> Inspector Digital Signature Capture
              </h4>

              <div className="p-4 bg-slate-100 rounded-2xl border border-slate-300 space-y-2 text-center">
                <p className="text-[11px] text-slate-500 font-bold">Draw or Type Authorized Inspector Signature</p>
                <div className="bg-white p-4 rounded-xl border border-dashed border-slate-400 font-serif italic text-lg font-bold text-[#1E3063]">
                  {signatureText || 'Sign here...'}
                </div>
                <Input
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="Type signature name..."
                  className="max-w-xs mx-auto text-center"
                />
              </div>
            </div>

            {/* Save & Publish Action */}
            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" size="md" onClick={() => setShowReportBuilderModal(false)}>
                Cancel
              </Button>
              <Button variant="accent" size="md" onClick={handleSaveAndPublishReport} className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-black">
                <FileCheck className="w-4 h-4 text-[#17244B]" /> Publish 150-Point Certificate
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ====================================================================
          MODAL 2: PDF PRINT PREVIEW & CERTIFICATE GENERATOR
          ==================================================================== */}
      {showPdfCertificateModal && pdfReportData && (
        <Modal
          isOpen={showPdfCertificateModal}
          onClose={() => setShowPdfCertificateModal(false)}
          title="Official 150-Point Audit Certificate (PDF Preview)"
          maxWidth="xl"
        >
          <div className="space-y-6 text-xs max-h-[80vh] overflow-y-auto pr-2">
            {/* Certificate Document Visual */}
            <div className="p-6 bg-white border-2 border-[#1E3063] rounded-3xl space-y-6 shadow-xl relative">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <Badge variant="accent" size="md" className="bg-[#1E3063] text-white">
                    KAYAD EA AUTOMOTIVE CERTIFICATION
                  </Badge>
                  <h2 className="text-xl font-black text-[#1E3063] font-display mt-2">
                    150-Point Pre-Purchase Audit Certificate
                  </h2>
                  <p className="text-[11px] text-slate-500">Certificate ID: {pdfReportData.id}</p>
                </div>

                <div className="text-right">
                  <span className="text-3xl font-black text-emerald-700 font-display">{pdfReportData.overallScore}%</span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Certified Grade</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-slate-500 font-bold">Vehicle Title:</p>
                  <p className="font-black text-[#1E3063]">{pdfReportData.vehicleTitle}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold">Inspection Date:</p>
                  <p className="font-black text-slate-800">{pdfReportData.inspectionDate}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold">Certified Inspector:</p>
                  <p className="font-black text-[#1E3063]">{pdfReportData.mechanicName} ({pdfReportData.mechanicCompany})</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold">Verdict:</p>
                  <p className="font-black text-emerald-700">{pdfReportData.verdict}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-[#1E3063] text-xs uppercase tracking-wider">Inspector Diagnostic Summary</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed font-medium">
                  {pdfReportData.inspectorSummary}
                </p>
              </div>

              {/* Digital signature footer */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">QR VERIFICATION STAMP</p>
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-xl flex items-center justify-center font-mono text-[9px]">
                    [QR SEAL]
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-serif italic text-lg font-bold text-[#1E3063]">{pdfReportData.mechanicName}</p>
                  <p className="text-[10px] text-slate-500 font-bold">Authorized Inspector Digital Signature</p>
                </div>
              </div>
            </div>

            {/* Print & Download Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="md" onClick={() => window.print()}>
                <Printer className="w-4 h-4 text-slate-600" /> Print Document
              </Button>
              <Button variant="accent" size="md" onClick={() => showToast('PDF Download initiated for 150-Point Audit Certificate!')} className="bg-amber-400 text-[#17244B] font-black">
                <Download className="w-4 h-4 text-[#17244B]" /> Download PDF Certificate
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PrePurchaseInspectionPortal;
