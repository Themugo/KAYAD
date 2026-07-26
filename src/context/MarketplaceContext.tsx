import { createContext, useContext, useState, useMemo } from 'react';
import { Vehicle, FilterState, EscrowContract, Bid, NotificationItem, Advert, PriceAlert } from '../types';
import { mockVehicles, mockEscrowContracts, mockBids, mockNotifications } from '../data/mockData';

export const initialAdverts: Advert[] = [
  {
    id: 'adv_1',
    title: 'M-Pesa Zero-Fee Escrow Weekend',
    subtitle: 'Pay 0% escrow transaction fee on all verified Land Cruiser & Porsche auctions until Sunday.',
    badgeTag: 'PROMOTION',
    ctaText: 'Explore Live Auctions',
    ctaPage: 'auctions',
    theme: 'cyan_navy',
    placement: 'homepage',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
    clicksCount: 342,
    createdAt: '2024-02-14T10:00:00Z'
  },
  {
    id: 'adv_2',
    title: 'Get 150-Point Ghost Check Verified',
    subtitle: 'Free physical KRA logbook & structural inspection for all new seller listings this month.',
    badgeTag: 'SPECIAL DEAL',
    ctaText: 'Book Inspection',
    ctaPage: 'ghost_check',
    theme: 'emerald_escrow',
    placement: 'search_feed',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
    clicksCount: 189,
    createdAt: '2024-02-12T08:00:00Z'
  }
];

export type PageView = 
  | 'home'
  | 'gallery'
  | 'vehicle_detail'
  | 'auctions'
  | 'ghost_check'
  | 'how_it_works'
  | 'about'
  | 'escrow'
  | 'dashboard'
  | 'dealer_profile'
  | 'admin'
  | 'support'
  | 'sell';

