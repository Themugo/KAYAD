import { useState, useEffect } from 'react';
import { dealerAPI } from '../../../api/api';
import { useToast } from '../../../context/ToastContext';
import { ShoppingCart, Search } from 'lucide-react';
import { timeAgo, StatusBadge } from '../components/DashboardWidgets';

export default function DealerOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    dealerAPI.orders?.()
      .then(res => setOrders(res.orders || res.data || []))
      .catch(() => toast('Failed to load orders', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => {
    if (filter && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (o.carTitle || o.car?.title || '').toLowerCase().includes(q)
        || (o.buyerName || o.buyer?.name || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="dealer-page">
      <div className="dealer-page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Orders</h1>
            <p className="page-subtitle">Track purchase orders and deal progress</p>
          </div>
        </div>

        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'rgba(255,255,255,0.25)' }} />
            <input className="filter-input" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, width: '100%' }} />
          </div>
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ShoppingCart size={40} /></div>
            <div className="empty-state-title">No orders yet</div>
            <div className="empty-state-desc">Orders appear when a buyer makes a purchase or a bid is accepted</div>
          </div>
        ) : (
          <div className="dealer-table-wrap">
            <table className="dealer-table">
              <thead>
                <tr>
                  <th>Order</th><th>Buyer</th><th>Vehicle</th><th>Amount</th><th>Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 700, color: '#fff' }}>#{o._id?.slice(-6)}</td>
                    <td>{o.buyerName || o.buyer?.name || '—'}</td>
                    <td>{o.carTitle || o.car?.title || '—'}</td>
                    <td style={{ fontWeight: 700 }}>KES {Number(o.amount || o.price || 0).toLocaleString()}</td>
                    <td style={{ color: 'rgba(255,255,255,0.4)' }}>{timeAgo(o.createdAt)}</td>
                    <td><StatusBadge status={o.status || 'pending'} /></td>
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
