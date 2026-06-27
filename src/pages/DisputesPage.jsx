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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Disputes</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage your disputes</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          {['all', 'open', 'under_review', 'mediation', 'resolved', 'appealed', 'closed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
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

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Shield size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No disputes found</p>
          <p className="text-gray-600 text-sm mt-2">Go to your escrows to open a dispute if needed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const meta = STATUS_META[d.status] || { label: d.status, badge: 'bg-gray-500/20 text-gray-400', icon: '❓' };
            return (
              <Link key={d._id} to={`/disputes/${d._id}`}
                className="block bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{meta.icon}</span>
                      <h3 className="text-sm font-semibold text-gray-200 truncate">{d.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${meta.badge}`}>{meta.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{d.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      <span>{CATEGORY_LABELS[d.category] || d.category}</span>
                      <span>KES {d.amountInDispute?.toLocaleString('en-KE')}</span>
                      <span>{timeAgo(d.createdAt)}</span>
                      {d.evidenceCount > 0 && <span>{d.evidenceCount} file{d.evidenceCount !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <span className="text-gray-600 group-hover:text-gray-400 transition">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
