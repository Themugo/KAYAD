import React, { useState, useMemo } from 'react';
import { Vehicle, Dealer, DealerTeamMember, DealerLead, DealerPromotion, DealerAnalytics } from '../types';
import { createPlaceholderVehicle } from '../utils/vehicleDefaults';
import { 
  Building2, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Car, 
  Sparkles, 
  DollarSign, 
  BarChart3, 
  PlusCircle, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Award, 
  Lock, 
  Zap, 
  Star, 
  Clock, 
  ChevronRight, 
  X, 
  UserCheck, 
  Tag, 
  Send, 
  Flame, 
  Globe, 
  FileText, 
  Layers, 
  Crown, 
  Megaphone, 
  Edit3, 
  Trash2, 
  Check, 
  ArrowUpRight,
  Eye,
  Calendar,
  MessageSquare,
  Shield,
  Upload,
  Download,
  FileSpreadsheet,
  Cpu,
  AlertTriangle,
  Activity,
  Gavel,
  Landmark,
  RefreshCw,
  PieChart,
  ArrowRight,
  Share2,
  CreditCard,
  MapPin,
  ExternalLink,
  FileCheck
} from 'lucide-react';
import { 
  StatWidget, 
  Card, 
  CardHeader, 
  CardTitle, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell, 
  Badge, 
  Button, 
  Input, 
  LazyImage 
} from '../components/ui';

export interface DealerBusinessViewProps {
  vehicles: Vehicle[];
  onAddVehicle?: (vehicle: Vehicle) => void;
  onQuickViewVehicle?: (v: Vehicle) => void;
  onStartEscrow?: (v: Vehicle) => void;
}

// Module Types
export type DealerTabModule = 
  | 'dashboard' 
  | 'inventory' 
  | 'leads' 
  | 'sales' 
  | 'tradeins' 
  | 'auctions' 
  | 'staff' 
  | 'finance' 
  | 'analytics' 
  | 'marketing' 
  | 'billing' 
  | 'settings';

export interface TradeInRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  targetVehicleTitle: string;
  tradeInVehicleTitle: string;
  tradeInYear: number;
  tradeInMileage: number;
  estimatedMarketValue: number;
  dealerAppraisalOffer: number;
  inspectionPassed: boolean;
  status: 'Pending Appraisal' | 'Appraised' | 'Offer Accepted' | 'Declined';
  requestedDate: string;
}

export interface AuctionLot {
  id: string;
  vehicleTitle: string;
  vehicleImage: string;
  year: number;
  mileage: number;
  startingPrice: number;
  reservePrice: number;
  currentHighestBid: number;
  bidsCount: number;
  highestBidderDealer: string;
  endsInHours: number;
  status: 'Active' | 'Reserve Met' | 'Ended';
}

export interface FinanceApplication {
  id: string;
  applicantName: string;
  applicantPhone: string;
  vehicleTitle: string;
  vehiclePrice: number;
  downPayment: number;
  financedAmount: number;
  bankPartner: 'Partner Bank A' | 'Co-operative Bank' | 'Partner Bank B' | 'Partner Bank C';
  status: 'Underwriting Review' | 'Pre-Approved' | 'Documents Required' | 'Disbursed';
  tenureMonths: number;
  monthlyInstallment: number;
  appliedDate: string;
}

