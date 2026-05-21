// src/App.jsx
// ─────────────────────────────────────────────────────────────────────
// KAYAD application root.
//
// Wires up the entire route tree on top of the provider stack:
//
//   ErrorBoundary
//     └─ BrowserRouter
//          └─ ToastProvider
//               └─ AuthProvider
//                    └─ SocketProvider          ← needs auth
//                         └─ NotificationProvider  ← needs auth + socket
//                              └─ CompareProvider
//                                   └─ <Routes/>
//
// Pages are code-split via React.lazy so the initial bundle stays small
// and each route loads on demand. A single <Suspense> at the route level
// shows the LoadingPage component while a chunk is in flight.
// ─────────────────────────────────────────────────────────────────────
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import {
  AuthProvider,
  RequireAuth,
  RequireAdmin,
  RequireSeller,
  RequireEmailVerified,
} from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { CompareProvider } from './context/CompareContext';

import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingPage } from './components/LoadingPage';
import AppLayout from './components/AppLayout';
import AdminLayout from './components/AdminLayout';
import DealerLayout from './components/DealerLayout';
import AppInstallPrompt from './components/AppInstallPrompt';

// ─── Public / auth pages ────────────────────────────────────────────────
const HomePage             = lazy(() => import('./pages/HomePage'));
const Showroom             = lazy(() => import('./pages/Showroom'));
const CarDetailPage        = lazy(() => import('./pages/CarDetailPage'));
const ComparePage          = lazy(() => import('./pages/ComparePage'));
const AuctionCalendar      = lazy(() => import('./pages/AuctionCalendar'));
const AuctionLivePage      = lazy(() => import('./pages/AuctionLivePage'));
const EscrowVaultPortal    = lazy(() => import('./pages/EscrowVaultPortal'));
const NotFoundPage         = lazy(() => import('./pages/NotFoundPage'));

const LoginPage            = lazy(() => import('./pages/LoginPage'));
const RegisterPage         = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage   = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage    = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmail          = lazy(() => import('./pages/VerifyEmail'));
const ForcePasswordChange  = lazy(() => import('./pages/ForcePasswordChange'));

// ─── Authenticated-user pages ───────────────────────────────────────────
const BuyerDashboard       = lazy(() => import('./pages/BuyerDashboard'));
const ProfilePage          = lazy(() => import('./pages/ProfilePage'));
const PaymentsPage         = lazy(() => import('./pages/PaymentsPage'));
const ChatPage             = lazy(() => import('./pages/ChatPage'));
const NotificationsPage    = lazy(() => import('./pages/NotificationsPage'));
const FavoritesPage        = lazy(() => import('./pages/FavoritesPage'));
const EscrowPage           = lazy(() => import('./pages/EscrowPage'));
const InspectorApply       = lazy(() => import('./pages/InspectorApply'));
const InspectorDashboard   = lazy(() => import('./pages/InspectorDashboard'));

// ─── Dealer pages ───────────────────────────────────────────────────────
const DealerDashboard      = lazy(() => import('./pages/dealer/DealerDashboard'));
const DealerOnboarding     = lazy(() => import('./pages/dealer/DealerOnboarding'));
const DealerSetup          = lazy(() => import('./pages/dealer/DealerSetup'));
const AddCarPage           = lazy(() => import('./pages/dealer/AddCarPage'));
const EditCarPage          = lazy(() => import('./pages/dealer/EditCarPage'));
const DealerAuctionSetup   = lazy(() => import('./pages/dealer/DealerAuctionSetup'));
const DealerAnalytics      = lazy(() => import('./pages/dealer/DealerAnalytics'));
const DealerSettlement     = lazy(() => import('./pages/dealer/DealerSettlement'));
const DealerTeam           = lazy(() => import('./pages/dealer/DealerTeam'));
const DealerSettings       = lazy(() => import('./pages/dealer/DealerSettings'));

