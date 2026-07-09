import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { disputeAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { timeAgo } from '../../utils/helpers';
import { Shield, Search, BarChart3, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { LoadingPage } from '../../components/LoadingPage';

const STATUS_META = {
  open:          { label: 'Open',           badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '🆕' },
  under_review:  { label: 'Under Review',   badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     icon: '🔍' },
  mediation:     { label: 'Mediation',      badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '🤝' },
  resolved:      { label: 'Resolved',       badge: 'bg-green-500/20 text-green-400 border-green-500/30',   icon: '✅' },
  appealed:      { label: 'Appealed',       badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '🔄' },
  closed:        { label: 'Closed',         badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',     icon: '🔒' },
};

const _PRIORITY_COLORS = {
  urgent: 'text-red-400',
  high:   'text-orange-400',
  medium: 'text-yellow-400',
  low:    'text-gray-400',
};

export default function AdminDisputes() {
  const { toast } = useToast();
  const { on } = useSocket();
  const [disputes, setDisputes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const load = useCallback((p = page) => {
    setLoading(true);
    const params = { page: p, limit: 20 };
    if (filter !== 'all') params.status = filter;
    Promise.all([
      disputeAPI.all(params),
      disputeAPI.stats().catch(() => null),
    ])
      .then(([d, s]) => {
        setDisputes(d.disputes || d.data || []);
        setPagination(d.pagination);
        setStats(s?.stats || s);
      })
      .catch(err => toast(err?.response?.data?.message || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [filter, page, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const offNew = on?.('newDispute', () => load());
    return () => offNew?.();
  }, [on, load]);

  const filtered = disputes.filter(d => {
    if (search) {
      const q = search.toLowerCase();
      return d.title?.toLowerCase().includes(q) || d._id?.toLowerCase().includes(q) || d.openedBy?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading && disputes.length === 0) return <LoadingPage />;

  return (
    <div style={{ padding: '40px 28px', maxWidth: 1400, margin: '0 auto', background: '#0a0a0a', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 36, position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
          opacity: 0.5,
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={24} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
                Admin Hub
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                Dispute Management
              </h1>
            </div>
          </div>
          <button onClick={() => load()} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
            borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(212,196,168,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 12, maxWidth: 600, lineHeight: 1.6 }}>
          Enterprise dispute resolution with full state machine workflow and real-time updates
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 32 }}>
          {[
            { label: 'Total', count: stats.total, icon: <Shield size={16} />, color: '#3B82F6' },
            { label: 'Open', count: stats.statusBreakdown?.open || 0, icon: <AlertTriangle size={16} />, color: '#F59E0B' },
            { label: 'Review', count: stats.statusBreakdown?.under_review || 0, icon: <Search size={16} />, color: '#3B82F6' },
            { label: 'Mediation', count: stats.statusBreakdown?.mediation || 0, icon: <Clock size={16} />, color: '#8B5CF6' },
            { label: 'Resolved', count: stats.statusBreakdown?.resolved || 0, icon: <CheckCircle size={16} />, color: '#22C55E' },
            { label: 'Appealed', count: stats.statusBreakdown?.appealed || 0, icon: <RefreshCw size={16} />, color: '#F97316' },
            { label: 'Evidence Files', count: stats.totalEvidence || 0, icon: <BarChart3 size={16} />, color: '#06B6D4' },
          ].map(s => (
            <div key={s.label} style={{
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)', padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: s.color, fontWeight: 600, marginBottom: 8 }}>
                {s.icon} {s.label}
              </div>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>{s.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
          {['all', 'open', 'under_review', 'mediation', 'resolved', 'appealed', 'closed'].map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(1); }}
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

      {/* Table */}
      <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Dispute', 'Status', 'Priority', 'Opened By', 'Amount', 'Category', 'Created', 'Action'].map((th, _i) => (
                  <th key={th} style={{
                    textAlign: 'left', padding: '16px', fontSize: 11, fontWeight: 700,
                    color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>{th}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const meta = STATUS_META[d.status] || { label: d.status, badge: 'bg-gray-500/20 text-gray-400', icon: '❓' };
                const statusColor = d.status === 'open' ? '#F59E0B' : d.status === 'under_review' ? '#3B82F6' : d.status === 'mediation' ? '#8B5CF6' : d.status === 'resolved' ? '#22C55E' : d.status === 'appealed' ? '#F97316' : '#6B7280';
                const priorityColor = d.priority === 'urgent' ? '#EF4444' : d.priority === 'high' ? '#F97316' : d.priority === 'medium' ? '#F59E0B' : '#6B7280';
                return (
                  <tr key={d._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{meta.icon}</span>
                        <div>
                          <p style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, margin: '0 0 4px 0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', margin: 0 }}>{d._id.slice(-8)}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: 16 }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700,
                        background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40`,
                      }}>{meta.label}</span>
                    </td>
                    <td style={{ padding: 16, fontSize: 12, fontWeight: 600, color: priorityColor }}>{d.priority || 'medium'}</td>
                    <td style={{ padding: 16, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{d.openedBy?.name || 'Unknown'}</td>
                    <td style={{ padding: 16, color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600 }}>KES {d.amountInDispute?.toLocaleString('en-KE')}</td>
                    <td style={{ padding: 16, color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'capitalize' }}>{d.category?.replace('_', ' ')}</td>
                    <td style={{ padding: 16, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{timeAgo(d.createdAt)}</td>
                    <td style={{ padding: 16, textAlign: 'right' }}>
                      <Link to={`/admin/disputes/${d._id}`} style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Shield size={24} style={{ color: 'var(--gold)' }} />
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No disputes match your filter</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              style={{
                width: 40, height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: page === p ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                color: page === p ? '#0A1628' : 'rgba(255,255,255,0.5)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (page !== p) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (page !== p) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
