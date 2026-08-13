import React, { useState, useCallback, useMemo, useEffect, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import VehicleMarketplace from './features/VehicleMarketplace';
import VehicleDetailModal from './components/VehicleDetailModal';
import CompareModal from './components/CompareModal';
import AuthModal from './components/AuthModal';
import PriceAlertsModal from './components/PriceAlertsModal';

import { INITIAL_VEHICLES, MOCK_DEALERS, MOCK_ESCROW_DEALS, MOCK_MESSAGES } from './data/mockVehicles';
import { Vehicle, ChatMessage, UserProfile } from './types';
import { getVehicleIdFromUrl, setVehicleDetailUrl, setAuctionDetailUrl } from './utils/navigation';
import { INITIAL_AUCTION_SESSIONS } from './data/mockAuctions';
import { isEscrowApplicable } from './utils/escrow';

// Views — lazy-loaded so each is its own chunk, downloaded only when the
// user navigates there, instead of all being bundled into the initial load.
// VehicleMarketplace stays a static import since it's the default/landing view.
const AuctionsView = lazy(() => import('./features/AuctionsView'));
const EscrowView = lazy(() => import('./features/EscrowView'));
const InspectionsView = lazy(() => import('./features/InspectionsView'));
const FinancingView = lazy(() => import('./features/FinancingView'));
const DealersView = lazy(() => import('./features/DealersView'));
const DashboardView = lazy(() => import('./features/DashboardView'));
const PrivateSellerDashboardView = lazy(() => import('./features/PrivateSellerDashboardView'));
const ChatView = lazy(() => import('./features/ChatView'));
const AdminView = lazy(() => import('./features/AdminView'));
const SupportView = lazy(() => import('./features/SupportView'));
const LiveAuctionBroadcastPage = lazy(() => import('./features/LiveAuctionBroadcastPage'));
const AuctionDiscoveryNetwork = lazy(() => import('./features/AuctionDiscoveryNetwork'));
const KAYADLive = lazy(() => import('./features/KAYADLive'));
const BuyerPlatform = lazy(() => import('./features/OwnershipPlatform').then(m => ({ default: m.BuyerPlatform })));
const PrivateSellerPlatform = lazy(() => import('./features/PrivateSellerPlatform').then(m => ({ default: m.PrivateSellerPlatform })));
// FinanceMarketplace lazy import removed - the 'finance' route it backed
// was confirmed genuinely unreachable (Phase 1 consolidation): zero
// callers anywhere in the codebase via navigateTo, handleNavSelect, or
// any other navigation prop pattern checked. FinancingView (route
// 'financing') is the actively-used, functionally superset
// implementation of the same business function (5 tabs vs
// FinanceMarketplace's fewer equivalent sections, plus a "Compare
// Offers" capability FinanceMarketplace doesn't have), and uses the
// established Tailwind-class styling convention consistently used
// everywhere else in this app, where FinanceMarketplace instead used
// its own inline KAYAD_THEME object and a hardcoded internal "KAYAD"
// header - architecturally inconsistent with the rest of the codebase.
// Only the dead ROUTE was removed here (VALID_VIEWS entry, render
// block, this import) - the component file itself
// (features/FinancePlatform/components/FinanceMarketplace.tsx) was
// deliberately left in place rather than deleted, per this
// consolidation phase's explicit caution against removing files "simply
// because they appear unused" - full file removal is a separate,
// more consequential decision documented in KAYAD_CURRENT_STATE.md,
// not made unilaterally here.

export function App() {
  const [activeNav, setActiveNav] = useState<string>('marketplace');
  const [selectedCounty, setSelectedCounty] = useState<string>('All East Africa');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Authenticated User State (null = anonymous public visitor)
  const [user, setUser] = useState<UserProfile | null>(null);

  // Interactive States
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [savedVehicles, setSavedVehicles] = useState<string[]>(['v1', 'v2']);
  const [comparedVehicles, setComparedVehicles] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  
  // Modal Trigger States
  const [quickViewVehicle, setQuickViewVehicle] = useState<Vehicle | null>(null);
  const [invalidVehicleId, setInvalidVehicleId] = useState<string | null>(null);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAlertsModal, setShowAlertsModal] = useState<boolean>(false);
  const [selectedChatVehicle, setSelectedChatVehicle] = useState<Vehicle | null>(null);
  // Separate from selectedChatVehicle on purpose - that state is shared
  // with the unrelated chat feature (handleContactSeller also sets it),
  // so reusing it here would mean EscrowView could show stale prefill
  // data from whichever vehicle chat was most recently opened for,
  // rather than the vehicle escrow was actually started for.
  const [escrowPrefillVehicle, setEscrowPrefillVehicle] = useState<Vehicle | null>(null);

  // Views that require a signed-in user. Attempting to navigate to one of
  // these while anonymous opens the auth modal instead of the view itself -
  // repairs a route-protection gap where any visitor could reach the admin
  // panel or personal dashboard with no login check at all.
  const PROTECTED_VIEWS = useMemo(() => new Set(['admin', 'dashboard']), []);
  const navigateTo = useCallback((nav: string) => {
    if (PROTECTED_VIEWS.has(nav) && !user) {
      setShowAuthModal(true);
      return;
    }
    setActiveNav(nav);
  }, [user, PROTECTED_VIEWS]);

  // Route map: every activeNav value the Module Switcher below actually
  // renders a view for. Anything else falls back to 'marketplace' - the
  // equivalent of a 404-to-home redirect for this custom router, so a
  // stray or future-feature nav target never leaves the user on a blank
  // screen with no way forward.
  const VALID_VIEWS = useMemo(() => new Set([
    'marketplace', 'saved', 'auctions', 'escrow', 'inspections', 'financing',
    'dealers', 'dashboard', 'chat', 'admin', 'support', 'broadcast',
    'discovery', 'kayadlive', 'buyer-platform', 'seller-platform',
    'sell', 'seller', 'seller-dashboard',
  ]), []);
  useEffect(() => {
    if (!VALID_VIEWS.has(activeNav)) {
      setActiveNav('marketplace');
    }
  }, [activeNav, VALID_VIEWS]);

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
  const handleToggleSave = useCallback((id: string) => {
    setSavedVehicles((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  // Toggle Compare
  const handleToggleCompare = useCallback((id: string) => {
    setComparedVehicles((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, id];
    });
  }, []);

  // Add Vehicle Handler
  const handleAddVehicle = useCallback((newVehicle: Vehicle) => {
    setVehicles((prev) => [newVehicle, ...prev]);
  }, []);

  // Escrow CTA Handler
  // Guards on isEscrowApplicable before navigating anywhere - the
  // primary trigger (VehicleDetailModal's "Start Secure Escrow
  // Purchase" button) is already conditionally rendered based on this
  // same check, so in normal use this guard is a defense-in-depth
  // backstop, not the only thing standing between a user and an
  // ineligible vehicle's escrow flow - but "make the routing respect
  // that" means this handler itself shouldn't blindly trust that
  // whatever called it already checked. Silently doesn't navigate if
  // the vehicle isn't eligible, rather than presenting a UI message -
  // there's no existing app-wide toast/alert system to hook into here
  // (checked before assuming one existed), and this path realistically
  // shouldn't be reachable for an ineligible vehicle given the upstream
  // gate, so a hard block without new UI infrastructure is the
  // proportionate fix.
  const handleStartEscrow = useCallback((vehicle: Vehicle) => {
    if (!isEscrowApplicable(vehicle)) return;
    setQuickViewVehicle(null);
    setEscrowPrefillVehicle(vehicle);
    navigateTo('escrow');
  }, [navigateTo]);

  // View Auction Lot Handler - "Place Bid / Submit Auction Offer" on
  // VehicleDetailModal previously called onContactSeller (opening a
  // chat with the seller) for auction vehicles - a real, confirmed bug:
  // the button's own label promised bidding, but its action opened
  // chat instead, with no route to the actual auction lot at all.
  // Finds the specific auction session for this vehicle (by vehicleId,
  // not just navigating to the bare /auctions directory and making the
  // user search again) and deep-links directly to it using the same
  // getAuctionIdFromUrl/setAuctionDetailUrl mechanism built for auction
  // lot deep-linking - AuctionsView's own URL-sync effect (added in
  // that same change) picks up the param on mount and opens the
  // correct lot automatically, so no additional wiring is needed on
  // the AuctionsView side.
  const handleViewAuctionLot = useCallback((vehicle: Vehicle) => {
    const session = INITIAL_AUCTION_SESSIONS.find((s) => s.vehicleId === vehicle.id);
    setQuickViewVehicle(null);
    if (session) {
      setAuctionDetailUrl(session.id);
    }
    navigateTo('auctions');
  }, [navigateTo]);

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
    navigateTo('chat');
  }, [navigateTo]);

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
    navigateTo('marketplace');
  }, [navigateTo]);

  const savedVehiclesList = useMemo(() => {
    return vehicles.filter((v) => savedVehicles.includes(v.id));
  }, [vehicles, savedVehicles]);

  const comparedVehiclesList = useMemo(() => {
    return vehicles.filter((v) => comparedVehicles.includes(v.id));
  }, [vehicles, comparedVehicles]);

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-slate-800 flex flex-col font-sans">
      {/* 1. Header Navigation */}
      <Navbar
        user={user}
        savedCount={savedVehicles.length}
        activeNav={activeNav}
        onNavClick={(nav) => navigateTo(nav)}
        selectedCounty={selectedCounty}
        onCountyChange={(c) => setSelectedCounty(c)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenAlerts={() => setShowAlertsModal(true)}
        onLogout={() => setUser(null)}
      />

      {/* 2. Main Container (Inventory Priority & Clear Hierarchy) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Module Switcher Rendering */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#17244B] rounded-full animate-spin" />
          </div>
        }>
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
              onNavigate={(nav) => navigateTo(nav)}
              onOpenAuth={() => setShowAuthModal(true)}
              user={user}
              isHomePage
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
              deals={MOCK_ESCROW_DEALS}
              prefillVehicle={escrowPrefillVehicle}
            />
          )}

          {activeNav === 'inspections' && (
            <InspectionsView
              vehicles={vehicles}
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
              deals={MOCK_ESCROW_DEALS}
              user={user}
              messages={messages}
              comparedVehicles={comparedVehicles}
              onNavigate={(nav) => navigateTo(nav)}
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
              onQuickViewVehicle={handleOpenVehicleDetails}
              onNavigateToEscrow={() => navigateTo('escrow')}
              onNavigateToInspections={() => navigateTo('inspections')}
              onNavigateToFinancing={() => navigateTo('financing')}
            />
          )}

          {/* Admin route guard added (Phase 2 consolidation): previously
              activeNav === 'admin' rendered AdminView with zero role
              check at this level - the only protection was the Navbar's
              own button being conditionally hidden for non-admins
              (confirmed: `{user.role === 'admin' && (...)}` gates the
              button correctly), but nothing stopped AdminView from
              actually rendering if activeNav ever became 'admin' by any
              other means (devtools state manipulation, a future bug
              elsewhere setting it, etc.) - exactly the "frontend state
              must not grant access on its own" gap this consolidation
              phase asks to verify. This app has no connected backend
              (confirmed throughout this project's history), so this
              client-side check is not a real security boundary against
              a determined attacker - true admin protection requires
              server-side authorization, which doesn't exist yet and is
              out of scope to build here (explicitly prohibited: "do not
              introduce a new authentication provider"). This guard is
              still worth adding as defense-in-depth and correct default
              behavior: it prevents accidental/unintended admin access
              (e.g. stale state after a role change) without requiring a
              new auth system, and it doesn't regress anything - the
              real, current entry point (the gated Navbar button) is
              unaffected. Falls through to the existing VALID_VIEWS-style
              reset behavior (no explicit error UI) since a non-admin
              reaching this state happens only via direct manipulation,
              not normal navigation - consistent with how invalid views
              already silently fall back elsewhere in this file. */}
          {activeNav === 'admin' && user?.role === 'admin' && (
            <AdminView
              vehicles={vehicles}
              onQuickViewVehicle={handleOpenVehicleDetails}
            />
          )}

          {activeNav === 'support' && (
            <SupportView />
          )}

          {activeNav === 'broadcast' && (
            <LiveAuctionBroadcastPage onNavigate={navigateTo} onOpenAuth={() => setShowAuthModal(true)} />
          )}

          {activeNav === 'discovery' && (
            <AuctionDiscoveryNetwork />
          )}

          {activeNav === 'kayadlive' && (
            <KAYADLive />
          )}

          {activeNav === 'buyer-platform' && (
            <BuyerPlatform onNavigate={navigateTo} user={user} />
          )}

          {activeNav === 'seller-platform' && (
            <PrivateSellerPlatform user={user} />
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
            />
          )}

          {(activeNav === 'sell' || activeNav === 'seller' || activeNav === 'seller-dashboard') && (
            <PrivateSellerDashboardView
              vehicles={vehicles}
              user={user}
              deals={MOCK_ESCROW_DEALS}
              messages={messages}
              onNavigate={(nav) => navigateTo(nav)}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onOpenAuthModal={() => setShowAuthModal(true)}
            />
          )}
        </Suspense>
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
            <button onClick={() => navigateTo('marketplace')} className="hover:text-amber-300">Marketplace</button>
            <button onClick={() => navigateTo('escrow')} className="hover:text-amber-300">Escrow Vault</button>
            <button onClick={() => navigateTo('financing')} className="hover:text-amber-300">Financing</button>
            <button onClick={() => navigateTo('support')} className="hover:text-amber-300">Support & Disputes</button>
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
        onRequestInspection={() => navigateTo('inspections')}
        onViewAuctionLot={handleViewAuctionLot}
        onNavigateToFinancing={() => navigateTo('financing')}
        onViewShowroom={handleSelectDealerVehicles}
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
        onLogin={(loggedInUser) => setUser(loggedInUser)}
      />

      <PriceAlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
      />
    </div>
  );
}

export default App;
