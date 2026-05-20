import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dealerAPI, carsAPI, adminAPI, notifAPI, formatKES } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit3, Trash2, Eye, ChevronRight, TrendingUp, Car, DollarSign, Gavel, BarChart3, ArrowUpRight, Users, UserPlus, Shield, Mail, X, Check, MessageSquare, Heart, Bell } from 'lucide-react';


// ─────────────────────────────────────────────────────────────
// TEAM TAB COMPONENT — full dealer team management with RBAC
// ─────────────────────────────────────────────────────────────
const DEALER_ROLES = [
  { id: 'manager',        label: 'Manager',        color: '#f97316', desc: 'Full control except team deletion' },
  { id: 'sales_agent',   label: 'Sales Agent',    color: '#3b82f6', desc: 'List, edit, chat with buyers' },
  { id: 'lot_agent',     label: 'Lot Agent',      color: '#22c55e', desc: 'List and edit cars only' },
  { id: 'finance_officer',label: 'Finance Officer',color: '#8b5cf6', desc: 'View earnings and transactions' },
  { id: 'viewer',         label: 'Viewer',         color: 'rgba(255,255,255,0.4)', desc: 'Read-only access' },
];

const PERM_LABELS = {
  canListCars:    'List Cars',
  canEditCars:    'Edit Cars',
  canDeleteCars:  'Delete Cars',
  canViewEarnings:'View Earnings',
  canManageTeam:  'Manage Team',
  canApproveDeals:'Approve Deals',
  canChatBuyers:  'Chat with Buyers',
  canEditSettings:'Edit Settings',
};

// Default permissions per role
const ROLE_DEFAULTS = {
  manager:         { canListCars:true,  canEditCars:true,  canDeleteCars:true,  canViewEarnings:true,  canManageTeam:true,  canApproveDeals:true,  canChatBuyers:true,  canEditSettings:true  },
  sales_agent:     { canListCars:true,  canEditCars:true,  canDeleteCars:false, canViewEarnings:false, canManageTeam:false, canApproveDeals:false, canChatBuyers:true,  canEditSettings:false },
  lot_agent:       { canListCars:true,  canEditCars:true,  canDeleteCars:false, canViewEarnings:false, canManageTeam:false, canApproveDeals:false, canChatBuyers:false, canEditSettings:false },
  finance_officer: { canListCars:false, canEditCars:false, canDeleteCars:false, canViewEarnings:true,  canManageTeam:false, canApproveDeals:false, canChatBuyers:false, canEditSettings:false },
  viewer:          { canListCars:false, canEditCars:false, canDeleteCars:false, canViewEarnings:false, canManageTeam:false, canApproveDeals:false, canChatBuyers:false, canEditSettings:false },
};

