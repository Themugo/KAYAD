// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, RequireAuth, RequireDealer, RequireAdmin } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Layout
import Navbar from './components/Navbar';
import AppInstallPrompt from './components/AppInstallPrompt';

// Public pages
import HomePage        from './pages/HomePage';
import Showroom        from './pages/Showroom';

import CarDetailPage   from './pages/CarDetailPage';
import AuctionLivePage from './pages/AuctionLivePage';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import NotFoundPage    from './pages/NotFoundPage';

// Auth-required user pages
import ForcePasswordChange from './pages/ForcePasswordChange';
import ProfilePage   from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import EscrowPage    from './pages/EscrowPage';
import ChatPage      from './pages/ChatPage';
import PaymentsPage  from './pages/PaymentsPage';

// Dealer pages
import DealerDashboard  from './pages/dealer/DealerDashboard';
import AddCarPage       from './pages/dealer/AddCarPage';
import EditCarPage      from './pages/dealer/EditCarPage';
import DealerAnalytics  from './pages/dealer/DealerAnalytics';
import DealerSettings   from './pages/dealer/DealerSettings';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers     from './pages/admin/AdminUsers';
import AdminCars      from './pages/admin/AdminCars';
import AdminBids      from './pages/admin/AdminBids';
import AdminEscrows   from './pages/admin/AdminEscrows';
import AdminAuctions  from './pages/admin/AdminAuctions';
import AdminSellers   from './pages/admin/AdminSellers';
import AdminSettings  from './pages/admin/AdminSettings';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <Navbar />
              <ErrorBoundary>
                <Routes>
                  {/* ── Public ── */}
                  <Route path="/"           element={<HomePage />} />
                  <Route path="/showroom"  element={<Showroom />} />
                  <Route path="/cars/:id"   element={<CarDetailPage />} />
                  <Route path="/auction/:id" element={<AuctionLivePage />} />
                  <Route path="/login"      element={<LoginPage />} />
                  <Route path="/register"   element={<RegisterPage />} />

                  {/* ── Auth Required ── */}
                  <Route path="/force-password-change" element={<RequireAuth><ForcePasswordChange /></RequireAuth>} />
                  <Route path="/profile"   element={<RequireAuth><ProfilePage /></RequireAuth>} />
                  <Route path="/favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
                  <Route path="/escrow"    element={<RequireAuth><EscrowPage /></RequireAuth>} />
                  <Route path="/chat"      element={<RequireAuth><ChatPage /></RequireAuth>} />
                  <Route path="/chat/:chatId" element={<RequireAuth><ChatPage /></RequireAuth>} />
                  <Route path="/payments"  element={<RequireAuth><PaymentsPage /></RequireAuth>} />

                  {/* ── Dealer ── */}
                  <Route path="/dealer"             element={<RequireDealer><DealerDashboard /></RequireDealer>} />
                  <Route path="/dealer/add-car"     element={<RequireDealer><AddCarPage /></RequireDealer>} />
                  <Route path="/dealer/edit/:id"    element={<RequireDealer><EditCarPage /></RequireDealer>} />
                  <Route path="/dealer/analytics"   element={<RequireDealer><DealerAnalytics /></RequireDealer>} />
                  <Route path="/dealer/settings"    element={<RequireDealer><DealerSettings /></RequireDealer>} />

                  {/* ── Admin ── */}
                  <Route path="/admin"             element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                  <Route path="/admin/users"       element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
                  <Route path="/admin/cars"        element={<RequireAdmin><AdminCars /></RequireAdmin>} />
                  <Route path="/admin/bids"        element={<RequireAdmin><AdminBids /></RequireAdmin>} />
                  <Route path="/admin/escrows"     element={<RequireAdmin><AdminEscrows /></RequireAdmin>} />
                  <Route path="/admin/auctions"    element={<RequireAdmin><AdminAuctions /></RequireAdmin>} />
                  <Route path="/admin/sellers"     element={<RequireAdmin><AdminSellers /></RequireAdmin>} />
                  <Route path="/admin/settings"    element={<RequireAdmin><AdminSettings /></RequireAdmin>} />

                  {/* ── Fallback ── */}
                  <Route path="/404" element={<NotFoundPage />} />
                  <Route path="*"    element={<NotFoundPage />} />
                </Routes>
                <AppInstallPrompt />
              </ErrorBoundary>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
