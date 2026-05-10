// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, escrowAPI, bidsAPI, formatKES } from '../../api/api';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/helpers';

const SECTIONS = [
  { to: '/admin/users', icon: '👥', label: 'Users', desc: 'Buyers, dealers, approvals, bans', color: 'var(--blue)' },
  { to: '/admin/cars', icon: '🚗', label: 'Listings', desc: 'Review, feature, delete listings', color: 'var(--green)' },
  { to: '/admin/bids', icon: '⚡', label: 'Bids', desc: 'Monitor, fraud-check, set winners', color: 'var(--gold)' },
  { to: '/admin/auctions', icon: '🔴', label: 'Auctions', desc: 'Start, end, extend live auctions', color: 'var(--red)' },
  { to: '/admin/escrows', icon: '🔒', label: 'Escrow', desc: 'Release or refund held funds', color: 'var(--purple)' },
];

function StatCard({ label, val, icon, color, sub, href }) {
  const inner = (
    <div
      className="stat-box"
      style={{ cursor: href ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color, fontSize: '1.6rem' }}>
            {val}
          </div>
          {sub && <div className="stat-sub">{sub}</div>}
        </div>
        <span style={{ fontSize: 26, opacity: 0.8 }}>{icon}</span>
      </div>
    </div>
  );

  return href ? <Link to={href}>{inner}</Link> : inner;
}

export default function AdminDashboard() {
  const { joinAdmin, on } = useSocket();
  const { toast } = useToast();

  const [stats, setStats] = useState(null);
  const [escrows, setEscrows] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState([]);
  const eventsRef = useRef([]);

  useEffect(() => {
    joinAdmin();

    Promise.all([
      adminAPI.stats(),
      escrowAPI.all({ limit: 5, status: 'funded' }),
      bidsAPI.adminAll({ limit: 8, sort: '-createdAt' }),
    ])
      .then(([s, e, b]) => {
        setStats(s.stats || s.data || s);
        setEscrows(e.escrows || e.data || []);
        setRecentBids(b.bids || b.data || []);
      })
      .catch(() => toast('Could not load some stats', 'warning'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const push = (icon, msg) => {
      const event = { icon, msg, time: Date.now(), id: Math.random() };
      eventsRef.current = [event, ...eventsRef.current.slice(0, 19)];
      setLiveEvents([...eventsRef.current]);
    };

    const offs = [
      on('auctionUpdate', d => push('⚡', `New bid of ${formatKES(d.currentBid)} on auction`)),
      on('auctionEnded', d => push('🏁', 'Auction ended — winner declared')),
      on('paymentSuccess', d => push('✅', `M-Pesa payment confirmed: ${d.receipt || ''}`)),
      on('paymentFailed', d => push('❌', `Payment failed: ${d.checkoutID?.slice(-8) || ''}`)),
      on('escrowReleased', d => push('💰', `Escrow ${d.escrowId?.slice(-6)} released`)),
      on('escrowRefunded', d => push('↩️', `Escrow ${d.escrowId?.slice(-6)} refunded`)),
      on('newBid', d => push('🏷', `New bid: ${formatKES(d.amount)}`)),
    ];

    return () => offs.forEach(f => f?.());
  }, [on]);

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  const s = stats || {};
  const fundedEscrowTotal = escrows.reduce((acc, e) => acc + (e.amount || 0), 0);

  return (
    <div className="page">
      <div className="container" style={{ padding: '32px 24px' }}>

        <div style={{ marginBottom: 32 }}>
          <h2>Admin Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Real-time overview of platform activity.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <StatCard href="/admin/users" label="Users" val={(s.totalUsers || 0).toLocaleString()} icon="👥" color="var(--blue)" />
          <StatCard href="/admin/cars" label="Cars" val={(s.totalCars || 0).toLocaleString()} icon="🚗" color="var(--green)" />
          <StatCard href="/admin/bids" label="Bids" val={(s.totalBids || 0).toLocaleString()} icon="⚡" color="var(--gold)" />
          <StatCard href="/admin/escrows" label="Escrow" val={formatKES(s.escrowTotal || 0)} icon="🔒" color="var(--purple)" />
        </div>

        {/* Management */}
        <h3 style={{ margin: '20px 0 10px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Management Sections
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {SECTIONS.map(sec => (
            <Link key={sec.to} to={sec.to}>
              <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>{sec.icon}</div>
                <div style={{ color: sec.color, fontWeight: 600 }}>{sec.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sec.desc}</div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}