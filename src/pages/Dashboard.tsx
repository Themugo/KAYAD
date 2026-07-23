import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/features/common/SEOHead';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <SEOHead 
        title="Dashboard - KAYAD"
        description="Your KAYAD dashboard"
      />
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Welcome back, {user?.name || 'User'}
          </h1>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Active Listings</h3>
              <p className="text-3xl font-bold text-blue-600">0</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Pending Orders</h3>
              <p className="text-3xl font-bold text-yellow-600">0</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Total Sales</h3>
              <p className="text-3xl font-bold text-green-600">KES 0</p>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <p className="text-gray-600">No recent activity to display.</p>
          </div>
        </div>
      </div>
    </>
  );
}
