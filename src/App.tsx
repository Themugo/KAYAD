import { lazy, Suspense, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, BrowserRouter, useParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/layout/Footer';
import CompareDrawer from './components/features/car/CompareDrawer';
import MobileBottomNav from './components/layout/MobileBottomNav';
import DemoModeBanner from './components/features/common/DemoModeBanner';
import { LoadingPage } from './components/features/common/LoadingPage';
import SWUpdateBanner from './components/features/common/SWUpdateBanner';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, RequireAuth, RequireAdmin, RequireAdminPage, RequireDealer } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { BrandingProvider } from './context/BrandingContext';
import { CompareProvider } from './context/CompareContext';
import { ThemeProvider } from './components/ui/ThemeContext';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Compare from './pages/Compare';
import Favorites from './pages/Favorites';
import Auction from './pages/Auction';
import EscrowVault from './pages/EscrowVault';
import EscrowPage from './pages/EscrowPage';
import PreInspection from './pages/PreInspection';
import Support from './pages/Support';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Payments from './pages/Payments';
import Chat from './pages/Chat';
import DealerProfile from './pages/DealerProfile';
import CarDetail from './pages/CarDetail';
import Dashboard from './pages/Dashboard';
import CreateAccount from './pages/CreateAccount';
import SignIn from './pages/SignIn';
import Showroom from './pages/Showroom';
import { CARS } from './data/cars';
import type { User } from './types';
import type { Car } from './components/features/car/CarCard';