function TeamTab({ user, toast }) {
  const [team,       setTeam]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [invEmail,   setInvEmail]   = useState('');
  const [invRole,    setInvRole]    = useState('sales_agent');
  const [inviting,   setInviting]   = useState(false);
  const [expanded,   setExpanded]   = useState(null); // memberId for expanded perms

  useEffect(() => {
    dealerAPI.getTeam().then(d => setTeam(d.members || d.team || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const invite = async () => {
    if (!invEmail.trim()) return;
    setInviting(true);
    try {
      const perms = ROLE_DEFAULTS[invRole] || ROLE_DEFAULTS.sales_agent;
      const d = await dealerAPI.inviteMember({ email: invEmail.trim(), role: invRole, permissions: perms });
      setTeam(p => [...p, d.member]);
      setInvEmail('');
      toast(`Invitation sent to ${invEmail}`, 'success');
    } catch (e) { toast(e?.response?.data?.message || 'Invite failed', 'error'); }
    finally { setInviting(false); }
  };

  const updateRole = async (memberId, role) => {
    const perms = ROLE_DEFAULTS[role] || {};
    try {
      await dealerAPI.updateMember(memberId, { role, permissions: perms });
      setTeam(p => p.map(m => m._id === memberId ? { ...m, role, permissions: perms } : m));
      toast('Role updated', 'success');
    } catch { toast('Failed to update role', 'error'); }
  };

  const togglePerm = async (memberId, permKey) => {
    const member = team.find(m => m._id === memberId);
    if (!member) return;
    const updated = { ...member.permissions, [permKey]: !member.permissions[permKey] };
    try {
      await dealerAPI.updateMember(memberId, { permissions: updated });
      setTeam(p => p.map(m => m._id === memberId ? { ...m, permissions: updated } : m));
    } catch { toast('Failed', 'error'); }
  };

  const remove = async (memberId) => {
    if (!confirm('Remove this team member?')) return;
    try {
      await dealerAPI.removeMember(memberId);
      setTeam(p => p.filter(m => m._id !== memberId));
      toast('Member removed', 'info');
    } catch { toast('Failed to remove', 'error'); }
  };

  const statusColor = { active: '#22c55e', invited: '#f97316', suspended: '#ef4444' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: '0 0 6px' }}>Team Management</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            You are the <strong style={{ color: 'var(--gold)' }}>Business Owner</strong>. Invite staff and assign role-based access.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)', borderRadius: 9999, padding: '6px 14px', fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
          <Shield size={12} /> Business Owner
        </div>
      </div>

      {/* Invite form */}
      <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '22px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
          <UserPlus size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />Invite Team Member
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 2, minWidth: 200 }}>
            <Mail size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
            <input
              placeholder="colleague@email.com"
              value={invEmail}
              onChange={e => setInvEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && invite()}
              style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <select value={invRole} onChange={e => setInvRole(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: '#111', color: '#fff', fontSize: 13, outline: 'none', flex: 1, minWidth: 160 }}>
            {DEALER_ROLES.map(r => <option key={r.id} value={r.id} style={{ background: '#111' }}>{r.label}</option>)}
          </select>
          <button onClick={invite} disabled={inviting || !invEmail.trim()} style={{ padding: '10px 22px', background: invEmail.trim() ? 'var(--gold)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 9, color: invEmail.trim() ? '#000' : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 900, cursor: invEmail.trim() ? 'pointer' : 'default', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 10 }}>
          They'll receive an email to join your dealership's team. Access is instant once they accept.
        </div>
      </div>

      {/* Role reference */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        {DEALER_ROLES.map(r => (
          <div key={r.id} style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: r.color, marginBottom: 5 }}>{r.label}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Team list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>
      ) : team.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', background: '#0C0C0C', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <Users size={36} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 14 }} />
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>No team members yet</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Invite your first employee above</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {team.map(m => {
            const roleInfo = DEALER_ROLES.find(r => r.id === m.role) || DEALER_ROLES[1];
            const isExp = expanded === m._id;
            return (
              <div key={m._id} style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                  {/* Avatar */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${roleInfo.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: roleInfo.color, flexShrink: 0 }}>
                    {(m.member?.name || m.inviteEmail || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.member?.name || m.inviteEmail || 'Pending'}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{m.member?.email || m.inviteEmail}</div>
                  </div>
                  {/* Role selector */}
                  <select value={m.role} onChange={e => updateRole(m._id, e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${roleInfo.color}30`, background: `${roleInfo.color}10`, color: roleInfo.color, fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                    {DEALER_ROLES.map(r => <option key={r.id} value={r.id} style={{ background: '#111', color: '#fff' }}>{r.label}</option>)}
                  </select>
                  {/* Status */}
                  <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: `${statusColor[m.status] || '#666'}15`, color: statusColor[m.status] || '#666', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                    {m.status}
                  </span>
                  {/* Expand perms */}
                  <button onClick={() => setExpanded(isExp ? null : m._id)}
                    style={{ padding: '7px 12px', borderRadius: 8, background: isExp ? 'rgba(212,196,168,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isExp ? 'rgba(212,196,168,0.25)' : 'rgba(255,255,255,0.08)'}`, color: isExp ? 'var(--gold)' : 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    Permissions
                  </button>
                  {/* Remove */}
                  <button onClick={() => remove(m._id)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X size={13} />
                  </button>
                </div>

                {/* Expanded permissions grid */}
                {isExp && (
                  <div style={{ padding: '0 20px 18px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Fine-grained Permissions</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {Object.entries(PERM_LABELS).map(([key, label]) => {
                        const on = m.permissions?.[key] ?? false;
                        return (
                          <button key={key} onClick={() => togglePerm(m._id, key)}
                            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 8, border: `1px solid ${on ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.07)'}`, background: on ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: on ? '#22c55e' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${on ? '#22c55e' : 'rgba(255,255,255,0.2)'}`, background: on ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {on && <Check size={9} style={{ color: '#000' }} />}
                            </div>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
const TABS = [
  { id: 'overview', label: 'Overview',  icon: BarChart3 },
  { id: 'listings', label: 'Listings',  icon: Car },
  { id: 'bids',     label: 'Bids',      icon: Gavel },
  { id: 'earnings', label: 'Earnings',  icon: TrendingUp },
  { id: 'package',  label: 'My Package', icon: BarChart3 },
  { id: 'team',     label: 'Team',       icon: Users },
];

const STATUS_CONFIG = {
  active:  { label: 'Active',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
  sold:    { label: 'Sold',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  pending: { label: 'Pending', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  draft:   { label: 'Draft',   color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)' },
};

function StatCard({ icon: Icon, label, value, sub, color = 'var(--gold)', to }) {
  const inner = (
    <div style={{
      background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '20px', position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { if (to) { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
      onMouseLeave={e => { if (to) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; }}}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${color}07` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} style={{ color }} />
        </div>
        {to && <ArrowUpRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.8rem', color: '#fff', lineHeight: 1, marginBottom: 4 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span style={{ padding: '3px 9px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function DemoBadge({ edited }) {
  return (
    <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 900, background: 'rgba(59,130,246,0.14)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', letterSpacing: '0.06em' }}>
      {edited ? 'DEMO EDITED' : 'DEMO'}
    </span>
  );
}

export default function DealerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [summary, setSummary]   = useState(null);
  const [cars, setCars]         = useState([]);
  const [bids, setBids]         = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('overview');
  const [config, setConfig]     = useState({});
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const canManageDemoCars = ['dealer', 'broker', 'individual_seller'].includes(user?.role);

  useEffect(() => {
    const carsPromise = canManageDemoCars
      ? Promise.all([
          dealerAPI.cars().catch(() => ({ cars: [] })),
          carsAPI.demoAll().catch(() => ({ data: [] })),
        ]).then(([ownedRes, demoRes]) => {
          const owned = ownedRes.cars || ownedRes.data || [];
          const demo = demoRes.data || demoRes.cars || [];
          const ownedIds = new Set(owned.map(car => car._id));
          return { cars: [...owned, ...demo.filter(car => !ownedIds.has(car._id))] };
        })
      : dealerAPI.cars().catch(() => ({ cars: [] }));
    Promise.all([
      dealerAPI.summary().catch(() => ({})),
      carsPromise,
      adminAPI.getConfig().catch(() => ({})),
      notifAPI.list({ limit: 1, unread: true }).catch(() => ({})),
    ]).then(([s, c, cfg, n]) => {
      setSummary(s.summary || s.data || s);
      setCars(c.cars || c.data || []);
      setConfig(cfg.config || cfg);
      setUnreadNotifs(n.unreadCount || n.pendingCount || n.count || 0);
    }).finally(() => setLoading(false));
  }, [canManageDemoCars]);

  useEffect(() => {
    if (tab === 'bids') dealerAPI.bids({ limit: 20 }).then(d => setBids(d.bids || [])).catch(() => {});
    if (tab === 'earnings') dealerAPI.earnings({ days: 365 }).then(d => setEarnings(d.earnings || d.data || d)).catch(() => {});
  }, [tab]);

  const handleDelete = async (carId) => {
    if (!confirm('Delete this listing permanently?')) return;
    try { await carsAPI.remove(carId); setCars(p => p.filter(c => c._id !== carId)); toast('Listing deleted', 'info'); }
    catch { toast('Delete failed', 'error'); }
  };

  if (!user?.approved && user?.role === 'dealer') {
    return (
      <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>⏳</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.6rem', color: '#fff', marginBottom: 10 }}>Pending Approval</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>Your dealer application is under review. We'll notify you once approved — usually within 24 hours.</p>
          <Link to="/" style={{ padding: '11px 28px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontWeight: 900, fontSize: 11, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Return Home</Link>
        </div>
      </div>
    );
  }

  const s = summary || {};
  const totalRevenue = s.totalRevenue || s.revenue || 0;

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '36px 0 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6 }}>Dealer Hub</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#fff', margin: 0 }}>
                {user?.businessName || user?.name || 'My Dealership'}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 6 }}>
                {user?.location || 'Nairobi, Kenya'} · {cars.length} listings
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/notifications" title="Notifications" style={{
                position: 'relative', width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
              }}>
                <Bell size={14} style={{ color: '#fff' }} />
                {unreadNotifs > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#ef4444', color: '#fff', fontSize: 9,
                    fontWeight: 900, minWidth: 16, height: 16,
                    borderRadius: 9999, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', padding: '0 4px',
                    boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                  }}>
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </span>
                )}
              </Link>
              <Link to="/dealer/settings" style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Settings</Link>
              <Link to="/dealer/analytics" style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Analytics</Link>
              <Link to="/dealer/add-car" style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Plus size={14} /> New Listing
              </Link>
            </div>
          </div>

          {!user?.onboardingComplete && (
            <div style={{
              background: 'rgba(212,196,168,0.06)', border: '1px solid rgba(212,196,168,0.15)',
              borderRadius: 10, padding: '12px 18px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 20 }}>🚀</span>
              <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                Complete your <strong style={{ color: 'var(--gold)' }}>shop setup</strong> to start receiving payments
              </span>
              <Link to="/dealer/onboarding" style={{
                padding: '8px 18px', borderRadius: 8,
                background: 'var(--gold)', color: '#000',
                fontSize: 12, fontWeight: 700, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                Complete Setup <ChevronRight size={13} />
              </Link>
            </div>
          )}

          {/* TABS */}
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === id ? 700 : 500,
                color: tab === id ? '#fff' : 'rgba(255,255,255,0.4)',
                borderBottom: `2px solid ${tab === id ? 'var(--gold)' : 'transparent'}`,
                transition: 'all 0.2s',
              }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                  <StatCard icon={Car}         label="Listings"      value={s.totalCars || cars.length}       color="var(--gold)" />
                  <StatCard icon={Eye}         label="Total Views"   value={s.totalViews}                     color="#3b82f6" />
                  <StatCard icon={Gavel}       label="Active Bids"   value={s.activeBids}                     color="#f97316" to="/dealer" />
                  <StatCard icon={DollarSign}  label="Revenue"
                    value={totalRevenue >= 1e6 ? `${(totalRevenue/1e6).toFixed(1)}M` : totalRevenue ? `${Math.round(totalRevenue/1000)}K` : '—'}
                    sub="KES" color="#22c55e" />
                  <StatCard icon={MessageSquare} label="Inquiries"   value={s.totalInquiries || 0}            color="#8b5cf6" />
                  <StatCard icon={Heart}       label="Favorites"    value={s.totalFavorites || 0}            color="#ef4444" />
                </div>

                {/* Recent listings preview */}
                <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Recent Listings</span>
                    <button onClick={() => setTab('listings')} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View All →</button>
                  </div>
                  {cars.slice(0, 5).map(car => {
                    const img = car.images?.[0]?.url || car.images?.[0] || car.image;
                    return (
                      <div key={car._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {img ? <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 54, height: 40, objectFit: 'cover', borderRadius: 7, flexShrink: 0 }} />
                          : <div style={{ width: 54, height: 40, borderRadius: 7, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title}</span>
                            {car.isDemo && <DemoBadge edited={!!car.demoEditedAt} />}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{car.views || 0} views · {car.year}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(car.price||0).toLocaleString()}</div>
                        </div>
                        <StatusBadge status={car.status || (car.auctionStatus === 'live' ? 'active' : 'draft')} />
                        <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
                          <Link to={`/dealer/edit/${car._id}`} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                            <Edit3 size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
                          </Link>
                          <button onClick={() => handleDelete(car._id)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={12} style={{ color: 'rgba(239,68,68,0.6)' }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {cars.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                      <div style={{ fontSize: 36, marginBottom: 12 }}>🚗</div>
                      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>No listings yet</div>
                      <Link to="/dealer/add-car" style={{ padding: '10px 24px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontSize: 12, fontWeight: 900, textDecoration: 'none' }}>Add Your First Car</Link>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── LISTINGS ── */}
            {tab === 'listings' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: 0 }}>{cars.length} Listings</h2>
                  <Link to="/dealer/add-car" style={{ padding: '10px 20px', background: 'var(--gold)', color: '#000', borderRadius: 10, fontSize: 12, fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={13} /> Add Listing
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cars.map(car => {
                    const img = car.images?.[0]?.url || car.images?.[0] || car.image;
                    return (
                      <div key={car._id} style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        {img ? <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                          : <div style={{ width: 80, height: 56, borderRadius: 8, background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{car.title}</span>
                            {car.isDemo && <DemoBadge edited={!!car.demoEditedAt} />}
                          </div>
                          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{car.year} · {car.mileage?.toLocaleString() || '—'} km</span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>👁 {car.views || 0} views</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginRight: 16 }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(car.price||0).toLocaleString()}</div>
                        </div>
                        <StatusBadge status={car.status || (car.auctionStatus === 'live' ? 'active' : 'draft')} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link to={`/cars/${car._id}`} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Preview</Link>
                          <Link to={`/dealer/edit/${car._id}`} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)', color: 'var(--gold)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Edit</Link>
                          <button onClick={() => handleDelete(car._id)} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.8)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── BIDS ── */}
            {tab === 'bids' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', marginBottom: 20 }}>Incoming Bids</h2>
                {bids.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', background: '#0C0C0C', borderRadius: 16 }}>
                    <div style={{ fontSize: 40, marginBottom: 14 }}>⚡</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No bids received yet</div>
                  </div>
                ) : bids.map(b => (
                  <div key={b._id} style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{b.car?.title || 'Vehicle'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{b.user?.name || 'Bidder'} · {new Date(b.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(b.amount||0).toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{b.isAuto ? 'Auto-bid' : 'Manual'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}


            {/* ── EARNINGS ── */}
            {tab === 'earnings' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', marginBottom: 20 }}>Earnings Overview</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                  <StatCard icon={DollarSign} label="Gross Revenue"  value={earnings?.gross    ? `${(earnings.gross/1e6).toFixed(1)}M`    : '—'} sub="KES" color="var(--gold)" />
                  <StatCard icon={TrendingUp} label="Net Earnings"   value={earnings?.net      ? `${(earnings.net/1e6).toFixed(1)}M`      : '—'} sub="after commission" color="#22c55e" />
                  <StatCard icon={BarChart3}  label="Commission Paid" value={earnings?.commission ? `${(earnings.commission/1e3).toFixed(0)}K` : '—'} sub="KES" color="#ef4444" />
                </div>
                {!earnings && (
                  <div style={{ textAlign: 'center', padding: '40px', background: '#0C0C0C', borderRadius: 16 }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No earnings data yet — complete a sale to see your revenue.</div>
                  </div>
                )}
              </div>
            )}

            {/* ── PACKAGE ── */}
            {tab === 'package' && (
              <div>
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: '0 0 8px' }}>Your Listing Package</h2>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No per-listing fees. Upgrade anytime to list more vehicles and unlock premium placement.</p>
                </div>

                {/* Current package status */}
                <div style={{ background: '#0C0C0C', border: '1px solid rgba(212,196,168,0.18)', borderRadius: 16, padding: '24px', marginBottom: 28 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>Current Plan</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.6rem', color: 'var(--gold)', textTransform: 'capitalize' }}>
                        {user?.dealerPackage || 'No Active Plan'}
                      </div>
                      {user?.packageExpiresAt && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                          Expires: {new Date(user.packageExpiresAt).toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' })}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Listings used</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>
                        {cars.length} / {user?.packageListingMax || (user?.dealerPackage ? '∞' : 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Package upgrade cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                  {[
                    { id: 'starter',    name: 'Starter',    price: 'KES 2,500/mo',  limit: 10,   color: 'rgba(255,255,255,0.6)',  perks: ['3 listings free (30 days)', 'KES 2,500/mo after trial', 'Standard position'] },
                    { id: 'growth',     name: 'Growth',     price: 'KES 6,500/mo',  limit: 30,   color: '#3b82f6',                perks: ['30 listings', 'Priority search', 'Chat support'] },
                    { id: 'elite',      name: 'Elite',      price: 'KES 14,000/mo', limit: 100,  color: 'var(--gold)',            badge: 'Most Popular', perks: ['100 listings', 'Homepage featured', 'Priority search', 'Account manager'] },
                    { id: 'enterprise', name: 'Enterprise', price: 'Custom',        limit: '∞',  color: '#a855f7',                perks: ['Unlimited', 'API access', 'White-label', 'SLA'] },
                  ].map(pkg => {
                    const isCurrent = user?.dealerPackage === pkg.id;
                    return (
                      <div key={pkg.id} style={{ background: '#0C0C0C', border: `1px solid ${isCurrent ? pkg.color + '40' : 'rgba(255,255,255,0.07)'}`, borderRadius: 16, padding: '20px', position: 'relative', overflow: 'hidden' }}>
                        {pkg.badge && <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--gold)', color: '#000', fontSize: 8, fontWeight: 900, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.08em' }}>{pkg.badge}</div>}
                        {isCurrent && <div style={{ position: 'absolute', top: 12, left: 12, background: '#22c55e', color: '#000', fontSize: 8, fontWeight: 900, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.06em' }}>ACTIVE</div>}
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: pkg.color, marginBottom: 8, marginTop: (isCurrent || pkg.badge) ? 22 : 0 }}>{pkg.name}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.2rem', color: '#fff', marginBottom: 4 }}>{pkg.price}</div>
                        <div style={{ fontSize: 11, color: pkg.color, fontWeight: 700, marginBottom: 16 }}>{pkg.limit} listings</div>
                        {pkg.perks.map((p, j) => (
                          <div key={j} style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 5, display: 'flex', gap: 5 }}>
                            <span style={{ color: pkg.color, flexShrink: 0 }}>✓</span>{p}
                          </div>
                        ))}
                        <div style={{ marginTop: 18 }}>
                          {isCurrent ? (
                            <div style={{ padding: '9px', borderRadius: 9, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>Current Plan ✓</div>
                          ) : (
                            <a href="mailto:plans@kayad.space?subject=Package Inquiry" style={{ display: 'block', padding: '9px', borderRadius: 9, background: `${pkg.color}12`, border: `1px solid ${pkg.color}30`, color: pkg.color, fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none', transition: 'all 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = `${pkg.color}22`}
                              onMouseLeave={e => e.currentTarget.style.background = `${pkg.color}12`}
                            >
                              {pkg.id === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 20, padding: '14px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
                  🔒 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>No escrow required for verified dealers.</strong> Contact <a href="mailto:plans@kayad.space" style={{ color: 'var(--gold)', textDecoration: 'none' }}>plans@kayad.space</a> to activate or change your package. Packages are managed by the Kayad team and reflected in your dashboard within 24 hours.
                </div>
              </div>
            )}

            {/* ── TEAM ── */}
            {tab === 'team' && (
              <TeamTab user={user} toast={toast} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
