import { useState, useEffect } from 'react';
import { dealerAPI } from '../../../api/api';
import { useToast } from '../../../context/ToastContext';
import { Search, UserCheck } from 'lucide-react';

export default function DealerCustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dealerAPI.customers?.()
      .then(res => setCustomers(res.customers || res.data || []))
      .catch(() => toast('Failed to load customers', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const filtered = search
    ? customers.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase()))
    : customers;

  return (
    <div className="dealer-page">
      <div className="dealer-page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">Your buyer relationships</p>
          </div>
        </div>

        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'rgba(255,255,255,0.25)' }} />
            <input className="filter-input" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, width: '100%' }} />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><UserCheck size={40} /></div>
            <div className="empty-state-title">No customers yet</div>
            <div className="empty-state-desc">Customers appear after completed transactions</div>
          </div>
        ) : (
          <div className="dealer-table-wrap">
            <table className="dealer-table">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Total Spent</th><th>Last Purchase</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{c.name}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.orderCount || 0}</td>
                    <td style={{ fontWeight: 700 }}>KES {Number(c.totalSpent || 0).toLocaleString()}</td>
                    <td style={{ color: 'rgba(255,255,255,0.4)' }}>{c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