// Lazy-loaded pages for code splitting
const AuctionCalendar = lazy(() => import('./pages/AuctionCalendar'));
const AuctionLivePage = lazy(() => import('./pages/AuctionLivePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const GhostCheckerInfo = lazy(() => import('./pages/GhostCheckerInfo'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const PhoneVerifyPage = lazy(() => import('./pages/PhoneVerifyPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForcePasswordChange = lazy(() => import('./pages/ForcePasswordChange'));
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard'));
const DisputesPage = lazy(() => import('./pages/DisputesPage'));
const DisputeDetailPage = lazy(() => import('./pages/DisputeDetailPage'));
const InspectorApply = lazy(() => import('./pages/InspectorApply'));
const InspectorDashboard = lazy(() => import('./pages/InspectorDashboard'));
const PostRegPackageSelect = lazy(() => import('./pages/PostRegPackageSelect'));

// Dealer pages
const DealerDashboardPage = lazy(() => import('./pages/dealer/DealerDashboard'));
const DealerOnboarding = lazy(() => import('./pages/dealer/DealerOnboarding'));
const DealerSetup = lazy(() => import('./pages/dealer/DealerSetup'));
const AddCarPage = lazy(() => import('./pages/dealer/AddCarPage'));
const EditCarPage = lazy(() => import('./pages/dealer/EditCarPage'));
const DealerAuctionSetup = lazy(() => import('./pages/dealer/DealerAuctionSetup'));
const DealerAnalytics = lazy(() => import('./pages/dealer/DealerAnalytics'));
const DealerSettlement = lazy(() => import('./pages/dealer/DealerSettlement'));
const DealerTeam = lazy(() => import('./pages/dealer/DealerTeam'));
const DealerSettings = lazy(() => import('./pages/dealer/DealerSettings'));
const DealerAuditLog = lazy(() => import('./pages/dealer/DealerAuditLog'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSellers = lazy(() => import('./pages/admin/AdminSellers'));
const AdminCars = lazy(() => import('./pages/admin/AdminCars'));
const AdminCarModeration = lazy(() => import('./pages/admin/AdminCarModeration'));
const AdminAuctions = lazy(() => import('./pages/admin/AdminAuctions'));
const AdminBids = lazy(() => import('./pages/admin/AdminBids'));
const AdminEscrows = lazy(() => import('./pages/admin/AdminEscrows'));
const AdminEscrowVault = lazy(() => import('./pages/admin/AdminEscrowVault'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminReferrals = lazy(() => import('./pages/admin/AdminReferrals'));
const AdminChatModeration = lazy(() => import('./pages/admin/AdminChatModeration'));
const AdminMarketData = lazy(() => import('./pages/admin/AdminMarketData'));
const AdminTransactions = lazy(() => import('./pages/admin/AdminTransactions'));
const AdminNtsaQueue = lazy(() => import('./pages/admin/AdminNtsaQueue'));
const AdminInspections = lazy(() => import('./pages/admin/AdminInspections'));
const AdminInspectorApplications = lazy(() => import('./pages/admin/AdminInspectorApplications'));
const AdminSecurityLog = lazy(() => import('./pages/admin/AdminSecurityLog'));
const AdManager = lazy(() => import('./pages/admin/AdManager'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminStaff = lazy(() => import('./pages/admin/AdminStaff'));
const AdminStaffPermissions = lazy(() => import('./pages/admin/AdminStaffPermissions'));
const ControlRoom = lazy(() => import('./pages/admin/ControlRoom'));
const PanicRoom = lazy(() => import('./pages/admin/PanicRoom'));
const WebhoistOverview = lazy(() => import('./pages/admin/WebhoistOverview'));
const OperationsDashboard = lazy(() => import('./pages/admin/OperationsDashboard'));
const AdminDisputes = lazy(() => import('./pages/admin/AdminDisputes'));
const AuctionIntegrityPage = lazy(() => import('./pages/admin/AuctionIntegrityPage'));
const AdminDealerVerifications = lazy(() => import('./pages/admin/AdminDealerVerifications'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminSupportTickets = lazy(() => import('./pages/admin/AdminSupportTickets'));
const AdminBroadcast = lazy(() => import('./pages/admin/AdminBroadcast'));
const AdminFeedback = lazy(() => import('./pages/admin/AdminFeedback'));

export type { Car, User };

// Legacy support for existing components
interface AuthUser {
  name: string;
  email: string;
  role: 'private-seller' | 'dealer' | 'admin';
  dealership?: string;
}

// Page wrapper components for backward compatibility
function AuthGuard({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}

function SecureAdminGuard({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  return <RequireAdminPage roles={roles}>{children}</RequireAdminPage>;
}

function DealerGuard({ children }: { children: React.ReactNode }) {
  return <RequireDealer>{children}</RequireDealer>;
}

// CarDetailRoute must be defined outside App to avoid recreation on each render
function CarDetailRoute() {
  const { id } = useParams();
  const car = CARS.find((item) => String(item.id) === String(id));
  const navigate = useNavigate();
  const handleSetPage = (page: string) => navigate('/' + page);

  if (!car) {
    return <NotFoundPage />;
  }

  return <CarDetail car={car} setPage={handleSetPage} />;
}


function AppContent() {
  const [page, setPage] = useState('home');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const viewCar = (car: Car) => {
    setSelectedCar(car);
    setPage('car-detail');
    navigate('/car/' + (car.id || car._id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
  };

  const handleSignOut = () => {
    setAuthUser(null);
    setPage('home');
    navigate('/');
  };

  const handleSetPage = (newPage: string) => {
    setPage(newPage);
    navigate('/' + newPage);
  };

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/' || path === '') return 'home';
    if (path === '/gallery') return 'gallery';
    if (path === '/compare') return 'compare';
    if (path === '/favorites') return 'favorites';
    if (path === '/profile') return 'profile';
    if (path === '/notifications') return 'notifications';
    if (path === '/payments') return 'payments';
    if (path === '/chat') return 'chat';
    if (path === '/dealer/:id') return 'dealer-profile';
    if (path === '/auction') return 'auction';
    if (path === '/escrow') return 'escrow';
    if (path === '/escrow-transactions') return 'escrow-transactions';
    if (path === '/pre-inspection') return 'pre-inspection';
    if (path === '/support') return 'support';
    if (path.startsWith('/car/')) return 'car-detail';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/create-account') return 'create-account';
    if (path === '/sign-in') return 'sign-in';
    if (path === '/showroom') return 'showroom';
    return 'home';
  };

  const currentPage = getCurrentPage();

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home setPage={handleSetPage} viewCar={viewCar} />;
      case 'gallery':
        return <Gallery viewCar={viewCar} />;
      case 'compare':
        return <Compare setPage={handleSetPage} viewCar={viewCar} />;
      case 'favorites':
        return <Favorites setPage={handleSetPage} viewCar={viewCar} />;
      case 'profile':
        return <Profile setPage={handleSetPage} authUser={authUser} />;
      case 'notifications':
        return <Notifications />;
      case 'payments':
        return <Payments />;
      case 'chat':
        return <Chat />;
      case 'dealer-profile':
        return <DealerProfile setPage={handleSetPage} viewCar={viewCar} />;
      case 'escrow-transactions':
        return <EscrowPage />;
      case 'showroom':
        return <Showroom />;
      case 'auction':
        return <Auction />;
      case 'escrow':
        return <EscrowVault />;
      case 'pre-inspection':
        return <PreInspection viewCar={viewCar} />;
      case 'support':
        return <Support />;
      case 'car-detail':
        return selectedCar
          ? <CarDetail car={selectedCar} setPage={handleSetPage} viewCar={viewCar} />
          : <Gallery viewCar={viewCar} />;
      case 'dashboard':
        return authUser
          ? <Dashboard setPage={handleSetPage} viewCar={viewCar} authUser={authUser} onSignOut={handleSignOut} />
          : <SignIn setPage={handleSetPage} onLogin={handleLogin} />;
      case 'create-account':
        return <CreateAccount setPage={handleSetPage} onLogin={handleLogin} />;
      case 'sign-in':
        return <SignIn setPage={handleSetPage} onLogin={handleLogin} />;
      default:
        return <Home setPage={handleSetPage} viewCar={viewCar} />;
    }
  };
  return (
    <>
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          {/* Legacy routes for backward compatibility */}
          <Route path="/" element={renderPage()} />
          <Route path="/:page" element={renderPage()} />

          {/* Public pages */}
          <Route path="/home" element={<Home setPage={handleSetPage} viewCar={viewCar} />} />
          <Route path="/showroom" element={<Showroom />} />
          <Route path="/car/:id" element={<CarDetailRoute />} />
          <Route path="/compare" element={<Compare setPage={handleSetPage} viewCar={viewCar} />} />
          <Route path="/auction-calendar" element={<AuctionCalendar />} />
          <Route path="/auction/:id" element={<AuctionLivePage />} />
          <Route path="/escrow-vault" element={<EscrowVault />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/ghost-checker" element={<GhostCheckerInfo />} />

          {/* Auth pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/phone-verify" element={<PhoneVerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/force-password-change" element={<ForcePasswordChange />} />

          {/* Authenticated user pages */}
          <Route path="/buyer" element={<AuthGuard><BuyerDashboard /></AuthGuard>} />
          <Route path="/profile" element={<AuthGuard><Profile setPage={handleSetPage} authUser={authUser} /></AuthGuard>} />
          <Route path="/payments" element={<AuthGuard><Payments /></AuthGuard>} />
          <Route path="/chat" element={<AuthGuard><Chat /></AuthGuard>} />
          <Route path="/chat/:threadId" element={<AuthGuard><Chat /></AuthGuard>} />
          <Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
          <Route path="/favorites" element={<AuthGuard><Favorites setPage={handleSetPage} viewCar={viewCar} /></AuthGuard>} />
          <Route path="/escrow/:id" element={<AuthGuard><EscrowPage /></AuthGuard>} />
          <Route path="/disputes" element={<AuthGuard><DisputesPage /></AuthGuard>} />
          <Route path="/disputes/:id" element={<AuthGuard><DisputeDetailPage /></AuthGuard>} />

          {/* Inspector pages */}
          <Route path="/inspector/apply" element={<AuthGuard><InspectorApply /></AuthGuard>} />
          <Route path="/inspector" element={<AuthGuard><InspectorDashboard /></AuthGuard>} />
          <Route path="/inspector/dashboard" element={<AuthGuard><InspectorDashboard /></AuthGuard>} />

          {/* Dealer/Seller pages */}
          <Route path="/dealer" element={<DealerGuard><DealerDashboardPage /></DealerGuard>} />
          <Route path="/dealer/onboarding" element={<RequireAuth><DealerOnboarding /></RequireAuth>} />
          <Route path="/dealer/setup" element={<DealerGuard><DealerSetup /></DealerGuard>} />
          <Route path="/dealer/add-car" element={<DealerGuard><AddCarPage /></DealerGuard>} />
          <Route path="/dealer/edit-car/:id" element={<DealerGuard><EditCarPage /></DealerGuard>} />
          <Route path="/dealer/edit/:id" element={<DealerGuard><EditCarPage /></DealerGuard>} />
          <Route path="/dealer/auction-setup" element={<DealerGuard><DealerAuctionSetup /></DealerGuard>} />
          <Route path="/dealer/auctions" element={<DealerGuard><DealerAuctionSetup /></DealerGuard>} />
          <Route path="/dealer/analytics" element={<DealerGuard><DealerAnalytics /></DealerGuard>} />
          <Route path="/dealer/settlement" element={<DealerGuard><DealerSettlement /></DealerGuard>} />
          <Route path="/dealer/team" element={<DealerGuard><DealerTeam /></DealerGuard>} />
          <Route path="/dealer/activity-log" element={<DealerGuard><DealerAuditLog /></DealerGuard>} />
          <Route path="/dealer/settings" element={<DealerGuard><DealerSettings /></DealerGuard>} />
          <Route path="/dealer/choose-plan" element={<DealerGuard><PostRegPackageSelect /></DealerGuard>} />

          {/* Admin pages */}
          <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/admin/users" element={<SecureAdminGuard roles={["superadmin","admin","technical_support","hr","moderator"]}><AdminUsers /></SecureAdminGuard>} />
          <Route path="/admin/sellers" element={<SecureAdminGuard roles={["superadmin","admin","hr"]}><AdminSellers /></SecureAdminGuard>} />
          <Route path="/admin/cars" element={<SecureAdminGuard roles={["superadmin","admin","moderator","technical_support"]}><AdminCars /></SecureAdminGuard>} />
          <Route path="/admin/moderation" element={<SecureAdminGuard roles={["superadmin","admin","moderator"]}><AdminCarModeration /></SecureAdminGuard>} />
          <Route path="/admin/auctions" element={<SecureAdminGuard roles={["superadmin","admin"]}><AdminAuctions /></SecureAdminGuard>} />
          <Route path="/admin/bids" element={<SecureAdminGuard roles={["superadmin","admin"]}><AdminBids /></SecureAdminGuard>} />
          <Route path="/admin/escrows" element={<SecureAdminGuard roles={["superadmin","admin","accounts","escrow_officer"]}><AdminEscrows /></SecureAdminGuard>} />
          <Route path="/admin/escrow-vault" element={<SecureAdminGuard roles={["superadmin","admin","accounts","escrow_officer"]}><AdminEscrowVault /></SecureAdminGuard>} />
          <Route path="/admin/reviews" element={<SecureAdminGuard roles={["superadmin","admin","moderator"]}><AdminReviews /></SecureAdminGuard>} />
          <Route path="/admin/referrals" element={<SecureAdminGuard roles={["superadmin","admin"]}><AdminReferrals /></SecureAdminGuard>} />
          <Route path="/admin/chats" element={<SecureAdminGuard roles={["superadmin","admin","moderator"]}><AdminChatModeration /></SecureAdminGuard>} />
          <Route path="/admin/market-data" element={<SecureAdminGuard roles={["superadmin","admin"]}><AdminMarketData /></SecureAdminGuard>} />
          <Route path="/admin/transactions" element={<SecureAdminGuard roles={["superadmin","admin","accounts","escrow_officer"]}><AdminTransactions /></SecureAdminGuard>} />
          <Route path="/admin/ntsa-queue" element={<SecureAdminGuard roles={["superadmin","admin"]}><AdminNtsaQueue /></SecureAdminGuard>} />
          <Route path="/admin/inspections" element={<SecureAdminGuard roles={["superadmin","admin","ghost_checker"]}><AdminInspections /></SecureAdminGuard>} />
          <Route path="/admin/inspector-applications" element={<SecureAdminGuard><AdminInspectorApplications /></SecureAdminGuard>} />
          <Route path="/admin/security-log" element={<SecureAdminGuard roles={["superadmin","admin"]}><AdminSecurityLog /></SecureAdminGuard>} />
          <Route path="/admin/ads" element={<SecureAdminGuard roles={["superadmin","admin","marketing","ad_manager"]}><AdManager /></SecureAdminGuard>} />
          <Route path="/admin/settings" element={<SecureAdminGuard roles={["superadmin","admin"]}><AdminSettings /></SecureAdminGuard>} />
          <Route path="/admin/staff" element={<SecureAdminGuard roles={["superadmin","admin","hr"]}><AdminStaff /></SecureAdminGuard>} />
          <Route path="/admin/staff-permissions" element={<SecureAdminGuard roles={["superadmin","admin"]}><AdminStaffPermissions /></SecureAdminGuard>} />
          <Route path="/admin/control-room" element={<SecureAdminGuard roles={["superadmin","admin"]}><ControlRoom /></SecureAdminGuard>} />
          <Route path="/admin/panic-room" element={<SecureAdminGuard roles={["superadmin"]}><PanicRoom /></SecureAdminGuard>} />
          <Route path="/admin/webhoist" element={<SecureAdminGuard roles={["superadmin"]}><WebhoistOverview /></SecureAdminGuard>} />
          <Route path="/admin/operations-dashboard" element={<SecureAdminGuard><OperationsDashboard /></SecureAdminGuard>} />
          <Route path="/admin/disputes" element={<SecureAdminGuard><AdminDisputes /></SecureAdminGuard>} />
          <Route path="/admin/disputes/:id" element={<SecureAdminGuard><DisputeDetailPage /></SecureAdminGuard>} />
          <Route path="/admin/auction-integrity" element={<SecureAdminGuard><AuctionIntegrityPage /></SecureAdminGuard>} />
          <Route path="/admin/dealer-verifications" element={<SecureAdminGuard><AdminDealerVerifications /></SecureAdminGuard>} />
          <Route path="/admin/reports" element={<SecureAdminGuard roles={["superadmin","admin","moderator"]}><AdminReports /></SecureAdminGuard>} />
          <Route path="/admin/support-tickets" element={<SecureAdminGuard roles={["superadmin","admin","technical_support"]}><AdminSupportTickets /></SecureAdminGuard>} />
          <Route path="/admin/broadcast" element={<SecureAdminGuard roles={["superadmin","admin"]}><AdminBroadcast /></SecureAdminGuard>} />
          <Route path="/admin/feedback" element={<SecureAdminGuard roles={["superadmin","admin"]}><AdminFeedback /></SecureAdminGuard>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Navbar
        currentPage={currentPage}
        setPage={handleSetPage}
        authUser={authUser}
        onSignOut={handleSignOut}
      />
      <Footer setPage={handleSetPage} />
      <CompareDrawer />
      <MobileBottomNav authUser={authUser} />
      <DemoModeBanner />
      <SWUpdateBanner />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <BrandingProvider>
            <AuthProvider>
              <SocketProvider>
                <NotificationProvider>
                  <CompareProvider>
                    <AppContent />
                  </CompareProvider>
                </NotificationProvider>
              </SocketProvider>
            </AuthProvider>
          </BrandingProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