export interface CallLog {
  id: string;
  customerName: string;
  customerPhone: string;
  callType: 'Inbound Call' | 'Outbound Followup';
  duration: string;
  salesRep: string;
  notes: string;
  timestamp: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  vehicleTitle: string;
  type: 'Showroom Test Drive' | 'Mechanical Inspection' | 'Handover Delivery';
  dateTime: string;
  assignedRep: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export const DealerBusinessView: React.FC<DealerBusinessViewProps> = ({
  vehicles,
  onAddVehicle,
  onQuickViewVehicle,
  onStartEscrow
}) => {
  // Toast Alert State
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Dealer Profile State
  const [currentDealer, setCurrentDealer] = useState<Dealer>({} as Dealer);
  const [teamMembers, setTeamMembers] = useState<DealerTeamMember[]>([]);
  const [leads, setLeads] = useState<DealerLead[]>([]);
  const [promotions, setPromotions] = useState<DealerPromotion[]>([]);
  const [analytics] = useState<DealerAnalytics>({ viewsByCounty: [], conversionRate: 0, averageDaysToSell: 0 } as DealerAnalytics);

  // Active Module State (12 Modules)
  const [activeTab, setActiveTab] = useState<DealerTabModule>('dashboard');

  // Inventory Sub-filters: 'all', 'active', 'drafts', 'health', 'featured'
  const [inventorySubTab, setInventorySubTab] = useState<'all' | 'active' | 'drafts' | 'health' | 'featured'>('all');
  const [inventorySearch, setInventorySearch] = useState<string>('');

  // Leads Sub-filters: 'kanban', 'inquiries', 'calls', 'appointments'
  const [leadsSubTab, setLeadsSubTab] = useState<'kanban' | 'inquiries' | 'calls' | 'appointments'>('kanban');

  // Modals
  const [showAddVehicleModal, setShowAddVehicleModal] = useState<boolean>(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState<boolean>(false);
  const [showVinDecoderModal, setShowVinDecoderModal] = useState<boolean>(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState<boolean>(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState<boolean>(false);
  const [showAddAppointmentModal, setShowAddAppointmentModal] = useState<boolean>(false);
  const [showCreateAuctionModal, setShowCreateAuctionModal] = useState<boolean>(false);
  const [showBoostModal, setShowBoostModal] = useState<Vehicle | null>(null);

  // VIN Decoder Form
  const [inputVin, setInputVin] = useState<string>('');
  const [decodedSpecs, setDecodedSpecs] = useState<any | null>(null);

  // CSV Import State
  const [csvRawText, setCsvRawText] = useState<string>(
    `Make,Model,Year,Price,Mileage,Location,VIN\nToyota,Prado TX-L,2022,7800000,31000,Kilimani,JTEBU5JR8K5011\nSubaru,Outback 2.5i,2020,3450000,48000,Westlands,JF1BS9LC5KH901\nMercedes-Benz,C200 AMG,2019,3900000,52000,Karen,WDD2050422R778`
  );
  const [csvImportedCount, setCsvImportedCount] = useState<number>(0);

  // Form States
  const [newTitle, setNewTitle] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState<number>(0);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newMileage, setNewMileage] = useState<number>(0);
  const [newLocation, setNewLocation] = useState('');
  const [newCounty, setNewCounty] = useState('Nairobi');
  const [newImage, setNewImage] = useState('');
  const [isDraft, setIsDraft] = useState<boolean>(false);

  // Team Form
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<DealerTeamMember['role']>('Senior Sales Agent');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');

  // Lead Form
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadVehicleTitle, setNewLeadVehicleTitle] = useState(vehicles[0]?.title || '');

  const [tradeIns, setTradeIns] = useState<TradeInRequest[]>([]);

  const [auctionLots, setAuctionLots] = useState<AuctionLot[]>([]);

  const [financeApps, setFinanceApps] = useState<FinanceApplication[]>([]);

  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [draftVehicles, setDraftVehicles] = useState<any[]>([]);

  // Dealer Vehicles Filtered
  const dealerVehicles = useMemo(() => {
    return vehicles.filter(v => v.sellerName.toLowerCase().includes('crown') || v.sellerName.toLowerCase().includes('dealer') || v.sellerType === 'Verified Dealer');
  }, [vehicles]);

  const filteredInventory = useMemo(() => {
    return dealerVehicles.filter(v => {
      if (inventorySearch) {
        const q = inventorySearch.toLowerCase();
        if (!v.title.toLowerCase().includes(q) && !v.make.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [dealerVehicles, inventorySearch]);

  // Total floorplan value
  const totalFloorplan = dealerVehicles.reduce((sum, v) => sum + v.price, 0);

  const handleDecodeVin = () => {
    if (!inputVin || inputVin.length < 6) {
      showToast('Please enter a valid 17-digit VIN / Chassis number');
      return;
    }
    setDecodedSpecs(null);
    showToast('VIN decoding requires the live NTSA/manufacturer integration and is not available from placeholder data.');
  };

  const handleCreateFromVin = () => {
    if (!decodedSpecs) return;

    const created: Vehicle = createPlaceholderVehicle({
      id: `v-vin-${Date.now()}`,
      title: `${decodedSpecs.year} ${decodedSpecs.make} ${decodedSpecs.model}`,
      make: decodedSpecs.make,
      model: decodedSpecs.model,
      year: decodedSpecs.year,
      price: decodedSpecs.estimatedValue,
      mileage: 41000,
      fuelType: 'Diesel',
      transmission: 'Automatic',
      location: 'Westlands Showroom',
      county: 'Nairobi',
      sellerType: 'Verified Dealer',
      sellerName: currentDealer.name,
      sellerRating: 4.9,
      verified: true,
      inspectionPassed: true,
      escrowEligible: true,
      financeAvailable: true,
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      listingFreshness: 'Just Listed (VIN Decoded)',
      responseTime: '< 10 mins'
    });

    onAddVehicle?.(created);
    setShowVinDecoderModal(false);
    setDecodedSpecs(null);
    showToast(`Added VIN-decoded "${created.title}" to inventory!`);
  };

  // CSV Bulk Import Logic Simulation
  const handleCsvImportSubmit = () => {
    const lines = csvRawText.trim().split('\n');
    if (lines.length <= 1) {
      showToast('No valid CSV records detected.');
      return;
    }

    let added = 0;
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 4) {
        const make = parts[0]?.trim() || 'Toyota';
        const model = parts[1]?.trim() || 'Vehicle';
        const year = parseInt(parts[2]?.trim() || '2020');
        const price = parseInt(parts[3]?.trim() || '3500000');
        const mileage = parseInt(parts[4]?.trim() || '45000');
        const loc = parts[5]?.trim() || 'Nairobi Yard';

        const created: Vehicle = createPlaceholderVehicle({
          id: `v-csv-${Date.now()}-${i}`,
          title: `${year} ${make} ${model}`,
          make,
          model,
          year,
          price,
          mileage,
          fuelType: 'Gasoline',
          transmission: 'Automatic',
          location: loc,
          county: 'Nairobi',
          sellerType: 'Verified Dealer',
          sellerName: currentDealer.name,
          sellerRating: 4.9,
          verified: true,
          inspectionPassed: true,
          escrowEligible: true,
          financeAvailable: true,
          image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800',
          listingFreshness: 'Bulk CSV Imported',
          responseTime: '< 10 mins'
        });

        onAddVehicle?.(created);
        added++;
      }
    }

    setCsvImportedCount(added);
    setShowCsvImportModal(false);
    showToast(`Bulk imported ${added} vehicles into ${currentDealer.name} Showroom!`);
  };

  // Handle Add Vehicle Form
  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrice) {
      showToast('Please provide vehicle title and price');
      return;
    }

    if (isDraft) {
      setDraftVehicles([
        ...draftVehicles,
        {
          id: `draft-${Date.now()}`,
          title: newTitle,
          price: Number(newPrice),
          mileage: Number(newMileage),
          location: newLocation,
          missingInfo: 'Draft Saved - Needs photos'
        }
      ]);
      setShowAddVehicleModal(false);
      showToast(`Saved "${newTitle}" as Draft in inventory console.`);
      return;
    }

    const createdVehicle: Vehicle = createPlaceholderVehicle({
      id: `v-d-${Date.now()}`,
      title: newTitle,
      make: newMake,
      model: newModel,
      year: Number(newYear),
      price: Number(newPrice),
      mileage: Number(newMileage),
      fuelType: 'Diesel',
      transmission: 'Automatic',
      location: newLocation,
      county: newCounty,
      sellerType: 'Verified Dealer',
      sellerName: currentDealer.name,
      sellerRating: currentDealer.rating,
      verified: true,
      inspectionPassed: true,
      escrowEligible: true,
      financeAvailable: true,
      image: newImage || 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=800',
      listingFreshness: 'Just Listed',
      responseTime: '< 10 mins'
    });

    onAddVehicle?.(createdVehicle);
    setShowAddVehicleModal(false);
    showToast(`Added "${newTitle}" to ${currentDealer.name} Showroom Inventory!`);
    setNewTitle('');
  };

  // Handle Add Staff
  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberPhone) return;

    const newMember: DealerTeamMember = {
      id: `team-${Date.now()}`,
      dealerId: currentDealer.id,
      name: newMemberName,
      role: newMemberRole,
      email: newMemberEmail || `${newMemberName.toLowerCase().replace(/\s+/g, '.')}@crownmotors.co.ke`,
      phone: newMemberPhone,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      assignedLeadsCount: 0,
      closedDealsCount: 0,
      active: true
    };

    setTeamMembers([...teamMembers, newMember]);
    setShowAddTeamModal(false);
    showToast(`Added ${newMemberName} as ${newMemberRole}`);
    setNewMemberName('');
    setNewMemberPhone('');
  };

  // Handle Add Lead
  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadPhone) return;

