import React, { useState, useMemo, useEffect } from 'react';
import { EscrowTransaction, EscrowLogEntry, EscrowDispute, UserProfile } from '../types';
import { getMyEscrows, getEscrowState, getFundingInstructions, confirmVehicle, confirmDelivery, requestRelease, disputeEscrow, releaseEscrow, mapBackendEscrowToTransaction, EscrowApiError } from '../services/escrowApi';
import EvidenceUpload from '../components/EvidenceUpload';
import {
  Shield,
  Lock,
  CheckCircle2,
  Landmark,
  Clock,
  ArrowRight,
  Search,
  ShieldCheck,
  FileCheck,
  UserCheck,
  Building2,
  Sparkles,
  ChevronRight,
  Info,
  PlusCircle,
  AlertTriangle,
  History,
  TrendingUp,
  DollarSign,
  Car,
  FileText,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Eye,
  Check,
  User,
  ShieldAlert,
  Download
} from 'lucide-react';
import { PageHeader, StatWidget, Card, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Modal } from '../components/ui';

interface EscrowViewProps {
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  initialTab?: 'journey' | 'deals' | 'create' | 'rules';
}

// Fixed: this entire page previously ran on MOCK_ESCROW_DEALS - fake
// deals, fake specific buyer/seller names, a fake NTSA TIMS ownership-
// transfer visualizer (no real TIMS integration exists anywhere in
// this backend), and a free role switcher that let any visitor
// self-promote to "Administrator / Custodian" with no real permission
// check at all. Rebuilt around real data: real escrow deals loaded
// from the real backend, real per-deal buyer/seller/amount/status,
// and the role perspective now derives from who is actually logged
// in - Buyer or Seller only shown when the current real user is
// genuinely that real party to the deal, Administrator only ever
// shown when the real user's own role is genuinely admin/superadmin/
// moderator (matching the real backend's own authorization checks on
// every action route, confirmed directly in
// backend/controllers/escrowController.js).
export const EscrowView: React.FC<EscrowViewProps> = ({ user, onOpenAuth, initialTab = 'journey' }) => {
  const [dealsList, setDealsList] = useState<EscrowTransaction[]>([]);
  const [dealsLoading, setDealsLoading] = useState<boolean>(true);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [dealSearch, setDealSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'journey' | 'deals' | 'create' | 'rules'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [stateDetails, setStateDetails] = useState<{ currentState?: string; allowedTransitions?: string[]; history?: Array<{ action?: string; by?: string; at?: string; reason?: string }> } | null>(null);
  const [fundingInstructions, setFundingInstructions] = useState<{ fundingMethod: string; rules: { releaseDays: number; minimumAmount: number; maximumAmount?: number | null }; account: { accountName?: string; bankName?: string; accountNumber?: string; branch?: string; currency?: string } | null; amount: number; reference: string } | null>(null);
  const selectedDeal = dealsList.find((d) => d.id === selectedDealId);

  useEffect(() => {
    if (!user) {
      setDealsList([]);
      setDealsLoading(false);
      return;
    }
    let cancelled = false;
    setDealsLoading(true);
    setDealsError(null);
    getMyEscrows()
      .then((escrows) => {
        if (cancelled) return;
        const mapped = escrows.map(mapBackendEscrowToTransaction);
        setDealsList(mapped);
        // Fixed: restores real, pre-existing deep-linking behavior
        // (this project's own earlier Phase 12 work) that this
        // rewrite had otherwise dropped - a shared/refreshed link
        // with ?escrowId=<id> should select that specific real deal,
        // not silently fall back to the first one.
        const urlEscrowId = new URLSearchParams(window.location.search).get('escrowId');
        const matched = urlEscrowId ? mapped.find((d) => d.id === urlEscrowId) : undefined;
        setSelectedDealId((prev) => prev || matched?.id || mapped[0]?.id || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setDealsError(err instanceof EscrowApiError ? err.message : 'Could not load your escrow deals.');
      })
      .finally(() => {
        if (!cancelled) setDealsLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!selectedDealId || !user) {
      setStateDetails(null);
      setFundingInstructions(null);
      return;
    }
    let cancelled = false;
    setStateDetails(null);
    getEscrowState(selectedDealId).then((details) => {
      if (!cancelled) setStateDetails(details);
    }).catch(() => {
      if (!cancelled) setStateDetails(null);
    });
    if (selectedDeal?.backendStatus === 'pending') {
      getFundingInstructions(selectedDealId).then((details) => {
        if (!cancelled) setFundingInstructions(details);
      }).catch(() => {
        if (!cancelled) setFundingInstructions(null);
      });
    } else {
      setFundingInstructions(null);
    }
    return () => { cancelled = true; };
  }, [selectedDealId, selectedDeal?.backendStatus, user]);

  // Fixed: derives the real, honest perspective from who the deal's
  // real parties actually are, rather than a free toggle anyone could
  // click. isRealAdmin mirrors the real backend's own authorization
  // check (admin/superadmin/moderator) exactly.
  // Fixed: restores real, pre-existing deep-linking behavior - writes
  // the currently-selected real deal's id back to the URL so it can
  // be shared or survive a refresh.
  useEffect(() => {
    if (!selectedDealId) return;
    const params = new URLSearchParams(window.location.search);
    params.set('escrowId', selectedDealId);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [selectedDealId]);

  const isRealAdmin = ['admin', 'superadmin', 'moderator'].includes(user?.role || '');
  const realUserRole: 'Buyer' | 'Seller' | 'Administrator' | null = useMemo(() => {
    if (!user || !selectedDeal) return null;
    if (isRealAdmin) return 'Administrator';
    // buyerEmail/sellerEmail are the only real identifiers this
    // mapped type carries for comparison against the current session.
    if (user.email && selectedDeal.buyerEmail === user.email) return 'Buyer';
    if (user.email && selectedDeal.sellerEmail === user.email) return 'Seller';
    return null;
  }, [user, selectedDeal, isRealAdmin]);
  const userRole = realUserRole;

  // Sub-modals for Inspection & Dispute
  const [showInspectionModal, setShowInspectionModal] = useState<boolean>(false);
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [disputeReasonInput, setDisputeReasonInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Escrow Form State

  // Auto-clear Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Canonical buyer/seller journey derived from the real backend state machine.
  // No inspection, title-transfer, or payout milestone is shown as complete
  // unless the backend exposes that state.
  const escrowTimelineSteps = [
    { step: 1, id: 'pending', title: 'Escrow Created', desc: 'Transaction exists and is awaiting custody funding.', controller: 'Purchase & Payment Workflow' },
    { step: 2, id: 'funded', title: 'Funds Held', desc: 'Custody funding has been verified and funds are held.', controller: 'KAYAD Escrow State Machine' },
    { step: 3, id: 'vehicle_confirmed', title: 'Buyer Confirmed', desc: 'Buyer has confirmed the vehicle against the transaction.', controller: 'Buyer Confirmation' },
    { step: 4, id: 'delivered', title: 'Delivery Confirmed', desc: 'Seller has confirmed vehicle delivery.', controller: 'Seller Delivery Confirmation' },
    { step: 5, id: 'released', title: 'Settlement', desc: 'Funds have been released or the escrow has reached a terminal outcome.', controller: 'Authorized Settlement / System' },
  ];


  const filteredDeals = useMemo(() => {
    if (!dealSearch) return dealsList;
    const q = dealSearch.toLowerCase();
    return dealsList.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.vehicleTitle.toLowerCase().includes(q) ||
        d.buyerName.toLowerCase().includes(q) ||
        d.sellerName.toLowerCase().includes(q)
    );
  }, [dealsList, dealSearch]);

  const heldStatuses = new Set(['funded', 'vehicle_confirmed', 'delivered', 'disputed']);
  const totalHeldValue = dealsList.filter((d) => heldStatuses.has(d.backendStatus || '')).reduce((sum, d) => sum + d.amount, 0);
  const activeDealCount = dealsList.filter((d) => !['released', 'refunded', 'closed'].includes(d.backendStatus || '')).length;
  const pendingFundingCount = dealsList.filter((d) => d.backendStatus === 'pending').length;
  const settledDealCount = dealsList.filter((d) => ['released', 'refunded', 'closed'].includes(d.backendStatus || '')).length;
  const selectedHeldAmount = selectedDeal && heldStatuses.has(selectedDeal.backendStatus || '') ? selectedDeal.amount : 0;

  // Derive the next operational action from the canonical backend state.
  const getWorkflowContext = (deal: EscrowTransaction) => {
    if (deal.backendStatus === 'disputed' || deal.dispute) {
      return { singleStatusText: 'Dispute under review', badgeVariant: 'warning' as const, fundController: 'KAYAD Escrow State Machine (Disputed)', nextActionRole: 'Authorized escrow operator', nextActionText: 'Review the dispute evidence and audit trail. Release or refund only through an authorized backend transition.' };
    }
    switch (deal.backendStatus) {
      case 'pending':
        return { singleStatusText: 'Awaiting verified custody funding', badgeVariant: 'escrow' as const, fundController: 'Buyer / funding rail', nextActionRole: 'Buyer or funding operator', nextActionText: 'Use the backend-issued custody instructions and verify the deposit reference.' };
      case 'funded':
        return { singleStatusText: 'Funds held in escrow', badgeVariant: 'escrow' as const, fundController: 'KAYAD Escrow Custody', nextActionRole: 'Buyer', nextActionText: 'Review the vehicle and confirm it through the escrow workflow when ready.' };
      case 'vehicle_confirmed':
        return { singleStatusText: 'Buyer confirmed the vehicle', badgeVariant: 'verified' as const, fundController: 'KAYAD Escrow Custody', nextActionRole: 'Seller', nextActionText: 'Confirm vehicle delivery through the seller workflow.' };
      case 'delivered':
        return { singleStatusText: 'Delivery confirmed — awaiting settlement', badgeVariant: 'verified' as const, fundController: 'KAYAD Escrow Custody', nextActionRole: 'Buyer / authorized settlement operator', nextActionText: 'Buyer may request release; authorized settlement can release funds when the backend transition is eligible.' };
      case 'released':
        return { singleStatusText: 'Funds released to seller', badgeVariant: 'success' as const, fundController: 'Seller / settlement rail', nextActionRole: 'Operations', nextActionText: 'Confirm the settlement record and close the escrow when the terminal workflow permits.' };
      case 'refunded':
        return { singleStatusText: 'Refunded to buyer', badgeVariant: 'warning' as const, fundController: 'Buyer / refund settlement', nextActionRole: 'Operations', nextActionText: 'Confirm the external refund settlement record and preserve the audit trail.' };
      case 'closed':
        return { singleStatusText: 'Escrow closed', badgeVariant: 'success' as const, fundController: 'Terminal', nextActionRole: 'None', nextActionText: 'This escrow is in a terminal state. No further transaction action is available.' };
      default:
        return { singleStatusText: deal.status, badgeVariant: 'neutral' as const, fundController: 'Backend controlled', nextActionRole: 'Operations', nextActionText: 'Review the canonical state endpoint for the current transition contract.' };
    }
  };

  // A standalone escrow cannot be created from this view. The backend
  // creates escrow records as part of its real purchase/payment flow.
  const handleCreateEscrow = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast('Standalone escrow creation is not available. Start from a real purchase/payment flow.');
  };

  // Open Dispute Handler
  // Fixed: this previously fabricated a complete, fake dispute record
  // locally - a fake case ID, fake "evidence" files that were never
  // uploaded, a fake "auditor assigned" message - none of it real or
  // persisted anywhere. Now calls the real backend, which genuinely
  // freezes the deal and is visible to the real other party (buyer/
  // seller) and real staff (confirmed directly:
  // backend/controllers/escrowController.js's disputeEscrow, and its
  // own real Socket.IO emit to both real parties).
  const handleOpenDisputeSubmit = async () => {
    if (!disputeReasonInput.trim() || !selectedDeal) return;
    try {
      const updatedEscrow = await disputeEscrow(selectedDeal.id, disputeReasonInput);
      const updated = mapBackendEscrowToTransaction(updatedEscrow);
      setDealsList(prev => prev.map(d => d.id === updated.id ? updated : d));
      setShowDisputeModal(false);
      setDisputeReasonInput('');
      triggerToast('Dispute opened. Funds frozen pending review.');
    } catch (err) {
      triggerToast(err instanceof EscrowApiError ? err.message : 'Could not open dispute. Please try again.');
    }
  };

  const currentContext = selectedDeal ? getWorkflowContext(selectedDeal) : null;

  return (
    <div className="space-y-6 bg-[#F6FAF9] min-h-screen pb-12">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#176B87] text-white px-4 py-3 rounded-2xl shadow-xl border border-amber-400/40 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Standalone Header Banner */}
      <PageHeader
        badgeIcon={<Lock className="w-4 h-4 text-amber-400" />}
        badgeText="Escrow Control Center"
        title="KAYAD Escrow Control Center"
        description="A backend-controlled transaction surface for custody funding, vehicle confirmation, delivery, dispute handling and settlement. KAYAD shows only states and actions supported by the live escrow workflow."
        rightElement={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={activeTab === 'journey' ? 'primary' : 'outline'}
              size="md"
              onClick={() => setActiveTab('journey')}
              className="bg-[#176B87] text-white font-bold"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Transaction Journey</span>
            </Button>
            <Button
              variant={activeTab === 'deals' ? 'primary' : 'outline'}
              size="md"
              onClick={() => setActiveTab('deals')}
              className="font-bold text-slate-700"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Protected Deals ({dealsList.length})</span>
            </Button>
            <Button
              variant={activeTab === 'create' ? 'primary' : 'outline'}
              size="md"
              onClick={() => setActiveTab('create')}
              className="font-bold text-slate-700"
            >
              <PlusCircle className="w-4 h-4 text-[#176B87]" />
              <span>How Escrow Starts</span>
            </Button>
          </div>
        }
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          label="Total Locked Vault Volume"
          value={`Ksh ${totalHeldValue.toLocaleString()}`}
          trend="Funds in held / disputed escrow states"
          trendType="positive"
          icon={<Landmark className="w-4 h-4 text-emerald-600" />}
        />

        <StatWidget
          label="Active Protected Transactions"
          value={activeDealCount}
          trend={`${pendingFundingCount} awaiting funding`}
          trendType="positive"
          icon={<Lock className="w-4 h-4 text-amber-500" />}
        />

        <StatWidget
          label="Pending Funding"
          value={pendingFundingCount}
          trend="Awaiting verified custody funding"
          trendType="neutral"
          icon={<Clock className="w-4 h-4 text-[#176B87]" />}
        />

        <StatWidget
          label="Settled / Closed"
          value={settledDealCount}
          trend="Released, refunded or closed records"
          trendType="positive"
          icon={<FileCheck className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      {realUserRole && selectedDeal && (
        <Card className="p-4 border border-slate-200 bg-white">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <UserCheck className="w-4 h-4 text-[#176B87]" />
            <span>Current perspective: {userRole}</span>
            <span className="font-normal text-slate-500">derived from the signed-in user and selected real escrow</span>
          </div>
        </Card>
      )}

      {/* TAB 1: ESCROW PURCHASE JOURNEY DASHBOARD */}
      {activeTab === 'journey' && selectedDeal && (
        <div className="space-y-6">
          {/* DEAL SELECTOR ROW */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 text-xs font-bold text-[#176B87] shrink-0">
              <Car className="w-4 h-4 text-[#176B87]" />
              <span>Select Active Deal:</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {dealsList.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDealId(d.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 border transition-all flex items-center gap-2 ${
                    selectedDeal?.id === d.id
                      ? 'bg-[#176B87] text-white border-[#176B87] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-mono text-[11px] opacity-80">{d.id}</span>
                  <span className="truncate max-w-[140px]">{d.vehicleTitle}</span>
                  {d.dispute && (
                    <span className="w-2 h-2 rounded-full bg-[#E5484D] animate-ping" title="Dispute Open" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 1. SINGLE CLEAR TRANSACTION STATUS BANNER */}
          <Card className="p-5 bg-gradient-to-r from-[#176B87] via-[#0A3340] to-slate-900 text-white border border-slate-700 shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Badge variant={currentContext.badgeVariant} size="md">
                  <Lock className="w-3.5 h-3.5 text-amber-300" /> Ref #{selectedDeal.id}
                </Badge>
                <span className="text-xs text-slate-300 font-mono font-bold">
                  Updated {selectedDeal.updatedAt}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300 font-medium">Vault Custodian:</span>
                <span className="text-xs text-amber-300 font-extrabold bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
                  {selectedDeal.vaultHolder || 'KAYAD Escrow Custodian'}
                </span>
              </div>
            </div>

            {/* Single Clear Status Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-extrabold text-amber-400 font-display">
                  Current Transaction Status
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-0.5 flex items-center gap-2">
                  {selectedDeal.dispute ? (
                    <AlertTriangle className="w-6 h-6 text-[#E5484D] shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  )}
                  {currentContext.singleStatusText}
                </h2>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15 text-xs text-slate-200 space-y-0.5 shrink-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-300">Who Controls Funds Now?</p>
                <p className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  {selectedDeal.whoControlsFunds || currentContext.fundController}
                </p>
              </div>
            </div>

            {/* EXPECTED NEXT ACTION BANNER */}
            <div className={`p-3.5 rounded-xl border flex items-start sm:items-center justify-between gap-3 text-xs ${
              selectedDeal.dispute
                ? 'bg-[#E5484D]/15 border-[#E5484D]/40 text-rose-100'
                : 'bg-emerald-950/40 border-emerald-400/30 text-emerald-100'
            }`}>
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-white text-xs">
                    Expected Next Action: <span className="text-amber-300">[{currentContext.nextActionRole}]</span>
                  </p>
                  <p className="text-[11px] text-slate-200 mt-0.5 leading-normal">
                    {currentContext.nextActionText}
                  </p>
                </div>
              </div>

              <Badge variant="neutral" size="sm" className="bg-white/15 text-white shrink-0 font-bold">
                Step {selectedDeal.step} of 6
              </Badge>
            </div>
          </Card>

          {selectedDeal.backendStatus === 'pending' && fundingInstructions && (
            <Card className="p-5 bg-white border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] font-extrabold text-[#176B87]">Custody funding instructions</p>
                  <h3 className="text-base font-black text-[#0A3340] font-display mt-1">Fund this escrow through the configured custody rail</h3>
                </div>
                <Badge variant="neutral" size="sm">{fundingInstructions.fundingMethod.replace('_', ' ')}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><p className="text-[10px] uppercase font-bold text-slate-400">Amount</p><p className="font-black text-[#176B87] mt-1">Ksh {Number(fundingInstructions.amount || selectedDeal.amount).toLocaleString()}</p></div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><p className="text-[10px] uppercase font-bold text-slate-400">Reference</p><p className="font-mono font-bold text-slate-800 mt-1 break-all">{fundingInstructions.reference}</p></div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><p className="text-[10px] uppercase font-bold text-slate-400">Custody account</p><p className="font-bold text-slate-800 mt-1">{fundingInstructions.account?.accountName || 'Configured custody account'}</p><p className="text-[10px] text-slate-500">{fundingInstructions.account?.bankName || 'Bank details available from custody configuration'}</p><p className="text-[10px] text-slate-500 font-mono">{fundingInstructions.account?.accountNumber || 'Account number unavailable'}</p></div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><p className="text-[10px] uppercase font-bold text-slate-400">Release window</p><p className="font-bold text-slate-800 mt-1">{fundingInstructions.rules.releaseDays} day{fundingInstructions.rules.releaseDays === 1 ? '' : 's'}</p><p className="text-[10px] text-slate-500">Backend-controlled rule</p></div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3">Only use the current backend-issued reference. This screen does not mark an escrow funded; funding is recognized only after the authorized custody verification succeeds.</p>
            </Card>
          )}

          {/* 2. CANONICAL STATE TIMELINE */}
          <Card className="p-6 bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#176B87] font-display flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                Canonical Escrow Lifecycle
              </h3>
              <span className="text-xs text-slate-500 font-bold">
                Backend state: {selectedDeal.backendStatus || 'unknown'}
              </span>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {escrowTimelineSteps.map((st) => {
                const currentIndex = ['pending', 'funded', 'vehicle_confirmed', 'delivered', 'released'].includes(selectedDeal.backendStatus || '')
                  ? escrowTimelineSteps.findIndex((item) => item.id === (selectedDeal.backendStatus === 'closed' ? 'released' : selectedDeal.backendStatus))
                  : -1;
                const stepIndex = escrowTimelineSteps.findIndex((item) => item.id === st.id);
                const isNormalPath = currentIndex >= 0;
                const isDone = isNormalPath && stepIndex < currentIndex;
                const isCurrent = isNormalPath && currentIndex === stepIndex;
                return (
                  <div
                    key={st.step}
                    className={`p-3.5 rounded-2xl border text-xs relative flex flex-col justify-between transition-all ${
                      isDone
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                        : isCurrent
                        ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/40 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center font-display ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-[#176B87] text-amber-300'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          {isDone ? <Check className="w-3.5 h-3.5" /> : st.step}
                        </span>

                        {isCurrent && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" title="Active Step" />
                        )}
                      </div>

                      <p className={`font-extrabold text-xs font-display ${
                        isDone ? 'text-emerald-950' : isCurrent ? 'text-[#176B87]' : 'text-slate-600'
                      }`}>
                        {st.title}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                        {st.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-[9px] font-bold text-slate-500">
                      Controller: {st.controller}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {stateDetails && (
            <Card className="p-5 bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-[#176B87] font-display flex items-center gap-2"><History className="w-4 h-4 text-[#176B87]" /> Canonical state audit</h3>
                <Badge variant="neutral" size="sm">{stateDetails.currentState || selectedDeal.backendStatus}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Recorded state history</p>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {(stateDetails.history || []).length ? (stateDetails.history || []).map((entry, index) => (
                      <div key={`${entry.at || 'event'}-${index}`} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                        <div className="flex justify-between gap-2 font-bold text-slate-700"><span>{entry.action || 'State update'}</span><span className="text-[10px] text-slate-400">{entry.at ? new Date(entry.at).toLocaleString() : '—'}</span></div>
                        {entry.reason && <p className="text-slate-500 mt-1">{entry.reason}</p>}
                      </div>
                    )) : <p className="text-[11px] text-slate-500">No state-history entries were returned by the backend.</p>}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Backend transition contract</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(stateDetails.allowedTransitions || []).length ? (stateDetails.allowedTransitions || []).map((next) => <span key={next} className="px-2.5 py-1.5 rounded-lg bg-[#EAF4F5] border border-[#CFE4E7] text-[10px] font-bold text-[#176B87]">{next}</span>) : <span className="text-[11px] text-slate-500">No next states returned. This may be a terminal state.</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3">The list above describes the backend contract; role and guard conditions still determine whether the current user can execute a transition.</p>
                </div>
              </div>
            </Card>
          )}

          {/* 3. DUAL COLUMN DASHBOARD GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT COLUMN: VEHICLE & PAYMENT SUMMARY */}
            <div className="lg:col-span-2 space-y-6">

              {/* VEHICLE SUMMARY CARD */}
              {realUserRole && <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-[#176B87] font-display flex items-center gap-2">
                    <Car className="w-4.5 h-4.5 text-[#176B87]" />
                    Protected Vehicle Item Summary
                  </h3>
                  <Badge variant="neutral" size="sm" className="font-mono">
                    {selectedDeal.vin ? `VIN: ${selectedDeal.vin}` : 'VIN Not on File'}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-full sm:w-44 h-32 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                    <img
                      src={selectedDeal.vehicleImage || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800'}
                      alt={selectedDeal.vehicleTitle}
                      className="w-full h-full object-cover"
                    />
                    {selectedDeal.plateNumber && (
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                        {selectedDeal.plateNumber}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Vehicle Title</span>
                      <h4 className="text-lg font-black text-[#176B87] font-display">{selectedDeal.vehicleTitle}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Agreed Sale Price</p>
                        <p className="text-base font-black text-[#176B87]">
                          Ksh {selectedDeal.amount.toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Seller</p>
                        <p className="font-extrabold text-emerald-950 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {selectedDeal.sellerName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium pt-1">
                      <span>Buyer: <strong>{selectedDeal.buyerName}</strong></span>
                      <span>Seller Type: <strong>{selectedDeal.sellerType || 'Verified Seller'}</strong></span>
                    </div>
                  </div>
                </div>
              </Card>}

              {/* PAYMENT & CUSTODY SECTION */}
              <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-[#176B87] font-display flex items-center gap-2">
                    <Landmark className="w-4.5 h-4.5 text-emerald-600" />
                    Custodial Payment Details & Vault Balance
                  </h3>
                  <Badge variant="escrow" size="sm">
                    KAYAD Escrow State Machine
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Deposit Date & Time</p>
                    <p className="font-extrabold text-[#176B87]">{selectedDeal.depositDate ? new Date(selectedDeal.depositDate).toLocaleString() : 'Not yet deposited'}</p>
                    <p className="text-[10px] text-slate-500">Timestamped Audit Record</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Payment Channel</p>
                    <p className="font-extrabold text-[#176B87]">{selectedDeal.paymentMethod || (selectedDeal.backendStatus === 'pending' && fundingInstructions ? fundingInstructions.fundingMethod.replace('_', ' ') : 'Funding method not exposed')}</p>
                    {/* Only display a payment reference when the backend actually returns one. */}
                    {selectedDeal.bankReference && (
                      <p className="text-[10px] text-slate-500">Ref: {selectedDeal.bankReference}</p>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Locked Vault Balance</p>
                    <p className="font-black text-emerald-700 text-sm">Ksh {selectedHeldAmount.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 font-bold">Status: {selectedDeal.status}</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-slate-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Escrow funds remain under the backend-controlled state machine until an authorized release transition is recorded.</span>
                  </div>
                  <Badge variant="neutral" size="sm" className="shrink-0 font-bold">
                    Backend-Controlled Release
                  </Badge>
                </div>
              </Card>


            </div>

            {/* RIGHT COLUMN: ROLE-AWARE ACTIONS & DISPUTES & NOTIFICATIONS */}
            <div className="space-y-6">

              {/* ROLE-AWARE CONTEXTUAL ACTION BUTTONS PANEL */}
              {realUserRole && <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-[#176B87] font-display flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-500" />
                    {userRole} Contextual Workflow Actions
                  </h3>
                  <Badge variant="neutral" size="sm" className="font-bold">
                    Role: {userRole}
                  </Badge>
                </div>

                <div className="space-y-2.5 text-xs">
                  {userRole === 'Buyer' && (
                    <>
                      {selectedDeal.status === 'Awaiting Buyer Deposit' && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-medium">
                          Deposit is initiated through the canonical purchase/payment flow. This escrow view does not fabricate a payment action.
                        </div>
                      )}

                      {selectedDeal.status === 'Funds Held in Escrow' && (
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          onClick={async () => {
                            try {
                              const updatedEscrow = await confirmVehicle(selectedDeal.id);
                              const updated = mapBackendEscrowToTransaction(updatedEscrow);
                              setDealsList(prev => prev.map(d => d.id === updated.id ? updated : d));
                              triggerToast('Vehicle inspection confirmation recorded.');
                            } catch (err) {
                              triggerToast(err instanceof EscrowApiError ? err.message : 'Could not confirm the vehicle. Please try again.');
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm Vehicle Inspection</span>
                        </Button>
                      )}

                      {selectedDeal.status === 'Vehicle Delivered' && (
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          onClick={async () => {
                            try {
                              const result = await requestRelease(selectedDeal.id);
                              triggerToast(result.message || 'Release request submitted to the admin team.');
                            } catch (err) {
                              triggerToast(err instanceof EscrowApiError ? err.message : 'Could not submit the release request. Please try again.');
                            }
                          }}
                          className="bg-[#176B87] text-white font-extrabold shadow-xs"
                        >
                          <Lock className="w-4 h-4 text-amber-300" />
                          <span>Request Release of Escrow Funds</span>
                        </Button>
                      )}

                      {!selectedDeal.dispute && (
                        <Button
                          variant="outline"
                          size="md"
                          fullWidth
                          onClick={() => setShowDisputeModal(true)}
                          className="text-[#E5484D] border-[#E5484D]/40 hover:bg-rose-50 font-bold"
                        >
                          <AlertTriangle className="w-4 h-4 text-[#E5484D]" />
                          <span>Report Issue / Open Dispute</span>
                        </Button>
                      )}
                    </>
                  )}

                  {userRole === 'Seller' && (
                    <>
                      {selectedDeal.status === 'Buyer Approved Vehicle' ? (
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          onClick={async () => {
                            try {
                              const updatedEscrow = await confirmDelivery(selectedDeal.id);
                              const updated = mapBackendEscrowToTransaction(updatedEscrow);
                              setDealsList(prev => prev.map(d => d.id === updated.id ? updated : d));
                              triggerToast('Vehicle delivery confirmed.');
                            } catch (err) {
                              triggerToast(err instanceof EscrowApiError ? err.message : 'Could not confirm delivery. Please try again.');
                            }
                          }}
                          className="bg-[#176B87] text-white font-extrabold shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4 text-amber-300" />
                          <span>Confirm Vehicle Delivery</span>
                        </Button>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-medium">
                          Seller actions are available only when the escrow state permits them.
                        </div>
                      )}

                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 font-medium">
                        NTSA TIMS transfer is not connected to KAYAD yet, so the interface does not claim to submit or process TIMS documents.
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-medium">
                        <strong>Settlement Status:</strong> {selectedDeal.status}. Seller payout is recorded only after the canonical release transition and provider settlement workflow.
                      </div>
                    </>
                  )}

                  {userRole === 'Administrator' && (
                    <>
                      {(selectedDeal.status === 'Funds Held in Escrow' || selectedDeal.status === 'Buyer Approved Vehicle' || selectedDeal.status === 'Vehicle Delivered' || selectedDeal.dispute) && (
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          onClick={async () => {
                            try {
                              await releaseEscrow(selectedDeal.id);
                              const refreshed = await getMyEscrows();
                              setDealsList(refreshed.map(mapBackendEscrowToTransaction));
                              triggerToast('Vault funds released to seller.');
                            } catch (err) {
                              triggerToast(err instanceof EscrowApiError ? err.message : 'Could not release funds. Please try again.');
                            }
                          }}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold shadow-xs"
                        >
                          <Landmark className="w-4 h-4" />
                          <span>{selectedDeal.dispute ? 'Resolve Dispute & Release Funds' : 'Release Vault Funds to Seller'}</span>
                        </Button>
                      )}

                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 font-medium">
                        Compliance holds are controlled by the backend transaction state. No local-only pause action is exposed.
                      </div>
                    </>
                  )}
                </div>
              </Card>}

              {/* DEDICATED DISPUTE PANEL */}
              {selectedDeal.dispute ? (
                <Card className="p-5 bg-rose-50/70 border border-rose-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-rose-200 pb-3">
                    <h3 className="text-sm font-extrabold text-[#E5484D] font-display flex items-center gap-2">
                      <AlertTriangle className="w-4.5 h-4.5 text-[#E5484D]" />
                      Active Dispute Resolution Panel
                    </h3>
                    <Badge variant="warning" size="sm" className="bg-[#E5484D] text-white font-bold">
                      {selectedDeal.dispute.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-[11px] font-bold text-slate-700">Reason for Dispute:</p>
                    <p className="p-3 bg-white rounded-xl border border-rose-200 text-slate-800 leading-relaxed font-medium">
                      "{selectedDeal.dispute.reason}"
                    </p>

                    <p className="text-[11px] font-bold text-slate-700 pt-1">Evidence Submitted ({selectedDeal.dispute.evidence.length}):</p>
                    <div className="space-y-1.5">
                      {selectedDeal.dispute.evidence.map((ev, i) => (
                        <div key={i} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#176B87] flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            {ev.title}
                          </span>
                          <span className="text-slate-400 font-mono">{ev.fileType}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] font-bold text-slate-700 pt-1">Case Investigation Updates:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedDeal.dispute.updates.map((up, i) => (
                        <div key={i} className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-0.5 text-[11px]">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>{up.author}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{up.timestamp}</span>
                          </div>
                          <p className="text-slate-600 leading-normal">{up.note}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-rose-200 space-y-3">
                      <div className="text-[10px] text-slate-500 font-medium">Updates shown below are sourced from the persisted dispute timeline. No fixed resolution SLA is displayed unless the backend provides one.</div>
                      <EvidenceUpload
                        disputeId={selectedDeal.id}
                        onUploaded={async () => {
                          try {
                            const refreshed = await getMyEscrows();
                            setDealsList(refreshed.map(mapBackendEscrowToTransaction));
                          } catch {
                            triggerToast('Evidence uploaded, but the dispute view could not be refreshed.');
                          }
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-5 bg-slate-50 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-[#176B87] font-display flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Dispute protection
                    </h4>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                      No dispute on this deal
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    A dispute can be opened by an authorized party when a transaction issue needs review. The backend moves the escrow into its disputed state and controls subsequent money-moving transitions.
                  </p>
                </Card>
              )}

              {/* NOTIFICATIONS & AUDIT TIMELINE LOG */}
              {realUserRole && <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-[#176B87] font-display flex items-center gap-2">
                    <History className="w-4.5 h-4.5 text-blue-600" />
                    Transaction Activity & Notification Audit Log
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">Live Stream</span>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {(selectedDeal.timelineLogs || []).map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-xs border-b border-slate-100 pb-2.5 last:border-0">
                      <div className={`p-1.5 rounded-full mt-0.5 shrink-0 ${
                        log.type === 'success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : log.type === 'dispute'
                          ? 'bg-rose-100 text-[#E5484D]'
                          : log.type === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>

                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-extrabold text-[#176B87]">{log.title}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{log.description}</p>
                        <span className="text-[10px] font-bold text-slate-400">Actor: {log.actor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>}

              {/* SUPPORT CONTACT SHORTCUT */}
              <div className="p-4 bg-[#176B87] text-white rounded-2xl border border-slate-700 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-extrabold text-amber-300 font-display">Need escrow assistance?</p>
                  <p className="text-[11px] text-slate-300">Open the real KAYAD support workflow to create or review a support case.</p>
                </div>
                <a href="/support" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-[11px] font-black text-[#0A3340] hover:bg-amber-300 shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Contact Support</span>
                </a>
              </div>

            </div>

          </div>
        </div>
      )}

      {activeTab === 'journey' && !selectedDeal && (
        <Card className="p-6 sm:p-8 bg-white border border-slate-200 shadow-xs">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF4F5] border border-[#CFE4E7] flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-[#176B87]" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-extrabold text-[#176B87]">Escrow Control Surface</p>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0A3340] font-display mt-2">No protected deal selected</h2>
            <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-2xl mx-auto">{user ? 'No escrow record is currently associated with this account. Start from a real KAYAD purchase/payment workflow; this page will show the persisted transaction here once the backend creates it.' : 'Sign in to view escrow records associated with your KAYAD transactions.'}</p>
            <div className="flex justify-center gap-2 mt-5 flex-wrap">
              {user ? <Button variant="secondary" onClick={() => setActiveTab('create')}>View How Escrow Starts</Button> : <Button variant="primary" onClick={onOpenAuth}>Sign In</Button>}
              {user && dealsList.length > 0 && <Button variant="outline" onClick={() => setActiveTab('deals')}>Open Protected Deals</Button>}
            </div>
          </div>
        </Card>
      )}

      {/* TAB 2: ALL PROTECTED DEALS TABLE */}
      {activeTab === 'deals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-96">
              <Input
                placeholder="Search Deal ID, vehicle title, buyer or seller..."
                value={dealSearch}
                onChange={(e) => setDealSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
              <span>Protected Queue Balance:</span>
              <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-lg font-black text-sm">
                Ksh {totalHeldValue.toLocaleString()}
              </span>
            </div>
          </div>

          <Card className="overflow-hidden bg-white border border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-[#176B87]">
                <Lock className="w-4 h-4 text-amber-500" />
                Live Escrow Vault Transaction Queue ({filteredDeals.length})
              </CardTitle>
            </CardHeader>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal Ref</TableHead>
                  <TableHead>Vehicle Item</TableHead>
                  <TableHead>Vault Balance</TableHead>
                  <TableHead>Parties</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((d) => (
                  <TableRow
                    key={d.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      selectedDeal?.id === d.id ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <TableCell className="font-mono font-extrabold text-xs text-[#176B87]">{d.id}</TableCell>
                    <TableCell className="font-extrabold text-xs text-[#176B87]">{d.vehicleTitle}</TableCell>
                    <TableCell className="font-black text-xs text-slate-900">Ksh {d.amount.toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-xs text-slate-600">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">{d.buyerName} <span className="text-slate-400 font-normal">(Buyer)</span></p>
                        <p className="text-slate-500">{d.sellerName} <span className="text-slate-400 font-normal">(Seller)</span></p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={['Released', 'Completed'].includes(d.status) ? 'success' : d.dispute ? 'warning' : 'escrow'}
                        size="sm"
                      >
                        <CheckCircle2 className="w-3 h-3" /> {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedDealId(d.id);
                            setActiveTab('journey');
                          }}
                        >
                          <span>Open Journey</span>
                        </Button>

                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 3: ESCROW FLOW INFORMATION */}
      {activeTab === 'create' && (
        <Card className="p-6 max-w-3xl mx-auto space-y-4 bg-white border border-slate-200">
          <Badge variant="escrow" size="md"><Lock className="w-4 h-4 text-amber-500" /> Escrow Flow</Badge>
          <h3 className="text-2xl font-black text-[#176B87] font-display">How a real KAYAD escrow starts</h3>
          <p className="text-xs text-slate-600 leading-relaxed">A standalone escrow agreement cannot be created from this screen. The backend creates and persists escrow records inside the real purchase/payment workflow.</p>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-700 space-y-2">
            <p><strong>1.</strong> A real vehicle purchase/payment flow creates the transaction.</p>
            <p><strong>2.</strong> The backend creates the corresponding escrow record.</p>
            <p><strong>3.</strong> This screen reads that persisted escrow and exposes only supported actions where authorized.</p>
          </div>
          <Button variant="primary" onClick={() => setActiveTab('deals')}>View My Protected Deals</Button>
        </Card>
      )}

      {/* SUB-MODAL 1: 150-POINT TECHNICAL INSPECTION REPORT VIEWER */}
      {/* SUB-MODAL 2: OPEN DISPUTE FORM VIEWER */}
      {showDisputeModal && selectedDeal && (
        <Modal
          isOpen={true}
          onClose={() => setShowDisputeModal(false)}
          title={`Raise Formal Escrow Dispute — Ref #${selectedDeal.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#E5484D]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Immediate Custodian Vault Freeze Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                Submitting this dispute moves the escrow into the backend disputed state. Money-moving transitions remain controlled by the canonical escrow state machine while the case is reviewed.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-[#176B87]">Reason for Dispute</label>
              <textarea
                rows={4}
                placeholder="Describe the defect, unmentioned issue, or non-compliance found during inspection..."
                value={disputeReasonInput}
                onChange={(e) => setDisputeReasonInput(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E5484D] focus:border-[#E5484D] text-xs"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-[#176B87]">Evidence handling</p>
              <p>Use the dispute evidence workflow to attach files that are actually available to the case.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowDisputeModal(false)}
                className="font-bold text-slate-600"
              >
                <span>Cancel</span>
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleOpenDisputeSubmit}
                className="bg-[#9F2F35] hover:bg-[#84272D] text-white font-extrabold shadow-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Submit Dispute & Freeze Vault Funds</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EscrowView;
