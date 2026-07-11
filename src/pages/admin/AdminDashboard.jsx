import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI, adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { SkeletonStat, SkeletonRow, SkeletonText } from '../../components/Skeleton';
import { EnterpriseCard, EnterpriseKPI, EnterpriseTimeline, EnterpriseChart, EnterpriseQuickActions, EnterpriseTable, EnterpriseTaskSummary, EnterpriseMetricRow, DashboardHeader } from '../../components/enterprise/EnterpriseDashboard';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [cars, setCars] = useState([]);

  useEffect(() => {
    Promise.all([
      adminAPI.stats(),
      carsAPI.list({ limit: 50 }),
    ])
      .then(([s, c]) => {
        setStats(s.stats || s.data || s);
        const carList = c.cars || c.data || [];
        setCars(carList);
      })
      .catch(() => toast('Could not load reports', 'warning'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page" style={{ paddingTop: 88 }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1100 }}>
        <div style={{ marginBottom: 28 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Platform Dashboard</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
          {[1,2,3,4,5].map(i => <SkeletonStat key={i} />)}
        </div>
        <div className="card" style={{ marginBottom: 24, padding: '16px 20px 0' }}>
          <SkeletonText lines={1} />
          <div style={{ marginTop: 16 }}>{[1,2,3,4].map(i => <SkeletonRow key={i} />)}</div>
        </div>
      </div>
    </div>
  );

  const s = stats || {};
  const dealerMap = {};
  cars.forEach(car => {
    const dealerId = car.dealer?._id || 'unknown';
    const dealerName = car.dealer?.name || 'Unknown Dealer';
    if (!dealerMap[dealerId]) dealerMap[dealerId] = { name: dealerName, carCount: 0, totalViews: 0, cars: [] };
    dealerMap[dealerId].carCount++;
    dealerMap[dealerId].totalViews += car.views || 0;
    dealerMap[dealerId].cars.push(car);
  });
  const dealerRows = Object.entries(dealerMap).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.carCount - a.carCount);
  const topCars = [...cars].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 15);

  const notifications = [
    { icon: '🚗', title: 'New listing requires moderation', description: 'Toyota Land Cruiser by Nairobi Auto Hub', time: '5m ago', unread: true },
    { icon: '👤', title: 'New dealer registration', description: 'Mombasa Motors Ltd — pending verification', time: '1h ago', unread: true },
    { icon: '💰', title: 'High-value escrow released', description: 'KES 12,500,000 — Mercedes GLE', time: '2h ago', unread: false },
    { icon: '⚠️', title: 'Dispute raised on escrow #4029', description: 'Buyer claims vehicle not delivered', time: '3h ago', unread: true },
  ];

  return (
    <div className="page" style={{ paddingTop: 88 }}>
      <DashboardHeader badge="Platform Owner" greeting="Platform Overview" name="Admin"
        subtitle={`${(s.totalCars || 0).toLocaleString()} vehicles · ${Object.keys(dealerMap).length} dealers · ${(s.totalUsers || 0).toLocaleString()} users`}
        actions={
          <Link to="/admin/settings" style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)', color: 'var(--gold)', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
            ⚙ Settings
          </Link>
        }
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
          <EnterpriseKPI icon="👥" label="Total Users" value={(s.totalUsers || 0).toLocaleString()} trend={5} accent="#3b82f6" />
          <EnterpriseKPI icon="🚗" label="Total Cars" value={(s.totalCars || 0).toLocaleString()} trend={12} accent="#22c55e" />
          <EnterpriseKPI icon="⚡" label="Total Bids" value={(s.totalBids || 0).toLocaleString()} trend={-3} accent="#f59e0b" />
          <EnterpriseKPI icon="💰" label="Revenue" value={formatKES(s.revenue || 0)} trend={8} accent="var(--gold)" />
          <EnterpriseKPI icon="🏪" label="Dealers" value={String(dealerRows.length)} accent="#8b5cf6" />
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Quick Actions</div>
          <EnterpriseQuickActions actions={[
            { to: '/admin/users', icon: '👥', label: 'Manage Users', desc: 'View, verify, suspend accounts' },
            { to: '/admin/cars', icon: '🚗', label: 'Vehicle Moderation', desc: 'Approve or reject listings' },
            { to: '/admin/escrows', icon: '🔒', label: 'Escrow Vault', desc: 'Monitor & release payments' },
            { to: '/admin/auctions', icon: '⚡', label: 'Live Auctions', desc: 'Monitor ongoing auctions' },
            { to: '/admin/sellers', icon: '🏪', label: 'Dealer Verifications', desc: 'Approve dealer accounts' },
            { to: '/admin/settings', icon: '⚙', label: 'Platform Settings', desc: 'Fees, branding, packages' },
          ]} />
        </div>

        {/* Task Summary + Notifications */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
          <EnterpriseCard header="📊 Platform Health">
            <EnterpriseTaskSummary tasks={[
              { label: 'Active Users', count: (s.totalUsers || 0).toLocaleString(), color: '#3b82f6' },
              { label: 'Live Auctions', count: s.liveAuctions || 0, color: '#22c55e' },
              { label: 'Pending Escrows', count: s.pendingEscrows || 0, color: '#f59e0b' },
              { label: 'Active Listings', count: (s.totalCars || 0).toLocaleString(), color: 'var(--gold)' },
              { label: 'Disputes', count: 0, color: '#ef4444' },
            ]} />
            <div style={{ marginTop: 16 }}>
              <EnterpriseMetricRow items={[
                { icon: '💳', value: formatKES(s.revenue || 0), label: 'Total Revenue' },
                { icon: '🔒', value: formatKES(s.escrowHeld || 0), label: 'In Escrow' },
                { icon: '✅', value: (s.completedTransactions || 0).toLocaleString(), label: 'Completed' },
              ]} />
            </div>
          </EnterpriseCard>

          <EnterpriseCard header="🔔 Notifications">
            <EnterpriseTimeline items={notifications.map(n => ({ title: n.title, description: n.description, time: n.time, color: n.unread ? 'var(--gold)' : 'rgba(255,255,255,0.2)' }))} />
          </EnterpriseCard>
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
          <EnterpriseCard header="📈 Revenue Trend (12 Months)">
            <EnterpriseChart data={[40, 65, 35, 80, 55, 70, 45, 60, 50, 75, 42, 68]} label="Monthly revenue (KES thousands)" height={180} color="var(--gold)" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
              <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
            </div>
          </EnterpriseCard>

          <EnterpriseCard header="⚡ Bid Activity (7 Days)">
            <EnterpriseChart data={[12, 25, 18, 30, 22, 35, 28]} label="Daily bids" height={180} color="#f59e0b" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </EnterpriseCard>
        </div>

        {/* Activity Feed */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
          <EnterpriseCard header="⚡ Live Activity Feed">
            <EnterpriseTimeline items={[
              { title: 'New vehicle listed: Toyota Land Cruiser V8', description: 'Listed by Nairobi Auto Hub · KES 12,500,000', time: '2m ago', color: '#22c55e' },
              { title: 'Bid placed: KES 11,200,000 on Mercedes GLE', description: 'Bidder: James K. · Outbid 3 others', time: '15m ago', color: '#f59e0b' },
              { title: 'New dealer registered: Mombasa Motors', description: 'Business verification pending', time: '1h ago', color: '#3b82f6' },
              { title: 'Escrow released for BMW X5 M Sport', description: 'KES 8,400,000 · Buyer confirmed receipt', time: '2h ago', color: '#22c55e' },
              { title: 'Vehicle inspection completed for Audi Q7', description: 'Score: 92/100 · Inspector: John M.', time: '3h ago', color: '#22c55e' },
              { title: 'Payment processed: KES 450,000 deposit', description: 'Auction deposit · Mercedes GLE', time: '4h ago', color: '#3b82f6' },
              { title: 'New 5-star review left for Nairobi Auto Hub', description: 'Buyer: "Smooth transaction, highly recommend"', time: '5h ago', color: 'var(--gold)' },
            ]} />
          </EnterpriseCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <EnterpriseCard header="🏪 Top Dealers by Listings">
              <EnterpriseTable
                columns={[
                  { key: 'name', label: 'Dealer' },
                  { key: 'carCount', label: 'Cars', align: 'center' },
                  { key: 'totalViews', label: 'Views', align: 'center' },
                ]}
                rows={dealerRows.slice(0, 6)}
                emptyMessage="No dealer data yet"
              />
            </EnterpriseCard>

            <EnterpriseCard header="📋 Recent Registrations">
              <EnterpriseTimeline items={[
                { title: 'Premium Auto KE', description: 'Dealer · Nairobi', time: '30m ago', color: '#3b82f6' },
                { title: 'Sarah Wanjiku', description: 'Buyer · Mombasa', time: '1h ago', color: '#22c55e' },
                { title: 'Highland Cars Ltd', description: 'Dealer · Eldoret', time: '3h ago', color: '#3b82f6' },
                { title: 'John Kamau', description: 'Seller · Nakuru', time: '5h ago', color: '#22c55e' },
              ]} />
            </EnterpriseCard>
          </div>
        </div>

        {/* Vehicle Table */}
        <EnterpriseCard header="👁 Most Viewed Cars">
          <EnterpriseTable
            columns={[
              { key: 'title', label: 'Vehicle' },
              { key: 'dealer', label: 'Dealer / Seller' },
              { key: 'views', label: 'Views', align: 'center' },
              { key: 'bidsCount', label: 'Bids', align: 'center' },
              { key: 'status', label: 'Status', align: 'center' },
            ]}
            rows={topCars.map(car => ({
              ...car,
              title: <Link to={`/cars/${car._id}`} style={{ color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>{car.title}</Link>,
              dealer: <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{car.dealer?.name || 'Unknown'}</span>,
              views: <span style={{ fontWeight: 700, color: car.views > 1000 ? 'var(--gold-400)' : '#fff' }}>{(car.views || 0).toLocaleString()}</span>,
              bidsCount: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{car.bidsCount || 0}</span>,
              status: (() => {
                const sc = car.auctionStatus === 'live' ? '#22c55e' : car.auctionStatus === 'sold' ? 'var(--gold)' : 'rgba(255,255,255,0.3)';
                const sl = car.auctionStatus === 'live' ? 'Live' : car.auctionStatus === 'sold' ? 'Sold' : car.auctionStatus === 'ended' ? 'Ended' : 'Listed';
                return <EnterpriseStatus label={sl} color={sc} />;
              })(),
            }))}
            emptyMessage="No vehicle data yet"
          />
        </EnterpriseCard>
      </div>
    </div>
  );
}
