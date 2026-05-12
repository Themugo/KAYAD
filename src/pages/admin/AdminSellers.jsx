import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { formatKES } from '../../api/api';

const DEMO_SELLERS = [
  { id: 'demo-dealer-1', businessName: 'Nairobi Auto Hub Ltd', name: 'Peter Kamau', email: 'dealer@demo.com', phone: '254723456789', status: 'approved', createdAt: new Date(Date.now() - 180 * 86400000).toISOString(), commission: 5, waiver: 0, discount: 0, totalSales: 18500000, listingCount: 8, rating: 4.7 },
  { id: 'dealer-coast1', businessName: 'Coast Auto Traders', name: 'Hassan Ali', email: 'hassan@coastauto.co.ke', phone: '254741234567', status: 'approved', createdAt: new Date(Date.now() - 120 * 86400000).toISOString(), commission: 5, waiver: 0, discount: 0, totalSales: 9200000, listingCount: 5, rating: 4.3 },
  { id: 'dealer-nakuru1', businessName: 'Nakuru Auto Deals', name: 'Grace Wanjiku', email: 'grace@nakuruauto.co.ke', phone: '254751234567', status: 'approved', createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), commission: 5, waiver: 15000, discount: 2, totalSales: 2900000, listingCount: 3, rating: 3.9 },
  { id: 'dealer-eldoret1', businessName: 'Eldoret Motors', name: 'Kiprop Rono', email: 'kiprop@eldoretmotors.co.ke', phone: '254761234567', status: 'approved', createdAt: new Date(Date.now() - 45 * 86400000).toISOString(), commission: 5, waiver: 0, discount: 0, totalSales: 3100000, listingCount: 2, rating: 4.0 },
  { id: 'admin-target-2', businessName: 'Omondi Auto Traders', name: 'David Omondi', email: 'david@example.com', phone: '254771234567', status: 'pending', createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), commission: 5, waiver: 0, discount: 0, totalSales: 0, listingCount: 0, rating: 0 },
];

export default function AdminSellers() {
  const { toast } = useToast();
  const [sellers, setSellers] = useState(DEMO_SELLERS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);

  const toggleStatus = (id) => {
    setSellers(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newStatus = s.status === 'approved' ? 'suspended' : s.status === 'pending' ? 'approved' : 'approved';
      toast(`${s.businessName} is now ${newStatus}`, 'success');
      return { ...s, status: newStatus };
    }));
  };

  const updateSeller = (id, field, val) => {
    setSellers(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const saveSeller = (id) => {
    setEditing(null);
    toast('Seller settings saved', 'success');
  };

  const filtered = sellers.filter(s => {
    if (filter === 'pending' && s.status !== 'pending') return false;
    if (filter === 'suspended' && s.status !== 'suspended') return false;
    if (filter === 'approved' && s.status !== 'approved') return false;
    if (search) {
      const q = search.toLowerCase();
      return s.businessName.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="page">
      <div className="container" style={{ padding: '32px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Seller Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage dealers, set commissions, waivers, and discounts per seller</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input className="input" placeholder="Search seller name, business, email..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
          {['all', 'approved', 'pending', 'suspended'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-gold' : 'btn-outline'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Seller</th><th>Contact</th><th>Commission</th>
                  <th>Waiver</th><th>Discount</th><th>Sales</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>No sellers found</div>
                    <div style={{ fontSize: 13 }}>Try adjusting your search or filter</div>
                  </td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(selected?.id === s.id ? null : s)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.businessName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.name} · ⭐ {s.rating}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <div>{s.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.phone}</div>
                    </td>
                    <td>
                      {editing === s.id ? (
                        <input className="input" type="number" min={0} max={50}
                          value={s.commission} onChange={e => updateSeller(s.id, 'commission', Number(e.target.value))}
                          style={{ width: 70, height: 32, fontSize: 13 }}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{s.commission}%</span>
                      )}
                    </td>
                    <td>
                      {editing === s.id ? (
                        <input className="input" type="number" min={0}
                          value={s.waiver} onChange={e => updateSeller(s.id, 'waiver', Number(e.target.value))}
                          style={{ width: 100, height: 32, fontSize: 13 }}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span>{s.waiver > 0 ? formatKES(s.waiver) : '—'}</span>
                      )}
                    </td>
                    <td>
                      {editing === s.id ? (
                        <input className="input" type="number" min={0} max={100}
                          value={s.discount} onChange={e => updateSeller(s.id, 'discount', Number(e.target.value))}
                          style={{ width: 70, height: 32, fontSize: 13 }}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span>{s.discount > 0 ? `${s.discount}%` : '—'}</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--gold-light)' }}>{formatKES(s.totalSales)}</td>
                    <td>
                      <span className={`badge ${s.status === 'approved' ? 'badge-green' : s.status === 'pending' ? 'badge-orange' : 'badge-muted'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {editing === s.id ? (
                          <button className="btn btn-gold btn-sm" onClick={() => saveSeller(s.id)}>Save</button>
                        ) : (
                          <button className="btn btn-outline btn-sm" onClick={() => setEditing(s.id)}>✏ Price</button>
                        )}
                        <button className={`btn btn-sm ${s.status === 'approved' ? 'btn-danger' : 'btn-gold'}`}
                          onClick={() => toggleStatus(s.id)}>
                          {s.status === 'approved' ? 'Suspend' : s.status === 'pending' ? 'Approve' : 'Reinstate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="card" style={{ padding: 24, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>{selected.businessName}</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{selected.name} · {selected.email}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer' }}>✕</button>
            </div>
            <div className="grid-4">
              {[
                { label: 'Commission Rate', val: `${selected.commission}%` },
                { label: 'Fee Waiver', val: selected.waiver > 0 ? formatKES(selected.waiver) : 'None' },
                { label: 'Discount', val: selected.discount > 0 ? `${selected.discount}%` : 'None' },
                { label: 'Total Sales', val: formatKES(selected.totalSales) },
                { label: 'Listings', val: selected.listingCount },
                { label: 'Rating', val: `⭐ ${selected.rating}/5` },
                { label: 'Status', val: selected.status },
                { label: 'Since', val: new Date(selected.createdAt).toLocaleDateString('en-KE') },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{r.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
