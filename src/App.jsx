// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, RequireAuth, RequireDealer, RequireAdmin } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Layout
import Navbar from './components/Navbar';

// Public pages
import HomePage        from './pages/HomePage';
import CarsPage        from './pages/CarsPage';
import CarDetailPage   from './pages/CarDetailPage';
import AuctionLivePage from './pages/AuctionLivePage';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import NotFoundPage    from './pages/NotFoundPage';

// Auth-required user pages
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

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers     from './pages/admin/AdminUsers';
import AdminCars      from './pages/admin/AdminCars';
import AdminBids      from './pages/admin/AdminBids';
import AdminEscrows   from './pages/admin/AdminEscrows';
import AdminAuctions  from './pages/admin/AdminAuctions';

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
                  <Route path="/cars"       element={<CarsPage />} />
                  <Route path="/cars/:id"   element={<CarDetailPage />} />
                  <Route path="/auction/:id" element={<AuctionLivePage />} />
                  <Route path="/login"      element={<LoginPage />} />
                  <Route path="/register"   element={<RegisterPage />} />

                  {/* ── Auth Required ── */}
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

                  {/* ── Admin ── */}
                  <Route path="/admin"           element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                  <Route path="/admin/users"     element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
                  <Route path="/admin/cars"      element={<RequireAdmin><AdminCars /></RequireAdmin>} />
                  <Route path="/admin/bids"      element={<RequireAdmin><AdminBids /></RequireAdmin>} />
                  <Route path="/admin/escrows"   element={<RequireAdmin><AdminEscrows /></RequireAdmin>} />
                  <Route path="/admin/auctions"  element={<RequireAdmin><AdminAuctions /></RequireAdmin>} />

                  {/* ── Fallback ── */}
                  <Route path="/404" element={<NotFoundPage />} />
                  <Route path="*"    element={<NotFoundPage />} />
                </Routes>
              </ErrorBoundary>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
