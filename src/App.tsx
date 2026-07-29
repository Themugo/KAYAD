import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import VehicleMarketplace from './features/VehicleMarketplace';
import VehicleDetailModal from './components/VehicleDetailModal';
import CompareModal from './components/CompareModal';
import AuthModal from './components/AuthModal';
import PriceAlertsModal from './components/PriceAlertsModal';
import { PageSkeleton } from './components/ui';

import { Vehicle, ChatMessage, Dealer, EscrowTransaction } from './types';
import { getVehicleIdFromUrl, setVehicleDetailUrl } from './utils/navigation';
import { api } from './api/api';
import { useAuth } from './context/AuthContext';

// Lazy-loaded secondary views for bundle optimization
const AuctionsView = lazy(() => import('./features/AuctionsView'));
const EscrowView = lazy(() => import('./features/EscrowView'));
const FinancingView = lazy(() => import('./features/FinancingView'));
const DealersView = lazy(() => import('./features/DealersView'));
const DashboardView = lazy(() => import('./features/DashboardView'));
const ChatView = lazy(() => import('./features/ChatView'));
const AdminView = lazy(() => import('./features/AdminView'));
const SupportView = lazy(() => import('./features/SupportView'));

export function App() {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState<string>('marketplace');
  const [selectedCounty, setSelectedCounty] = useState<string>('All East Africa');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Backend-connected States
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [escrowDeals, setEscrowDeals] = useState<EscrowTransaction[]>([]);
  const [savedVehicles, setSavedVehicles] = useState<string[]>([]);
  const [comparedVehicles, setComparedVehicles] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Modal Trigger States
  const [quickViewVehicle, setQuickViewVehicle] = useState<Vehicle | null>(null);
  const [invalidVehicleId, setInvalidVehicleId] = useState<string | null>(null);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAlertsModal, setShowAlertsModal] = useState<boolean>(false);
  const [selectedChatVehicle, setSelectedChatVehicle] = useState<Vehicle | null>(null);

  // Fetch vehicles from backend
  useEffect(() => {
    async function fetchVehicles() {
      try {
        setIsLoading(true);
        const response = await api.get('/vehicles');
        const data = response.data?.vehicles || response.data || [];
        setVehicles(data);
        
        // Load user favorites from localStorage
        const saved = localStorage.getItem('kayad_favorites');
        if (saved) {
          setSavedVehicles(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to fetch vehicles:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchVehicles();
  }, []);

  // Fetch dealers
  useEffect(() => {
    async function fetchDealers() {
      try {
        const response = await api.get('/dealers');
        const data = response.data?.dealers || response.data || [];
        setDealers(data);
      } catch (error) {
        console.error('Failed to fetch dealers:', error);
      }
    }
    if (activeNav === 'dealers') {
      fetchDealers();
    }
  }, [activeNav]);

  // Fetch escrow deals
  useEffect(() => {
    async function fetchEscrowDeals() {
      try {
        const response = await api.get('/escrow');
        const data = response.data?.deals || response.data || [];
        setEscrowDeals(data);
      } catch (error) {
        console.error('Failed to fetch escrow deals:', error);
      }
    }
    if (user && activeNav === 'escrow') {
      fetchEscrowDeals();
    }
  }, [user, activeNav]);

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

  // Escrow CTA Handler
  const handleStartEscrow = useCallback((vehicle: Vehicle) => {
    setQuickViewVehicle(null);
    setSelectedChatVehicle(vehicle);
    setActiveNav('escrow');
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
        initialQuery={searchQuery}
        onSearch={(q) => setSearchQuery(q)}
        savedCount={savedVehicles.length}
        activeNav={activeNav}
        onNavClick={(nav) => setActiveNav(nav)}
        selectedCounty={selectedCounty}
        onCountyChange={(c) => setSelectedCounty(c)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenAlerts={() => setShowAlertsModal(true)}
      />

      {/* 2. Main Container (Inventory Priority & Clear Hierarchy) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Module Switcher Rendering */}
        <Suspense fallback={<PageSkeleton />}>
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
            />
          )}

          {activeNav === 'auctions' && (
            <AuctionsView
              vehicles={vehicles}
              onStartEscrow={handleStartEscrow}
              onQuickViewVehicle={handleOpenVehicleDetails}
            />
          )}

          {activeNav === 'escrow' && (
            <EscrowView
              deals={escrowDeals}
            />
          )}

          {activeNav === 'financing' && (
            <FinancingView />
          )}

          {activeNav === 'dealers' && (
            <DealersView
              dealers={dealers}
              vehicles={vehicles}
              onSelectDealerVehicles={handleSelectDealerVehicles}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onStartEscrow={handleStartEscrow}
            />
          )}

          {activeNav === 'dashboard' && (
            <DashboardView
              savedVehicles={savedVehicles}
              vehicles={vehicles}
              deals={escrowDeals}
              onNavigate={(nav) => setActiveNav(nav)}
              onQuickViewVehicle={handleOpenVehicleDetails}
            />
          )}

          {activeNav === 'chat' && (
            <ChatView
              messages={messages}
              onSendMessage={handleSendMessage}
              selectedVehicle={selectedChatVehicle}
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

          {activeNav === 'sell' && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-card max-w-2xl mx-auto space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Sell Your Car</span>
                <h2 className="text-2xl font-extrabold text-[#1E3063] font-display mt-1">List Vehicle with KAYAD Escrow</h2>
                <p className="text-xs text-slate-500">Reach thousands of verified buyers in Kenya, Uganda, Tanzania & Rwanda.</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setActiveNav('marketplace'); }} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Make</label>
                    <input type="text" placeholder="e.g. Toyota" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Model</label>
                    <input type="text" placeholder="e.g. Prado TX-L" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Registration Year</label>
                    <input type="number" placeholder="2021" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Asking Price (Ksh)</label>
                    <input type="number" placeholder="6,850,000" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">County & Location</label>
                  <input type="text" placeholder="Westlands, Nairobi" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>

                <button type="submit" className="w-full py-3 bg-[#1E3063] hover:bg-[#17244B] text-white font-bold rounded-xl shadow">
                  Submit Listing for 150-Point Inspection
                </button>
              </form>
            </div>
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
              <p className="text-[11px] text-slate-400">100% Escrow Protected Vehicle Discovery Platform</p>
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
      />

      <PriceAlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
      />
    </div>
  );
}

export default App;