// ─── Admin pages ────────────────────────────────────────────────────────
const AdminDashboard               = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers                   = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSellers                 = lazy(() => import('./pages/admin/AdminSellers'));
const AdminCars                    = lazy(() => import('./pages/admin/AdminCars'));
const AdminCarModeration           = lazy(() => import('./pages/admin/AdminCarModeration'));
const AdminAuctions                = lazy(() => import('./pages/admin/AdminAuctions'));
const AdminBids                    = lazy(() => import('./pages/admin/AdminBids'));
const AdminEscrows                 = lazy(() => import('./pages/admin/AdminEscrows'));
const AdminEscrowVault             = lazy(() => import('./pages/admin/AdminEscrowVault'));
const AdminReviews                 = lazy(() => import('./pages/admin/AdminReviews'));
const AdminReferrals               = lazy(() => import('./pages/admin/AdminReferrals'));
const AdminChatModeration          = lazy(() => import('./pages/admin/AdminChatModeration'));
const AdminMarketData              = lazy(() => import('./pages/admin/AdminMarketData'));
const AdminTransactions            = lazy(() => import('./pages/admin/AdminTransactions'));
const AdminNtsaQueue               = lazy(() => import('./pages/admin/AdminNtsaQueue'));
const AdminInspections             = lazy(() => import('./pages/admin/AdminInspections'));
const AdminInspectorApplications   = lazy(() => import('./pages/admin/AdminInspectorApplications'));
const AdminSecurityLog             = lazy(() => import('./pages/admin/AdminSecurityLog'));
const AdManager                    = lazy(() => import('./pages/admin/AdManager'));
const AdminSettings                = lazy(() => import('./pages/admin/AdminSettings'));
const AdminStaff                   = lazy(() => import('./pages/admin/AdminStaff'));
const ControlRoom                  = lazy(() => import('./pages/admin/ControlRoom'));
const PanicRoom                    = lazy(() => import('./pages/admin/PanicRoom'));

// ─── Layout wrappers ────────────────────────────────────────────────────
// Small composition helpers keep the <Routes> block tidy.

/** Public chrome (Navbar + Footer). Used for landing, listings, and auth pages. */
const Public = ({ children }) => <AppLayout>{children}</AppLayout>;

/** Requires login + email-verified. Used for buyer dashboard, profile, etc. */
const User = ({ children }) => (
  <RequireAuth>
    <RequireEmailVerified>
      <AppLayout>{children}</AppLayout>
    </RequireEmailVerified>
  </RequireAuth>
);

/** Requires login but not email verification. Used for verification-flow pages. */
const Authed = ({ children }) => (
  <RequireAuth>
    <AppLayout>{children}</AppLayout>
  </RequireAuth>
);

/** Seller area (dealer / broker / individual_seller). */
const Dealer = ({ children }) => (
  <RequireSeller>
    <DealerLayout>{children}</DealerLayout>
  </RequireSeller>
);

/** Admin / staff area. */
const Admin = ({ children }) => (
  <RequireAdmin>
    <AdminLayout>{children}</AdminLayout>
  </RequireAdmin>
);

