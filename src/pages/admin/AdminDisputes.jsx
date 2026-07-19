import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { disputeAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { timeAgo } from '../../utils/helpers';
import { Shield, Search, Filter, BarChart3, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { LoadingPage } from '../../components/LoadingPage';

const STATUS_META = {
  open:          { label: 'Open',           badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '🆕' },
  under_review:  { label: 'Under Review',   badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     icon: '🔍' },
  mediation:     { label: 'Mediation',      badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '🤝' },
  resolved:      { label: 'Resolved',       badge: 'bg-green-500/20 text-green-400 border-green-500/30',   icon: '✅' },
  appealed:      { label: 'Appealed',       badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '🔄' },
  closed:        { label: 'Closed',         badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',     icon: '🔒' },
};

const PRIORITY_COLORS = {
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

  const load = (p = page) => {
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
  };

  useEffect(() => { load(); }, [filter, page]);

  useEffect(() => {
    const offNew = on?.('newDispute', () => load());
    return () => offNew?.();
  }, [on]);

  const filtered = disputes.filter(d => {
    if (search) {
      const q = search.toLowerCase();
      return d.title?.toLowerCase().includes(q) || d._id?.toLowerCase().includes(q) || d.openedBy?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading && disputes.length === 0) return <LoadingPage />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dispute Management</h1>
          <p className="text-sm text-gray-500 mt-1">Enterprise dispute resolution with full state machine workflow</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label: 'Total', count: stats.total, icon: <Shield size={16} />, color: 'text-blue-400' },
            { label: 'Open', count: stats.statusBreakdown?.open || 0, icon: <AlertTriangle size={16} />, color: 'text-yellow-400' },
            { label: 'Review', count: stats.statusBreakdown?.under_review || 0, icon: <Search size={16} />, color: 'text-blue-400' },
            { label: 'Mediation', count: stats.statusBreakdown?.mediation || 0, icon: <Clock size={16} />, color: 'text-purple-400' },
            { label: 'Resolved', count: stats.statusBreakdown?.resolved || 0, icon: <CheckCircle size={16} />, color: 'text-green-400' },
            { label: 'Appealed', count: stats.statusBreakdown?.appealed || 0, icon: <RefreshCw size={16} />, color: 'text-orange-400' },
            { label: 'Evidence Files', count: stats.totalEvidence || 0, icon: <BarChart3 size={16} />, color: 'text-cyan-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-700 rounded-lg p-3">
              <div className={`flex items-center gap-1.5 text-xs ${s.color} mb-1`}>{s.icon} {s.label}</div>
              <p className="text-xl font-bold text-gray-100">{s.count}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          {['all', 'open', 'under_review', 'mediation', 'resolved', 'appealed', 'closed'].map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filter === s ? 'bg-gold text-black' : 'text-gray-400 hover:text-gray-200'}`}>
              {STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Search disputes..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gold" />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-500 uppercase">
                <th className="text-left px-4 py-3 font-medium">Dispute</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Priority</th>
                <th className="text-left px-4 py-3 font-medium">Opened By</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const meta = STATUS_META[d.status] || { label: d.status, badge: 'bg-gray-500/20 text-gray-400', icon: '❓' };
                return (
                  <tr key={d._id} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{meta.icon}</span>
                        <div>
                          <p className="text-gray-200 font-medium truncate max-w-[200px]">{d.title}</p>
                          <p className="text-[10px] text-gray-600 font-mono">{d._id.slice(-8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${meta.badge}`}>{meta.label}</span></td>
                    <td className={`px-4 py-3 text-xs font-medium ${PRIORITY_COLORS[d.priority] || 'text-gray-400'}`}>{d.priority || 'medium'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{d.openedBy?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-gray-200 text-xs">KES {d.amountInDispute?.toLocaleString('en-KE')}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs capitalize">{d.category?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{timeAgo(d.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/disputes/${d._id}`} className="text-xs text-gold hover:text-gold/80">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Shield size={36} className="mx-auto mb-2 text-gray-600" />
            <p className="text-sm">No disputes match your filter</p>
          </div>
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium ${page === p ? 'bg-gold text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
