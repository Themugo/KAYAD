import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { disputeAPI, formatKES } from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { timeAgo } from '../utils/helpers';
import { Shield, AlertTriangle, Plus, Search, Filter } from 'lucide-react';
import { LoadingPage } from '../components/LoadingPage';

const STATUS_META = {
  open:          { label: 'Open',           badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '🆕' },
  under_review:  { label: 'Under Review',   badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     icon: '🔍' },
  mediation:     { label: 'Mediation',      badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '🤝' },
  resolved:      { label: 'Resolved',       badge: 'bg-green-500/20 text-green-400 border-green-500/30',   icon: '✅' },
  appealed:      { label: 'Appealed',       badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '🔄' },
  closed:        { label: 'Closed',         badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',     icon: '🔒' },
};

const CATEGORY_LABELS = {
  condition_mismatch: 'Condition Mismatch',
  delivery_issue:     'Delivery Issue',
  payment_dispute:    'Payment Dispute',
  fraud:              'Fraud',
  other:              'Other',
};

export default function DisputesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { on } = useSocket();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    disputeAPI.my()
      .then(d => setDisputes(d.disputes || d.data || []))
      .catch(err => toast(err?.response?.data?.message || 'Failed to load disputes', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const off = on?.('disputeUpdate', (data) => {
      setDisputes(prev => prev.map(d => d._id === data.disputeId ? { ...d, status: data.status } : d));
    });
    return () => off?.();
  }, [on]);

  const filtered = disputes.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.title?.toLowerCase().includes(q) && !d._id?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) return <LoadingPage />;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px', background: '#0a0a0a', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 36, position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
          opacity: 0.5,
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={24} style={{ color: '#0A1628' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
              Dispute Center
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              My Disputes
            </h1>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 12, maxWidth: 600, lineHeight: 1.6 }}>
          Track and manage your disputes with full transparency and real-time updates
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
          {['all', 'open', 'under_review', 'mediation', 'resolved', 'appealed', 'closed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: filter === s ? 'var(--gold)' : 'transparent',
                color: filter === s ? '#0A1628' : 'rgba(255,255,255,0.5)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (filter !== s) e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { if (filter !== s) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              {STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input type="text" placeholder="Search disputes..." value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 36, paddingRight: 12, padding: '10px 12px 10px 36px',
              borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 13, outline: 'none', transition: 'all 0.2s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <Shield size={32} style={{ color: 'var(--gold)' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No disputes found</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Go to your escrows to open a dispute if needed</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(d => {
            const meta = STATUS_META[d.status] || { label: d.status, badge: 'bg-gray-500/20 text-gray-400', icon: '❓' };
            const statusColor = d.status === 'open' ? '#F59E0B' : d.status === 'under_review' ? '#3B82F6' : d.status === 'mediation' ? '#8B5CF6' : d.status === 'resolved' ? '#22C55E' : d.status === 'appealed' ? '#F97316' : '#6B7280';
            return (
              <Link key={d._id} to={`/disputes/${d._id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.02)', padding: 16,
                  transition: 'all 0.2s', cursor: 'pointer',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 20 }}>{meta.icon}</span>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</h3>
                        <span style={{
                          padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700,
                          background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40`,
                        }}>{meta.label}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                        <span>{CATEGORY_LABELS[d.category] || d.category}</span>
                        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>KES {d.amountInDispute?.toLocaleString('en-KE')}</span>
                        <span>{timeAgo(d.createdAt)}</span>
                        {d.evidenceCount > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Shield size={12} /> {d.evidenceCount} file{d.evidenceCount !== 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