// ─── Scroll restoration ────────────────────────────────────────────────
/** Scrolls to the top on every route change so deep pages don't load mid-scroll. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// ─── Root component ─────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              <NotificationProvider>
                <CompareProvider>
                  <AppInstallPrompt />
                  <ScrollToTop />
                  <Suspense fallback={<LoadingPage />}>
                    <Routes>
                      {/* ── Public ──────────────────────────────────────────── */}
                      <Route path="/"                    element={<Public><HomePage /></Public>} />
                      <Route path="/showroom"            element={<Public><Showroom /></Public>} />
                      <Route path="/cars"                element={<Navigate to="/showroom" replace />} />
                      <Route path="/car/:id"             element={<Public><CarDetailPage /></Public>} />
                      <Route path="/compare"             element={<Public><ComparePage /></Public>} />
                      <Route path="/auctions"            element={<Public><AuctionCalendar /></Public>} />
                      <Route path="/auctions/calendar"   element={<Public><AuctionCalendar /></Public>} />
                      <Route path="/auctions/live/:id"   element={<Public><AuctionLivePage /></Public>} />
                      <Route path="/escrow-vault"        element={<Public><EscrowVaultPortal /></Public>} />

                      {/* ── Auth ────────────────────────────────────────────── */}
                      <Route path="/login"               element={<Public><LoginPage /></Public>} />
                      <Route path="/register"            element={<Public><RegisterPage /></Public>} />
                      <Route path="/forgot-password"     element={<Public><ForgotPasswordPage /></Public>} />
                      <Route path="/reset-password"      element={<Public><ResetPasswordPage /></Public>} />
                      <Route path="/verify-email"        element={<Public><VerifyEmail /></Public>} />
                      <Route path="/force-password-change" element={<Authed><ForcePasswordChange /></Authed>} />

                      {/* ── User (logged-in buyer) ─────────────────────────── */}
                      <Route path="/dashboard"           element={<User><BuyerDashboard /></User>} />
                      <Route path="/profile"             element={<User><ProfilePage /></User>} />
                      <Route path="/payments"            element={<User><PaymentsPage /></User>} />
                      <Route path="/chat"                element={<User><ChatPage /></User>} />
                      <Route path="/chat/:threadId"      element={<User><ChatPage /></User>} />
                      <Route path="/notifications"       element={<Authed><NotificationsPage /></Authed>} />
                      <Route path="/favorites"           element={<User><FavoritesPage /></User>} />
                      <Route path="/escrow/:id"          element={<User><EscrowPage /></User>} />

                      {/* ── Inspector ─────────────────────────────────────── */}
                      <Route path="/inspector/apply"     element={<Authed><InspectorApply /></Authed>} />
                      <Route path="/inspector"           element={<User><InspectorDashboard /></User>} />
                      <Route path="/inspector/dashboard" element={<User><InspectorDashboard /></User>} />

                      {/* ── Dealer / Seller ─────────────────────────────────── */}
                      <Route path="/dealer"              element={<Dealer><DealerDashboard /></Dealer>} />
                      <Route path="/dealer/onboarding"   element={<RequireAuth><AppLayout><DealerOnboarding /></AppLayout></RequireAuth>} />
                      <Route path="/dealer/setup"        element={<Dealer><DealerSetup /></Dealer>} />
                      <Route path="/dealer/add-car"      element={<Dealer><AddCarPage /></Dealer>} />
                      <Route path="/dealer/edit-car/:id" element={<Dealer><EditCarPage /></Dealer>} />
                      <Route path="/dealer/auction-setup"      element={<Dealer><DealerAuctionSetup /></Dealer>} />
                      <Route path="/dealer/auctions"     element={<Dealer><DealerAuctionSetup /></Dealer>} />
                      <Route path="/dealer/analytics"    element={<Dealer><DealerAnalytics /></Dealer>} />
                      <Route path="/dealer/settlement"   element={<Dealer><DealerSettlement /></Dealer>} />
                      <Route path="/dealer/team"         element={<Dealer><DealerTeam /></Dealer>} />
                      <Route path="/dealer/settings"     element={<Dealer><DealerSettings /></Dealer>} />

                      {/* ── Admin / Staff ─────────────────────────────────── */}
                      <Route path="/admin"                          element={<Admin><AdminDashboard /></Admin>} />
                      <Route path="/admin/users"                    element={<Admin><AdminUsers /></Admin>} />
                      <Route path="/admin/sellers"                  element={<Admin><AdminSellers /></Admin>} />
                      <Route path="/admin/cars"                     element={<Admin><AdminCars /></Admin>} />
                      <Route path="/admin/moderation"               element={<Admin><AdminCarModeration /></Admin>} />
                      <Route path="/admin/auctions"                 element={<Admin><AdminAuctions /></Admin>} />
                      <Route path="/admin/bids"                     element={<Admin><AdminBids /></Admin>} />
                      <Route path="/admin/escrows"                  element={<Admin><AdminEscrows /></Admin>} />
                      <Route path="/admin/escrow-vault"             element={<Admin><AdminEscrowVault /></Admin>} />
                      <Route path="/admin/reviews"                  element={<Admin><AdminReviews /></Admin>} />
                      <Route path="/admin/referrals"                element={<Admin><AdminReferrals /></Admin>} />
                      <Route path="/admin/chats"                    element={<Admin><AdminChatModeration /></Admin>} />
                      <Route path="/admin/market-data"              element={<Admin><AdminMarketData /></Admin>} />
                      <Route path="/admin/transactions"             element={<Admin><AdminTransactions /></Admin>} />
                      <Route path="/admin/ntsa-queue"               element={<Admin><AdminNtsaQueue /></Admin>} />
                      <Route path="/admin/inspections"              element={<Admin><AdminInspections /></Admin>} />
                      <Route path="/admin/inspector-applications"   element={<Admin><AdminInspectorApplications /></Admin>} />
                      <Route path="/admin/security-log"             element={<Admin><AdminSecurityLog /></Admin>} />
                      <Route path="/admin/ads"                      element={<Admin><AdManager /></Admin>} />
                      <Route path="/admin/settings"                 element={<Admin><AdminSettings /></Admin>} />
                      <Route path="/admin/staff"                    element={<Admin><AdminStaff /></Admin>} />
                      <Route path="/admin/control-room"             element={<Admin><ControlRoom /></Admin>} />
                      <Route path="/admin/panic-room"               element={<Admin><PanicRoom /></Admin>} />

                      {/* ── 404 ─────────────────────────────────────────────── */}
                      <Route path="*" element={<Public><NotFoundPage /></Public>} />
                    </Routes>
                  </Suspense>
                </CompareProvider>
              </NotificationProvider>
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
