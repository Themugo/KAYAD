import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle, InspectionBooking, InspectionReport, InspectionPayment, InspectionRating, UserProfile } from '../types';
import { createInspectionOrder, getMyInspections, InspectionApiError, BackendInspectionOrder } from '../services/inspectionApi';
import { useSocket } from '../context/SocketContext';
import {
  ShieldCheck,
  Search,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  UserCheck,
  Award,
  Wrench,
  Calendar,
  PlusCircle,
  ChevronRight,
  X,
  Eye,
  Lock,
  AlertTriangle,
  TrendingUp,
  Landmark,
  Building2,
  Phone,
  Mail,
  Sparkles,
  Percent,
  Check,
  ThumbsUp,
  Filter,
  Car,
  AlertCircle,
  FileText,
  Layers,
  ExternalLink,
  Shield,
  Activity,
  Info,
  Navigation,
  User,
  CheckSquare,
  Share2
} from 'lucide-react';
import { PageHeader, StatWidget, Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, LazyImage, Modal } from '../components/ui';

// Honestly maps a real backend inspection order into this UI's own
// InspectionBooking shape. See types.ts's own comments on
// InspectionBooking for exactly which fields have no real backend
// equivalent (packages, commission split) and were widened/made
// optional rather than invented.
function mapBackendOrderToBooking(order: BackendInspectionOrder): InspectionBooking {
  const statusMap: Record<string, InspectionBooking['status']> = {
    pending_payment: 'Pending Mechanic Confirmation',
    assigned: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  const id = order.id || order._id || '';
  return {
    id,
    vehicleId: order.car?.id,
    vehicleTitle: order.car?.title || 'Vehicle',
    vehicleLocation: order.location || order.car?.location || '',
    buyerName: '',
    buyerPhone: '',
    buyerEmail: '',
    mechanicId: order.inspector?.id,
    mechanicName: order.inspector?.name,
    scheduledDate: order.scheduledAt ? new Date(order.scheduledAt).toLocaleDateString() : '',
    scheduledTime: order.scheduledAt ? new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    packageType: 'Pre-Purchase Inspection',
    totalFee: order.fee || 0,
    status: statusMap[order.status] || 'Pending Mechanic Confirmation',
    reportId: order.overallScore !== undefined ? id : undefined,
    createdAt: order.createdAt || '',
  };
}

// Honestly maps a real, completed backend inspection order into this
// UI's own InspectionReport shape - only called for orders that
// actually have a real overallScore.
function mapBackendOrderToReport(order: BackendInspectionOrder): InspectionReport {
  const id = order.id || order._id || '';
  const score = order.overallScore ?? 0;
  const verdict: InspectionReport['verdict'] =
    score >= 80 ? 'Passed (Clean Certification)' : score >= 50 ? 'Minor Issues Noted' : 'Failed (Major Defects)';
  return {
    id,
    bookingId: id,
    vehicleId: order.car?.id,
    vehicleTitle: order.car?.title || 'Vehicle',
    vehicleLocation: order.location || order.car?.location,
    mechanicId: order.inspector?.id,
    mechanicName: order.inspector?.name,
    overallScore: score,
    verdict,
    inspectionDate: order.completedAt ? new Date(order.completedAt).toLocaleDateString() : '',
    obdDiagnosticCodes: [],
    inspectorSummary: order.notes || '',
    photos: (order.images || []).map((img) => img.url),
  };
}

interface InspectionsViewProps {
  vehicles: Vehicle[];
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  initialSelectedVehicle?: Vehicle | null;
  onViewVehicleDetails?: (vehicleId: string) => void;
  onOpenInspectionMarketplace?: () => void;
}

export const InspectionsView: React.FC<InspectionsViewProps> = ({
  vehicles,
  user,
  onOpenAuth,
  initialSelectedVehicle,
  onViewVehicleDetails,
  onOpenInspectionMarketplace
}) => {
  // State
  const socket = useSocket();
  // Fixed: reports/bookings previously started from, and only ever
  // showed, entirely fake mock data (specific fake mechanic names,
  // ratings, business names, platform-wide fake "recently completed"
  // reports unrelated to this user). Per explicit direction: removed
  // the fake inspector-directory/ratings concept entirely (it has no
  // real, buyer-accessible backend equivalent - confirmed directly,
  // the real available-inspectors endpoint is admin-only), and now
  // loads the buyer's own real inspection history from the real
  // backend instead.
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [bookings, setBookings] = useState<InspectionBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState<boolean>(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [payments] = useState<InspectionPayment[]>([]);
  const [ratings, setRatings] = useState<InspectionRating[]>([]);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      setReports([]);
      setBookingsLoading(false);
      return;
    }
    let cancelled = false;
    setBookingsLoading(true);
    setBookingsError(null);
    getMyInspections()
      .then((res) => {
        if (cancelled) return;
        const orders = res.orders || [];
        setBookings(orders.map(mapBackendOrderToBooking));
        setReports(orders.filter((o) => o.overallScore !== undefined).map(mapBackendOrderToReport));
      })
      .catch((err) => {
        if (cancelled) return;
        setBookingsError(err instanceof InspectionApiError ? err.message : 'Could not load your inspections.');
      })
      .finally(() => {
        if (!cancelled) setBookingsLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  // Realtime is a reconciliation signal only: the API remains the source of truth.
  useEffect(() => {
    if (!user || bookings.length === 0) return;
    const channels = bookings.map((booking) => socket.joinInspection(booking.id, {
      onUpdate: () => {
        getMyInspections().then((res) => {
          const orders = res.orders || [];
          setBookings(orders.map(mapBackendOrderToBooking));
          setReports(orders.filter((o) => o.overallScore !== undefined).map(mapBackendOrderToReport));
        }).catch(() => undefined);
      },
    })).filter(Boolean);
    return () => channels.forEach((channel) => channel && socket.leaveChannel(channel));
  }, [user, bookings.map((b) => b.id).join(',')]);

  // Top-Level Mode: 'buyer_marketplace' | 'mechanic_portal'

  // Active Main Navigation Sub-Tab
  const [activeTab, setActiveTab] = useState<'packages' | 'reports' | 'bookings'>('bookings');

  // Search & Filters for Mechanics
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [countyFilter, setCountyFilter] = useState<string>('All');
  const [specializationFilter, setSpecializationFilter] = useState<string>('All');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [packageTypeFilter, setPackageTypeFilter] = useState<string>('All');

  // Selected items & Modals
  // Fixed: selectedMechanic (and the "Mechanic Profile Modal" that
  // displayed it) was only ever set from the fake inspector directory
  // removed above - now genuinely dead state, removed.
  const [selectedReport, setSelectedReport] = useState<InspectionReport | null>(null);
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [bookingStep, setBookingStep] = useState<number>(1);

  // Booking Form State
  const [targetVehicleId, setTargetVehicleId] = useState<string>(initialSelectedVehicle?.id || (vehicles[0]?.id || 'custom'));
  // Fixed: chosenMechanicId was only ever set/read by the fake
  // "choose your inspector" step removed above - genuinely dead now.
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [packageType, setPackageType] = useState<InspectionBooking['packageType']>('Pre-Purchase Inspection');
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

  // The buyer-facing API currently exposes one inspection-order contract:
  // vehicle + phone + location. Pricing, package tier, inspector assignment,
  // payment and scheduling are not returned by that contract, so this UI
  // must not invent any of them.
  const inspectionPackages = [
    {
      id: 'Pre-Purchase Inspection',
      name: 'Pre-Purchase Vehicle Inspection',
      description: 'Request an inspection for a vehicle already in KAYAD. Assignment, pricing, scheduling and report data remain backend-authoritative.',
      idealFor: 'Vehicles already listed in KAYAD',
      features: ['Vehicle-linked inspection order', 'Backend-assigned inspector', 'Backend-authoritative status and report data']
    }
  ];

  // Counties List
  const availableCounties = ['All', 'Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Eldoret', 'Machakos', 'Kajiado', 'Kisumu', 'Kilifi', 'Kwale'];
  const specializationOptions = ['All', 'Toyota 4x4', 'German Luxury', 'Subaru AWD', 'Diesel Turbo Systems', 'Hybrid Diagnostics', 'Commercial Fleet', 'Foreign Import Audit'];

  // Launch Booking Modal for a specific mechanic
  // Fixed: the wizard previously started at Step 1, "Choose Your
  // Preferred Independent Inspector" - the same fake, rated-mechanic-
  // directory concept removed above, just relocated inside the
  // booking wizard. The real backend never lets a buyer choose their
  // own inspector at all (admin-assigned, confirmed directly) - now
  // starts at the real first step instead.
  const handleOpenBooking = (vehicle?: Vehicle) => {
    if (vehicle) {
      setTargetVehicleId(vehicle.id);
    }
    setBookingStep(1);
    setShowBookingModal(true);
  };

  // Submit only the real backend-supported inspection order.
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to request an inspection.');
      onOpenAuth?.();
      return;
    }
    if (!buyerPhone) {
      showToast('Please provide your phone number.');
      return;
    }

    const targetVeh = vehicles.find(v => v.id === targetVehicleId);
    if (!targetVeh) {
      showToast('Select a vehicle that exists in KAYAD before requesting an inspection.');
      return;
    }

    try {
      const result = await createInspectionOrder(targetVeh.id, buyerPhone, targetVeh.location);
      if (!result.success || !result.order) {
        showToast(result.message || 'Could not request inspection. Please try again.');
        return;
      }
      const newBooking = mapBackendOrderToBooking(result.order);
      setBookings(prev => [newBooking, ...prev]);
      setNewBookingId(result.order.id || result.order._id || null);
      setBookingStep(4);
      showToast(`Inspection requested for ${targetVeh.title}. Your order is saved on the KAYAD backend.`);
    } catch (err) {
      showToast(err instanceof InspectionApiError ? err.message : 'Could not request inspection. Please try again.');
    }
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
    <div className="kayad-inspection-page min-h-screen bg-[#F5F8F8] text-slate-800 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#176B87] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Service scope banner */}
      <div className="kayad-inspection-scope bg-[#0A3340] border-b border-white/10 px-4 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[#8DE4D8] font-black text-[10px] uppercase tracking-[0.12em] bg-white/10 px-2.5 py-1 rounded border border-white/10">KAYAD Inspection Orders</span>
            <span className="text-slate-300 text-[11px] hidden md:inline">Backend-authoritative buyer inspection requests</span>
          </div>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="kayad-inspection-hero bg-[#0F5D73] text-white px-4 sm:px-6 lg:px-8 py-7 sm:py-8">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-3xl">
              {onOpenInspectionMarketplace && (
                <Button type="button" onClick={onOpenInspectionMarketplace} className="mb-3">
                  <Search className="w-4 h-4" />
                  Browse Inspection Providers
                </Button>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase bg-white/10 text-[#B8EEE7] border border-white/15 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Inspection Operations
                </span>
                <span className="text-[10px] font-semibold text-slate-300 bg-white/10 px-2.5 py-1 rounded-full">
                  Backend service
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display tracking-tight text-white">
                Inspection Control Center
              </h1>
              <p className="text-slate-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Manage inspection requests for vehicles already in KAYAD. Assignment, order status, pricing, scheduling and report data are returned by the backend.
              </p>
            </div>

            {/* Quick CTAs */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={() => handleOpenBooking()}
                className="font-bold shadow-lg"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" /> Request Inspection
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => setActiveTab('reports')}
                className="text-white border-white/30 hover:bg-white/10"
              >
                <FileCheck className="w-4 h-4 mr-1.5 text-emerald-400" /> View My Reports
              </Button>
            </div>
          </div>

          {/* CRITICAL BUSINESS MODEL TRANSPARENCY BANNER */}
          <div className="kayad-inspection-process bg-[#0A3340]/35 rounded-xl p-3.5 border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-[#8DE4D8] flex items-center justify-center shrink-0 font-bold border border-white/15">
                1
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Vehicle-linked Request</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  Each request is tied to a vehicle that exists in the KAYAD marketplace.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-[#8DE4D8] flex items-center justify-center shrink-0 font-bold border border-white/15">
                2
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Inspector Assignment</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  Assignment is controlled by the inspection backend and appears here when returned.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-[#8DE4D8] flex items-center justify-center shrink-0 font-bold border border-white/15">
                3
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Payment State</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  Payment state is displayed only when a real backend transaction provides it.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-[#8DE4D8] flex items-center justify-center shrink-0 font-bold border border-white/15">
                4
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Pricing & Scheduling</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  Pricing and scheduling remain backend-authoritative and are not fabricated here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      {/* Buyer control tabs: service definition plus the buyer's own reports and orders. */}
      <div className="kayad-inspection-tabs sticky top-14 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none text-xs font-bold">
            <button
              onClick={() => setActiveTab('packages')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'packages'
                  ? 'bg-[#176B87] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4 text-[#13B8A6]" />
              <span>Inspection Packages</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-[#176B87] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileCheck className="w-4 h-4 text-[#13B8A6]" />
              <span>My Reports</span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'bg-[#176B87] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-[#13B8A6]" />
              <span>My Bookings</span>
              {bookings.filter(b => b.status !== 'Completed').length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#13B8A6] text-[#0A3340] font-bold">
                  {bookings.filter(b => b.status !== 'Completed').length} Active
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* TAB 2: INSPECTION PACKAGES */}
        {activeTab === 'packages' && (
          <div className="space-y-6 animate-fade-in">
            <PageHeader
              badgeIcon={<Award className="w-4 h-4 text-emerald-600" />}
              badgeText="Service Definition"
              title="Inspection Service & Pricing"
              description="Review the inspection service currently exposed by KAYAD. Package scope, pricing, assignment and scheduling are authoritative only when returned by the backend."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inspectionPackages.map((pkg) => (
                <Card key={pkg.id} className="flex flex-col justify-between hover:shadow-card-hover transition-all">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                        Backend-defined service
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-[#176B87] font-display">{pkg.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pkg.description}</p>
                    </div>

                    <div className="bg-[#F5F8F8] p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 block">Current pricing</span>
                        <span className="text-lg sm:text-xl font-black text-[#176B87]">Provided by backend at order time</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#176B87] bg-[#E8F5F3] px-2.5 py-1 rounded-lg border border-[#CDE9E5] whitespace-nowrap">
                        Server-authoritative
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
              badgeText="My Digital Inspection Reports"
              title="My Inspection Reports"
              description="Review inspection reports returned by the KAYAD backend for your own inspection orders. Only fields actually returned by the server are shown."
            />

            {reports.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                <FileCheck className="w-9 h-9 mx-auto text-[#13B8A6] mb-3" />
                <h3 className="text-sm font-bold text-[#0F5D73]">No inspection reports yet</h3>
                <p className="text-xs text-slate-500 mt-1">Completed report data will appear here when returned by the inspection backend.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((rep) => (
                <Card key={rep.id} hoverable className="flex flex-col justify-between">
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#176B87] bg-slate-100 px-2.5 py-1 rounded-md">
                        {rep.id}
                      </span>
                      <Badge variant={rep.verdict.includes('Passed') ? 'success' : 'warning'}>
                        {rep.verdict}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-800 line-clamp-1">{rep.vehicleTitle}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#176B87]" /> {rep.vehicleLocation}
                      </p>
                    </div>

                    <div className="bg-[#176B87] text-white p-4 rounded-xl flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Health Score</span>
                        <span className="text-2xl font-black font-mono text-[#B8EEE7]">{rep.overallScore}/100</span>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[10px] text-slate-300 block">Backend score</span>
                        <span className="text-xs font-bold text-emerald-400">Returned by server</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Inspector:</span>
                        <strong className="text-slate-800">{rep.mechanicName || 'Not assigned / not returned'}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Inspection Date:</span>
                        <span className="font-semibold">{rep.inspectionDate || 'Not returned'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic line-clamp-3">
                      "{rep.inspectorSummary || 'No inspector summary returned.'}"
                    </p>
                  </div>

                  <div className="p-5 pt-0">
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => setSelectedReport(rep)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> View Report Details
                    </Button>
                  </div>
                </Card>
              ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BOOKINGS TRACKER */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-fade-in">
            <PageHeader
              badgeIcon={<Clock className="w-4 h-4 text-[#13B8A6]" />}
              badgeText="Real-Time Tracker"
              title="Inspection Orders & Status"
              description="Track your inspection orders using status, assignment, scheduling and report data returned by the KAYAD backend."
            />

            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#176B87]" /> Inspection Orders ({bookings.length})
                </CardTitle>

                <Button variant="primary" size="sm" onClick={() => handleOpenBooking()}>
                  <PlusCircle className="w-4 h-4 mr-1" /> New Inspection Request
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Vehicle & Location</TableHead>
                      <TableHead>Inspector Assignment</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Payment / Fee</TableHead>
                      <TableHead>Progress Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Clock className="w-8 h-8 text-[#13B8A6]" />
                            <span className="font-bold text-[#0F5D73]">No inspection orders yet</span>
                            <span className="text-[11px] text-slate-500">Requests created through KAYAD will appear here with backend-returned status.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono font-bold text-[#176B87]">
                          {b.id}
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-slate-800 text-xs">{b.vehicleTitle}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#176B87]" /> {b.vehicleLocation}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-slate-800 text-xs">{b.mechanicName || 'Not assigned / not returned'}</div>
                          <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-[#13B8A6]" /> Backend assignment
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs font-medium text-slate-700">{b.scheduledDate || 'Not scheduled / not returned'}</div>
                          {b.scheduledTime && <div className="text-[10px] text-slate-500 font-medium">{b.scheduledTime}</div>}
                        </TableCell>

                        <TableCell>
                          <div className="font-mono font-extrabold text-[#176B87] text-xs">
                            {b.totalFee > 0 ? `Ksh ${b.totalFee.toLocaleString()}` : 'Not returned'}
                          </div>
                          <span className="text-[10px] font-medium text-slate-500">{b.paymentStatus || 'Payment state not returned'}</span>
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
                              Report not available
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


      </main>


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
              <span>KAYAD Inspection Report ({selectedReport.id})</span>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Header: Vehicle & Verdict */}
            <div className="bg-[#176B87] text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  Inspection ID: {selectedReport.id} • {selectedReport.inspectionDate}
                </span>
                <h2 className="text-2xl font-extrabold font-display text-white mt-1">
                  {selectedReport.vehicleTitle}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Inspector: <strong>{selectedReport.mechanicName || 'Not assigned / not returned'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl border border-white/20">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Overall Score</span>
                  <span className="text-3xl font-black font-mono text-[#B8EEE7]">{selectedReport.overallScore}/100</span>
                </div>

                <div className="border-l border-white/20 pl-4 text-right">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Verdict</span>
                  <Badge variant={selectedReport.verdict.includes('Passed') ? 'success' : 'warning'}>
                    {selectedReport.verdict}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-700">
              <div className="font-bold text-[#176B87]">Backend-provided inspection data</div>
              <p className="mt-1">VIN, chassis, logbook verification flags and fixed category scores are not part of the current buyer report API, so no verification result or invented sub-score is displayed here.</p>
            </div>

            {/* Inspector Summary */}
            <div className="space-y-2 bg-[#F6FAF9] p-5 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-[#176B87] uppercase tracking-wider">Inspector Final Summary</h4>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                "{selectedReport.inspectorSummary}"
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                Report data supplied by the KAYAD inspection backend.
              </span>

              <Button variant="secondary" size="sm" onClick={() => setSelectedReport(null)}>
                Close Report
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================== */}
      {/* MODAL 3: GUIDED INSPECTION REQUEST MODAL */}
      {/* ========================================================================== */}
      {showBookingModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowBookingModal(false)}
          maxWidth="3xl"
          title={
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#13B8A6]" />
              <span>Request Vehicle Inspection</span>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Compact request flow: only collect fields supported by the buyer order endpoint. */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-4 text-xs font-bold">
              {[
                { step: 1, label: 'Vehicle' },
                { step: 2, label: 'Contact' },
                { step: 3, label: 'Review & Submit' },
                { step: 4, label: 'Confirmed' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    bookingStep === s.step
                      ? 'bg-[#0F5D73] text-white'
                      : bookingStep > s.step
                        ? 'bg-[#13B8A6] text-[#0A3340]'
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {bookingStep > s.step ? '✓' : s.step}
                  </span>
                  <span className={`hidden sm:inline truncate ${bookingStep === s.step ? 'text-[#0F5D73]' : 'text-slate-500'}`}>{s.label}</span>
                  {s.step < 4 && <span className="text-slate-300">/</span>}
                </div>
              ))}
            </div>

            {bookingStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[#0F5D73] font-display">Select the vehicle</h3>
                  <p className="text-xs text-slate-500 mt-1">The inspection request must reference a vehicle that already exists in KAYAD.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">KAYAD Marketplace Vehicle</label>
                  <select
                    value={targetVehicleId}
                    onChange={(e) => setTargetVehicleId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#176B87]"
                  >
                    {vehicles.length === 0 && <option value="">No KAYAD vehicles available</option>}
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title} — Ksh {v.price.toLocaleString()} ({v.location})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <Button variant="primary" onClick={() => setBookingStep(2)} disabled={!targetVehicleId || vehicles.length === 0}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {bookingStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[#0F5D73] font-display">Confirm your contact</h3>
                  <p className="text-xs text-slate-500 mt-1">Only the phone number is submitted to the current buyer inspection-order endpoint.</p>
                </div>
                <Input
                  label="Phone number"
                  placeholder="e.g. +254 712 345 678"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                />
                <div className="bg-[#F5F8F8] border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#13B8A6] shrink-0 mt-0.5" />
                  <span>Name, email, scheduling preferences and payment details are not submitted by this request flow because the backend does not currently accept them here.</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button variant="secondary" onClick={() => setBookingStep(1)}>← Back</Button>
                  <Button variant="primary" onClick={() => setBookingStep(3)} disabled={!buyerPhone}>Review Request</Button>
                </div>
              </div>
            )}

            {bookingStep === 3 && (
              <form onSubmit={handleConfirmBooking} className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[#0F5D73] font-display">Review & submit request</h3>
                  <p className="text-xs text-slate-500 mt-1">The backend will assign the inspection order and return its authoritative status.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Vehicle</span><strong className="text-slate-800 text-right">{vehicles.find(v => v.id === targetVehicleId)?.title || 'Not selected'}</strong></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Location</span><strong className="text-slate-800 text-right">{vehicles.find(v => v.id === targetVehicleId)?.location || 'Not returned'}</strong></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Phone</span><strong className="text-slate-800 text-right">{buyerPhone || 'Not provided'}</strong></div>
                  <div className="flex justify-between gap-4 pt-2 border-t border-slate-200"><span className="text-slate-500">Pricing</span><strong className="text-[#0F5D73]">Backend-authoritative</strong></div>
                </div>
                <div className="bg-[#E8F5F3] p-3 rounded-xl border border-[#CDE9E5] text-xs text-[#0A5A50] flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#13B8A6] shrink-0 mt-0.5" />
                  <span>No payment or escrow is created by this request step. Any later payment state must come from the backend transaction flow.</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button variant="secondary" type="button" onClick={() => setBookingStep(2)}>← Back</Button>
                  <Button variant="accent" type="submit" className="font-bold">Submit Inspection Request</Button>
                </div>
              </form>
            )}

            {bookingStep === 4 && (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 rounded-full bg-[#E8F5F3] text-[#0F5D73] flex items-center justify-center mx-auto border border-[#CDE9E5]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#0F5D73] font-display">Inspection request submitted</h3>
                  <p className="text-xs text-slate-500 mt-1">Order reference: <strong className="font-mono text-slate-800">{newBookingId || 'Pending'}</strong></p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Assignment</span><strong className="text-slate-800">Backend-controlled</strong></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Scheduling</span><strong className="text-slate-800">Not returned yet</strong></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Payment</span><strong className="text-slate-800">Not created by this request</strong></div>
                </div>
                <Button variant="primary" onClick={() => { setShowBookingModal(false); setActiveTab('bookings'); }}>
                  View Inspection Orders →
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InspectionsView;
