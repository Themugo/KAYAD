import { lazy, Suspense, useMemo, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, RequireAuth, RequireDealer, RequireAdmin } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BottomNav } from './components/ui';

// NavbarNew component
import NavbarNew from './components/NavbarNew';

// Eager load: critical above-the-fold pages
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
// Mobile pages (eager loaded for instant mobile experience)
import MobileHomePage from './pages/mobile/MobileHomePage';
import MobileBrowsePage from './pages/mobile/MobileBrowsePage';

// Lazy load: everything else for smaller initial bundle
const InspectionPage = lazy(() => import('./pages/InspectionPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AuctionPage = lazy(() => import('./pages/AuctionPage'));
const CarDetailPage = lazy(() => import('./pages/CarDetailPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ForcePasswordChange = lazy(() => import('./pages/ForcePasswordChange'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const EscrowPage = lazy(() => import('./pages/EscrowPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const AuctionLivePage = lazy(() => import('./pages/AuctionLivePage'));
const DealerProfilePage = lazy(() => import('./pages/DealerProfilePage'));

// Dealer pages
const DealerDashboard = lazy(() => import('./pages/dealer/DealerDashboard'));
const AddCarPage = lazy(() => import('./pages/dealer/AddCarPage'));
const EditCarPage = lazy(() => import('./pages/dealer/EditCarPage'));
const DealerAnalytics = lazy(() => import('./pages/dealer/DealerAnalytics'));
const DealerSettings = lazy(() => import('./pages/dealer/DealerSettings'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCars = lazy(() => import('./pages/admin/AdminCars'));
const AdminBids = lazy(() => import('./pages/admin/AdminBids'));
const AdminEscrows = lazy(() => import('./pages/admin/AdminEscrows'));
const AdminAuctions = lazy(() => import('./pages/admin/AdminAuctions'));
const AdminSellers = lazy(() => import('./pages/admin/AdminSellers'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

// Dashboards
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard'));
const PrivateSellerDashboard = lazy(() => import('./pages/PrivateSellerDashboard'));
const InspectorDashboard = lazy(() => import('./pages/InspectorDashboard'));
const SupportDashboard = lazy(() => import('./pages/SupportDashboard'));

// Additional pages
const Showroom = lazy(() => import('./pages/Showroom'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const AuctionCalendar = lazy(() => import('./pages/AuctionCalendar'));

// Seller pages
const SellerAnalytics = lazy(() => import('./pages/seller/SellerAnalytics'));
const SellerSupport = lazy(() => import('./pages/seller/SellerSupport'));
const SellerGuide = lazy(() => import('./pages/seller/SellerGuide'));

// Dealer pages
const DealerOnboarding = lazy(() => import('./pages/dealer/DealerOnboarding'));
const DealerSettlement = lazy(() => import('./pages/dealer/DealerSettlement'));
const DealerAuctionSetup = lazy(() => import('./pages/dealer/DealerAuctionSetup'));

function LazyFallback() {
  return (
    <div className="page loading-center">
      <div className="spinner" />
    </div>
  );
}

// Mobile detection hook
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

const MOBILE_NAV_ITEMS = [
  { id: '/',            label: 'Home',     icon: '🏠' },
  { id: '/browse',      label: 'Gallery',  icon: '🚗' },
  { id: '/auctions',    label: 'Auctions', icon: '⚡' },
  { id: '/escrow',      label: 'Escrow',   icon: '🔒' },
  { id: '/inspection',  label: 'Inspect',  icon: '🔍' },
];

function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = useMemo(() => {
    const path = location.pathname;
    const match = MOBILE_NAV_ITEMS.find(i => i.id !== '/' && path.startsWith(i.id));
    return match ? match.id : (path === '/' ? '/' : null);
  }, [location.pathname]);
  return (
    <BottomNav
      items={MOBILE_NAV_ITEMS}
      active={active}
      onChange={(id) => navigate(id)}
    />
  );
}

export default function App() {
  const isMobile = useIsMobile();

  return (
    <BrowserRouter>
      <ErrorBoundary>
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="skip-nav-link"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            zIndex: 9999,
          }}
          onFocus={(e) => {
            e.currentTarget.style.position = 'fixed';
            e.currentTarget.style.top = '10px';
            e.currentTarget.style.left = '10px';
            e.currentTarget.style.width = 'auto';
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.padding = '10px 20px';
            e.currentTarget.style.background = '#000';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.zIndex = 9999;
          }}
          onBlur={(e) => {
            e.currentTarget.style.position = 'absolute';
            e.currentTarget.style.left = '-9999px';
            e.currentTarget.style.width = '1px';
            e.currentTarget.style.height = '1px';
          }}
        >
          Skip to main content
        </a>
      </ErrorBoundary>
      <ErrorBoundary>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <NavbarNew />
              <ErrorBoundary>
                <main id="main-content">
                  <Suspense fallback={<LazyFallback />}>
                    <Routes>
                    {/* Mobile-optimized routes */}
                    {isMobile ? (
                      <>
                        <Route path="/" element={<MobileHomePage />} />
                        <Route path="/browse" element={<MobileBrowsePage />} />
                      </>
                    ) : (
                      <>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/browse" element={<BrowsePage />} />
                      </>
                    )}

                    {/* Shared routes */}
                    {/* "Gallery" tab now leads to the real, live-data browse
                        experience (search/filter/infinite-scroll) instead of
                        the old hardcoded demo GalleryPage, so desktop and
                        mobile nav both land on the same working page. */}
                    <Route path="/gallery" element={<BrowsePage />} />
                    <Route path="/auctions" element={<AuctionPage />} />
                    <Route path="/auctions/calendar" element={<AuctionCalendar />} />
                    <Route path="/showroom" element={<Showroom />} />
                    <Route path="/cars/:id" element={<CarDetailPage />} />
                    <Route path="/dealer/:id" element={<DealerProfilePage />} />
                    <Route path="/auction/:id" element={<AuctionLivePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                    {/* Auth Required */}
                    <Route path="/force-password-change" element={<RequireAuth><ForcePasswordChange /></RequireAuth>} />
                    <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                    <Route path="/favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
                    <Route path="/escrow" element={<RequireAuth><EscrowPage /></RequireAuth>} />
                    <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
                    <Route path="/chat/:chatId" element={<RequireAuth><ChatPage /></RequireAuth>} />
                    <Route path="/payments" element={<RequireAuth><PaymentsPage /></RequireAuth>} />

                    {/* Dealer */}
                    <Route path="/dealer" element={<RequireDealer><DealerDashboard /></RequireDealer>} />
                    <Route path="/dealer/add-car" element={<RequireDealer><AddCarPage /></RequireDealer>} />
                    <Route path="/dealer/edit/:id" element={<RequireDealer><EditCarPage /></RequireDealer>} />
                    <Route path="/dealer/analytics" element={<RequireDealer><DealerAnalytics /></RequireDealer>} />
                    <Route path="/dealer/settings" element={<RequireDealer><DealerSettings /></RequireDealer>} />
                    <Route path="/dealer/onboarding" element={<RequireDealer><DealerOnboarding /></RequireDealer>} />
                    <Route path="/dealer/settlement" element={<RequireDealer><DealerSettlement /></RequireDealer>} />
                    <Route path="/dealer/auction-setup" element={<RequireDealer><DealerAuctionSetup /></RequireDealer>} />
                    <Route path="/dealer/choose-plan" element={<RequireAuth><DealerSettings /></RequireAuth>} />

                    {/* Admin */}
                    <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                    <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
                    <Route path="/admin/cars" element={<RequireAdmin><AdminCars /></RequireAdmin>} />
                    <Route path="/admin/bids" element={<RequireAdmin><AdminBids /></RequireAdmin>} />
                    <Route path="/admin/escrows" element={<RequireAdmin><AdminEscrows /></RequireAdmin>} />
                    <Route path="/admin/auctions" element={<RequireAdmin><AdminAuctions /></RequireAdmin>} />
                    <Route path="/admin/sellers" element={<RequireAdmin><AdminSellers /></RequireAdmin>} />
                    <Route path="/admin/settings" element={<RequireAdmin><AdminSettings /></RequireAdmin>} />

                    {/* Dashboards */}
                    <Route path="/dashboard" element={<RequireAuth><BuyerDashboard /></RequireAuth>} />
                    <Route path="/seller" element={<RequireAuth><PrivateSellerDashboard /></RequireAuth>} />
                    <Route path="/seller/analytics" element={<RequireAuth><SellerAnalytics /></RequireAuth>} />
                    <Route path="/seller/support" element={<RequireAuth><SellerSupport /></RequireAuth>} />
                    <Route path="/seller/guide" element={<RequireAuth><SellerGuide /></RequireAuth>} />
                    <Route path="/sell" element={<RequireAuth><AddCarPage /></RequireAuth>} />
                    <Route path="/inspector" element={<RequireAuth><InspectorDashboard /></RequireAuth>} />
                    <Route path="/admin/support" element={<RequireAdmin><SupportDashboard /></RequireAdmin>} />

                    {/* Info pages */}
                    <Route path="/inspection" element={<InspectionPage />} />
                    <Route path="/support" element={<SupportPage />} />

                    {/* Fallback */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
                {isMobile && <MobileNav />}
              </main>
              </ErrorBoundary>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
