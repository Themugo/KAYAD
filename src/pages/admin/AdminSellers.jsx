import { useState, useEffect, useCallback } from 'react';
import { adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';

import { X, Search } from 'lucide-react';
export default function AdminSellers() {
  const { toast } = useToast();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Seller Management is the dealer/commercial-account workspace; never fetch every platform user here.
      const roleParam = 'dealer';
      const data = await adminAPI.users({ role: roleParam, search: search || undefined });
      const users = data.users || data.data || [];
      const mapped = users.map(u => ({
        id: u._id,
        businessName: u.businessName || u.name,
        name: u.name,
        email: u.email,
        phone: u.phone || '—',
        status: u.isBanned ? 'suspended' : u.approved ? 'approved' : 'pending',
        commission: u.commission ?? null,
        waiver: u.waiver ?? null,
        discount: u.discount ?? null,
        totalSales: u.totalSales || 0,
        listingCount: u.listingCount || 0,
        rating: u.dealerRating || 0,
        createdAt: u.createdAt,
      }));
      const filtered = filter === 'pending' ? mapped.filter(s => s.status === 'pending')
        : filter === 'suspended' ? mapped.filter(s => s.status === 'suspended')
        : filter === 'approved' ? mapped.filter(s => s.status === 'approved')
        : mapped;
      setSellers(filtered);
    } catch (err) {
      setError(err?.response?.data?.message || 'Seller records could not be loaded. This does not mean there are no sellers. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const toggleStatus = async (id, currentStatus) => {
    if (updatingStatus) return;
    setUpdatingStatus(id);
    try {
      if (currentStatus === 'pending') {
        await adminAPI.approveDealer(id);
        toast('Dealer approved', 'success');
      } else {
        await adminAPI.toggleBan(id);
        toast(currentStatus === 'approved' ? 'Seller suspended' : 'Seller reinstated', 'success');
      }
      fetchSellers();
    } catch {
      toast('Failed to update seller status. The server did not confirm the change.', 'error');
      await fetchSellers();
    } finally {
      setUpdatingStatus(null);
    }
  };

  const updateSeller = (id, field, val) => {
    setSellers(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const saveSeller = async (id) => {
    const seller = sellers.find(s => s.id === id);
    if (!seller || saving) return;
    const commission = Number(seller.commission);
    const waiver = Number(seller.waiver ?? 0);
    const discount = Number(seller.discount ?? 0);
    if (!Number.isFinite(commission) || commission < 0 || commission > 50 ||
        !Number.isFinite(waiver) || waiver < 0 ||
        !Number.isFinite(discount) || discount < 0 || discount > 100) {
      toast('Enter a valid commission (0–50%), non-negative waiver and discount (0–100%).', 'error');
      return;
    }
    setSaving(true);
    try {
      await adminAPI.updateSellerSettings(id, {
        commission,
        waiver,
        discount,
      });
      setEditing(null);
      toast('Seller settings saved', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to save seller settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ padding: '32px 24px' }}>
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="section-eyebrow">Business Operations / Sellers</div>
            <h2 style={{ margin: '6px 0 8px', letterSpacing: '-0.025em' }}>Seller Management</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 680, lineHeight: 1.6, margin: 0 }}>
              Manage dealer relationships, commercial terms and account status. Changes are saved to the existing seller record.
            </p>
          </div>
          <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 12, padding: '10px 14px', minWidth: 140 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Current results</div>
            <div style={{ fontSize: 23, fontWeight: 700, marginTop: 3 }}>{loading ? '—' : sellers.length}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loaded records only</div>
          </div>
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ position: 'relative', flex: '1 1 280px', maxWidth: 440 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}><Search size={16} aria-hidden="true" /></span>
            <input className="input" aria-label="Search sellers" placeholder="Search seller, business or email..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: 36 }} />
          </label>
          <div role="group" aria-label="Filter sellers by status" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'approved', 'pending', 'suspended'].map(f => (
              <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                className={`btn btn-sm ${filter === f ? 'btn-gold' : 'btn-outline'}`}>
                {f === 'all' ? 'All sellers' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div role="alert" className="card" style={{ borderColor: 'var(--danger, #b45309)', padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Seller records unavailable</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{error}</div>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={fetchSellers} disabled={loading}>Retry</button>
          </div>
        )}

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
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading sellers...</td></tr>
                ) : error ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Seller records are unavailable. Retry to load the authoritative list.</td></tr>
                ) : sellers.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 44, color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: 10, display: 'inline-flex', padding: 12, borderRadius: 12, background: 'var(--surface)' }}><Search size={24} aria-hidden="true" /></div>
                    <div style={{ fontWeight: 650, marginBottom: 5, color: 'var(--text)' }}>No sellers found</div>
                    <div style={{ fontSize: 13 }}>No records match the current search and status filter.</div>
                    {(search || filter !== 'all') && <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</button>}
                  </td></tr>
                ) : sellers.map(s => (
                  <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(selected?.id === s.id ? null : s)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.businessName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.name} · Rating {s.rating}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <div>{s.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.phone}</div>
                    </td>
                    <td>
                      {editing === s.id ? (
                        <input className="input" type="number" min={0} max={50}
                          value={s.commission ?? ''} onChange={e => updateSeller(s.id, 'commission', Number(e.target.value))}
                          style={{ width: 70, height: 32, fontSize: 13 }}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{s.commission == null ? 'Not set' : `${s.commission}%`}</span>
                      )}
                    </td>
                    <td>
                      {editing === s.id ? (
                        <input className="input" type="number" min={0}
                          value={s.waiver ?? ''} onChange={e => updateSeller(s.id, 'waiver', Number(e.target.value))}
                          style={{ width: 100, height: 32, fontSize: 13 }}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span>{s.waiver > 0 ? formatKES(s.waiver) : s.waiver == null ? 'Not set' : '—'}</span>
                      )}
                    </td>
                    <td>
                      {editing === s.id ? (
                        <input className="input" type="number" min={0} max={100}
                          value={s.discount ?? ''} onChange={e => updateSeller(s.id, 'discount', Number(e.target.value))}
                          style={{ width: 70, height: 32, fontSize: 13 }}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span>{s.discount > 0 ? `${s.discount}%` : s.discount == null ? 'Not set' : '—'}</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--brand-light)' }}>{formatKES(s.totalSales)}</td>
                    <td>
                      <span className={`badge ${s.status === 'approved' ? 'badge-green' : s.status === 'pending' ? 'badge-orange' : 'badge-muted'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {editing === s.id ? (
                          <button className="btn btn-gold btn-sm" disabled={saving} onClick={() => saveSeller(s.id)}>{saving ? 'Saving…' : 'Save'}</button>
                        ) : (
                          <button className="btn btn-outline btn-sm" onClick={() => setEditing(s.id)}>Price</button>
                        )}
                        <button disabled={updatingStatus === s.id} className={`btn btn-sm ${s.status === 'approved' ? 'btn-danger' : 'btn-gold'}`}
                          onClick={() => toggleStatus(s.id, s.status)}>
                          {updatingStatus === s.id ? 'Updating…' : s.status === 'approved' ? 'Suspend' : s.status === 'pending' ? 'Approve' : 'Reinstate'}
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
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer' }} aria-label="Close" title="Close"><X size={16} aria-hidden="true" /></button>
            </div>
            <div className="grid-4">
              {[
                { label: 'Commission Rate', val: `${selected.commission}%` },
                { label: 'Fee Waiver', val: selected.waiver > 0 ? formatKES(selected.waiver) : 'None' },
                { label: 'Discount', val: selected.discount > 0 ? `${selected.discount}%` : 'None' },
                { label: 'Total Sales', val: formatKES(selected.totalSales) },
                { label: 'Listings', val: selected.listingCount },
                { label: 'Rating', val: `${selected.rating}/5` },
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