interface MarketplaceContextType {
  activePage: PageView;
  navigateTo: (page: PageView, vehicleId?: string) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  previousPage: PageView | null;
  selectedVehicleId: string | null;
  selectedVehicle: Vehicle | null;
  vehicles: Vehicle[];
  savedVehicleIds: string[];
  toggleSaveVehicle: (id: string) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  bids: Bid[];
  placeBid: (vehicleId: string, amount: number, bidderName: string, bidderId: string) => boolean;
  escrowContracts: EscrowContract[];
  initiateEscrow: (vehicle: Vehicle, buyerId: string, buyerName: string) => EscrowContract;
  updateEscrowStep: (contractId: string, nextStep: number) => void;
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  markNotificationRead: (id: string) => void;
  isChatOpen: boolean;
  openChat: (vehicleId?: string) => void;
  closeChat: () => void;
  activeChatVehicleId: string | null;
  isReportModalOpen: boolean;
  openReportModal: () => void;
  closeReportModal: () => void;
  addNewVehicle: (vehicleData: Partial<Vehicle>) => Vehicle;
  adverts: Advert[];
  addAdvert: (advData: Omit<Advert, 'id' | 'clicksCount' | 'createdAt'>) => Advert;
  toggleAdvertStatus: (id: string) => void;
  deleteAdvert: (id: string) => void;
  priceAlerts: PriceAlert[];
  setPriceAlert: (alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'isActive'>) => PriceAlert;
  removePriceAlert: (vehicleId: string) => void;
  getPriceAlertForVehicle: (vehicleId: string) => PriceAlert | undefined;
  simulatePriceChange: (vehicleId: string, newPrice: number) => void;
  simulateStatusChange: (vehicleId: string, newStatus: Vehicle['status']) => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const initialFilters: FilterState = {
  searchQuery: '',
  makes: [],
  bodyStyles: [],
  minYear: 2000,
  maxYear: 2026,
  minPrice: 0,
  maxPrice: 60000000,
  maxMileage: 500000,
  transmission: [],
  fuelType: [],
  listingType: 'all',
  certifiedOnly: false,
  sortBy: 'featured'
};

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<PageView>('home');
  const [navHistory, setNavHistory] = useState<PageView[]>(['home']);
  const [navIndex, setNavIndex] = useState<number>(0);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>('veh_1');
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [savedVehicleIds, setSavedVehicleIds] = useState<string[]>(['veh_1', 'veh_5']);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [bids, setBids] = useState<Bid[]>(mockBids);
  const [escrowContracts, setEscrowContracts] = useState<EscrowContract[]>(mockEscrowContracts);
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatVehicleId, setActiveChatVehicleId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const navigateTo = (page: PageView, vehicleId?: string) => {
    if (vehicleId) {
      setSelectedVehicleId(vehicleId);
    }
    
    if (page !== activePage) {
      const newHistory = navHistory.slice(0, navIndex + 1);
      newHistory.push(page);
      setNavHistory(newHistory);
      setNavIndex(newHistory.length - 1);
    }
    
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (navIndex > 0) {
      const prevIndex = navIndex - 1;
      setNavIndex(prevIndex);
      setActivePage(navHistory[prevIndex]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Default back is gallery or home
      setActivePage(activePage === 'gallery' ? 'home' : 'gallery');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goForward = () => {
    if (navIndex < navHistory.length - 1) {
      const nextIndex = navIndex + 1;
      setNavIndex(nextIndex);
      setActivePage(navHistory[nextIndex]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const canGoBack = navIndex > 0 || activePage !== 'home';
  const canGoForward = navIndex < navHistory.length - 1;
  const previousPage = navIndex > 0 ? navHistory[navIndex - 1] : null;

  const selectedVehicle = useMemo(() => {
    return vehicles.find(v => v.id === selectedVehicleId) || vehicles[0] || null;
  }, [vehicles, selectedVehicleId]);

  const toggleSaveVehicle = (id: string) => {
    setSavedVehicleIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const resetFilters = () => setFilters(initialFilters);

  const placeBid = (vehicleId: string, amount: number, bidderName: string, bidderId: string): boolean => {
    const target = vehicles.find(v => v.id === vehicleId);
    if (!target) return false;

    const minBid = (target.currentBid || target.price) + 500;
    if (amount < minBid) return false;

    const newBid: Bid = {
      id: `bid_${Date.now()}`,
      vehicleId,
      bidderId,
      bidderName,
      amount,
      placedAt: new Date().toISOString()
    };

    setBids(prev => [newBid, ...prev]);

    setVehicles(prev =>
      prev.map(v => {
        if (v.id === vehicleId) {
          return {
            ...v,
            currentBid: amount,
            bidsCount: (v.bidsCount || 0) + 1
          };
        }
        return v;
      })
    );

    // Trigger Notification
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      userId: bidderId,
      title: 'Bid Placed Successfully',
      message: `Your bid of $${amount.toLocaleString()} on ${target.title} was recorded.`,
      type: 'bid',
      isRead: false,
      createdAt: 'Just now'
    };
    setNotifications(prev => [newNotif, ...prev]);

    return true;
  };

  const initiateEscrow = (vehicle: Vehicle, buyerId: string, buyerName: string): EscrowContract => {
    const existing = escrowContracts.find(e => e.vehicleId === vehicle.id && e.buyerId === buyerId);
    if (existing) return existing;

    const price = vehicle.buyNowPrice || vehicle.currentBid || vehicle.price;
    const fee = Math.round(price * 0.005); // 0.5% escrow fee

    const newContract: EscrowContract = {
      id: `escrow_KYD_${Math.floor(10000 + Math.random() * 90000)}`,
      vehicleId: vehicle.id,
      vehicleTitle: vehicle.title,
      vehicleImage: vehicle.images[0],
      buyerId,
      buyerName,
      sellerId: vehicle.sellerId,
      sellerName: vehicle.sellerName,
      agreedPrice: price,
      escrowFee: fee,
      status: 'initiated',
      milestones: [
        { step: 1, title: 'Escrow Agreement Initiated', description: 'Buyer accepted deal terms and inspection policy', status: 'completed', timestamp: 'Just now' },
        { step: 2, title: 'Buyer Funds Deposit', description: `Awaiting wire/card transfer of $${(price + fee).toLocaleString()}`, status: 'current' },
        { step: 3, title: 'Title & Lien Audit', description: 'KAYAD legal team verifies vehicle ownership and clear title', status: 'upcoming' },
        { step: 4, title: 'Insured Transport Dispatch', description: 'Carrier collects vehicle from seller', status: 'upcoming' },
        { step: 5, title: 'Buyer Inspection Window', description: '48-Hour evaluation period before funds payout', status: 'upcoming' },
        { step: 6, title: 'Disbursement to Seller', description: 'Funds released from segregated escrow account', status: 'upcoming' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setEscrowContracts(prev => [newContract, ...prev]);
    
    // Add notification
    setNotifications(prev => [
      {
        id: `notif_${Date.now()}`,
        userId: buyerId,
        title: 'Escrow Initiated',
        message: `Escrow contract ${newContract.id} created for ${vehicle.title}.`,
        type: 'escrow',
        isRead: false,
        createdAt: 'Just now'
      },
      ...prev
    ]);

    return newContract;
  };

  const updateEscrowStep = (contractId: string, nextStep: number) => {
    setEscrowContracts(prev =>
      prev.map(contract => {
        if (contract.id === contractId) {
          const updatedMilestones = contract.milestones.map(m => {
            if (m.step < nextStep) return { ...m, status: 'completed' as const };
            if (m.step === nextStep) return { ...m, status: 'current' as const, timestamp: 'In Progress' };
            return { ...m, status: 'upcoming' as const };
          });

          const statusMap: Record<number, EscrowContract['status']> = {
            1: 'initiated',
            2: 'buyer_funded',
            3: 'inspection_pending',
            4: 'delivery_in_transit',
            5: 'buyer_accepted',
            6: 'completed'
          };

          return {
            ...contract,
            status: statusMap[nextStep] || contract.status,
            milestones: updatedMilestones,
            updatedAt: new Date().toISOString()
          };
        }
        return contract;
      })
    );
  };

  const unreadNotifsCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const openChat = (vehicleId?: string) => {
    if (vehicleId) setActiveChatVehicleId(vehicleId);
    setIsChatOpen(true);
  };

  const closeChat = () => setIsChatOpen(false);

  const addNewVehicle = (data: Partial<Vehicle>): Vehicle => {
    const newVehicle: Vehicle = {
      id: `veh_${Date.now()}`,
      title: data.title || '2024 Custom Performance Listing',
      make: data.make || 'Custom',
      model: data.model || 'Model',
      year: data.year || 2024,
      vin: data.vin || 'VIN' + Math.floor(Math.random() * 100000000),
      price: data.price || 50000,
      buyNowPrice: data.buyNowPrice || data.price || 50000,
      mileage: data.mileage || 1000,
      location: data.location || 'Miami, FL',
      bodyStyle: data.bodyStyle || 'Coupe',
      transmission: data.transmission || 'Automatic',
      fuelType: data.fuelType || 'Gasoline',
      engine: data.engine || 'V8 Twin Turbo',
      horsepower: data.horsepower || 450,
      exteriorColor: data.exteriorColor || 'Black Metallic',
      interiorColor: data.interiorColor || 'Black Leather',
      condition: data.condition || 'Excellent',
      listingType: data.listingType || 'fixed',
      images: data.images?.length ? data.images : ['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80'],
      description: data.description || 'Verified KAYAD inventory listing with inspection certification.',
      features: data.features || ['Navigation', 'Leather Interior', 'Premium Sound'],
      sellerId: data.sellerId || 'dealer_1',
      sellerName: data.sellerName || 'Apex Luxury Motors',
      sellerRating: 4.9,
      isDealerCertified: true,
      viewsCount: 1,
      savedCount: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    setVehicles(prev => [newVehicle, ...prev]);
    return newVehicle;
  };

  const [adverts, setAdverts] = useState<Advert[]>(initialAdverts);

  const addAdvert = (data: Omit<Advert, 'id' | 'clicksCount' | 'createdAt'>): Advert => {
    const newAdv: Advert = {
      id: `adv_${Date.now()}`,
      title: data.title,
      subtitle: data.subtitle,
      badgeTag: data.badgeTag || 'PROMOTION',
      ctaText: data.ctaText || 'Learn More',
      ctaPage: data.ctaPage || 'gallery',
      theme: data.theme || 'cyan_navy',
      placement: data.placement || 'homepage',
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
      isActive: data.isActive ?? true,
      clicksCount: 0,
      createdAt: new Date().toISOString()
    };
    setAdverts(prev => [newAdv, ...prev]);
    return newAdv;
  };

  const toggleAdvertStatus = (id: string) => {
    setAdverts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const deleteAdvert = (id: string) => {
    setAdverts(prev => prev.filter(a => a.id !== id));
  };

  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([
    {
      id: 'alert_1',
      userId: 'user_1',
      vehicleId: 'veh_c200',
      vehicleTitle: '2009 Mercedes-Benz C200 Kompressor',
      targetPrice: 1300000,
      alertOnPriceDrop: true,
      alertOnStatusChange: true,
      currentPriceAtSet: 1400000,
      notifyMethod: 'both',
      createdAt: new Date().toISOString(),
      isActive: true
    }
  ]);

  const setPriceAlert = (alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'isActive'>): PriceAlert => {
    const existingIndex = priceAlerts.findIndex(a => a.vehicleId === alertData.vehicleId && a.userId === alertData.userId);
    const newAlert: PriceAlert = {
      ...alertData,
      id: existingIndex >= 0 ? priceAlerts[existingIndex].id : `alert_${Date.now()}`,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    if (existingIndex >= 0) {
      setPriceAlerts(prev => prev.map((item, idx) => idx === existingIndex ? newAlert : item));
    } else {
      setPriceAlerts(prev => [newAlert, ...prev]);
    }

    // Post a notification confirming alert activation
    const notif: NotificationItem = {
      id: `notif_${Date.now()}`,
      userId: alertData.userId,
      title: 'Price Alert Set',
      message: `Alert configured for ${alertData.vehicleTitle}. We will notify you if price drops below KSh ${alertData.targetPrice.toLocaleString()}.`,
      type: 'price_alert',
      isRead: false,
      createdAt: 'Just now',
      vehicleId: alertData.vehicleId
    };
    setNotifications(prev => [notif, ...prev]);

    return newAlert;
  };

  const removePriceAlert = (vehicleId: string) => {
    setPriceAlerts(prev => prev.filter(a => a.vehicleId !== vehicleId));
  };

  const getPriceAlertForVehicle = (vehicleId: string): PriceAlert | undefined => {
    return priceAlerts.find(a => a.vehicleId === vehicleId && a.isActive);
  };

  const simulatePriceChange = (vehicleId: string, newPrice: number) => {
    const target = vehicles.find(v => v.id === vehicleId);
    if (!target) return;

    const oldPrice = target.price;

    // Update vehicle price
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, price: newPrice, buyNowPrice: newPrice } : v));

    // Find alert
    const alert = priceAlerts.find(a => a.vehicleId === vehicleId && a.isActive);

    const priceDropped = newPrice < oldPrice;
    const dropAmount = oldPrice - newPrice;

    if (priceDropped) {
      const notif: NotificationItem = {
        id: `notif_${Date.now()}`,
        userId: alert ? alert.userId : 'user_1',
        title: `🚨 Price Drop: ${target.title}`,
        message: `Price dropped by KSh ${dropAmount.toLocaleString()}! New price: KSh ${newPrice.toLocaleString()}${alert ? ` (Below your KSh ${alert.targetPrice.toLocaleString()} alert threshold)` : ''}.`,
        type: 'price_drop',
        isRead: false,
        createdAt: 'Just now',
        vehicleId: vehicleId
      };
      setNotifications(prev => [notif, ...prev]);
    }
  };

  const simulateStatusChange = (vehicleId: string, newStatus: Vehicle['status']) => {
    const target = vehicles.find(v => v.id === vehicleId);
    if (!target) return;

    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, status: newStatus } : v));

    const alert = priceAlerts.find(a => a.vehicleId === vehicleId && a.isActive);

    const statusLabels: Record<Vehicle['status'], string> = {
      active: 'Available for Purchase',
      pending: 'Under Escrow Lock / Deal Pending',
      sold: 'Marked as Sold',
      draft: 'In Draft Review'
    };

    const notif: NotificationItem = {
      id: `notif_${Date.now()}`,
      userId: alert ? alert.userId : 'user_1',
      title: `⚡ Vehicle Status Update: ${target.title}`,
      message: `Status updated to "${statusLabels[newStatus] || newStatus}".`,
      type: 'status_change',
      isRead: false,
      createdAt: 'Just now',
      vehicleId: vehicleId
    };
    setNotifications(prev => [notif, ...prev]);
  };

  return (
    <MarketplaceContext.Provider
      value={{
        activePage,
        navigateTo,
        goBack,
        goForward,
        canGoBack,
        canGoForward,
        previousPage,
        selectedVehicleId,
        selectedVehicle,
        vehicles,
        savedVehicleIds,
        toggleSaveVehicle,
        filters,
        setFilters,
        resetFilters,
        bids,
        placeBid,
        escrowContracts,
        initiateEscrow,
        updateEscrowStep,
        notifications,
        unreadNotifsCount,
        markNotificationRead,
        isChatOpen,
        openChat,
        closeChat,
        activeChatVehicleId,
        isReportModalOpen,
        openReportModal: () => setIsReportModalOpen(true),
        closeReportModal: () => setIsReportModalOpen(false),
        addNewVehicle,
        adverts,
        addAdvert,
        toggleAdvertStatus,
        deleteAdvert,
        priceAlerts,
        setPriceAlert,
        removePriceAlert,
        getPriceAlertForVehicle,
        simulatePriceChange,
        simulateStatusChange,
        isLoading,
        setIsLoading
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext);
  if (!context) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return context;
};
