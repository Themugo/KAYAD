import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, carsAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';

function RoleWelcome({ role }) {
  const welcome = {
    admin:            { icon: '⚙', title: 'System Admin', desc: 'Full platform oversight and configuration' },
    superadmin:       { icon: '👑', title: 'Super Admin', desc: 'Ultimate system control and management' },
    marketing:        { icon: '📢', title: 'Marketing', desc: 'Ad campaigns, banners, and promotions' },
    technical_support:{ icon: '🛠', title: 'Technical Support', desc: 'User and car management' },
    hr:               { icon: '👥', title: 'Human Resources', desc: 'Dealer approvals and staff management' },
    accounts:         { icon: '💰', title: 'Accounts & Finance', desc: 'Payments, escrows, and financial reports' },
    escrow_officer:   { icon: '🔒', title: 'Escrow Officer', desc: 'Escrow release and payment oversight' },
    ad_manager:       { icon: '📢', title: 'Ad Manager', desc: 'Ad campaign management' },
    moderator:        { icon: '🛡', title: 'Moderator', desc: 'Content moderation and compliance' },
  };
  return welcome[role] || { icon: '⚙', title: 'Staff', desc: 'Admin portal' };
}

export default function AdminDashboard() {
  const { user, isSuperAdmin, isMarketing, isTechSupport, isHR, isAccounts, isEscrowOfficer, isAdManager } = useAuth();
  const { toast } = useToast();
  const role = user?.role || 'admin';
  const welcome = RoleWelcome(role);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    Promise.all([
      adminAPI.stats().catch(() => ({ stats: {} })),
      isSuperAdmin ? adminAPI.users({ limit: 100 }).catch(() => ({ users: [] })) : Promise.resolve({ users: [] }),
    ]).then(([s, u]) => {
      setStats(s.stats || {});
      setStaff((u.users || []).filter(u => ['admin','superadmin','marketing','technical_support','hr','accounts','escrow_officer','ad_manager','moderator'].includes(u.role)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Quick links per role ──
  const roleLinks = {
    superadmin: [
      { to: '/admin/users', icon: '👥', label: 'All Users' },
      { to: '/admin/cars', icon: '🚗', label: 'All Cars' },
      { to: '/admin/sellers', icon: '🏪', label: 'Dealer Approvals' },
      { to: '/admin/transactions', icon: '💳', label: 'Transactions' },
      { to: '/admin/escrows', icon: '🔒', label: 'Escrow Ledger' },
      { to: '/admin/bids', icon: '⚡', label: 'All Bids' },
      { to: '/admin/auctions', icon: '🔴', label: 'Auctions' },
      { to: '/admin/ads', icon: '📢', label: 'Ad Manager' },
      { to: '/admin/settings', icon: '⚙', label: 'System Config' },
      { to: '/admin/panic-room', icon: '🚨', label: 'Panic Room' },
    ],
    admin: [
      { to: '/admin/users', icon: '👥', label: 'All Users' },
      { to: '/admin/cars', icon: '🚗', label: 'All Cars' },
      { to: '/admin/sellers', icon: '🏪', label: 'Dealer Approvals' },
      { to: '/admin/transactions', icon: '💳', label: 'Transactions' },
      { to: '/admin/escrows', icon: '🔒', label: 'Escrow Ledger' },
      { to: '/admin/bids', icon: '⚡', label: 'All Bids' },
      { to: '/admin/auctions', icon: '🔴', label: 'Auctions' },
    ],
    marketing: [
      { to: '/admin/ads', icon: '📢', label: 'Ad Campaigns' },
      { to: '/admin/settings', icon: '🎨', label: 'Homepage Content' },
    ],
    technical_support: [
      { to: '/admin/users', icon: '👥', label: 'User Management' },
      { to: '/admin/cars', icon: '🚗', label: 'Car Listings' },
    ],
    hr: [
      { to: '/admin/sellers', icon: '🏪', label: 'Dealer Approvals' },
      { to: '/admin/users', icon: '👥', label: 'User Management' },
    ],
    accounts: [
      { to: '/admin/transactions', icon: '💳', label: 'Transactions' },
      { to: '/admin/escrows', icon: '🔒', label: 'Escrow Ledger' },
      { to: '/admin/payments', icon: '💰', label: 'Payments' },
    ],
    escrow_officer: [
      { to: '/admin/escrows', icon: '🔒', label: 'Escrow Ledger' },
      { to: '/admin/transactions', icon: '💳', label: 'Transactions' },
    ],
    ad_manager: [
      { to: '/admin/ads', icon: '📢', label: 'Ad Campaigns' },
    ],
    moderator: [
      { to: '/admin/cars', icon: '🚗', label: 'Car Listings' },
      { to: '/admin/users', icon: '👥', label: 'Users' },
    ],
  };

  const links = roleLinks[role] || roleLinks.admin;
  const s = stats || {};

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <div className="section-eyebrow">{welcome.title}</div>
          <h2>{welcome.icon} Welcome, {user?.name?.split(' ')[0]}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{welcome.desc}</p>
        </div>

        {/* ── Stats (superadmin/admin only) ── */}
        {(isSuperAdmin || role === 'admin') && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              { icon: '👥', label: 'Total Users', val: (s.totalUsers || 0).toLocaleString(), color: 'var(--blue)' },
              { icon: '🚗', label: 'Total Cars', val: (s.totalCars || 0).toLocaleString(), color: 'var(--green)' },
              { icon: '📋', label: 'Banned Users', val: (s.bannedUsers || 0).toLocaleString(), color: 'var(--red)' },
            ].map(c => (
              <div key={c.label} className="stat-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="stat-label">{c.label}</div>
                    <div className="stat-value" style={{ color: c.color, fontSize: '1.5rem' }}>{c.val}</div>
                  </div>
                  <span style={{ fontSize: 28, opacity: 0.7 }}>{c.icon}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Accounts / Finance stats ── */}
        {(isAccounts || isEscrowOfficer) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
            <div className="stat-box">
              <div className="stat-label">Total Users</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{(s.totalUsers || 0).toLocaleString()}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Cars</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{(s.totalCars || 0).toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* ── Quick Links ── */}
        <h3 style={{ fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-muted)' }}>Quick Access</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
          {links.map(link => (
            <Link key={link.to} to={link.to} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12,
              background: 'var(--card)', border: '1px solid var(--border)',
              textDecoration: 'none', transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: 24 }}>{link.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* ── Staff Overview (superadmin only) ── */}
        {isSuperAdmin && (
          <div className="card" style={{ padding: 20, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.95rem' }}>👥 Staff Overview</h3>
              <Link to="/admin/sellers" style={{ fontSize: 12, color: 'var(--gold)' }}>Manage Staff →</Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {staff.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No staff accounts yet. Use the seed endpoint to create them.</p>
              ) : staff.slice(0, 10).map(m => (
                <div key={m._id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--surface)', borderRadius: 8, padding: '8px 12px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: m.role === 'superadmin' ? 'var(--red)' : 'var(--gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', fontWeight: 700, flexShrink: 0,
                  }}>{m.name?.[0] || '?'}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.role?.replace('_', ' ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Marketing quick stats ── */}
        {isMarketing && (
          <div className="card" style={{ padding: 20, marginTop: 16 }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>📊 Marketing Overview</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Manage ad campaigns and promotional content from the Ad Manager.
            </p>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Link to="/admin/ads" className="btn btn-gold btn-sm">Go to Ad Manager</Link>
            </div>
          </div>
        )}

        {/* ── Tech Support quick tools ── */}
        {isTechSupport && (
          <div className="card" style={{ padding: 20, marginTop: 16 }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>🛠 Support Tools</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Manage users, review car listings, and handle support requests.
            </p>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Link to="/admin/users" className="btn btn-gold btn-sm">Manage Users</Link>
              <Link to="/admin/cars" className="btn btn-outline btn-sm">View Cars</Link>
            </div>
          </div>
        )}

        {/* ── System info (all staff) ── */}
        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>ℹ System</h3>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>Logged in as: <strong style={{ color: 'var(--text)' }}>{user?.name}</strong></div>
            <div>Email: <strong style={{ color: 'var(--text)' }}>{user?.email}</strong></div>
            <div>Role: <span className={`badge ${user?.role === 'superadmin' ? 'badge-red' : 'badge-gold'}`}>{user?.role?.replace('_', ' ')}</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}
