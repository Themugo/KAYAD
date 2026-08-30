import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Navbar from './components/Navbar';
import VehicleMarketplace from './features/VehicleMarketplace';
import TopNoticeStrip from './components/TopNoticeStrip';
import VehicleDetailModal from './components/VehicleDetailModal';
import CompareModal from './components/CompareModal';
import AuthModal from './components/AuthModal';
import PriceAlertsModal from './components/PriceAlertsModal';

import { MOCK_DEALERS, MOCK_MESSAGES } from './data/mockVehicles';
import { getCars, mapBackendCarToVehicle, VehicleApiError } from './services/vehicleApi';
import { useVehicleCollections } from './hooks/useVehicleCollections';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Vehicle, ChatMessage, UserProfile } from './types';
import { getVehicleIdFromUrl, setVehicleDetailUrl } from './utils/navigation';

// Views
import AuctionsView from './features/AuctionsView';
import EscrowView from './features/EscrowView';
import InspectionsView from './features/InspectionsView';
import FinancingView from './features/FinancingView';
import DealersView from './features/DealersView';
import DashboardView from './features/DashboardView';
import PrivateSellerDashboardView from './features/PrivateSellerDashboardView';
import ChatView from './features/ChatView';
import AdminView from './features/AdminView';
import SupportView from './features/SupportView';
import AuctionDiscoveryNetwork from './pages/AuctionDiscoveryNetwork';
import KAYADLive from './pages/KAYADLive';
import { BuyerPlatform } from './features/OwnershipPlatform';
import { PrivateSellerPlatform } from './features/PrivateSellerPlatform';
import { FinanceMarketplace } from './features/FinancePlatform';

