import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/features/common/SEOHead';

export default function Dashboard() {
  const { user, isDealer, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isInspector = user?.role === 'ghost_checker';

  useEffect(() => {
    // Redirect based on user role
    if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isDealer) {
      navigate('/dealer', { replace: true });
    } else if (isInspector) {
      navigate('/inspector/dashboard', { replace: true });
    }
  }, [user, isAdmin, isDealer, isInspector, navigate]);

  return (
    <>
      <SEOHead
        title="Dashboard - KAYAD"
        description="Your KAYAD dashboard"
      />

      <div className="min-h-screen bg-[#F6FAF9] py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-[#0A3340] mb-6">
            Welcome back, {user?.name || 'User'}
          </h1>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Active Listings</h3>
              <p className="text-3xl font-bold text-[#176B87]">0</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Pending Orders</h3>
              <p className="text-3xl font-bold text-[#176B87]">0</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Total Sales</h3>
              <p className="text-3xl font-bold text-green-600">KES 0</p>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/gallery')}
                className="p-4 bg-[#F3FAF9] rounded-lg hover:bg-[#DDF4F0] transition-colors text-left"
              >
                <div className="text-2xl mb-2">🚗</div>
                <div className="font-semibold text-[#0A3340]">Browse Cars</div>
                <div className="text-sm text-[#64748B]">View all listings</div>
              </button>
              <button
                onClick={() => navigate('/auction')}
                className="p-4 bg-[#F3FAF9] rounded-lg hover:bg-[#DDF4F0] transition-colors text-left"
              >
                <div className="text-2xl mb-2">🏷️</div>
                <div className="font-semibold text-[#0A3340]">Live Auctions</div>
                <div className="text-sm text-[#64748B]">Bid on vehicles</div>
              </button>
              <button
                onClick={() => navigate('/escrow')}
                className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
              >
                <div className="text-2xl mb-2">🛡️</div>
                <div className="font-semibold text-[#0A3340]">Escrow</div>
                <div className="text-sm text-[#64748B]">Protected deals</div>
              </button>
              <button
                onClick={() => navigate('/chat')}
                className="p-4 bg-[#F3FAF9] rounded-lg hover:bg-[#DDF4F0] transition-colors text-left"
              >
                <div className="text-2xl mb-2">💬</div>
                <div className="font-semibold text-[#0A3340]">Messages</div>
                <div className="text-sm text-[#64748B]">Chat with dealers</div>
              </button>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <p className="text-[#64748B]">No recent activity to display. Start by browsing our vehicle gallery.</p>
            <button
              onClick={() => navigate('/gallery')}
              className="mt-4 px-4 py-2 bg-[#176B87] text-white rounded-lg hover:bg-[#12576D] transition-colors"
            >
              Browse Vehicles
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
