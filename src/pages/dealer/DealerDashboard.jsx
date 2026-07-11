import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI, formatKES } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge, Pagination } from '../../components/ui';
import { EnterpriseCard, EnterpriseKPI, EnterpriseTimeline, EnterpriseChart, EnterpriseQuickActions, EnterpriseTable, EnterpriseTaskSummary, EnterpriseMetricRow, EnterpriseStatus, DashboardHeader } from '../../components/enterprise/EnterpriseDashboard';

export default function DealerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [summary, setSummary]     = useState(null);
  const [cars, setCars]           = useState([]);
  const [bids, setBids]           = useState([]);
  const [escrows, setEscrows]     = useState([]);
  const [earnings, setEarnings]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('overview');
  const [bidsPage, setBidsPage]   = useState(1);
  const [bidsTotal, setBidsTotal] = useState(0);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        dealerAPI.summary().catch(() => ({ summary: {} })),
        dealerAPI.cars().catch(() => ({ cars: [] })),
      ]);
      setSummary(s.summary || s.data || s);
      setCars(c.cars || c.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    if (tab === 'bids') {
      dealerAPI.bids({ page: bidsPage, limit: 20 })
        .then(d => { setBids(d.bids || []); setBidsTotal(d.pagination?.total || 0); })
        .catch(() => {});
    }
    if (tab === 'escrows') {
      dealerAPI.escrows()
        .then(d => setEscrows(d.escrows || []))
        .catch(() => {});
    }
    if (tab === 'earnings') {
      dealerAPI.earnings({ days: 365 })
        .then(d => setEarnings(d.earnings || d.data || d))
        .catch(() => {});
    }
  }, [tab, bidsPage]);

  const handleDelete = async (carId) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await carsAPI.remove(carId);
      setCars(prev => prev.filter(c => c._id !== carId));
      toast('Listing deleted', 'info');
    } catch { toast('Failed to delete', 'error'); }
  };

  if (!user?.approved && user?.role === 'dealer') {
    return (
      <div className="page" style={{ paddingTop: 88 }}>
        <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
          <EnterpriseCard header="⏳ Account Pending">
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <h3 style={{ marginBottom: 8 }}>Awaiting Admin Approval</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your dealer account is pending approval. You'll be notified once approved.</p>
            </div>
          </EnterpriseCard>
        </div>
      </div>
    );
  }

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  const s = summary || {};
  const activeListings = cars.filter(c => c.status === 'active' || !c.status);

  const renderOverview = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <EnterpriseCard header="🚗 Recent Listings">
          {cars.slice(0, 5).map(car => (
            <div key={car._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{car.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{(car.views || 0).toLocaleString()} views · {car.bidsCount || 0} bids</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontWeight: 700, fontSize: '0.9rem' }}>{formatKES(car.price)}</div>
                {car.auctionStatus === 'live' && <Badge variant="live" style={{ fontSize: 9 }}>LIVE</Badge>}
              </div>
            </div>
          ))}
          {cars.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No listings yet</div>}
          {cars.length > 0 && (
            <button onClick={() => setTab('listings')} style={{ marginTop: 12, fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', display: 'block', fontWeight: 600 }}>
              View all listings →
            </button>
          )}
        </EnterpriseCard>

        <EnterpriseCard header="⚡ Recent Activity">
          <EnterpriseTimeline items={[
            { title: 'New view on Toyota V8', time: '10m ago', color: '#3b82f6' },
            { title: 'Bid placed on Mercedes GLE', description: 'KES 11,200,000 by James K.', time: '1h ago', color: '#f59e0b' },
            { title: 'New inquiry from buyer', description: 'Sarah: "Is this still available?"', time: '2h ago', color: 'var(--gold)' },
            { title: 'Escrow payment received', description: 'KES 8,400,000 — BMW X5', time: '5h ago', color: '#22c55e' },
          ]} />
        </EnterpriseCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <EnterpriseCard header="📈 Views (Last 7 Days)">
          <EnterpriseChart data={[30, 45, 35, 50, 65, 55, 70]} label="Daily views" height={160} color="#3b82f6" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </EnterpriseCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <EnterpriseCard header="Lead Management">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: '💬', value: (s.totalInquiries || 0).toLocaleString(), label: 'Total Inquiries' },
                { icon: '📞', value: (s.thisMonthInquiries || 0).toLocaleString(), label: 'This Month' },
                { icon: '✅', value: (s.convertedLeads || 0).toLocaleString(), label: 'Converted' },
                { icon: '📊', value: s.conversionRate || '0%', label: 'Conversion Rate' },
              ].map((m, i) => (
                <div key={i} style={{ padding: '14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#fff' }}>{m.value}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </EnterpriseCard>
        </div>
      </div>

      <EnterpriseCard header="Quick Actions">
        <EnterpriseQuickActions actions={[
          { to: '/dealer/add-car', icon: '➕', label: 'List a New Car', desc: 'Add vehicle to marketplace' },
          { to: '/dealer/analytics', icon: '📊', label: 'Analytics', desc: 'Views, bids, earnings reports' },
          { to: '/dealer/settings', icon: '⚙', label: 'Settings', desc: 'Payments, business profile, alerts' },
          { to: '/escrow', icon: '🔒', label: 'Check Escrow', desc: 'View payment status' },
          { to: '/chat', icon: '💬', label: 'View Messages', desc: 'Buyer inquiries' },
        ]} />
      </EnterpriseCard>
    </>
  );

  const renderListings = () => (
    <EnterpriseCard header={`🚗 Your Listings (${cars.length})`}>
      <EnterpriseTable
        columns={[
          { key: 'car', label: 'Vehicle' },
          { key: 'price', label: 'Price', align: 'right' },
          { key: 'views', label: 'Views', align: 'center' },
          { key: 'bids', label: 'Bids', align: 'center' },
          { key: 'status', label: 'Status', align: 'center' },
          { key: 'actions', label: 'Actions', align: 'right' },
        ]}
        rows={cars.map(car => ({
          car: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 44, height: 32, borderRadius: 4, overflow: 'hidden', background: 'var(--surface)', flexShrink: 0 }}>
                {car.images?.[0]?.url
                  ? <img src={car.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚗</div>
                }
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{car.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{car.year} · {car.fuel}</div>
              </div>
            </div>
          ),
          price: <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontWeight: 700 }}>{formatKES(car.price)}</span>,
          views: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{car.views || 0}</span>,
          bids: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{car.bidsCount || 0}</span>,
          status: <EnterpriseStatus label={car.auctionStatus === 'live' ? 'Live' : car.auctionStatus === 'ended' ? 'Ended' : 'Listed'} color={car.auctionStatus === 'live' ? '#22c55e' : car.auctionStatus === 'ended' ? 'rgba(255,255,255,0.3)' : '#3b82f6'} />,
          actions: (
            <div style={{ display: 'flex', gap: 6 }}>
              <Link to={`/dealer/edit/${car._id}`} className="btn btn-outline btn-sm">Edit</Link>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(car._id)}>Del</button>
            </div>
          ),
        }))}
        emptyMessage="No listings yet — click 'List a New Car' to get started"
      />
      <Link to="/dealer/add-car" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>+ Add New Car</Link>
    </EnterpriseCard>
  );

  const renderBids = () => (
    <EnterpriseCard header={`⚡ Bids on Your Listings (${bidsTotal})`}>
      <EnterpriseTable
        columns={[
          { key: 'car', label: 'Car' },
          { key: 'bidder', label: 'Bidder' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'date', label: 'Date' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        rows={bids.map(b => ({
          car: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 26, borderRadius: 3, overflow: 'hidden', background: 'var(--surface)', flexShrink: 0 }}>
                {b.carImage
                  ? <img src={b.carImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🚗</div>
                }
              </div>
              <span style={{ fontWeight: 500, fontSize: 13, color: '#fff' }}>{b.carTitle}</span>
            </div>
          ),
          bidder: (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{b.bidderName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{b.bidderEmail}</div>
            </div>
          ),
          amount: <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontWeight: 700 }}>{formatKES(b.amount)}</span>,
          date: <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-KE') : '—'}</span>,
          status: <EnterpriseStatus label={b.status} color={b.status === 'paid' ? '#22c55e' : b.status === 'failed' ? '#ef4444' : '#f59e0b'} />,
        }))}
        emptyMessage="No bids received yet"
      />
      {bidsTotal > 20 && (
        <div style={{ marginTop: 16 }}>
          <Pagination page={bidsPage} totalPages={Math.ceil(bidsTotal / 20)} onChange={setBidsPage} />
        </div>
      )}
    </EnterpriseCard>
  );

  const renderEscrows = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
      {escrows.length === 0 ? (
        <EnterpriseCard header="🔒 Escrows">
          <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No escrows yet</div>
        </EnterpriseCard>
      ) : escrows.map(e => (
        <EnterpriseCard key={e._id} header={e.car?.title || 'Unknown Car'}
          action={<EnterpriseStatus label={e.status} color={e.status === 'held' ? '#f59e0b' : e.status === 'released' ? '#22c55e' : e.status === 'refunded' ? '#ef4444' : 'rgba(255,255,255,0.3)'} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 2 }}>Buyer</div>
              <div style={{ fontWeight: 600, color: '#fff' }}>{e.buyer?.name || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 2 }}>Amount</div>
              <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontWeight: 700 }}>{formatKES(e.amount)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 2 }}>Created</div>
              <div style={{ color: 'rgba(255,255,255,0.6)' }}>{e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-KE') : '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
              <div style={{ color: e.status === 'released' ? '#22c55e' : 'rgba(255,255,255,0.6)' }}>{e.status === 'held' ? '⏳ In Escrow' : e.status === 'released' ? '✅ Released' : e.status || '—'}</div>
            </div>
          </div>
        </EnterpriseCard>
      ))}
      <div>
        <Link to="/escrow" style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 10, background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)', color: 'var(--gold)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>View All Escrows →</Link>
      </div>
    </div>
  );

  const renderEarnings = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
        <EnterpriseKPI icon="💰" label="Total Earned" value={formatKES(earnings?.total ?? s.totalRevenue ?? 0)} accent="var(--gold)" />
        <EnterpriseKPI icon="🔒" label="In Escrow" value={formatKES(earnings?.inEscrow ?? 0)} accent="#f59e0b" />
        <EnterpriseKPI icon="✅" label="Released" value={formatKES(earnings?.released ?? 0)} accent="#22c55e" />
        <EnterpriseKPI icon="📈" label="This Month" value={formatKES(earnings?.thisMonth ?? 0)} trend={12} accent="#3b82f6" />
      </div>

      <EnterpriseCard header="📊 Monthly Earnings">
        <EnterpriseChart data={[450, 520, 380, 610, 550, 720, 680, 750, 690, 820, 780, 910]} label="Monthly revenue (KES thousands)" height={180} color="var(--gold)" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
          <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
        </div>
      </EnterpriseCard>

      {earnings?.payments?.length > 0 && (
        <EnterpriseCard header="Recent Payments" style={{ marginTop: 24 }}>
          <EnterpriseTable
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'car', label: 'Car' },
              { key: 'amount', label: 'Amount', align: 'right' },
              { key: 'status', label: 'Status', align: 'center' },
            ]}
            rows={earnings.payments.slice(0, 10).map(p => ({
              date: <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-KE') : '—'}</span>,
              car: <span style={{ fontSize: 13, color: '#fff' }}>{p.car?.title || '—'}</span>,
              amount: <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontWeight: 700 }}>{formatKES(p.dealerAmount || p.amount)}</span>,
              status: <EnterpriseStatus label={p.status} color={p.status === 'success' ? '#22c55e' : p.status === 'failed' ? '#ef4444' : 'rgba(255,255,255,0.3)'} />,
            }))}
            emptyMessage="No payments yet"
          />
          <Link to="/payments" style={{ display: 'inline-block', marginTop: 16, fontSize: 12, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>View All Payments →</Link>
        </EnterpriseCard>
      )}
    </>
  );

  return (
    <div className="page" style={{ paddingTop: 88 }}>
      <DashboardHeader badge="Dealer Hub" greeting="Welcome" name={user?.name?.split(' ')[0] || 'Dealer'}
        subtitle={user?.businessName ? `🏪 ${user.businessName}` : 'Manage your inventory and track performance'}
        actions={
          <Link to="/dealer/add-car" style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>+ List New Car</Link>
        }
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 28 }}>
          <EnterpriseKPI icon="🚗" label="Total Listings" value={s.totalCars ?? cars.length} accent="var(--gold)" />
          <EnterpriseKPI icon="✅" label="Active" value={s.activeCars ?? activeListings.length} accent="#22c55e" />
          <EnterpriseKPI icon="👁" label="Total Views" value={(s.totalViews ?? 0).toLocaleString()} trend={5} accent="#3b82f6" />
          <EnterpriseKPI icon="⚡" label="Total Bids" value={s.totalBids ?? 0} accent="#f59e0b" />
          <EnterpriseKPI icon="🔴" label="Live Auctions" value={s.liveAuctions ?? 0} accent="#ef4444" />
          <EnterpriseKPI icon="🔒" label="Pending Escrows" value={s.pendingEscrows ?? 0} accent="#f59e0b" />
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'listings', label: '🚗 Listings' },
            { id: 'bids', label: '⚡ Bids' },
            { id: 'escrows', label: '🔒 Escrows' },
            { id: 'earnings', label: '💰 Earnings' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '7px 16px', borderRadius: 8,
                background: tab === t.id ? 'rgba(212,168,67,0.1)' : 'transparent',
                border: '1px solid',
                borderColor: tab === t.id ? 'rgba(212,168,67,0.2)' : 'transparent',
                color: tab === t.id ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && renderOverview()}
        {tab === 'listings' && renderListings()}
        {tab === 'bids' && renderBids()}
        {tab === 'escrows' && renderEscrows()}
        {tab === 'earnings' && renderEarnings()}
      </div>
    </div>
  );
}
