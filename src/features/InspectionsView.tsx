import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle, InspectionBooking, InspectionReport, InspectionPayment, InspectionRating, UserProfile } from '../types';
import { createInspectionOrder, getMyInspections, InspectionApiError, BackendInspectionOrder } from '../services/inspectionApi';
import { inspectionApi } from './InspectionMarketplace/services/api';
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
  Share2,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardCheck,
  Route,
  MessageCircle
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
    const openProviderApplication = () => setShowProviderModal(true);
    window.addEventListener('kayad:open-inspection-provider-application', openProviderApplication);
    return () => window.removeEventListener('kayad:open-inspection-provider-application', openProviderApplication);
  }, []);

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
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'bookings'>('overview');

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
  const [showProviderModal, setShowProviderModal] = useState<boolean>(false);
  const [providerSubmitting, setProviderSubmitting] = useState(false);
  const [providerForm, setProviderForm] = useState({ companyName: '', phone: '', county: '', town: '', address: '', serviceTypes: '' });
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

      {/* Public service header: this is a customer-facing service, not an operations console. */}
      <section className="bg-[#082F3A] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-8 lg:gap-12 items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#B8EEE7]">
                <ClipboardCheck className="w-3.5 h-3.5" /> KAYAD Pre-Purchase Inspection
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05]">
                Know the vehicle before you commit.
              </h1>
              <p className="mt-4 max-w-2xl text-sm sm:text-base leading-7 text-slate-300">
                Request an inspection for a vehicle in the marketplace, follow your real order status, and access your inspection report when it is ready.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button variant="accent" size="md" onClick={() => handleOpenBooking()} className="font-black">
                  <Search className="w-4 h-4 mr-1.5" /> Start an Inspection
                </Button>
                <Button variant="outline" size="md" onClick={onOpenInspectionMarketplace} className="border-white/25 text-white hover:bg-white/10">
                  <MapPin className="w-4 h-4 mr-1.5" /> Find an Inspection Provider
                </Button>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-300">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-[#8DE4D8]" /> Vehicle-linked requests</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#8DE4D8]" /> Verified order status</span>
                <span className="inline-flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-[#8DE4D8]" /> Reports when completed</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8DE4D8]">How KAYAD works</p>
              <div className="mt-4 space-y-4">
                {[
                  ['1', 'Choose a vehicle', 'Start from a real KAYAD marketplace vehicle.'],
                  ['2', 'Request inspection', 'Send the vehicle and your contact details.'],
                  ['3', 'KAYAD coordinates', 'Assignment, pricing and scheduling appear when returned by the service.'],
                  ['4', 'Review the result', 'Track the order and open the report when available.'],
                ].map(([n, title, text]) => (
                  <div key={n} className="flex gap-3">
                    <span className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-black text-[#B8EEE7] shrink-0">{n}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-5">{text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Audience-aware service navigation */}
      <div className="sticky top-14 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${activeTab === 'overview' ? 'bg-[#0F5D73] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                <ClipboardCheck className="w-4 h-4" /> Service
              </button>
              {user && <button onClick={() => setActiveTab('bookings')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${activeTab === 'bookings' ? 'bg-[#0F5D73] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Clock className="w-4 h-4" /> My Inspections {bookings.filter(b => b.status !== 'Completed').length > 0 && <span className="rounded-full bg-[#13B8A6] text-[#082F3A] px-1.5 text-[9px]">{bookings.filter(b => b.status !== 'Completed').length}</span>}
              </button>}
              {user && <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${activeTab === 'reports' ? 'bg-[#0F5D73] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                <FileCheck className="w-4 h-4" /> My Reports
              </button>}
            </nav>
            <button type="button" onClick={() => setShowProviderModal(true)} className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0F5D73] hover:text-[#13B8A6] whitespace-nowrap">
              <BriefcaseBusiness className="w-4 h-4" /> Inspection providers <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* PUBLIC SERVICE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            <section className="grid lg:grid-cols-[1.1fr_.9fr] gap-5 items-stretch">
              <Card className="overflow-hidden">
                <div className="p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#13B8A6]">Before you buy</div>
                      <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#0F5D73] font-display">Inspection should remove uncertainty, not add another process.</h2>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-[#E8F5F3] text-[#0F5D73] flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5" /></div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600 max-w-2xl">KAYAD links your request to the vehicle you are considering. As the inspection progresses, your account shows the assignment, status, schedule, payment state and report information available for your order.</p>
                  <div className="mt-6 grid sm:grid-cols-3 gap-3">
                    {[
                      [Car, 'Vehicle-linked', 'No invented vehicle or order records.'],
                      [Route, 'Track the process', 'Follow real status as the order moves.'],
                      [FileCheck, 'Evidence when ready', 'Open report data once completed.'],
                    ].map(([Icon, title, text]) => (
                      <div key={title as string} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <Icon className="w-4 h-4 text-[#176B87]" />
                        <div className="mt-3 text-xs font-bold text-slate-800">{title as string}</div>
                        <div className="mt-1 text-[11px] leading-5 text-slate-500">{text as string}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Button variant="primary" onClick={() => handleOpenBooking()}><Search className="w-4 h-4 mr-1.5" /> Request an inspection</Button>
                    <Button variant="secondary" onClick={onOpenInspectionMarketplace}><MapPin className="w-4 h-4 mr-1.5" /> Browse providers</Button>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#F8FBFA] border-[#DCEBE8]">
                <div className="p-6 sm:p-8 h-full">
                  <div className="flex items-center gap-2 text-[#0F5D73]"><MessageCircle className="w-5 h-5" /><h3 className="text-base font-black">What happens after you request?</h3></div>
                  <div className="mt-5 space-y-5">
                    {[
                      ['Request received', 'Your order is created against the selected KAYAD vehicle.'],
                      ['Service coordination', 'Assignment, pricing and scheduling are shown only when returned by the inspection service.'],
                      ['Inspection completed', 'Your order can show the completed score, notes and inspection images.'],
                      ['Report available', 'Your report becomes visible in My Reports when the order contains completed report data.'],
                    ].map(([title, text], index) => (
                      <div key={title} className="flex gap-3">
                        <div className="relative">
                          <span className="w-7 h-7 rounded-full bg-white border border-[#CDE9E5] text-[#0F5D73] flex items-center justify-center text-[10px] font-black">{index + 1}</span>
                          {index < 3 && <span className="absolute top-7 left-1/2 -translate-x-1/2 h-6 border-l border-dashed border-[#CDE9E5]" />}
                        </div>
                        <div><div className="text-xs font-bold text-slate-800">{title}</div><p className="text-[11px] text-slate-500 leading-5 mt-0.5">{text}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            <section className="grid md:grid-cols-3 gap-4">
              <Card className="p-5"><BadgeCheck className="w-5 h-5 text-[#13B8A6]" /><h3 className="mt-3 text-sm font-black text-[#0F5D73]">For first-time buyers</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">Start with the vehicle you are considering, understand the request flow, and keep the inspection record tied to that vehicle.</p></Card>
              <Card className="p-5"><Clock className="w-5 h-5 text-[#176B87]" /><h3 className="mt-3 text-sm font-black text-[#0F5D73]">For returning customers</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">Sign in to see your active inspection requests and completed reports without searching for them again.</p><Button variant="secondary" size="sm" className="mt-4" onClick={() => user ? setActiveTab('bookings') : onOpenAuth?.()}>{user ? 'Open my inspections' : 'Sign in to continue'} <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button></Card>
              <Card className="p-5"><BriefcaseBusiness className="w-5 h-5 text-[#176B87]" /><h3 className="mt-3 text-sm font-black text-[#0F5D73]">For inspection providers</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">Apply to participate, then manage eligible service work through the provider business surface after your application is accepted.</p><button type="button" onClick={() => setShowProviderModal(true)} className="mt-4 text-xs font-bold text-[#0F5D73] inline-flex items-center gap-1.5">Apply as a provider <ArrowRight className="w-3.5 h-3.5" /></button></Card>
            </section>

            {!user && <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><div className="text-xs font-black text-[#0F5D73]">Already have an inspection request?</div><p className="text-xs text-slate-500 mt-1">Sign in to see the current status and any reports returned for your account.</p></div><Button variant="primary" onClick={onOpenAuth}>Sign in to view my inspections</Button></div>}
          </div>
        )}

        {/* TAB 3: DIGITAL REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fade-in">
            <PageHeader
              badgeIcon={<FileCheck className="w-4 h-4 text-emerald-600" />}
              badgeText="My Digital Inspection Reports"
              title="My Inspection Reports"
              description="Review reports from your own inspection orders. Only information available for your completed inspection is shown."
            />

            {reports.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                <FileCheck className="w-9 h-9 mx-auto text-[#13B8A6] mb-3" />
                <h3 className="text-sm font-bold text-[#0F5D73]">No inspection reports yet</h3>
                <p className="text-xs text-slate-500 mt-1">Completed report data will appear here when your inspection is finished and the report is available.</p>
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
                        <span className="text-[10px] text-slate-300 block">Inspection score</span>
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
              description="Track your inspection requests, assignment, schedule, payment state and report availability in one place."
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
                            <span className="text-[11px] text-slate-500">Your inspection requests will appear here with their current status and next step.</span>
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
                            <ShieldCheck className="w-3 h-3 text-[#13B8A6]" /> KAYAD assignment
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
              <div className="font-bold text-[#176B87]">Inspection information</div>
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
                Report information supplied for this completed inspection.
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
                  <span>This request only asks for the information currently needed to create the inspection request. Any later scheduling or payment step will appear when available for your order.</span>
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
                  <p className="text-xs text-slate-500 mt-1">KAYAD will coordinate the inspection and your order will show its current status.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Vehicle</span><strong className="text-slate-800 text-right">{vehicles.find(v => v.id === targetVehicleId)?.title || 'Not selected'}</strong></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Location</span><strong className="text-slate-800 text-right">{vehicles.find(v => v.id === targetVehicleId)?.location || 'Not returned'}</strong></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Phone</span><strong className="text-slate-800 text-right">{buyerPhone || 'Not provided'}</strong></div>
                  <div className="flex justify-between gap-4 pt-2 border-t border-slate-200"><span className="text-slate-500">Pricing</span><strong className="text-[#0F5D73]">Shown when available</strong></div>
                </div>
                <div className="bg-[#E8F5F3] p-3 rounded-xl border border-[#CDE9E5] text-xs text-[#0A5A50] flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#13B8A6] shrink-0 mt-0.5" />
                  <span>Submitting this request does not mean payment has been completed. Any payment step will be shown separately when required.</span>
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
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Assignment</span><strong className="text-slate-800">KAYAD coordinated</strong></div>
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

      {showProviderModal && (
        <Modal
          isOpen={true}
          onClose={() => !providerSubmitting && setShowProviderModal(false)}
          maxWidth="2xl"
          title={<div className="flex items-center gap-2"><BriefcaseBusiness className="w-5 h-5 text-[#13B8A6]" /><span>Apply to become an inspection provider</span></div>}
        >
          {!user ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#E8F5F3] text-[#0F5D73] flex items-center justify-center"><BriefcaseBusiness className="w-6 h-6" /></div>
              <div><h3 className="text-lg font-black text-[#0F5D73]">Create or sign in to your KAYAD account</h3><p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">Provider applications are authenticated and reviewed through KAYAD. Your application is not created anonymously.</p></div>
              <Button variant="primary" onClick={onOpenAuth}>Sign in / Create account</Button>
            </div>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (providerSubmitting) return;
              setProviderSubmitting(true);
              try {
                const result = await inspectionApi.registerProvider({
                  companyName: providerForm.companyName || undefined, phone: providerForm.phone || undefined,
                  country: 'Kenya', county: providerForm.county || undefined, town: providerForm.town || undefined,
                  address: providerForm.address || undefined, serviceTypes: providerForm.serviceTypes.split(',').map(v => v.trim()).filter(Boolean),
                });
                showToast((result as any)?.message || 'Provider application submitted for review.');
                setShowProviderModal(false);
              } catch (error) {
                showToast(error instanceof Error ? error.message : 'Provider application could not be submitted.');
              } finally { setProviderSubmitting(false); }
            }} className="space-y-4">
              <div className="rounded-xl bg-[#F5F8F8] border border-slate-200 p-4 text-xs text-slate-600"><strong className="text-[#0F5D73]">Provider onboarding</strong><p className="mt-1">Submit the business details you are comfortable providing. KAYAD will return the authoritative application outcome; this form does not grant provider access immediately.</p></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Business / trading name" value={providerForm.companyName} onChange={e => setProviderForm(v => ({...v, companyName:e.target.value}))} />
                <Input label="Contact phone" value={providerForm.phone} onChange={e => setProviderForm(v => ({...v, phone:e.target.value}))} required />
                <Input label="County" value={providerForm.county} onChange={e => setProviderForm(v => ({...v, county:e.target.value}))} />
                <Input label="Town / city" value={providerForm.town} onChange={e => setProviderForm(v => ({...v, town:e.target.value}))} />
              </div>
              <Input label="Business / workshop address" value={providerForm.address} onChange={e => setProviderForm(v => ({...v, address:e.target.value}))} />
              <Input label="Services offered" placeholder="e.g. pre-purchase, diagnostics, mobile inspection" value={providerForm.serviceTypes} onChange={e => setProviderForm(v => ({...v, serviceTypes:e.target.value}))} />
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200"><Button type="button" variant="secondary" onClick={() => setShowProviderModal(false)} disabled={providerSubmitting}>Cancel</Button><Button type="submit" variant="primary" disabled={providerSubmitting || !providerForm.phone}>{providerSubmitting ? 'Submitting…' : 'Submit provider application'}</Button></div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};

export default InspectionsView;
