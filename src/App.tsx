import React, { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import { buildAuthPath, loginPathFor } from './utils/authIntent';
import Navbar from './components/Navbar';
import VehicleMarketplace from './features/VehicleMarketplace';
import TopNoticeStrip from './components/TopNoticeStrip';
import VehicleDetailModal from './components/VehicleDetailModal';
import CompareModal from './components/CompareModal';
import PriceAlertsModal from './components/PriceAlertsModal';
import DashboardHub from './components/DashboardHub';
import VerifyEmailPage from './pages/VerifyEmailPage';
import LoginPage from './pages/LoginPage';
import OnboardingFlow from './components/OnboardingFlow';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ForcePasswordChange from './pages/ForcePasswordChange';
import NotificationsPage from './pages/NotificationsPage';
import DealerOnboarding from './pages/dealer/DealerOnboarding';
import DealerAuctionSetupWizard from './pages/dealer/DealerAuctionSetupWizard';
import DealerAuctionOperations from './pages/dealer/DealerAuctionOperations';
import DealerAuctionOperationCase from './pages/dealer/DealerAuctionOperationCase';
import Profile from './pages/Profile';
import { AuctionMobileDock, AuctionSurfaceReveal } from './components/auction/AuctionInteractionLayer';
import MobileBottomNav from './components/MobileBottomNav';
// STAGE 12 PHASE D: SkipLink already existed in src/components/ui/SkipLink.tsx
// (default targetId="main-content", default label="Skip to main content")
// but was never imported or rendered anywhere in the app -- confirmed by
// grep before touching anything. The <main> this top-level route tree
// renders below had no id for it to target either. This is the one real,
// well-scoped "skip-to-content" gap for the primary auction/marketplace
// surfaces audited across this engagement (a different, unrelated
// CustomerLayout used elsewhere in the app already has its own inline
// skip link to its own <main id="main-content">, which was not touched).
import SkipLink from './components/ui/SkipLink';

import { getCars, getCarById, mapBackendCarToVehicle, VehicleApiError } from './services/vehicleApi';
import { useVehicleCollections } from './hooks/useVehicleCollections';
import { AuthProvider, useAuth, RequireAuth, RequireDealer, RequireAdmin } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';
import { CompareProvider, useCompare } from './context/CompareContext';
import { Vehicle, UserProfile } from './types';
import { getVehicleIdFromUrl, setVehicleDetailUrl } from './utils/navigation';
import { navLocationFor } from './utils/navLocation';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

// Views
// Heavy authenticated/admin surfaces are loaded on demand. This keeps the
// public marketplace shell small while preserving existing navigation and
// component contracts.
const AuctionsView = React.lazy(() => import('./features/AuctionsView'));
const EscrowView = React.lazy(() => import('./features/EscrowView'));
const InspectionsView = React.lazy(() => import('./features/InspectionsView'));
const DealersView = React.lazy(() => import('./features/DealersView'));
const ChatView = React.lazy(() => import('./features/ChatView'));
const AdminView = React.lazy(() => import('./features/AdminView'));
const SupportView = React.lazy(() => import('./features/SupportView'));
const PaymentHistoryView = React.lazy(() => import('./features/PaymentHistoryView'));
const AuctionLivePage = React.lazy(() => import('./pages/AuctionLivePage'));
const KAYADLive = React.lazy(() => import('./pages/KAYADLive'));
const BuyerPlatform = React.lazy(() => import('./features/OwnershipPlatform').then((m) => ({ default: m.BuyerPlatform })));
const PrivateSellerPlatform = React.lazy(() => import('./features/PrivateSellerPlatform').then((module) => ({ default: module.PrivateSellerPlatform })));
const DealerDashboard = React.lazy(() => import('./pages/dealer/dashboard/DealerDashboard'));
const FinanceMarketplace = React.lazy(() => import('./features/FinancePlatform').then((m) => ({ default: m.FinanceMarketplace })));
const InspectionMarketplacePage = React.lazy(() => import('./features/InspectionMarketplace/pages/InspectionMarketplacePage'));

// Fixed (Final Integration - real data integration): App() previously
// held its own, disconnected local user state directly - re-applying
// this project's own earlier hardening fix (Phase 2), confirmed lost
// on this branch: useAuth() requires an AuthProvider ancestor, so
// App() is now a thin wrapper providing that, with the real logic in
// AppInner().
function AppInner() {
  const [activeNav, setActiveNavState] = useState<string>('marketplace');
  const location = useLocation();
  const { user: authUser, logout: authLogout, isAdmin, isDealer, isAuth, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const normalizeNav = useCallback((requested: string | null): string => {
    return navLocationFor(requested || '', window.location.href).nav;
  }, []);

  // Keep the query-backed single-shell navigation canonical. AuctionsView
  // writes its active tab into the URL for shareable deep links; without
  // syncing subsequent navigation, leaving Auctions could leave `?nav=auctions`
  // behind and make a later refresh reopen Auctions instead of Marketplace.
  const setActiveNav = useCallback((requested: string) => {
    const next = navLocationFor(requested, window.location.href);
    setActiveNavState(next.nav);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next.href !== current) {
      window.history.replaceState(window.history.state, '', next.href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('nav');
    setActiveNav(normalizeNav(requested));
    // Deep link used as a sign-in return destination: /?nav=inspections&action=apply-provider.
    // The action only opens a form; the backend still decides what the account may do.
    const action = new URLSearchParams(location.search).get('action');
    if (requested === 'inspections' && (action === 'apply-provider' || action === 'manage-business')) {
      setInspectionLaunch((prev) => ({ vehicle: null, tab: 'service', action, nonce: prev.nonce + 1 }));
    }
  }, [location.search, normalizeNav, setActiveNav]);

  // Client-side navigation state is convenience only, but it must never
  // expose a private workspace to the wrong account. Backend authorization
  // remains authoritative; this gate prevents accidental cross-surface
  // rendering and stale deep links from landing on the wrong workspace.
  useEffect(() => {
    if (authLoading) return;
    const protectedNavs = new Set(['admin', 'dashboard', 'payments', 'profile', 'saved', 'chat', 'buyer-platform', 'dealer-dashboard']);
    if (!protectedNavs.has(activeNav)) return;
    if (!isAuth) {
      navigate(loginPathFor(location), { replace: true });
      return;
    }
    if (activeNav === 'admin' && !isAdmin) {
      setActiveNav('marketplace');
      return;
    }
    if (activeNav === 'dealer-dashboard' && !isDealer && !isAdmin) {
      setActiveNav('marketplace');
    }
  }, [activeNav, authLoading, isAuth, isAdmin, isDealer, location, navigate]);
  const [selectedCounty, setSelectedCounty] = useState<string>('All East Africa');
  // Where the services finder opens from the global navigation / hub (a canonical taxonomy category, or none).
  const [finderLaunch, setFinderLaunch] = useState<{ category?: string; nonce: number }>({ nonce: 0 });
  const [escrowLaunchTab, setEscrowLaunchTab] = useState<'journey' | 'deals' | 'create' | 'operations'>('journey');
  const [escrowLaunchNonce, setEscrowLaunchNonce] = useState(0);
  const [inspectionLaunch, setInspectionLaunch] = useState<{ vehicle: Vehicle | null; tab: 'service' | 'mine' | 'reports'; action: 'request' | 'apply-provider' | 'manage-business' | null; nonce: number }>({ vehicle: null, tab: 'service', action: null, nonce: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fixed (Final Integration - real data integration): this was
  // useState<UserProfile | null>(null) - a second, disconnected
  // source of truth for "who is logged in," never wired to the real,
  // HttpOnly-cookie-based session at all. Confirmed reverted from
  // this project's own earlier hardening work. Now consumes the one,
  // real, authoritative user directly from AuthProvider via
  // useAuth().
  //
  // authUser (from AuthContext) and the UserProfile shape the rest of
  // this app's component tree expects are two different types -
  // AuthContext's User has broader, all-optional fields matching
  // exactly what the real backend returns; UserProfile is this app's
  // own, stricter, required-fields shape. This adapter bridges the
  // two honestly: no field is invented that the backend doesn't
  // provide, except isVerified (backend has no such field - mapped
  // from the real, existing emailVerified boolean).
  const handleOpenAuth = useCallback(() => {
    navigate(loginPathFor(window.location));
  }, [navigate]);
  const handleOpenRegister = useCallback((intent: string, next: string) => {
    navigate(buildAuthPath('register', { next, intent }));
  }, [navigate]);
  const user: UserProfile | null = useMemo(() => {
    if (!authUser) return null;
    const id = authUser.id || authUser._id;
    if (!id) return null;
    return {
      id,
      email: authUser.email || '',
      name: authUser.name || '',
      // This narrow role union is UserProfile's own, pre-existing
      // contract in src/types.ts - not something this fix changes or
      // widens.
      role: (authUser.role || 'user') as UserProfile['role'],
      phone: authUser.phone || '',
      avatar: authUser.avatar || '',
      isVerified: Boolean(authUser.emailVerified),
    };
  }, [authUser]);

  // Interactive States
  // Fixed (Final Integration - production mock-data dependencies):
  // - the exact same mock-on-every-load defect originally found and
  // fixed in this project's own earlier hardening work (Phase 3),
  // confirmed to have been lost when this file was rebuilt on a
  // diverged branch. Re-applying the same, already-proven fix: starts
  // empty + loading, fetches real data from the already-existing,
  // already-correct services/vehicleApi.ts (getCars/
  // mapBackendCarToVehicle - neither needed any changes, both were
  // still intact). A failed fetch produces an explicit error state,
  // never a silent fallback to mock data.
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState<boolean>(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    setVehiclesError(null);
    try {
      const res = await getCars({ limit: 50 });
      const real = (res.data || res.cars || []).map(mapBackendCarToVehicle);
      setVehicles(real);
    } catch (err) {
      setVehiclesError(
        err instanceof VehicleApiError
          ? err.message
          : 'Something went wrong loading vehicles. Please try again.'
      );
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Modal Trigger States
  const [quickViewVehicle, setQuickViewVehicle] = useState<Vehicle | null>(null);
  const [invalidVehicleId, setInvalidVehicleId] = useState<string | null>(null);
  const resolvedVehicleIds = React.useRef(new Set<string>());
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showAlertsModal, setShowAlertsModal] = useState<boolean>(false);
  const [selectedChatVehicle, setSelectedChatVehicle] = useState<Vehicle | null>(null);

  // Central Navigation Handler: Opens Vehicle Details & Updates URL
  const handleOpenVehicleDetails = useCallback((vehicleOrId: Vehicle | string) => {
    if (typeof vehicleOrId !== 'string') {
      setQuickViewVehicle(vehicleOrId);
      setInvalidVehicleId(null);
      setVehicleDetailUrl(vehicleOrId.id);
      return;
    }

    const found = vehicles.find((v) => v.id === vehicleOrId);
    if (found) {
      setQuickViewVehicle(found);
      setInvalidVehicleId(null);
      setVehicleDetailUrl(found.id);
      return;
    }

    // A valid vehicle can be outside the currently loaded inventory slice.
    // Resolve the ID from the authoritative backend before declaring it missing.
    setVehicleDetailUrl(vehicleOrId);
    setQuickViewVehicle(null);
    setInvalidVehicleId(null);
    void getCarById(vehicleOrId).then((car) => {
      resolvedVehicleIds.current.add(vehicleOrId);
      if (car) {
        setQuickViewVehicle(mapBackendCarToVehicle(car));
        setInvalidVehicleId(null);
      } else {
        setInvalidVehicleId(vehicleOrId);
      }
    }).catch(() => {
      resolvedVehicleIds.current.add(vehicleOrId);
      setInvalidVehicleId(vehicleOrId);
    });
  }, [vehicles]);

  // Central Close Handler: Clears Vehicle Details & Removes URL Param
  const handleCloseVehicleDetails = useCallback(() => {
    setQuickViewVehicle(null);
    setInvalidVehicleId(null);
    setVehicleDetailUrl(null);
  }, []);

  // Listen for initial URL vehicle parameter and popstate (browser back/forward)
  useEffect(() => {
    let cancelled = false;

    const handleUrlSync = () => {
      const urlVehicleId = getVehicleIdFromUrl();
      if (!urlVehicleId) {
        setQuickViewVehicle(null);
        setInvalidVehicleId(null);
        return;
      }

      const found = vehicles.find((v) => v.id === urlVehicleId);
      if (found) {
        setQuickViewVehicle(found);
        setInvalidVehicleId(null);
        return;
      }

      // Browser refreshes and shared URLs must resolve against the backend,
      // not only the first inventory page currently held in memory.
      setQuickViewVehicle(null);
      setInvalidVehicleId(null);
      if (resolvedVehicleIds.current.has(urlVehicleId)) return;

      resolvedVehicleIds.current.add(urlVehicleId);
      void getCarById(urlVehicleId).then((car) => {
        if (cancelled) return;
        if (car) {
          setQuickViewVehicle(mapBackendCarToVehicle(car));
          setInvalidVehicleId(null);
        } else {
          setInvalidVehicleId(urlVehicleId);
        }
      }).catch(() => {
        if (!cancelled) setInvalidVehicleId(urlVehicleId);
      });
    };

    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    return () => {
      cancelled = true;
      window.removeEventListener('popstate', handleUrlSync);
    };
  }, [vehicles]);

  // Saved vehicles are server-authoritative for authenticated users.
  const {
    savedVehicles,
    savedVehiclesList,
    handleToggleSave,
  } = useVehicleCollections(vehicles, user?.id ?? null);

  // Phase 47: comparison is client-owned state, but it must still have one
  // authoritative client source. CompareContext already persists IDs to
  // localStorage, so App consumes that instead of maintaining a second,
  // non-persisted comparedVehicles array inside useVehicleCollections.
  const { compareIds: comparedVehicles, toggleCar: handleToggleCompare, removeCar: removeComparedVehicle } = useCompare();
  const [resolvedComparedVehicles, setResolvedComparedVehicles] = useState<Record<string, Vehicle>>({});

  // A persisted comparison can contain a vehicle outside the current inventory
  // page/slice. Resolve those IDs through the real single-vehicle API so the
  // compare modal survives refreshes and marketplace pagination honestly.
  useEffect(() => {
    let cancelled = false;
    const availableIds = new Set(vehicles.map((vehicle) => vehicle.id));
    const missingIds = comparedVehicles.filter(
      (id) => !availableIds.has(id) && !resolvedComparedVehicles[id]
    );

    if (missingIds.length === 0) return () => { cancelled = true; };

    void Promise.all(missingIds.map(async (id) => {
      try {
        const car = await getCarById(id);
        return car ? [id, mapBackendCarToVehicle(car)] as const : [id, null] as const;
      } catch {
        return [id, null] as const;
      }
    })).then((results) => {
      if (cancelled) return;
      setResolvedComparedVehicles((prev) => {
        const next = { ...prev };
        for (const [id, vehicle] of results) {
          if (vehicle) next[id] = vehicle;
        }
        return next;
      });
      for (const [id, vehicle] of results) {
        if (!vehicle) removeComparedVehicle(id);
      }
    });

    return () => { cancelled = true; };
  }, [comparedVehicles, vehicles, resolvedComparedVehicles, removeComparedVehicle]);

  const comparedVehiclesList = useMemo(() => {
    const currentById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
    return comparedVehicles
      .map((id) => currentById.get(id) || resolvedComparedVehicles[id])
      .filter((vehicle): vehicle is Vehicle => Boolean(vehicle));
  }, [comparedVehicles, vehicles, resolvedComparedVehicles]);

  // Add Vehicle Handler
  const handleAddVehicle = useCallback((_newVehicle: Vehicle) => {
    // Vehicle creation is backend-authoritative. Refresh the real inventory
    // after a successful create instead of inserting a locally synthesized row.
    void fetchVehicles();
  }, [fetchVehicles]);

  // Escrow CTA Handler
  const handleStartEscrow = useCallback((vehicle: Vehicle) => {
    setQuickViewVehicle(null);
    setSelectedChatVehicle(vehicle);
    setEscrowLaunchTab('create');
    setActiveNav('escrow');
  }, []);

  // Inspection launch: keep the vehicle the customer was looking at (it used to be discarded).
  const launchInspections = useCallback((next: { vehicle?: Vehicle | null; tab?: 'service' | 'mine' | 'reports'; action?: 'request' | 'apply-provider' | 'manage-business' | null }) => {
    setInspectionLaunch((prev) => ({ vehicle: next.vehicle ?? null, tab: next.tab ?? 'service', action: next.action ?? null, nonce: prev.nonce + 1 }));
    setActiveNav('inspections');
  }, []);
  const handleRequestInspection = useCallback((vehicle: Vehicle) => {
    handleCloseVehicleDetails();
    launchInspections({ vehicle, action: 'request' });
  }, [handleCloseVehicleDetails, launchInspections]);

  // Contact Seller Handler
  const handleContactSeller = useCallback((vehicle: Vehicle) => {
    setQuickViewVehicle(null);
    setSelectedChatVehicle(vehicle);
    setActiveNav('chat');
  }, []);

  // Select Dealer Vehicles Shortcut
  const handleSelectDealerVehicles = useCallback((dealerName: string) => {
    setSearchQuery(dealerName);
    setActiveNav('marketplace');
  }, []);

  const handleNavClick = useCallback((nav: string) => {
    // `scope:value` ids from the global navigation select an EXISTING tab of an
    // existing destination (Auction tabs, Escrow tabs). They create no route.
    if (nav.startsWith('auctions:')) {
      const tab = nav.slice('auctions:'.length);
      const params = new URLSearchParams({ nav: 'auctions' });
      if (tab && tab !== 'live') params.set('auctionTab', tab);
      window.history.replaceState({}, '', `/?${params.toString()}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      setActiveNav('auctions');
      return;
    }
    // `services:*` ids open an existing destination of the automotive services hub. They create no route.
    if (nav.startsWith('services:')) {
      const where = nav.slice('services:'.length);
      if (where === 'find') { setFinderLaunch((p) => ({ nonce: p.nonce + 1 })); setActiveNav('inspection-marketplace'); return; }
      if (where === 'roadside') { setFinderLaunch((p) => ({ category: 'roadside_recovery', nonce: p.nonce + 1 })); setActiveNav('inspection-marketplace'); return; }
      if (where === 'mine') { launchInspections({ tab: 'mine' }); return; }
      launchInspections({});
      return;
    }
    if (nav.startsWith('escrow:')) {
      const tab = nav.slice('escrow:'.length);
      setEscrowLaunchTab(tab === 'create' || tab === 'deals' || tab === 'operations' ? tab : 'journey');
      setEscrowLaunchNonce((n) => n + 1);
      setActiveNav('escrow');
      return;
    }
    if (nav === 'escrow') setEscrowLaunchTab('journey');
    setActiveNav(nav);
  }, [launchInspections]);

  const isMarketplaceSurface = activeNav === 'marketplace' || activeNav === 'saved';
  const privateWorkspaceNavs = new Set([
    'admin',
    'dashboard',
    'dealer-dashboard',
    'buyer-platform',
    'seller-platform',
    'sell',
    'seller',
    'seller-dashboard',
  ]);
  const showPublicMobileDock = !privateWorkspaceNavs.has(activeNav) && !['auctions', 'payments', 'profile'].includes(activeNav);

  return (
    <div className="min-h-screen bg-[#EEF7F5] text-[#0A3340] flex flex-col font-sans">
      {/* 0. Top notice/advertisement strip - real, backend-driven,
          admin-managed entirely through the Ad Manager panel, no code
          changes needed to add/edit/recolor/remove an entry. */}
      {!privateWorkspaceNavs.has(activeNav) && <TopNoticeStrip />}

      {/* 1. Header Navigation */}
      <SkipLink />

      <Navbar
        user={user}
        authLoading={authLoading}
        savedCount={savedVehicles.length}
        activeNav={activeNav}
        onNavClick={handleNavClick}
        selectedCounty={selectedCounty}
        onCountyChange={(c) => setSelectedCounty(c)}
        onOpenAuth={handleOpenAuth}
        onOpenAlerts={() => setShowAlertsModal(true)}
        onOpenCompare={() => setShowCompareModal(true)}
        onLogout={() => { authLogout(); }}
      />

      {/* 2. Main Container (Inventory Priority & Clear Hierarchy) */}
      <main
        id="main-content"
        tabIndex={-1}
        className={
          isMarketplaceSurface
            ? `flex-1 w-full min-w-0 max-w-none mx-0 px-0 py-0 ${showPublicMobileDock ? 'pb-[calc(5rem+env(safe-area-inset-bottom))]' : ''} lg:pb-0 space-y-0 overflow-x-clip`
            : `flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 ${showPublicMobileDock ? 'pb-[calc(5rem+env(safe-area-inset-bottom))]' : 'pb-6'} lg:pb-6 space-y-6`
        }
      >
        <Suspense fallback={
          <div className="min-h-[420px] flex items-center justify-center px-6" role="status" aria-live="polite">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#BDE5DE] border-t-amber-400" aria-hidden="true" />
              <p className="text-sm font-medium text-[#64748B]">Loading KAYAD workspace…</p>
            </div>
          </div>
        }>

        {/* Module Switcher Rendering */}
        <AuctionSurfaceReveal surface={activeNav}>
        {activeNav === 'marketplace' && (
            <VehicleMarketplace
              vehicles={vehicles}
              savedVehicles={savedVehicles}
              comparedVehicles={comparedVehicles}
              onToggleSave={handleToggleSave}
              onToggleCompare={handleToggleCompare}
              onQuickView={handleOpenVehicleDetails}
              onStartEscrow={handleStartEscrow}
              selectedCounty={selectedCounty}
              onCountyChange={(c) => setSelectedCounty(c)}
              searchQuery={searchQuery}
              onSearchChange={(q) => setSearchQuery(q)}
              onOpenCompareModal={() => setShowCompareModal(true)}
              onNavigate={(nav) => setActiveNav(nav)}
              onOpenAuth={handleOpenAuth}
              user={user}
              isHomePage
              isLoadingReal={vehiclesLoading}
              loadError={vehiclesError}
              onRetryLoad={fetchVehicles}
            />
          )}

          {activeNav === 'auctions' && (
            <AuctionsView
              vehicles={vehicles}
              user={user}
              onOpenAuth={handleOpenAuth}
              onStartEscrow={handleStartEscrow}
              onQuickViewVehicle={handleOpenVehicleDetails}
            />
          )}

          {activeNav === 'payments' && user && <PaymentHistoryView />}

          {activeNav === 'profile' && user && (
            <Profile setPage={(page) => setActiveNav(page)} authUser={authUser} />
          )}

          {activeNav === 'escrow' && (
            <EscrowView
              key={escrowLaunchNonce}
              user={user}
              onOpenAuth={handleOpenAuth}
              initialTab={escrowLaunchTab}
              onNavigate={handleNavClick}
            />
          )}

          {activeNav === 'inspections' && (
            <InspectionsView
              key={inspectionLaunch.nonce}
              initialSelectedVehicle={inspectionLaunch.vehicle}
              initialTab={inspectionLaunch.tab}
              launchAction={inspectionLaunch.action}
              vehicles={vehicles}
              user={user}
              onOpenAuth={handleOpenAuth}
              onOpenRegister={handleOpenRegister}
              onViewVehicleDetails={handleOpenVehicleDetails}
              onOpenInspectionMarketplace={(category) => { setFinderLaunch((p) => ({ category, nonce: p.nonce + 1 })); setActiveNav('inspection-marketplace'); }}
            />
          )}

          {activeNav === 'inspection-marketplace' && (
            <InspectionMarketplacePage
              key={finderLaunch.nonce}
              initialFilters={finderLaunch.category ? { category: finderLaunch.category } : undefined}
              onViewMyInspections={() => launchInspections({ tab: 'mine' })}
              onApplyAsProvider={() => launchInspections({ action: 'apply-provider' })}
            />
          )}

          {(activeNav === 'financing' || activeNav === 'finance') && (
            <FinanceMarketplace user={user} onOpenAuth={handleOpenAuth} />
          )}

          {activeNav === 'dealers' && (
            <DealersView
              dealers={[]}
              vehicles={vehicles}
              onSelectDealerVehicles={handleSelectDealerVehicles}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onStartEscrow={handleStartEscrow}
              onAddVehicle={handleAddVehicle}
            />
          )}

          {activeNav === 'dashboard' && user && (
            <DashboardHub user={authUser} vehicles={vehicles} onNavigate={(nav) => setActiveNav(nav)} />
          )}

          {activeNav === 'chat' && (
            <ChatView
              messages={[]}
              selectedVehicle={selectedChatVehicle}
              user={user}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onNavigateToEscrow={() => setActiveNav('escrow')}
              onNavigateToInspections={() => setActiveNav('inspections')}
              onNavigateToFinancing={() => setActiveNav('financing')}
            />
          )}

          {/* Fixed (Final Integration): this rendered purely on
              activeNav === 'admin', with no check on the real user's
              role - any visitor, including an anonymous, logged-out
              one, could reach this by manipulating client-side
              navigation state alone. Confirmed reverted from this
              project's own earlier hardening work (Phase 2). This
              frontend gate is a UX improvement, not the sole security
              boundary - real backend authorization on this view's own
              data calls remains the authoritative check. */}
          {activeNav === 'admin' && isAdmin && (
            <AdminView
              vehicles={vehicles}
              onQuickViewVehicle={handleOpenVehicleDetails}
            />
          )}

          {activeNav === 'support' && (
            <SupportView user={user} onOpenAuth={handleOpenAuth} onNavigate={(nav) => setActiveNav(nav)} />
          )}

          {/* Fixed: 'broadcast' (LiveAuctionBroadcastPage) removed
              entirely - confirmed zero real navigation ever reached
              it (no nav link, no button anywhere in the real app), it
              was driven entirely by 2 hardcoded mock constants with
              no real backend connection, and the real, working "watch
              a live auction, see the real current bid, place a real
              bid" experience already exists and is genuinely
              connected (AuctionDiscoveryNetwork's own WatchLiveModal,
              'discovery'). Rebuilding this as a real, separate page
              would have duplicated that already-real functionality
              rather than adding anything genuinely new. */}
          {activeNav === 'discovery' && (
            <AuctionsView user={user} onOpenAuth={handleOpenAuth} />
          )}

          {activeNav === 'kayadlive' && (
            <KAYADLive onNavigate={(nav) => setActiveNav(nav)} />
          )}

          {activeNav === 'buyer-platform' && (
            <BuyerPlatform user={user} onNavigate={(nav) => setActiveNav(nav)} onOpenAuth={handleOpenAuth} />
          )}


          {activeNav === 'dealer-dashboard' && (
            <DealerDashboard user={user} onOpenAuth={handleOpenAuth} onNavigate={(nav) => setActiveNav(nav)} />
          )}


          {activeNav === 'saved' && (
            <VehicleMarketplace
              vehicles={savedVehiclesList}
              savedVehicles={savedVehicles}
              comparedVehicles={comparedVehicles}
              onToggleSave={handleToggleSave}
              onToggleCompare={handleToggleCompare}
              onQuickView={handleOpenVehicleDetails}
              onStartEscrow={handleStartEscrow}
              selectedCounty={selectedCounty}
              onCountyChange={(c) => setSelectedCounty(c)}
              searchQuery=""
              onSearchChange={() => {}}
              onOpenCompareModal={() => setShowCompareModal(true)}
              isLoadingReal={false}
              loadError={null}
              onRetryLoad={() => undefined}
              savedOnly
            />
          )}

          {(activeNav === 'sell' || activeNav === 'seller' || activeNav === 'seller-dashboard' || activeNav === 'seller-platform') && (
            <PrivateSellerPlatform user={user} onOpenAuth={handleOpenAuth} />
          )}
        </AuctionSurfaceReveal>
        </Suspense>
        </main>

      {user && ['auctions', 'payments', 'profile'].includes(activeNav) && (
        <AuctionMobileDock active={activeNav === 'auctions' ? (new URLSearchParams(location.search).get('auctionTab') === 'saved' ? 'saved' : 'auctions') : activeNav} savedCount={savedVehicles.length} onNavigate={(nav) => setActiveNav(nav)} onSaved={() => { setActiveNav('auctions'); window.history.replaceState({}, '', '/?nav=auctions&auctionTab=saved'); window.dispatchEvent(new PopStateEvent('popstate')); }} />
      )}

      {showPublicMobileDock && (
        <MobileBottomNav
          authUser={authUser}
          activeNav={activeNav}
          onNavigate={(nav) => setActiveNav(nav)}
          onOpenCompare={() => setShowCompareModal(true)}
          onOpenAuth={handleOpenAuth}
        />
      )}

      {/* 3. Footer */}
      <footer className="bg-[#0A3340] text-[#BDE5DE] text-xs py-8 border-t border-navy-600/40 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#13B8A6] text-[#0A3340] font-black flex items-center justify-center">
              K
            </div>
            <div>
              <p className="font-bold text-white">KAYAD Automotive Marketplace East Africa</p>
              <p className="text-[11px] text-[#94A3B8]">Verified Automotive & Escrow Platform East Africa</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[#BDE5DE]">
            <button onClick={() => setActiveNav('marketplace')} className="hover:text-[#5AAFA4]">Marketplace</button>
            <button onClick={() => setActiveNav('escrow')} className="hover:text-[#5AAFA4]">Escrow Vault</button>
            <button onClick={() => setActiveNav('financing')} className="hover:text-[#5AAFA4]">Financing</button>
            <button onClick={() => setActiveNav('support')} className="hover:text-[#5AAFA4]">Support & Disputes</button>
          </div>
        </div>
      </footer>

      {/* 4. Modals */}
      <VehicleDetailModal
        vehicle={quickViewVehicle}
        notFoundId={invalidVehicleId}
        allVehicles={vehicles}
        onClose={handleCloseVehicleDetails}
        onStartEscrow={handleStartEscrow}
        onContactSeller={handleContactSeller}
        onRequestInspection={handleRequestInspection}
        isSaved={quickViewVehicle ? savedVehicles.includes(quickViewVehicle.id) : false}
        onToggleSave={handleToggleSave}
        onSelectVehicle={handleOpenVehicleDetails}
      />

      {showCompareModal && (
        <CompareModal
          vehicles={comparedVehiclesList}
          onClose={() => setShowCompareModal(false)}
          onRemove={handleToggleCompare}
          onStartEscrow={handleStartEscrow}
          onQuickViewVehicle={handleOpenVehicleDetails}
        />
      )}

      <PriceAlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
      />
    </div>
  );
}

function AuthRouteSurface() {
  const location = useLocation();
  const path = location.pathname;
  if (path === '/login' || path === '/admin/login') return <LoginPage />;
  if (path === '/register') return <OnboardingFlow onClose={() => { window.location.href = '/'; }} />;
  if (path === '/forgot-password') return <ForgotPasswordPage />;
  if (path === '/reset-password') return <ResetPasswordPage />;

  // Canonical vehicle deep-link boundary. Marketplace cards, shared links,
  // dealer previews and auction completion historically used /cars/:id,
  // while the current marketplace detail state is URL-query based. Resolve
  // the legacy/public path into the existing single detail mechanism instead
  // of letting it fall through to the homepage without opening the vehicle.
  const vehiclePathMatch = path.match(/^\/cars\/([^/]+)\/?$/);
  if (vehiclePathMatch) {
    return <Navigate replace to={`/?nav=marketplace&vehicleId=${encodeURIComponent(vehiclePathMatch[1])}`} />;
  }

  // STAGE 3 MARKETPLACE/VEHICLE/AUCTION CONVERGENCE FIX: AuctionLivePage is
  // rendered directly from this path switch, not from a <Route>, so React
  // has no identity-driven unmount/remount signal of its own when `path`
  // changes between two different auctions (e.g. navigating from
  // /auction/A to /auction/B via AuctionsView's in-app navigate() call).
  // Without a `key`, the existing component instance is reused and its
  // `registration`/`car` state can transiently show the previous auction's
  // data for the brief window before the new auction's fetches resolve.
  // Keying on `path` forces a clean remount per auction, matching how a
  // real <Route path="/auction/:id"> would behave.
  if (path.startsWith('/auction/')) return <AuctionLivePage key={path} />;
  if (path === '/force-password-change') return <ForcePasswordChange />;
  // All notification entry points use this canonical authenticated destination.
  // Previously /notifications had no route, while the panel's 'View All' sent
  // users to /dashboard; that protected dashboard route redirected to /login.
  if (path === '/notifications') return <RequireAuth><NotificationsPage /></RequireAuth>;

  // Canonicalize legacy/direct routes into the single AppInner navigation
  // surface. This prevents stale links such as /gallery, /auction, /escrow,
  // /chat, /admin and /dealer from silently rendering the wrong public page.
  if (path === '/gallery' || path === '/marketplace') return <Navigate to="/?nav=marketplace" replace />;
  if (path === '/auction' || path === '/auctions') return <Navigate to="/?nav=discovery" replace />;
  if (path === '/escrow') return <Navigate to="/?nav=escrow" replace />;
  if (path === '/support') return <Navigate to="/?nav=support" replace />;
  if (path === '/inspections') return <Navigate to="/?nav=inspections" replace />;
  if (path === '/financing') return <Navigate to="/?nav=financing" replace />;
  if (path === '/saved') return <RequireAuth><Navigate to="/?nav=saved" replace /></RequireAuth>;
  if (path === '/profile') return <RequireAuth><Navigate to="/?nav=profile" replace /></RequireAuth>;
  if (path === '/payments') return <RequireAuth><Navigate to="/?nav=payments" replace /></RequireAuth>;
  if (path === '/chat') return <RequireAuth><Navigate to="/?nav=chat" replace /></RequireAuth>;
  if (path === '/dashboard') return <RequireAuth><Navigate to="/?nav=dashboard" replace /></RequireAuth>;
  if (path === '/buyer-platform') return <RequireAuth><Navigate to="/?nav=buyer-platform" replace /></RequireAuth>;
  if (path === '/dealer') return <RequireAuth><RequireDealer><Navigate to="/?nav=dealer-dashboard" replace /></RequireDealer></RequireAuth>;
  if (path === '/admin') return <RequireAdmin><Navigate to="/?nav=admin" replace /></RequireAdmin>;
  if (path === '/inspector/dashboard') return <RequireAuth><Navigate to="/?nav=inspections" replace /></RequireAuth>;

  if (path === '/dealer/onboarding') return <RequireAuth><RequireDealer><DealerOnboarding /></RequireDealer></RequireAuth>;
  if (path === '/dealer/auction-setup') return <RequireAuth><RequireDealer><DealerAuctionSetupWizard /></RequireDealer></RequireAuth>;
  if (path === '/dealer/auction-operations') return <RequireAuth><RequireDealer><DealerAuctionOperations /></RequireDealer></RequireAuth>;
  if (path.startsWith('/dealer/auction-operations/') && path !== '/dealer/auction-operations') return <RequireAuth><RequireDealer><DealerAuctionOperationCase /></RequireDealer></RequireAuth>;
  return <AppInner />;
}

export function App() {
  const location = useLocation();
  if (location.pathname === '/verify-email') return <VerifyEmailPage />;
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <CompareProvider>
            <AuthRouteSurface />
          </CompareProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
