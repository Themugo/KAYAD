import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, RequireAuth, RequireDealer, RequireSeller, RequireAdmin } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CompareProvider } from './context/CompareContext';
import AppLayout from './components/AppLayout';
import AdminLayout from './components/AdminLayout';
import AppInstallPrompt from './components/AppInstallPrompt';
import { LoadingPage } from './components/LoadingPage';

const HomePage = lazy(() => import('./pages/HomePage'));
const Showroom = lazy(() => import('./pages/Showroom'));
const CarDetailPage = lazy(() => import('./pages/CarDetailPage'));
const AuctionLivePage = lazy(() => import('./pages/AuctionLivePage'));
const AuctionCalendar = lazy(() => import('./pages/AuctionCalendar'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmail'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const ForcePasswordChange = lazy(() => import('./pages/ForcePasswordChange'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const EscrowPage = lazy(() => import('./pages/EscrowPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const EscrowVaultPortal = lazy(() => import('./pages/EscrowVaultPortal'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard'));

const DealerDashboard = lazy(() => import('./pages/dealer/DealerDashboard'));
const DealerTeam = lazy(() => import('./pages/dealer/DealerTeam'));
const DealerSetup = lazy(() => import('./pages/dealer/DealerSetup'));
const DealerOnboarding = lazy(() => import('./pages/dealer/DealerOnboarding'));
const AddCarPage = lazy(() => import('./pages/dealer/AddCarPage'));
const EditCarPage = lazy(() => import('./pages/dealer/EditCarPage'));
const DealerAnalytics = lazy(() => import('./pages/dealer/DealerAnalytics'));
const DealerSettings = lazy(() => import('./pages/dealer/DealerSettings'));
const DealerSettlement = lazy(() => import('./pages/dealer/DealerSettlement'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCars = lazy(() => import('./pages/admin/AdminCars'));
const AdminBids = lazy(() => import('./pages/admin/AdminBids'));
const AdminEscrows = lazy(() => import('./pages/admin/AdminEscrows'));
const AdminAuctions = lazy(() => import('./pages/admin/AdminAuctions'));
const AdminSellers = lazy(() => import('./pages/admin/AdminSellers'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminStaff = lazy(() => import('./pages/admin/AdminStaff'));
const PanicRoom = lazy(() => import('./pages/admin/PanicRoom'));
const AdManager = lazy(() => import('./pages/admin/AdManager'));
const AdminTransactions = lazy(() => import('./pages/admin/AdminTransactions'));
const AdminNtsaQueue = lazy(() => import('./pages/admin/AdminNtsaQueue'));
const AdminInspections = lazy(() => import('./pages/admin/AdminInspections'));
const AdminSecurityLog = lazy(() => import('./pages/admin/AdminSecurityLog'));
const InspectorDashboard = lazy(() => import('./pages/InspectorDashboard'));
const InspectorApply = lazy(() => import('./pages/InspectorApply'));
const AdminInspectorApplications = lazy(() => import('./pages/admin/AdminInspectorApplications'));
const AdminCarModeration = lazy(() => import('./pages/admin/AdminCarModeration'));
const AdminEscrowVault = lazy(() => import('./pages/admin/AdminEscrowVault'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminReferrals = lazy(() => import('./pages/admin/AdminReferrals'));
const AdminChatModeration = lazy(() => import('./pages/admin/AdminChatModeration'));
const AdminMarketData = lazy(() => import('./pages/admin/AdminMarketData'));
const ControlRoom = lazy(() => import('./pages/admin/ControlRoom'));

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
                  <Suspense fallback={<LoadingPage />}>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/showroom" element={<Showroom />} />
                      <Route path="/cars/:id" element={<CarDetailPage />} />
                      <Route path="/auction/:id" element={<AuctionLivePage />} />
                      <Route path="/auctions/calendar" element={<AuctionCalendar />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                      <Route path="/verify-email" element={<VerifyEmailPage />} />

                      <Route path="/dashboard" element={<RequireAuth><BuyerDashboard /></RequireAuth>} />
                      <Route path="/force-password-change" element={<RequireAuth><ForcePasswordChange /></RequireAuth>} />
                      <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                      <Route path="/favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
                      <Route path="/compare" element={<ComparePage />} />
                      <Route path="/escrow" element={<RequireAuth><EscrowPage /></RequireAuth>} />
                      <Route path="/escrow-vault" element={<RequireAuth><EscrowVaultPortal /></RequireAuth>} />
                      <Route path="/escrow-vault/:id" element={<RequireAuth><EscrowVaultPortal /></RequireAuth>} />
                      <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
                      <Route path="/chat/:chatId" element={<RequireAuth><ChatPage /></RequireAuth>} />
                      <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
                      <Route path="/payments" element={<RequireAuth><PaymentsPage /></RequireAuth>} />

                      <Route path="/dealer" element={<RequireSeller><DealerDashboard /></RequireSeller>} />
                      <Route path="/dealer/team" element={<RequireSeller><DealerTeam /></RequireSeller>} />
                      <Route path="/dealer/setup" element={<RequireSeller><DealerSetup /></RequireSeller>} />
                      <Route path="/dealer/onboarding" element={<RequireSeller><DealerOnboarding /></RequireSeller>} />
                      <Route path="/dealer/add-car" element={<RequireSeller><AddCarPage /></RequireSeller>} />
                      <Route path="/dealer/edit/:id" element={<RequireSeller><EditCarPage /></RequireSeller>} />
                      <Route path="/dealer/analytics" element={<RequireDealer><DealerAnalytics /></RequireDealer>} />
                      <Route path="/dealer/settings" element={<RequireSeller><DealerSettings /></RequireSeller>} />
                      <Route path="/dealer/settlement" element={<RequireSeller><DealerSettlement /></RequireSeller>} />

                      <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/users" element={<AdminUsers />} />
                        <Route path="/admin/cars" element={<AdminCars />} />
                        <Route path="/admin/moderation" element={<AdminCarModeration />} />
                        <Route path="/admin/bids" element={<AdminBids />} />
                        <Route path="/admin/escrows" element={<AdminEscrows />} />
                        <Route path="/admin/escrow-vault" element={<AdminEscrowVault />} />
                        <Route path="/admin/reviews" element={<AdminReviews />} />
                        <Route path="/admin/auctions" element={<AdminAuctions />} />
                        <Route path="/admin/sellers" element={<AdminSellers />} />
                        <Route path="/admin/settings" element={<AdminSettings />} />
                        <Route path="/admin/panic-room" element={<PanicRoom />} />
                        <Route path="/admin/staff" element={<AdminStaff />} />
                        <Route path="/admin/ads" element={<AdManager />} />
                        <Route path="/admin/transactions" element={<AdminTransactions />} />
                        <Route path="/admin/ntsa-queue" element={<AdminNtsaQueue />} />
                        <Route path="/admin/inspections" element={<AdminInspections />} />
                        <Route path="/admin/security-log" element={<AdminSecurityLog />} />
                        <Route path="/admin/inspector-applications" element={<AdminInspectorApplications />} />
                        <Route path="/admin/referrals" element={<AdminReferrals />} />
                        <Route path="/admin/chats" element={<AdminChatModeration />} />
                        <Route path="/admin/market-data" element={<AdminMarketData />} />
                        <Route path="/admin/control-room" element={<ControlRoom />} />
                      </Route>

                      <Route path="/inspector" element={<RequireAuth><InspectorDashboard /></RequireAuth>} />
                      <Route path="/inspector/apply" element={<InspectorApply />} />

                      <Route path="/404" element={<NotFoundPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
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
