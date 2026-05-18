// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, RequireAuth, RequireDealer, RequireSeller, RequireAdmin } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CompareProvider } from './context/CompareContext';

// Layout
import AppLayout from './components/AppLayout';
import AppInstallPrompt from './components/AppInstallPrompt';

// Public pages
import HomePage        from './pages/HomePage';
import Showroom        from './pages/Showroom';

import CarDetailPage   from './pages/CarDetailPage';
import AuctionLivePage from './pages/AuctionLivePage';
import AuctionCalendar from './pages/AuctionCalendar';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';
import NotFoundPage    from './pages/NotFoundPage';

// Auth-required user pages
import ForcePasswordChange from './pages/ForcePasswordChange';
import ProfilePage   from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import ComparePage   from './pages/ComparePage';
import EscrowPage    from './pages/EscrowPage';
import NotificationsPage from './pages/NotificationsPage';
import EscrowVaultPortal from './pages/EscrowVaultPortal';
import ChatPage      from './pages/ChatPage';
import PaymentsPage  from './pages/PaymentsPage';
import Checkout      from './pages/Checkout';
import BuyerDashboard from './pages/BuyerDashboard';

// Dealer pages
import DealerDashboard  from './pages/dealer/DealerDashboard';
import DealerTeam       from './pages/dealer/DealerTeam';
import DealerSetup      from './pages/dealer/DealerSetup';
import AddCarPage       from './pages/dealer/AddCarPage';
import EditCarPage      from './pages/dealer/EditCarPage';
import DealerAnalytics  from './pages/dealer/DealerAnalytics';
import DealerSettings   from './pages/dealer/DealerSettings';
import DealerSettlement from './pages/dealer/DealerSettlement';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers     from './pages/admin/AdminUsers';
import AdminCars      from './pages/admin/AdminCars';
import AdminBids      from './pages/admin/AdminBids';
import AdminEscrows   from './pages/admin/AdminEscrows';
import AdminAuctions  from './pages/admin/AdminAuctions';
import AdminSellers   from './pages/admin/AdminSellers';
import AdminSettings  from './pages/admin/AdminSettings';
import AdminStaff     from './pages/admin/AdminStaff';
import PanicRoom     from './pages/admin/PanicRoom';
import AdManager     from './pages/admin/AdManager';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminNtsaQueue from './pages/admin/AdminNtsaQueue';
import AdminInspections from './pages/admin/AdminInspections';
import AdminSecurityLog from './pages/admin/AdminSecurityLog';
import InspectorDashboard from './pages/InspectorDashboard';
import InspectorApply from './pages/InspectorApply';
import AdminInspectorApplications from './pages/admin/AdminInspectorApplications';
import AdminCarModeration from './pages/admin/AdminCarModeration';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <NotificationProvider>
              <CompareProvider>
              <AppLayout>
                <ErrorBoundary>
                  <Routes>
                  {/* ── Public ── */}
                  <Route path="/"           element={<HomePage />} />
                  <Route path="/showroom"  element={<Showroom />} />
                  <Route path="/cars/:id"   element={<CarDetailPage />} />
                  <Route path="/auction/:id" element={<AuctionLivePage />} />
                  <Route path="/auctions/calendar" element={<AuctionCalendar />} />
                  <Route path="/login"             element={<LoginPage />} />
                  <Route path="/register"          element={<RegisterPage />} />
                  <Route path="/forgot-password"   element={<ForgotPasswordPage />} />
                  <Route path="/reset-password"    element={<ResetPasswordPage />} />

                  {/* ── Auth Required ── */}
                  <Route path="/dashboard" element={<RequireAuth><BuyerDashboard /></RequireAuth>} />
                  <Route path="/force-password-change" element={<RequireAuth><ForcePasswordChange /></RequireAuth>} />
                  <Route path="/profile"   element={<RequireAuth><ProfilePage /></RequireAuth>} />
                  <Route path="/favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
                  <Route path="/compare" element={<ComparePage />} />
                  <Route path="/escrow"    element={<RequireAuth><EscrowPage /></RequireAuth>} />
                  <Route path="/escrow-vault" element={<RequireAuth><EscrowVaultPortal /></RequireAuth>} />
                  <Route path="/escrow-vault/:id" element={<RequireAuth><EscrowVaultPortal /></RequireAuth>} />
                  <Route path="/chat"      element={<RequireAuth><ChatPage /></RequireAuth>} />
                  <Route path="/chat/:chatId" element={<RequireAuth><ChatPage /></RequireAuth>} />
                  <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
                  <Route path="/payments"  element={<RequireAuth><PaymentsPage /></RequireAuth>} />
                  <Route path="/checkout/:id" element={<RequireAuth><Checkout /></RequireAuth>} />

                  {/* ── Seller (dealers + brokers) ── */}
                  <Route path="/dealer"             element={<RequireSeller><DealerDashboard /></RequireSeller>} />
                  <Route path="/dealer/team"        element={<RequireSeller><DealerTeam /></RequireSeller>} />
                  <Route path="/dealer/setup"       element={<RequireSeller><DealerSetup /></RequireSeller>} />
                  <Route path="/dealer/add-car"     element={<RequireSeller><AddCarPage /></RequireSeller>} />
                  <Route path="/dealer/edit/:id"       element={<RequireSeller><EditCarPage /></RequireSeller>} />

                  {/* ── Dealer Only ── */}
                  <Route path="/dealer/analytics"   element={<RequireDealer><DealerAnalytics /></RequireDealer>} />
                  <Route path="/dealer/settings"    element={<RequireSeller><DealerSettings /></RequireSeller>} />
                  <Route path="/dealer/settlement"  element={<RequireSeller><DealerSettlement /></RequireSeller>} />

                  {/* ── Admin ── */}
                  <Route path="/admin"             element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                  <Route path="/admin/users"       element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
                  <Route path="/admin/cars"        element={<RequireAdmin><AdminCars /></RequireAdmin>} />
                  <Route path="/admin/moderation"   element={<RequireAdmin><AdminCarModeration /></RequireAdmin>} />
                  <Route path="/admin/bids"        element={<RequireAdmin><AdminBids /></RequireAdmin>} />
                  <Route path="/admin/escrows"     element={<RequireAdmin><AdminEscrows /></RequireAdmin>} />
                  <Route path="/admin/auctions"    element={<RequireAdmin><AdminAuctions /></RequireAdmin>} />
                  <Route path="/admin/sellers"     element={<RequireAdmin><AdminSellers /></RequireAdmin>} />
                  <Route path="/admin/settings"    element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
                  <Route path="/admin/panic-room" element={<RequireAdmin><PanicRoom /></RequireAdmin>} />
                  <Route path="/admin/staff"      element={<RequireAdmin><AdminStaff /></RequireAdmin>} />
                  <Route path="/admin/ads"       element={<RequireAdmin><AdManager /></RequireAdmin>} />
                  <Route path="/admin/transactions" element={<RequireAdmin><AdminTransactions /></RequireAdmin>} />
                  <Route path="/admin/ntsa-queue"   element={<RequireAdmin><AdminNtsaQueue /></RequireAdmin>} />
                  <Route path="/admin/inspections"  element={<RequireAdmin><AdminInspections /></RequireAdmin>} />
                  <Route path="/admin/security-log" element={<RequireAdmin><AdminSecurityLog /></RequireAdmin>} />
                  <Route path="/admin/inspector-applications" element={<RequireAdmin><AdminInspectorApplications /></RequireAdmin>} />

                  {/* Inspector */}
                  <Route path="/inspector" element={<RequireAuth><InspectorDashboard /></RequireAuth>} />
                  <Route path="/inspector/apply" element={<InspectorApply />} />

                  {/* ── Fallback ── */}
                  <Route path="/404" element={<NotFoundPage />} />
                  <Route path="*"    element={<NotFoundPage />} />
                </Routes>
                <AppInstallPrompt />
              </ErrorBoundary>
              </AppLayout>
              </CompareProvider>
              </NotificationProvider>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