    const newLead: DealerLead = {
      id: `lead-${Date.now()}`,
      dealerId: currentDealer.id,
      vehicleTitle: newLeadVehicleTitle,
      customerName: newLeadName,
      customerPhone: newLeadPhone,
      customerEmail: newLeadEmail,
      source: 'Marketplace Listing',
      status: 'New Lead',
      assignedToName: teamMembers[0]?.name || 'Samuel Mwaura',
      createdAt: 'Just now',
      lastFollowUp: 'Just created'
    };

    setLeads([newLead, ...leads]);
    setShowAddLeadModal(false);
    showToast(`Registered lead for ${newLeadName}`);
    setNewLeadName('');
    setNewLeadPhone('');
  };

  // Boost Listing Action
  const handleBoostListing = (vehicle: Vehicle, type: DealerPromotion['type'], cost: number) => {
    const newPromo: DealerPromotion = {
      id: `promo-${Date.now()}`,
      dealerId: currentDealer.id,
      vehicleId: vehicle.id,
      vehicleTitle: vehicle.title,
      type,
      durationDays: 7,
      startDate: '2026-07-29',
      endDate: '2026-08-05',
      costKsh: cost,
      impressionsCount: 140,
      clicksCount: 18,
      status: 'Active'
    };

    setPromotions([newPromo, ...promotions]);
    setShowBoostModal(null);
    showToast(`Activated ${type} boost for "${vehicle.title}"!`);
  };

  // Navigation Items (12 Modules)
  const moduleTabs: { id: DealerTabModule; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: '1. Dealer Dashboard', icon: <BarChart3 className="w-4 h-4 text-amber-500" /> },
    { id: 'inventory', label: `2. Vehicle Inventory (${dealerVehicles.length})`, icon: <Car className="w-4 h-4 text-[#1E3063]" /> },
    { id: 'leads', label: `3. Leads CRM (${leads.length})`, icon: <Users className="w-4 h-4 text-blue-500" /> },
    { id: 'sales', label: '4. Sales Pipeline & Escrow', icon: <Lock className="w-4 h-4 text-emerald-600" /> },
    { id: 'tradeins', label: `5. Trade-ins (${tradeIns.length})`, icon: <RefreshCw className="w-4 h-4 text-purple-600" /> },
    { id: 'auctions', label: `6. B2B Auctions (${auctionLots.length})`, icon: <Gavel className="w-4 h-4 text-amber-600" /> },
    { id: 'staff', label: `7. Staff Management (${teamMembers.length})`, icon: <UserCheck className="w-4 h-4 text-emerald-600" /> },
    { id: 'finance', label: `8. Finance Apps (${financeApps.length})`, icon: <Landmark className="w-4 h-4 text-indigo-600" /> },
    { id: 'analytics', label: '9. Performance Analytics', icon: <PieChart className="w-4 h-4 text-blue-600" /> },
    { id: 'marketing', label: '10. Marketing & Boosts', icon: <Megaphone className="w-4 h-4 text-rose-500" /> },
    { id: 'billing', label: '11. Billing & Escrow Payouts', icon: <CreditCard className="w-4 h-4 text-emerald-600" /> },
    { id: 'settings', label: '12. Showroom Settings', icon: <Building2 className="w-4 h-4 text-slate-600" /> }
  ];

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
          HEADER & DEALERSHIP CONSOLE BANNER
          ========================================== */}
      <div className="bg-gradient-to-r from-[#17244B] via-[#1E3063] to-[#17244B] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-400/20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="accent" size="md" className="bg-amber-400 text-[#17244B] font-black">
                <Crown className="w-3.5 h-3.5 text-[#17244B]" /> {currentDealer.subscriptionTier} Showroom OS
              </Badge>
              <Badge variant="verified" size="md" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> KRA PIN & NTSA TIMS Audited
              </Badge>
              <span className="text-xs text-amber-300 font-bold bg-white/10 px-3 py-1 rounded-full">
                {currentDealer.location} Yard
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              KAYAD Dealership Operating System
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Operating <strong className="text-amber-400">{currentDealer.name}</strong> • Total Active Floorplan: <strong className="text-emerald-400">Ksh {totalFloorplan.toLocaleString()}</strong> across {dealerVehicles.length} verified showroom vehicles.
            </p>
          </div>

          {/* Direct Quick Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="accent"
              size="sm"
              onClick={() => setShowAddVehicleModal(true)}
              className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-black shadow-md"
            >
              <PlusCircle className="w-4 h-4 text-[#17244B]" />
              <span>Add Vehicle</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowVinDecoderModal(true)}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 font-bold"
            >
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>VIN Decoder</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCsvImportModal(true)}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 font-bold"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>CSV Bulk Upload</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ==========================================
          12-MODULE NAVIGATION BAR TABS
          ========================================== */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 py-2 px-2 rounded-2xl shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {moduleTabs.map((tab) => (
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
          MODULE 1: DEALER DASHBOARD
          ========================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive Telemetry KPI Widgets */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <StatWidget
              label="Total Floorplan"
              value={`Ksh ${(totalFloorplan / 1000000).toFixed(1)}M`}
              trend={`${dealerVehicles.length} Listed Cars`}
              trendType="positive"
              icon={<Car className="w-4 h-4 text-[#1E3063]" />}
            />
            <StatWidget
              label="Active CRM Leads"
              value={`${leads.length} Leads`}
              trend="4 Pending Followups"
              trendType="positive"
              icon={<Users className="w-4 h-4 text-amber-500" />}
            />
            <StatWidget
              label="Conversion Rate"
              value={`${analytics.conversionRate}%`}
              trend="Top 5% Showroom"
              trendType="positive"
              icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
            />
            <StatWidget
              label="Avg Days to Sale"
              value={`${analytics.averageDaysToSell} Days`}
              trend="Prado & CX-5 fastest"
              trendType="neutral"
              icon={<Clock className="w-4 h-4 text-blue-500" />}
            />
            <StatWidget
              label="Escrow Vault Locked"
              value="Ksh 7.3M"
              trend="1 Active Transaction"
              trendType="positive"
              icon={<Lock className="w-4 h-4 text-emerald-600" />}
            />
            <StatWidget
              label="Subscription Tier"
              value="Gold Enterprise"
              trend="Unlimited Fleet"
              trendType="positive"
              icon={<Crown className="w-4 h-4 text-amber-400" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Main Operational View (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Quick Actions Panel */}
              <Card className="p-5 bg-white border-slate-200 space-y-4">
                <h3 className="text-sm font-black text-[#1E3063] font-display flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Digital Showroom Quick Controls
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <button
                    onClick={() => setShowAddVehicleModal(true)}
                    className="p-3 bg-amber-50 hover:bg-amber-100 text-[#17244B] font-extrabold rounded-xl border border-amber-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <PlusCircle className="w-5 h-5 text-amber-600" />
                    <span>Add Showroom Vehicle</span>
                  </button>

                  <button
                    onClick={() => setShowVinDecoderModal(true)}
                    className="p-3 bg-blue-50 hover:bg-blue-100 text-[#17244B] font-extrabold rounded-xl border border-blue-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <Cpu className="w-5 h-5 text-blue-600" />
                    <span>VIN Auto-Decoder</span>
                  </button>

                  <button
                    onClick={() => setShowCsvImportModal(true)}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 text-[#17244B] font-extrabold rounded-xl border border-emerald-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span>CSV Inventory Import</span>
                  </button>

                  <button
                    onClick={() => setShowAddLeadModal(true)}
                    className="p-3 bg-purple-50 hover:bg-purple-100 text-[#17244B] font-extrabold rounded-xl border border-purple-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <Users className="w-5 h-5 text-purple-600" />
                    <span>Register Buyer Lead</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('tradeins')}
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 text-[#17244B] font-extrabold rounded-xl border border-indigo-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <RefreshCw className="w-5 h-5 text-indigo-600" />
                    <span>Trade-in Appraisals</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('auctions')}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-[#17244B] font-extrabold rounded-xl border border-slate-300 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <Gavel className="w-5 h-5 text-slate-700" />
                    <span>B2B Wholesale Auction</span>
                  </button>
                </div>
              </Card>

              {/* Showroom Stock Performance Overview */}
              <Card className="p-5 bg-white border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2">
                    <Car className="w-4 h-4 text-emerald-600" /> Showroom Stock Status & Impressions
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('inventory')}>
                    View All Stock ({dealerVehicles.length})
                  </Button>
                </div>

                <div className="space-y-3">
                  {dealerVehicles.slice(0, 4).map((v) => (
                    <div key={v.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <LazyImage src={v.image} alt={v.title} wrapperClassName="w-14 h-12 rounded-xl shrink-0 bg-slate-900" className="w-full h-full object-cover" />
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-[#1E3063] truncate">{v.title}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">Ksh {v.price.toLocaleString()} • {v.location}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="verified" size="sm">Active</Badge>
                        <Button variant="accent" size="sm" onClick={() => setShowBoostModal(v)}>
                          <Flame className="w-3.5 h-3.5 text-[#17244B]" /> Boost
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Side CRM & Escrow Deals Pipeline (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Active Escrow Deal Progress */}
              <Card className="p-5 bg-gradient-to-br from-white via-amber-50/20 to-emerald-50/30 border-amber-300 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <Badge variant="escrow" size="sm">
                    <Lock className="w-3.5 h-3.5 text-amber-500" /> Active Escrow Deal
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-extrabold">ESC-9081</span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-[#1E3063] text-sm">2021 Toyota Land Cruiser Prado TX-L</h4>
                  <p className="text-xs text-slate-600">Buyer: <strong>Dr. Samuel Omondi</strong> (+254 722 *** 902)</p>
                  <p className="text-lg font-black text-emerald-700 font-display">Ksh 7,300,000 Secured in Vault</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-700 text-[11px]">
                    <span>TIMS Transfer & Handover Progress</span>
                    <span className="text-emerald-600">Step 4 of 6</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-2/3" />
                  </div>
                  <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Action: Awaiting Signed NTSA Form 9
                  </p>
                </div>

                <Button variant="primary" size="sm" fullWidth onClick={() => setActiveTab('sales')}>
                  Open Escrow Transaction Console
                </Button>
              </Card>

              {/* Recent Buyer Leads List */}
              <Card className="p-5 bg-white border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" /> Buyer Lead Queue
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('leads')}>
                    View CRM
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {leads.slice(0, 3).map((l) => (
                    <div key={l.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-[#1E3063]">{l.customerName}</span>
                        <Badge variant="neutral" size="sm">{l.status}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{l.vehicleTitle}</p>
                      <p className="text-[10px] text-slate-400">Assigned: {l.assignedToName}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODULE 2: VEHICLE INVENTORY MANAGEMENT
          ========================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory Sub-navigation Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
              {[
                { id: 'all', label: `All Stock (${dealerVehicles.length})` },
                { id: 'active', label: 'Active Showroom' },
                { id: 'drafts', label: `Drafts (${draftVehicles.length})` },
                { id: 'health', label: 'Inventory Health Alerts' },
                { id: 'featured', label: `Featured & Boosted (${promotions.length})` }
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setInventorySubTab(sub.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all whitespace-nowrap ${
                    inventorySubTab === sub.id
                      ? 'bg-[#1E3063] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Input
                placeholder="Search make, model, VIN..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                className="w-full md:w-64"
              />

              <Button variant="accent" size="md" onClick={() => setShowAddVehicleModal(true)} className="shrink-0">
                <PlusCircle className="w-4 h-4 text-[#17244B]" />
                <span>Add Vehicle</span>
              </Button>
            </div>
          </div>

          {/* INVENTORY SUB-TAB 1: INVENTORY HEALTH & ALERTS */}
          {inventorySubTab === 'health' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="p-5 bg-amber-50/60 border-amber-300 space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">Aging Stock Warning (&gt;40 Days)</h4>
                </div>
                <p className="text-xs text-amber-900">
                  2 vehicles have been listed for over 40 days without price adjustments.
                </p>
                <div className="p-3 bg-white rounded-xl text-xs space-y-1 border border-amber-200">
                  <p className="font-extrabold text-[#1E3063]">2019 Nissan X-Trail Hybrid</p>
                  <p className="text-[11px] text-slate-500">42 Days on Yard • Price: Ksh 2,850,000</p>
                  <Button variant="outline" size="sm" className="mt-1" onClick={() => showToast('Price reduced by Ksh 100,000 to trigger buyer alert!')}>
                    Apply Recommended Ksh 100k Discount
                  </Button>
                </div>
              </Card>

              <Card className="p-5 bg-blue-50/60 border-blue-300 space-y-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  <h4 className="font-extrabold text-sm">NTSA Logbook Verification</h4>
                </div>
                <p className="text-xs text-blue-900">
                  100% of your listed showroom inventory has verified TIMS logbook records.
                </p>
                <div className="p-3 bg-white rounded-xl text-xs space-y-1 border border-blue-200">
                  <p className="font-bold text-emerald-700">✓ Audit Badge Active on Marketplace</p>
                  <p className="text-[11px] text-slate-500">Boosts buyer inquiry rate by +38%</p>
                </div>
              </Card>

              <Card className="p-5 bg-emerald-50/60 border-emerald-300 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-extrabold text-sm">Photo Quality Index</h4>
                </div>
                <p className="text-xs text-emerald-900">
                  All active vehicles feature 4K exterior and 360-degree interior imagery.
                </p>
                <div className="p-3 bg-white rounded-xl text-xs space-y-1 border border-emerald-200">
                  <p className="font-bold text-[#1E3063]">HD Studio Badge Granted</p>
                </div>
              </Card>
            </div>
          )}

          {/* INVENTORY SUB-TAB 2: DRAFTS MANAGEMENT */}
          {inventorySubTab === 'drafts' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" /> Saved Vehicle Drafts ({draftVehicles.length})
              </h3>

              <div className="space-y-3">
                {draftVehicles.map((d) => (
                  <div key={d.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <Badge variant="warning" size="sm">DRAFT</Badge>
                      <h4 className="font-extrabold text-sm text-[#1E3063] mt-1">{d.title}</h4>
                      <p className="text-slate-500 font-medium">Target Price: Ksh {d.price.toLocaleString()} • {d.location}</p>
                      <p className="text-rose-600 font-bold text-[11px] mt-1">{d.missingInfo}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="accent" size="sm" onClick={() => showToast('Publishing draft to active showroom...')}>
                        Complete & Publish
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDraftVehicles(prev => prev.filter(x => x.id !== d.id))}>
                        Discard
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* STANDARD STOCK DISPLAY GRID */}
          {inventorySubTab !== 'drafts' && inventorySubTab !== 'health' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredInventory.map((v) => (
                <Card key={v.id} className="p-4 space-y-3 hover:border-amber-400 transition-all shadow-card flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="relative">
                      <LazyImage src={v.image} alt={v.title} wrapperClassName="w-full h-44 rounded-xl overflow-hidden bg-slate-900" className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 flex gap-1">
                        <Badge variant="verified" size="sm">
                          Verified Stock
                        </Badge>
                        {v.escrowEligible && (
                          <Badge variant="escrow" size="sm">
                            Escrow Ready
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-[#1E3063] text-sm font-display">{v.title}</h4>
                      <p className="text-lg font-black text-amber-600 font-display mt-0.5">Ksh {v.price.toLocaleString()}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{v.location} • {v.mileage.toLocaleString()} km • {v.fuelType}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => onQuickViewVehicle?.(v)}>
                      <Eye className="w-3.5 h-3.5 text-slate-600" /> Preview
                    </Button>
                    <Button variant="accent" size="sm" onClick={() => setShowBoostModal(v)}>
                      <Flame className="w-3.5 h-3.5 text-[#17244B]" /> Boost Placement
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          MODULE 3: LEADS & CRM PIPELINE
          ========================================== */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'kanban', label: 'CRM Pipeline Board' },
                { id: 'inquiries', label: `Inquiries (${leads.length})` },
                { id: 'calls', label: `Call Logs (${callLogs.length})` },
                { id: 'appointments', label: `Appointments (${appointments.length})` }
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setLeadsSubTab(sub.id as any)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                    leadsSubTab === sub.id
                      ? 'bg-[#1E3063] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <Button variant="primary" size="sm" onClick={() => setShowAddLeadModal(true)}>
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" /> Add New Lead
            </Button>
          </div>

          {/* CRM KANBAN BOARD VIEW */}
          {leadsSubTab === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto">
              {[
                { stage: 'New Inquiry', color: 'border-blue-400 bg-blue-50/30' },
                { stage: 'Contacted & Qualified', color: 'border-amber-400 bg-amber-50/30' },
                { stage: 'Test Drive Scheduled', color: 'border-purple-400 bg-purple-50/30' },
                { stage: 'Escrow / Deposit Paid', color: 'border-emerald-400 bg-emerald-50/30' }
              ].map((col) => {
                const colLeads = leads.filter(l => {
                  if (col.stage.includes('New') && l.status === 'New Lead') return true;
                  if (col.stage.includes('Contacted') && l.status === 'In Contact') return true;
                  if (col.stage.includes('Test Drive') && l.status === 'Test Drive Scheduled') return true;
                  if (col.stage.includes('Escrow') && l.status === 'Deposit Paid') return true;
                  return false;
                });

                return (
                  <div key={col.stage} className={`p-4 rounded-2xl border ${col.color} space-y-3 min-w-[240px]`}>
                    <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                      <h4 className="font-extrabold text-xs text-[#1E3063] uppercase tracking-wider">{col.stage}</h4>
                      <Badge variant="neutral" size="sm">{colLeads.length}</Badge>
                    </div>

                    <div className="space-y-2.5">
                      {colLeads.map((l) => (
                        <Card key={l.id} className="p-3 bg-white space-y-2 border-slate-200 shadow-xs hover:shadow-md transition-all">
                          <p className="font-black text-xs text-[#1E3063]">{l.customerName}</p>
                          <p className="text-[11px] text-slate-500 font-medium truncate">{l.vehicleTitle}</p>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>{l.customerPhone}</span>
                            <span className="font-bold text-slate-700">{l.assignedToName}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CALL LOGS VIEW */}
          {leadsSubTab === 'calls' && (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Sales Rep</TableHead>
                    <TableHead>Call Summary Notes</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callLogs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-extrabold text-xs text-[#1E3063]">{c.customerName}</TableCell>
                      <TableCell className="font-mono text-xs">{c.customerPhone}</TableCell>
                      <TableCell><Badge variant="neutral" size="sm">{c.callType}</Badge></TableCell>
                      <TableCell className="text-xs font-bold text-slate-700">{c.duration}</TableCell>
                      <TableCell className="text-xs font-bold text-[#1E3063]">{c.salesRep}</TableCell>
                      <TableCell className="text-xs text-slate-600">{c.notes}</TableCell>
                      <TableCell className="text-[11px] text-slate-400 font-semibold">{c.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* APPOINTMENTS VIEW */}
          {leadsSubTab === 'appointments' && (
            <Card className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-[#1E3063] text-sm">Scheduled Test Drives & Handover Appointments</h3>
                <Button variant="outline" size="sm" onClick={() => showToast('Test drive calendar synced with Safaricom SMS alerts!')}>
                  Sync Google Calendar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.map((a) => (
                  <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <Badge variant={a.status === 'Completed' ? 'success' : 'escrow'} size="sm">{a.status}</Badge>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">{a.dateTime}</span>
                    </div>

                    <h4 className="font-extrabold text-[#1E3063] text-sm">{a.customerName}</h4>
                    <p className="text-slate-600"><strong>Vehicle:</strong> {a.vehicleTitle}</p>
                    <p className="text-slate-500"><strong>Type:</strong> {a.type} • Rep: {a.assignedRep}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ==========================================
          MODULE 4: SALES PIPELINE & ESCROW
          ========================================== */}
      {activeTab === 'sales' && (
        <Card className="p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-black text-[#1E3063] font-display flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600" /> Sales Pipeline & Escrow Vault Clearance
              </h2>
              <p className="text-xs text-slate-500">Capital security guaranteed by KAYAD 4-Way Escrow Protocol.</p>
            </div>

            <Badge variant="success" size="md">
              100% Capital Protection Active
            </Badge>
          </div>

          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-300 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] text-emerald-800 font-extrabold uppercase">Active Vault Transaction</span>
                <h3 className="text-base font-black text-[#1E3063]">2021 Toyota Land Cruiser Prado TX-L</h3>
                <p className="text-xs text-slate-600">Buyer: Dr. Samuel Omondi • Agreed Price: <strong>Ksh 7,300,000</strong></p>
              </div>
              <span className="text-2xl font-black text-emerald-700 font-display">Ksh 7,300,000</span>
            </div>

            <div className="p-3 bg-white rounded-xl text-xs space-y-2 border border-emerald-200">
              <p className="font-bold text-[#1E3063]">Mandatory Escrow Milestones:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                <div className="p-2 bg-emerald-100 rounded-lg font-bold text-emerald-900">1. Vault Deposited ✓</div>
                <div className="p-2 bg-emerald-100 rounded-lg font-bold text-emerald-900">2. 150-Pt Inspection ✓</div>
                <div className="p-2 bg-amber-100 rounded-lg font-bold text-amber-900">3. TIMS Logbook Transfer (Pending)</div>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-400">4. Payout Release</div>
              </div>
            </div>

            <Button variant="accent" size="md" onClick={() => showToast('Uploading NTSA TIMS Transfer Form 9...')}>
              <Upload className="w-4 h-4 text-[#17244B]" /> Upload NTSA Logbook Transfer Form 9
            </Button>
          </div>
        </Card>
      )}

      {/* ==========================================
          MODULE 5: TRADE-INS
          ========================================== */}
      {activeTab === 'tradeins' && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-black text-[#1E3063] font-display flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-600" /> Trade-in Appraisal Management
            </h2>
            <p className="text-xs text-slate-500">Review trade-in offers submitted by buyers upgrading to your showroom stock.</p>
          </div>

          <div className="space-y-4">
            {tradeIns.map((t) => (
              <div key={t.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <Badge variant="neutral" size="sm">{t.status}</Badge>
                  <span className="text-[11px] text-slate-400 font-semibold">{t.requestedDate}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Buyer's Trade-in Vehicle</span>
                    <h4 className="font-extrabold text-[#1E3063] text-sm">{t.tradeInVehicleTitle}</h4>
                    <p className="text-slate-600">{t.tradeInYear} • {t.tradeInMileage.toLocaleString()} km • Inspection Passed</p>
                    <p className="text-emerald-700 font-black mt-1">Est Market Value: Ksh {t.estimatedMarketValue.toLocaleString()}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Target Showroom Vehicle</span>
                    <h4 className="font-extrabold text-[#1E3063] text-sm">{t.targetVehicleTitle}</h4>
                    <p className="text-slate-600">Customer: <strong>{t.customerName}</strong> ({t.customerPhone})</p>
                    <p className="text-amber-600 font-black mt-1">Dealer Appraisal Offer: Ksh {t.dealerAppraisalOffer.toLocaleString()}</p>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button variant="accent" size="sm" onClick={() => showToast('Appraisal offer approved and sent to buyer!')}>
                    Approve Appraisal Offer
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => showToast('Counter offer sent to buyer.')}>
                    Counter Appraisal Value
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ==========================================
          MODULE 6: B2B WHOLESALE AUCTIONS
          ========================================== */}
      {activeTab === 'auctions' && (
        <div className="space-y-6">
          <Card className="p-5 bg-gradient-to-r from-[#1E3063] to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <Badge variant="accent" size="sm">
                <Gavel className="w-3.5 h-3.5 text-[#17244B]" /> Certified B2B Dealer Exchange
              </Badge>
              <h3 className="text-xl font-black font-display">Wholesale Fleet Auctions & Inter-Dealer Bidding</h3>
              <p className="text-xs text-slate-300">
                Buy and sell aged inventory wholesale to over 240 verified motor dealers across East Africa.
              </p>
            </div>
            <Button variant="accent" size="md" onClick={() => showToast('Creating new wholesale auction lot...')}>
              <PlusCircle className="w-4 h-4 text-[#17244B]" /> Create Auction Lot
            </Button>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {auctionLots.map((auc) => (
              <Card key={auc.id} className="p-5 space-y-4 bg-white border-slate-200">
                <div className="flex items-start gap-4">
                  <LazyImage src={auc.vehicleImage} alt={auc.vehicleTitle} wrapperClassName="w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-900" className="w-full h-full object-cover" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Badge variant={auc.status === 'Reserve Met' ? 'success' : 'warning'} size="sm">{auc.status}</Badge>
                    <h4 className="font-extrabold text-[#1E3063] text-sm truncate">{auc.vehicleTitle}</h4>
                    <p className="text-xs text-slate-500">{auc.year} • {auc.mileage.toLocaleString()} km</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Highest Bid</span>
                    <span className="text-base font-black text-emerald-700 font-display">Ksh {auc.currentHighestBid.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 block">{auc.bidsCount} Bids placed</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Highest Bidder</span>
                    <span className="font-bold text-[#1E3063] block truncate">{auc.highestBidderDealer}</span>
                    <span className="text-[10px] text-amber-600 font-extrabold block">Ends in {auc.endsInHours} hours</span>
                  </div>
                </div>

                <Button variant="primary" size="sm" fullWidth onClick={() => showToast('Placing wholesale counter-bid...')}>
                  Place Dealer Bid
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          MODULE 7: STAFF MANAGEMENT
          ========================================== */}
      {activeTab === 'staff' && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-[#1E3063] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" /> Dealership Sales Staff & Roster
            </CardTitle>
            <Button variant="primary" size="sm" onClick={() => setShowAddTeamModal(true)}>
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" /> Add Team Member
            </Button>
          </CardHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Assigned Leads</TableHead>
                <TableHead>Closed Deals</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-extrabold text-xs text-[#1E3063] flex items-center gap-2">
                    <img src={m.avatar} alt={m.name} className="w-7 h-7 rounded-full object-cover" />
                    {m.name}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-700">{m.role}</TableCell>
                  <TableCell className="text-xs text-slate-600">{m.email}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-800">{m.phone}</TableCell>
                  <TableCell className="font-bold text-xs text-blue-700">{m.assignedLeadsCount} Leads</TableCell>
                  <TableCell className="font-black text-xs text-emerald-700">{m.closedDealsCount} Closed</TableCell>
                  <TableCell><Badge variant="success" size="sm">Active</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 8: FINANCE APPLICATIONS
          ========================================== */}
      {activeTab === 'finance' && (
        <Card className="p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-black text-[#1E3063] font-display flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-600" /> Bank Asset Financing Applications
              </h2>
              <p className="text-xs text-slate-500">Track loan pre-approvals and underwriting status from KAYAD, Equity & Co-op Bank.</p>
            </div>
          </div>

          <div className="space-y-4">
            {financeApps.map((f) => (
              <div key={f.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <Badge variant={f.status === 'Pre-Approved' ? 'success' : 'warning'} size="sm">{f.status}</Badge>
                  <span className="text-xs font-bold text-indigo-700">{f.bankPartner}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Applicant</span>
                    <p className="font-extrabold text-[#1E3063]">{f.applicantName}</p>
                    <p className="text-slate-500">{f.applicantPhone}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Financed Amount</span>
                    <p className="font-black text-emerald-700 text-sm">Ksh {f.financedAmount.toLocaleString()}</p>
                    <p className="text-slate-500">Down Payment: Ksh {f.downPayment.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly Installment</span>
                    <p className="font-black text-[#1E3063] text-sm">Ksh {f.monthlyInstallment.toLocaleString()} / mo</p>
                    <p className="text-slate-500">Tenure: {f.tenureMonths} Months</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ==========================================
          MODULE 9: PERFORMANCE ANALYTICS
          ========================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 space-y-3">
              <h4 className="font-black text-[#1E3063] text-sm">30-Day Showroom Views</h4>
              <p className="text-3xl font-black text-amber-600 font-display">48,920</p>
              <p className="text-xs text-slate-500">+14.2% from last month</p>
            </Card>

            <Card className="p-5 space-y-3">
              <h4 className="font-black text-[#1E3063] text-sm">Leads Generated</h4>
              <p className="text-3xl font-black text-blue-600 font-display">142 Leads</p>
              <p className="text-xs text-slate-500">Avg response time: &lt;10 mins</p>
            </Card>

            <Card className="p-5 space-y-3">
              <h4 className="font-black text-[#1E3063] text-sm">Sales Conversion Rate</h4>
              <p className="text-3xl font-black text-emerald-600 font-display">8.4%</p>
              <p className="text-xs text-slate-500">Industry benchmark: 5.2%</p>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <h3 className="font-black text-[#1E3063] text-base font-display">Regional Traffic Distribution (Kenya Counties)</h3>
            <div className="space-y-3">
              {analytics.viewsByCounty.map((vc) => (
                <div key={vc.county} className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>{vc.county} County</span>
                    <span>{vc.views.toLocaleString()} Views</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1E3063] rounded-full" style={{ width: `${(vc.views / 50000) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 10: MARKETING
          ========================================== */}
      {activeTab === 'marketing' && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-black text-[#1E3063] font-display flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-rose-500" /> Marketing & Ad Boost Center
            </h2>
            <p className="text-xs text-slate-500">Run sponsored listing campaigns across KAYAD web and mobile channels.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promotions.map((p) => (
              <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <Badge variant="accent" size="sm">{p.type}</Badge>
                <h4 className="font-extrabold text-[#1E3063]">{p.vehicleTitle}</h4>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Impressions: <strong>{p.impressionsCount}</strong></span>
                  <span>Clicks: <strong>{p.clicksCount}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ==========================================
          MODULE 11: BILLING & PAYOUTS
          ========================================== */}
      {activeTab === 'billing' && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-black text-[#1E3063] font-display flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" /> Subscription Billing & Bank Payouts
            </h2>
            <p className="text-xs text-slate-500">Manage monthly subscription tier and designated bank accounts for escrow disbursements.</p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-sm text-[#1E3063]">Current Plan: Gold Enterprise</span>
              <Badge variant="accent" size="sm">Active</Badge>
            </div>
            <p className="text-slate-600">Renews automatically on August 28, 2026 (Ksh 65,000 / mo)</p>
            <p className="text-emerald-700 font-bold">Designated Escrow Payout Account: our escrow custodian (A/C ****8891)</p>
          </div>
        </Card>
      )}

      {/* ==========================================
          MODULE 12: SHOWROOM SETTINGS
          ========================================== */}
      {activeTab === 'settings' && (
        <Card className="p-6 max-w-2xl mx-auto space-y-4">
          <h3 className="text-lg font-black text-[#1E3063] font-display">Showroom Profile & Credentials</h3>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Dealership Business Name</label>
              <Input value={currentDealer.name} onChange={(e) => setCurrentDealer({ ...currentDealer, name: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Yard Physical Address</label>
              <Input value={currentDealer.address} onChange={(e) => setCurrentDealer({ ...currentDealer, address: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">KRA Tax PIN Number</label>
              <Input value={currentDealer.kraPin} onChange={(e) => setCurrentDealer({ ...currentDealer, kraPin: e.target.value })} />
            </div>

            <Button variant="accent" size="md" onClick={() => showToast('Saved Dealership Settings!')}>
              Save Showroom Configuration
            </Button>
          </div>
        </Card>
      )}

      {/* ==========================================
          MODAL 1: VIN AUTO-DECODER
          ========================================== */}
      {showVinDecoderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-xl w-full p-6 space-y-4 bg-white relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowVinDecoderModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Cpu className="w-6 h-6 text-amber-500" />
              <h3 className="text-xl font-black text-[#1E3063] font-display">NTSA & Factory VIN Decoder</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">17-Digit Vehicle Identification Number (VIN) / Chassis #</label>
                <div className="flex gap-2">
                  <Input value={inputVin} onChange={(e) => setInputVin(e.target.value)} placeholder="e.g. JTEBU5JR8K5098124" />
                  <Button variant="accent" size="md" onClick={handleDecodeVin} className="shrink-0">
                    Decode Specs
                  </Button>
                </div>
              </div>

              {decodedSpecs && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-fade-in">
                  <Badge variant="success" size="sm">✓ Manufacturer Database Match</Badge>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-bold">Make & Model:</span>
                      <p className="font-extrabold text-[#1E3063]">{decodedSpecs.year} {decodedSpecs.make} {decodedSpecs.model}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">Engine Code:</span>
                      <p className="font-bold text-slate-700">{decodedSpecs.engineSize}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">Transmission:</span>
                      <p className="font-bold text-slate-700">{decodedSpecs.transmission}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">Est Market Valuation:</span>
                      <p className="font-black text-amber-600">Ksh {decodedSpecs.estimatedValue.toLocaleString()}</p>
                    </div>
                  </div>

                  <Button variant="primary" size="md" fullWidth onClick={handleCreateFromVin}>
                    Create Vehicle Listing from Decoded Specs
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODAL 2: CSV BULK IMPORT
          ========================================== */}
      {showCsvImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-xl w-full p-6 space-y-4 bg-white relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowCsvImportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              <h3 className="text-xl font-black text-[#1E3063] font-display">CSV Bulk Fleet Inventory Import</h3>
            </div>

            <p className="text-xs text-slate-500">
              Paste or upload raw CSV data to bulk create multiple vehicles in your showroom console.
            </p>

            <div className="space-y-3 text-xs">
              <textarea
                rows={6}
                value={csvRawText}
                onChange={(e) => setCsvRawText(e.target.value)}
                className="w-full p-3 font-mono text-[11px] rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              <Button variant="accent" size="md" fullWidth onClick={handleCsvImportSubmit}>
                Validate & Import Fleet CSV
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODAL 3: ADD NEW VEHICLE FORM
          ========================================== */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-xl w-full p-6 space-y-4 bg-white relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAddVehicleModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-[#1E3063] font-display">Add Vehicle to {currentDealer.name} Showroom</h3>

            <form onSubmit={handleCreateVehicle} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Vehicle Title</label>
                <Input placeholder="e.g. 2022 Toyota Land Cruiser Prado TX-L 2.8L" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Price (Ksh)</label>
                  <Input type="number" value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} required />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mileage (Km)</label>
                  <Input type="number" value={newMileage} onChange={(e) => setNewMileage(Number(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Location Yard</label>
                  <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">County</label>
                  <Input value={newCounty} onChange={(e) => setNewCounty(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Photo URL</label>
                <Input value={newImage} onChange={(e) => setNewImage(e.target.value)} />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="draftCheckbox"
                  checked={isDraft}
                  onChange={(e) => setIsDraft(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
                <label htmlFor="draftCheckbox" className="font-bold text-slate-700 cursor-pointer">
                  Save as Draft (Don't publish immediately)
                </label>
              </div>

              <Button type="submit" variant="accent" size="md" fullWidth>
                {isDraft ? 'Save as Draft' : 'Save & Publish to Showroom Stock'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODAL 4: BOOST PLACEMENT
          ========================================== */}
      {showBoostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-md w-full p-6 space-y-4 bg-white relative">
            <button onClick={() => setShowBoostModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <Badge variant="accent" size="sm">
              <Flame className="w-3.5 h-3.5 text-[#17244B]" /> Boost Placement
            </Badge>
            <h3 className="text-lg font-black text-[#1E3063] font-display">{showBoostModal.title}</h3>

            <div className="space-y-2 text-xs">
              {[
                { type: 'Top of Search Boost', price: 5000, desc: 'Guaranteed #1 spot in marketplace search for 7 days' },
                { type: 'Featured Showroom Badge', price: 8500, desc: 'Highlighted with gold badge & homepage placement for 14 days' }
              ].map((b) => (
                <button
                  key={b.type}
                  onClick={() => handleBoostListing(showBoostModal, b.type as any, b.price)}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:border-amber-400 text-left flex justify-between items-center cursor-pointer transition-all bg-slate-50 hover:bg-amber-50"
                >
                  <div>
                    <p className="font-bold text-[#1E3063] text-xs">{b.type}</p>
                    <p className="text-[10px] text-slate-500">{b.desc}</p>
                  </div>
                  <span className="font-black text-amber-600 text-xs shrink-0 ml-2">Ksh {b.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODAL 5: ADD TEAM MEMBER
          ========================================== */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-md w-full p-6 space-y-4 bg-white relative">
            <button onClick={() => setShowAddTeamModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-[#1E3063] font-display">Add Sales Staff Member</h3>

            <form onSubmit={handleAddTeamMember} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Full Name</label>
                <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} required />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs"
                >
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Senior Sales Agent">Senior Sales Agent</option>
                  <option value="Inventory Specialist">Inventory Specialist</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Phone</label>
                <Input value={newMemberPhone} onChange={(e) => setNewMemberPhone(e.target.value)} required />
              </div>

              <Button type="submit" variant="accent" size="md" fullWidth>
                Add Staff Member
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODAL 6: ADD LEAD
          ========================================== */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-md w-full p-6 space-y-4 bg-white relative">
            <button onClick={() => setShowAddLeadModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-[#1E3063] font-display">Register Customer Lead</h3>

            <form onSubmit={handleAddLead} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Customer Name</label>
                <Input value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} required />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Phone Number</label>
                <Input value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} required />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Vehicle Interested</label>
                <Input value={newLeadVehicleTitle} onChange={(e) => setNewLeadVehicleTitle(e.target.value)} />
              </div>

              <Button type="submit" variant="accent" size="md" fullWidth>
                Register Lead
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DealerBusinessView;
