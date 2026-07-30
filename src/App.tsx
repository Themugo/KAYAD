import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Navbar from './components/Navbar';
import VehicleMarketplace from './features/VehicleMarketplace';
import VehicleDetailModal from './components/VehicleDetailModal';
import CompareModal from './components/CompareModal';
import AuthModal from './components/AuthModal';
import PriceAlertsModal from './components/PriceAlertsModal';

import { INITIAL_VEHICLES, MOCK_DEALERS, MOCK_ESCROW_DEALS, MOCK_MESSAGES } from './data/mockVehicles';
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
import LiveAuctionBroadcastPage from './pages/LiveAuctionBroadcastPage';
import AuctionDiscoveryNetwork from './pages/AuctionDiscoveryNetwork';

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
        onNavClick={(nav) => setActiveNav(nav)}
        selectedCounty={selectedCounty}
        onCountyChange={(c) => setSelectedCounty(c)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenAlerts={() => setShowAlertsModal(true)}
        onLogout={() => setUser(null)}
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
              onQuickViewVehicle={handleOpenVehicleDetails}
              onNavigateToEscrow={() => setActiveNav('escrow')}
              onNavigateToInspections={() => setActiveNav('inspections')}
              onNavigateToFinancing={() => setActiveNav('financing')}
            />
          )}

          {activeNav === 'admin' && (
            <AdminView
              vehicles={vehicles}
              onQuickViewVehicle={handleOpenVehicleDetails}
            />
          )}

          {activeNav === 'support' && (
            <SupportView />
          )}

          {activeNav === 'broadcast' && (
            <LiveAuctionBroadcastPage />
          )}

          {activeNav === 'discovery' && (
            <AuctionDiscoveryNetwork />
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
