import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, Users, FolderKanban, 
  DollarSign, AlertTriangle, Package, 
  RefreshCw, BarChart3, Activity
} from 'lucide-react';
import { formatKES } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'indigo';
}

function MetricCard({ title, value, icon, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-[#F3FAF9] text-[#176B87] border-[#D7E7E4]',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-[#F3FAF9] text-[#176B87] border-[#D7E7E4]',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-[#F3FAF9] text-[#176B87] border-[#D7E7E4]',
    indigo: 'bg-[#F3FAF9] text-[#176B87] border-[#D7E7E4]',
  };

  return (
    <div className="p-6 bg-white border rounded-xl hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-[#64748B] mb-1">{title}</p>
      <p className="text-2xl font-bold text-navy-900">{value}</p>
    </div>
  );
}

type DashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
};

type RecentOrder = {
  id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  total_amount?: number | null;
  status: string;
};

export function ExecutiveDashboard() {
  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['executiveDashboardStats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [ordersResult, productsResult, customersResult] = await Promise.all([
        supabase.from('orders').select('status, total_amount'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
      ]);
      if (ordersResult.error) throw ordersResult.error;
      if (productsResult.error) throw productsResult.error;
      if (customersResult.error) throw customersResult.error;
      const orders = ordersResult.data || [];
      return {
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        completedOrders: orders.filter((o) => o.status === 'completed').length,
        totalRevenue: orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
        totalProducts: productsResult.count || 0,
        totalCustomers: customersResult.count || 0,
      };
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['executiveDashboardRecentOrders'],
    queryFn: async (): Promise<RecentOrder[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, customer_email, total_amount, status')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as RecentOrder[];
    },
  });
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-[#DDF4F0] rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-[#DDF4F0] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-[#D7E7E4]">
        <p className="text-[#64748B]">Unable to load dashboard metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Business Control Centre</h1>
          <p className="text-[#64748B] text-sm mt-1">Real-time business overview and metrics</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-[#BDE5DE] rounded-lg hover:bg-[#F6FAF9] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard title="Total Orders" value={stats.totalOrders} icon={<FolderKanban className="w-6 h-6" />} color="blue" />
        <MetricCard title="Pending Orders" value={stats.pendingOrders} icon={<AlertTriangle className="w-6 h-6" />} color="orange" />
        <MetricCard title="Completed Orders" value={stats.completedOrders} icon={<TrendingUp className="w-6 h-6" />} color="green" />
        <MetricCard title="Total Products" value={stats.totalProducts} icon={<Package className="w-6 h-6" />} color="purple" />
        <MetricCard title="Total Customers" value={stats.totalCustomers} icon={<Users className="w-6 h-6" />} color="indigo" />
        <MetricCard title="Total Revenue" value={formatKES(stats.totalRevenue)} icon={<DollarSign className="w-6 h-6" />} color="green" />
      </div>

      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-navy-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Sales Performance
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-[#64748B]">Total Revenue</p>
            <p className="text-2xl font-bold text-green-700">{formatKES(stats.totalRevenue)}</p>
          </div>
          <div className="p-4 bg-[#F3FAF9] rounded-lg">
            <p className="text-sm text-[#64748B]">Pending Orders</p>
            <p className="text-2xl font-bold text-[#12576D]">{stats.pendingOrders}</p>
          </div>
          <div className="p-4 bg-[#F3FAF9] rounded-lg">
            <p className="text-sm text-[#64748B]">Completion Rate</p>
            <p className="text-2xl font-bold text-[#12576D]">
              {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Orders
        </h2>
        {recentOrders && recentOrders.length > 0 ? (
          <div className="divide-y">
            {recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-navy-900">{order.customer_name}</p>
                  <p className="text-sm text-[#64748B]">{order.customer_email}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatKES(Number(order.total_amount ?? 0))}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'pending' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    'bg-[#EEF7F5] text-[#12576D]'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#64748B] text-sm">No recent orders</p>
        )}
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-navy-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center gap-3 p-4 bg-[#F6FAF9] hover:bg-[#EEF7F5] rounded-lg transition-colors text-left">
            <Users className="w-5 h-5 text-[#176B87]" />
            <div>
              <p className="font-medium text-navy-900">Add Lead</p>
              <p className="text-xs text-[#64748B]">New enquiry</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-[#F6FAF9] hover:bg-[#EEF7F5] rounded-lg transition-colors text-left">
            <FolderKanban className="w-5 h-5 text-[#176B87]" />
            <div>
              <p className="font-medium text-navy-900">Create Quote</p>
              <p className="text-xs text-[#64748B]">New quotation</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-[#F6FAF9] hover:bg-[#EEF7F5] rounded-lg transition-colors text-left">
            <Package className="w-5 h-5 text-[#176B87]" />
            <div>
              <p className="font-medium text-navy-900">Stock Alert</p>
              <p className="text-xs text-[#64748B]">Low inventory</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-[#F6FAF9] hover:bg-[#EEF7F5] rounded-lg transition-colors text-left">
            <DollarSign className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-navy-900">Invoices</p>
              <p className="text-xs text-[#64748B]">View all</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
