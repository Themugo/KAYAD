import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import AdminLoadNotice from '../../components/admin/AdminLoadNotice';
import { approvalEligibility, describeDealerDecisionError, isReasonValid, DEALER_REASON_MIN } from '../../utils/dealerDecision';

import { X, Search } from 'lucide-react';
export default function AdminSellers() {
  const { toast } = useToast();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const [lastSuccessAt, setLastSuccessAt] = useState(null);
  const loadedKeyRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [approving, setApproving] = useState(null); // { id, label } while the reason is being entered
  const [approveReason, setApproveReason] = useState('');
  const [decisionError, setDecisionError] = useState('');

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const queryKey = JSON.stringify([page, search.trim(), filter]);
    try {
      // Seller Management is the dealer/commercial-account workspace; never fetch every platform user here.
      // Status tabs are answered by the server so a dealer beyond the first page can never make a queue look empty.
      const params = { role: 'dealer', page, limit: 20, search: search.trim() || undefined };
      // Buyers who applied to sell on their existing account (still role "user" until approved).
      if (filter === 'applicants') { delete params.role; params.dealerApplicants = true; }
      if (filter === 'pending') params.status = 'pending';
      else if (filter === 'approved') params.status = 'approved';
      else if (filter === 'suspended') params.banned = true;
      const data = await adminAPI.users(params);
      const users = data?.users ?? data?.data;
      if (!Array.isArray(users)) throw new Error('The server returned an unexpected seller-list response.');
      const reportedTotal = Number(data?.pagination?.total ?? data?.total);
      const mapped = users.map(u => ({
        id: u._id,
        businessName: u.businessName || u.name,
        name: u.name,
        email: u.email,
        phone: u.phone || '—',
        status: u.isBanned ? 'suspended' : u.dealerApplicant ? (u.application?.dealerApproved ? 'approved' : 'pending') : u.approved ? 'approved' : 'pending',
        commission: u.commission ?? null,
        waiver: u.waiver ?? null,
        discount: u.discount ?? null,
        totalSales: u.totalSales ?? null,
        listingCount: u.listingCount ?? null,
        rating: u.dealerRating ?? null,
        createdAt: u.createdAt,
        application: u.application ?? null, // what the server says the application still lacks; null = could not be inspected
        role: u.role,
        applicant: u.dealerApplicant === true,
      }));
      setSellers(mapped);
      setTotal(Number.isFinite(reportedTotal) ? reportedTotal : mapped.length);
      setLastSuccessAt(new Date());
      loadedKeyRef.current = queryKey;
    } catch (err) {
      setError(err || new Error('Seller records could not be loaded.'));
      // Rows are kept (and labelled stale) only when they answer the same search/status/page; another query's rows are never relabelled.
      if (loadedKeyRef.current !== queryKey) { setSellers([]); setTotal(null); }
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const startApprove = (s) => { setDecisionError(''); setApproveReason(''); setApproving({ id: s.id, label: s.businessName || s.name }); };

  // Approval is confirmed by the SERVER: the list is re-read afterwards and the row changes only if the server now reports it approved.
  const confirmApprove = async () => {
    if (!approving || updatingStatus) return;
    if (!isReasonValid(approveReason)) { setDecisionError(`State the reason for approving this dealer (at least ${DEALER_REASON_MIN} characters).`); return; }
    setUpdatingStatus(approving.id);
    setDecisionError('');
    try {
      const out = await adminAPI.approveDealer(approving.id, { reason: approveReason.trim() });
      toast(out?.changed === false ? 'Already approved — nothing was changed.' : 'Dealer approved — confirmed by the server.', 'success');
      setApproving(null); setApproveReason('');
    } catch (err) {
      // The original state is untouched on a refusal; show exactly what the server said.
      setDecisionError(describeDealerDecisionError(err, 'The server did not approve this dealer. Nothing was changed.'));
    } finally {
      setUpdatingStatus(null);
      await fetchSellers();
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    if (updatingStatus) return;
    setUpdatingStatus(id);
    try {
      await adminAPI.toggleBan(id);
      toast(currentStatus === 'approved' ? 'Seller suspended' : 'Seller reinstated', 'success');
      fetchSellers();
    } catch (err) {
      toast(describeDealerDecisionError(err, 'Failed to update seller status. The server did not confirm the change.'), 'error');
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
            <div style={{ fontSize: 23, fontWeight: 700, marginTop: 3 }}>{total === null || (loading && sellers.length === 0) ? '—' : total.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{total === null ? 'Count unavailable' : 'Matching sellers (server count)'}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ position: 'relative', flex: '1 1 280px', maxWidth: 440 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}><Search size={16} aria-hidden="true" /></span>
            <input className="input" aria-label="Search sellers" placeholder="Search seller, business or email..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: 36 }} />
          </label>
          <button type="button" className="btn btn-sm btn-outline" onClick={fetchSellers} disabled={loading} aria-label="Refresh sellers">{loading ? 'Refreshing…' : '↻ Refresh'}</button>
          <div role="group" aria-label="Filter sellers by status" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'approved', 'pending', 'applicants', 'suspended'].map(f => (
              <button key={f} type="button" onClick={() => { setFilter(f); setPage(1); }} aria-pressed={filter === f}
                className={`btn btn-sm ${filter === f ? 'btn-gold' : 'btn-outline'}`}>
                {f === 'all' ? 'All sellers' : f === 'applicants' ? 'Buyer applicants' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <AdminLoadNotice error={error} subject="Seller records" hasData={sellers.length > 0} lastSuccessAt={lastSuccessAt} onRetry={fetchSellers} retrying={loading} />

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
                {loading && sellers.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading sellers...</td></tr>
                ) : error && sellers.length === 0 ? (
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
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.name} · Rating {s.rating ?? 'not reported'}</div>
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
                    <td style={{ fontWeight: 600, color: 'var(--brand-light)' }}>{s.totalSales === null ? 'Not reported' : formatKES(s.totalSales)}</td>
                    <td>
                      <span className={`badge ${s.status === 'approved' ? 'badge-green' : s.status === 'pending' ? 'badge-orange' : 'badge-muted'}`}>
                        {s.status}
                      </span>
                      {s.status === 'pending' && (s.role === 'dealer' || s.applicant) && (() => {
                        const el = approvalEligibility(s.application);
                        if (el.state === 'blocked') return <div role="note" style={{ fontSize: 11, color: '#92400e', marginTop: 6, maxWidth: 260 }}>Cannot be approved yet: {el.reasons.join(' ')}</div>;
                        if (el.state === 'unknown') return <div role="note" style={{ fontSize: 11, color: '#64748b', marginTop: 6, maxWidth: 260 }}>Application completeness could not be checked; the server will validate on approval.</div>;
                        return null;
                      })()}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {editing === s.id ? (
                          <button className="btn btn-gold btn-sm" disabled={saving} onClick={() => saveSeller(s.id)}>{saving ? 'Saving…' : 'Save'}</button>
                        ) : (
                          <button className="btn btn-outline btn-sm" onClick={() => setEditing(s.id)}>Price</button>
                        )}
                        <button disabled={updatingStatus === s.id || (s.status === 'pending' && (s.role === 'dealer' || s.applicant) && approvalEligibility(s.application).state === 'blocked')}
                          className={`btn btn-sm ${s.status === 'approved' ? 'btn-danger' : 'btn-gold'}`}
                          onClick={() => (s.status === 'pending' ? startApprove(s) : toggleStatus(s.id, s.status))}>
                          {updatingStatus === s.id ? 'Updating…' : s.status === 'approved' ? 'Suspend' : s.status === 'pending' ? 'Approve' : 'Reinstate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>{total === null ? 'Total unavailable' : `${total.toLocaleString()} matching sellers`}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" className="btn btn-sm btn-outline" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>← Previous</button>
              <span aria-current="page">Page {page}</span>
              <button type="button" className="btn btn-sm btn-outline" disabled={loading || total === null || page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        </div>

        {approving && (
          <div className="card" role="dialog" aria-label="Confirm dealer approval" style={{ padding: 20, marginTop: 20 }}>
            <h3 style={{ marginBottom: 6 }}>Approve {approving.label}?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>The reason is recorded in the audit log. The dealer can list vehicles once the server confirms the approval.</p>
            <label htmlFor="approve-reason" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Reason (required, at least {DEALER_REASON_MIN} characters)</label>
            <input id="approve-reason" className="input" value={approveReason} maxLength={300} onChange={(e) => setApproveReason(e.target.value)} style={{ width: '100%', maxWidth: 560 }} />
            {decisionError && <div role="alert" style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(185,28,28,0.06)', color: '#b91c1c', fontSize: 13 }}>{decisionError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" className="btn btn-gold btn-sm" disabled={!!updatingStatus || !isReasonValid(approveReason)} onClick={confirmApprove}>{updatingStatus ? 'Approving…' : 'Confirm approval'}</button>
              <button type="button" className="btn btn-outline btn-sm" disabled={!!updatingStatus} onClick={() => { setApproving(null); setDecisionError(''); }}>Cancel</button>
            </div>
          </div>
        )}

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
                { label: 'Total Sales', val: selected.totalSales === null ? 'Not reported' : formatKES(selected.totalSales) },
                { label: 'Listings', val: selected.listingCount ?? 'Not reported' },
                { label: 'Rating', val: selected.rating === null ? 'Not reported' : `${selected.rating}/5` },
                { label: 'Status', val: selected.status },
                { label: 'Since', val: new Date(selected.createdAt).toLocaleDateString('en-KE') },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{r.val}</div>
                </div>
              ))}
            </div>
            {selected.application?.paperwork && (
              <div style={{ marginTop: 20 }} data-testid="paperwork-state">
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Paperwork (against current requirements)</div>
                <div style={{ fontSize: 13 }}>Supplied: {selected.application.paperwork.supplied?.length ? selected.application.paperwork.supplied.join(', ') : 'none'}</div>
                <div style={{ fontSize: 13 }}>Required and missing: {selected.application.paperwork.requiredMissing?.length ? selected.application.paperwork.requiredMissing.join(', ') : 'none — nothing blocks approval'}</div>
                <div style={{ fontSize: 13 }}>Optional, not supplied: {selected.application.paperwork.optionalMissing?.length ? selected.application.paperwork.optionalMissing.join(', ') : 'none'}</div>
              </div>
            )}
            {selected.applicant && <div role="note" style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>This person is an existing buyer applying on the same account. Approving makes them a dealer; their buyer history is kept.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