// Fixed (Final Integration - real data integration): App() previously
// held its own, disconnected local user state directly - re-applying
// this project's own earlier hardening fix (Phase 2), confirmed lost
// on this branch: useAuth() requires an AuthProvider ancestor, so
// App() is now a thin wrapper providing that, with the real logic in
// AppInner().
function AppInner() {
  const [activeNav, setActiveNav] = useState<string>('marketplace');
  const [selectedCounty, setSelectedCounty] = useState<string>('All East Africa');
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
  const { user: authUser, logout: authLogout, isAdmin } = useAuth();
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
  // this had regressed back to useState<Vehicle[]>(INITIAL_VEHICLES)
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

  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  
  // Modal Trigger States
  const [quickViewVehicle, setQuickViewVehicle] = useState<Vehicle | null>(null);
  const [invalidVehicleId, setInvalidVehicleId] = useState<string | null>(null);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAlertsModal, setShowAlertsModal] = useState<boolean>(false);
  const [selectedChatVehicle, setSelectedChatVehicle] = useState<Vehicle | null>(null);

  // Central Navigation Handler: Opens Vehicle Details & Updates URL
  const handleOpenVehicleDetails = useCallback((vehicleOrId: Vehicle | string) => {
    if (typeof vehicleOrId === 'string') {
      const found = vehicles.find((v) => v.id === vehicleOrId);
      if (found) {
        setQuickViewVehicle(found);
        setInvalidVehicleId(null);
        setVehicleDetailUrl(found.id);
      } else {
        setQuickViewVehicle(null);
        setInvalidVehicleId(vehicleOrId);
        setVehicleDetailUrl(vehicleOrId);
      }
    } else {
      setQuickViewVehicle(vehicleOrId);
      setInvalidVehicleId(null);
      setVehicleDetailUrl(vehicleOrId.id);
    }
  }, [vehicles]);

  // Central Close Handler: Clears Vehicle Details & Removes URL Param
  const handleCloseVehicleDetails = useCallback(() => {
    setQuickViewVehicle(null);
    setInvalidVehicleId(null);
    setVehicleDetailUrl(null);
  }, []);

  // Listen for initial URL vehicle parameter and popstate (browser back/forward)
  useEffect(() => {
    const handleUrlSync = () => {
      const urlVehicleId = getVehicleIdFromUrl();
      if (urlVehicleId) {
        const found = vehicles.find((v) => v.id === urlVehicleId);
        if (found) {
          setQuickViewVehicle(found);
          setInvalidVehicleId(null);
        } else {
          setQuickViewVehicle(null);
          setInvalidVehicleId(urlVehicleId);
        }
      } else {
        setQuickViewVehicle(null);
        setInvalidVehicleId(null);
      }
    };

    handleUrlSync();

    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, [vehicles]);

  // Toggle Save
  // Fixed (Final Integration - real data integration): savedVehicles
  // was local-only state starting from hardcoded, fake IDs (['v1',
  // 'v2']) that never match any real vehicle, with no connection to
  // the real, already-built favorites backend (verified end-to-end
  // this pass: real toggle, real fetch, real persisted result,
  // survives refresh). A complete, already-built hook
  // (useVehicleCollections) already wires this correctly - real API
  // for logged-in users, honest local-only behavior for anonymous
  // ones (the backend has no anonymous-favorites concept at all) -
  // it simply was never connected to App.tsx. comparedVehicles has no
  // backend concept at all (confirmed: no such endpoint exists
  // anywhere) and correctly stays local-only in both cases.
  const {
    savedVehicles,
    comparedVehicles,
    savedVehiclesList,
    comparedVehiclesList,
    handleToggleSave,
    handleToggleCompare,
  } = useVehicleCollections(vehicles, user?.id ?? null);

  // Add Vehicle Handler
  const handleAddVehicle = useCallback((newVehicle: Vehicle) => {
    setVehicles((prev) => [newVehicle, ...prev]);
  }, []);

  // Escrow CTA Handler
  const handleStartEscrow = useCallback((vehicle: Vehicle) => {
    setQuickViewVehicle(null);
    setSelectedChatVehicle(vehicle);
    setActiveNav('escrow');
  }, []);

  // Update Vehicle Auction Status Handler
  const handleUpdateVehicleAuctionStatus = useCallback((vehicleId: string, isAuction: boolean) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, isAuction } : v))
    );
  }, []);

  // Contact Seller Handler
  const handleContactSeller = useCallback((vehicle: Vehicle) => {
    setQuickViewVehicle(null);
    setSelectedChatVehicle(vehicle);
    setActiveNav('chat');
  }, []);

  // Send Chat Message
  const handleSendMessage = useCallback((text: string) => {
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      vehicleTitle: selectedChatVehicle?.title
    };
    setMessages((prev) => [...prev, newMsg]);
  }, [selectedChatVehicle]);

  // Select Dealer Vehicles Shortcut
  const handleSelectDealerVehicles = useCallback((dealerName: string) => {
    setSearchQuery(dealerName);
    setActiveNav('marketplace');
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-slate-800 flex flex-col font-sans">
      {/* 0. Top notice/advertisement strip - real, backend-driven,
          admin-managed entirely through the Ad Manager panel, no code
          changes needed to add/edit/recolor/remove an entry. */}
      <TopNoticeStrip />

      {/* 1. Header Navigation */}
      <Navbar
        user={user}
        savedCount={savedVehicles.length}
        activeNav={activeNav}
        onNavClick={(nav) => setActiveNav(nav)}
        selectedCounty={selectedCounty}
        onCountyChange={(c) => setSelectedCounty(c)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenAlerts={() => setShowAlertsModal(true)}
        onLogout={() => { authLogout(); }}
      />

      {/* 2. Main Container (Inventory Priority & Clear Hierarchy) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Module Switcher Rendering */}
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
              onOpenAuth={() => setShowAuthModal(true)}
              isLoadingReal={vehiclesLoading}
              loadError={vehiclesError}
              onRetryLoad={fetchVehicles}
            />
          )}

          {activeNav === 'auctions' && (
            <AuctionsView
              vehicles={vehicles}
              user={user}
              onOpenAuth={() => setShowAuthModal(true)}
              onStartEscrow={handleStartEscrow}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onUpdateVehicleAuctionStatus={handleUpdateVehicleAuctionStatus}
            />
          )}

          {activeNav === 'escrow' && (
            <EscrowView
              user={user}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {activeNav === 'inspections' && (
            <InspectionsView
              vehicles={vehicles}
              user={user}
              onOpenAuth={() => setShowAuthModal(true)}
              onViewVehicleDetails={handleOpenVehicleDetails}
            />
          )}

          {activeNav === 'financing' && (
            <FinancingView 
              vehicles={vehicles}
              onQuickViewVehicle={handleOpenVehicleDetails}
            />
          )}

          {activeNav === 'dealers' && (
            <DealersView
              dealers={MOCK_DEALERS}
              vehicles={vehicles}
              onSelectDealerVehicles={handleSelectDealerVehicles}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onStartEscrow={handleStartEscrow}
              onAddVehicle={handleAddVehicle}
            />
          )}

          {activeNav === 'dashboard' && (
            <DashboardView
              savedVehicles={savedVehicles}
              vehicles={vehicles}
              // Fixed: this dashboard widget's own escrow-deals list is
              // a separate integration from the real Escrow page
              // (src/features/EscrowView.tsx, now connected to real
              // data) - out of today's explicit scope. Passing an
              // honest empty list rather than continuing to show fake
              // sample deals here.
              deals={[]}
              user={user}
              messages={messages}
              comparedVehicles={comparedVehicles}
              onNavigate={(nav) => setActiveNav(nav)}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onToggleSave={handleToggleSave}
              onToggleCompare={handleToggleCompare}
              onStartEscrow={handleStartEscrow}
              onContactSeller={handleContactSeller}
              onOpenCompareModal={() => setShowCompareModal(true)}
              onOpenAlertsModal={() => setShowAlertsModal(true)}
              onOpenAuthModal={() => setShowAuthModal(true)}
            />
          )}

          {activeNav === 'chat' && (
            <ChatView
              messages={messages}
              onSendMessage={handleSendMessage}
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
            <SupportView user={user} onOpenAuth={() => setShowAuthModal(true)} />
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
            <AuctionDiscoveryNetwork user={user} onOpenAuth={() => setShowAuthModal(true)} />
          )}

          {activeNav === 'kayadlive' && (
            <KAYADLive onNavigate={(nav) => setActiveNav(nav)} />
          )}

          {activeNav === 'buyer-platform' && (
            <BuyerPlatform user={user} onNavigate={(nav) => setActiveNav(nav)} onOpenAuth={() => setShowAuthModal(true)} />
          )}

          {activeNav === 'seller-platform' && (
            <PrivateSellerPlatform user={user} onOpenAuth={() => setShowAuthModal(true)} />
          )}

          {activeNav === 'finance' && (
            <FinanceMarketplace user={user} onOpenAuth={() => setShowAuthModal(true)} />
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
              isLoadingReal={vehiclesLoading}
              loadError={vehiclesError}
              onRetryLoad={fetchVehicles}
            />
          )}

          {(activeNav === 'sell' || activeNav === 'seller' || activeNav === 'seller-dashboard') && (
            <PrivateSellerDashboardView
              vehicles={vehicles}
              user={user}
              // Fixed: same as DashboardView above - a separate
              // integration, out of today's explicit scope. Honest
              // empty list instead of fake sample deals.
              deals={[]}
              messages={messages}
              onNavigate={(nav) => setActiveNav(nav)}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onOpenAuthModal={() => setShowAuthModal(true)}
            />
          )}
        </main>

      {/* 3. Footer */}
      <footer className="bg-[#17244B] text-slate-300 text-xs py-8 border-t border-navy-600/40 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-[#17244B] font-black flex items-center justify-center">
              K
            </div>
            <div>
              <p className="font-bold text-white">KAYAD Automotive Marketplace East Africa</p>
              <p className="text-[11px] text-slate-400">Verified Automotive & Escrow Platform East Africa</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-slate-300">
            <button onClick={() => setActiveNav('marketplace')} className="hover:text-amber-300">Marketplace</button>
            <button onClick={() => setActiveNav('escrow')} className="hover:text-amber-300">Escrow Vault</button>
            <button onClick={() => setActiveNav('financing')} className="hover:text-amber-300">Financing</button>
            <button onClick={() => setActiveNav('support')} className="hover:text-amber-300">Support & Disputes</button>
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
        onRequestInspection={() => setActiveNav('inspections')}
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

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        // Fixed: the real state update already happens inside
        // AuthModal's own login()/register()/demoLogin() calls
        // through AuthContext by the time this fires - App no longer
        // keeps any separate state to set here.
        onLogin={() => {}}
      />

      <PriceAlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
