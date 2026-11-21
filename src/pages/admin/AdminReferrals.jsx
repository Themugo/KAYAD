import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';

import { Clock, CheckCircle2, Users, Search, Hourglass } from 'lucide-react';
const STATUS_META = {
  pending:  { label: 'Pending',  icon: Clock, color: '#176b87' },
  credited: { label: 'Credited', icon: CheckCircle2, color: '#22c55e' },
  expired:  { label: 'Expired',  icon: Hourglass, color: 'var(--admin-muted-content)' },
};

export default function AdminReferrals() {
  const { toast } = useToast();
  const [tab, setTab] = useState('list');
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [creditAmount, setCreditAmount] = useState('500');
  const [userTree, setUserTree] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [submittedUserSearch, setSubmittedUserSearch] = useState('');

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError('');
    try {
      if (tab === 'stats') {
        const d = await adminAPI.referralStats();
        if (!d || !d.stats || typeof d.stats !== 'object') throw new Error('Unexpected referral statistics response');
        if (requestId === requestSequence.current) setStats(d.stats);
      } else if (tab === 'user-tree') {
        if (!submittedUserSearch) {
          if (requestId === requestSequence.current) setUserTree(null);
          return;
        }
        const d = await adminAPI.userReferrals(submittedUserSearch);
        if (!d || !d.user || !Array.isArray(d.referred)) throw new Error('Unexpected referral tree response');
        if (requestId === requestSequence.current) setUserTree(d);
      } else {
        const params = { page, limit: 20 };
        if (statusFilter) params.status = statusFilter;
        const d = await adminAPI.referrals(params);
        if (!d || !Array.isArray(d.referrals) || !d.pagination || !Number.isFinite(Number(d.pagination.total))) {
          throw new Error('Unexpected referrals response');
        }
        if (requestId === requestSequence.current) {
          setReferrals(d.referrals);
          setTotal(Number(d.pagination.total));
        }
      }
    } catch (err) {
      if (requestId === requestSequence.current) {
        setError(err.response?.data?.message || err.message || 'Referral records could not be loaded. Existing decisions have not been changed.');
        toast(err.response?.data?.message || 'Referral records could not be loaded', 'error');
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [tab, page, statusFilter, submittedUserSearch, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); setSelected(null); }, [statusFilter, tab]);

  const handleCredit = async (id) => {
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast('Enter a valid positive credit amount', 'error'); return; }
    if (!window.confirm(`Credit this referral with KES ${amount}? This changes the referrer balance and creates a transaction record.`)) return;
    setActionId(id);
    try {
      await adminAPI.creditReferral(id, { amount });
      toast('Referral credited', 'success');
      await load();
    } catch (err) {
      toast(err.response?.data?.message || 'Credit failed. Check the referral and transaction records before retrying.', 'error');
    } finally { setActionId(null); }
  };

  const handleExpire = async (id) => {
    if (!window.confirm('Expire this pending referral?')) return;
    setActionId(id);
    try {
      await adminAPI.expireReferral(id);
      toast('Referral expired', 'success');
      await load();
    } catch (err) {
      toast(err.response?.data?.message || 'Expire failed', 'error');
    } finally { setActionId(null); }
  };

  const pages = Math.ceil(total / 20);

  return (
    <div style={{ padding: '32px', background: '#f6faf9', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, fontStyle: 'italic' }}> Referral Management</h2>
          <p style={{ color: 'var(--admin-muted-content)', fontSize: 13, marginTop: 6 }}>Referral analytics, payout oversight, and user tree lookup</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {['list', 'stats', 'user-tree'].map(t => (
            <button key={t} onClick={() => { setTab(t); setSelected(null); }}
              className={`btn btn-sm ${tab === t ? 'btn-gold' : 'btn-outline'}`} style={{ fontSize: 11 }}>
              {t === 'list' ? ' All Referrals' : t === 'stats' ? ' Stats' : ' User Tree'}
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 16px', marginBottom: 18, border: '1px solid rgba(220,38,38,.22)', borderRadius: 10, background: '#fff7f7', color: '#991b1b', fontSize: 13 }}>
            <span>{error}</span>
            <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>{loading ? 'Retrying…' : 'Retry loading'}</button>
          </div>
        )}

        {tab === 'stats' && (
          loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
          : stats && !error ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {[
                { label: 'Total Referrals', value: stats.totalReferrals, color: '#176B87' },
                { label: 'Pending', value: stats.pendingCount, color: '#176b87' },
                { label: 'Credited', value: stats.creditedCount, color: '#22c55e' },
                { label: 'Expired', value: stats.expiredCount, color: 'var(--admin-muted-content)' },
                { label: 'Total Bonus Paid', value: formatKES(stats.totalBonus), color: 'var(--brand)' },
              ].map(s => (
                <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid rgba(10, 51, 64, 0.07)', borderRadius: 14, padding: 22 }}>
                  <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--admin-muted-content)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          ) : !error ? <div className="empty-state" style={{ padding: 32 }}><h3>Statistics unavailable</h3></div> : null
        )}

        {tab === 'user-tree' && (
          <div>
            <form onSubmit={e => { e.preventDefault(); setUserTree(null); setSubmittedUserSearch(userSearch.trim()); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              <input placeholder="Enter user ID to look up referral tree…"
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                aria-label="User ID for referral tree"
                style={{ width: '100%', maxWidth: 400, background: 'rgba(10, 51, 64, 0.04)', border: '1px solid rgba(10, 51, 64, 0.1)', borderRadius: 8, padding: '10px 14px', color: '#0a3340', fontSize: 13, outline: 'none' }} />
              <button className="btn btn-gold btn-sm" type="submit" disabled={loading || !userSearch.trim()}>{loading ? 'Loading…' : 'Load referral tree'}</button>
            </form>
            {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
            : userTree ? (
              <div>
                <div style={{ background: '#FFFFFF', border: '1px solid rgba(10, 51, 64, 0.07)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0a3340', marginBottom: 8 }}>{userTree.user?.name || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'var(--admin-muted-content)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>Email: {userTree.user?.email}</div>
                    <div>Referral Code: {userTree.user?.referralCode || '—'}</div>
                    <div>Earnings: {Number.isFinite(userTree.user?.referralEarnings) ? formatKES(userTree.user.referralEarnings) : 'Unavailable'}</div>
                    <div>Referrals: {Number.isFinite(userTree.user?.referralCount) ? userTree.user.referralCount : 'Unavailable'}</div>
                    <div>Credits: {Number.isFinite(userTree.user?.credits) ? userTree.user.credits : 'Unavailable'}</div>
                  </div>
                </div>
                {userTree.referredBy && (
                  <div style={{ background: '#FFFFFF', border: '1px solid rgba(10, 51, 64, 0.07)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--admin-muted-content)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Referred By</div>
                    <div style={{ fontSize: 13, color: 'var(--brand)' }}>{userTree.referredBy.referrer?.name || '—'} ({userTree.referredBy.referrer?.email || '—'})</div>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--admin-muted-content)', marginBottom: 12 }}>People they referred ({userTree.referred?.length || 0})</div>
                {userTree.referred?.length === 0 ? (
                  <div className="empty-state" style={{ padding: 32 }}><div className="empty-icon"><Users size={32} aria-hidden="true" /></div><h3>No referrals</h3></div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {userTree.referred?.map(r => (
                      <div key={r._id || r.id} style={{ background: '#FFFFFF', border: '1px solid rgba(10, 51, 64, 0.07)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, color: '#0a3340', fontWeight: 600 }}>{r.referee?.name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--admin-muted-content)' }}>{r.referee?.email} · {new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_META[r.status]?.color || '#fff' }}>{(() => { const I = STATUS_META[r.status]?.icon; return I ? <I size={12} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} /> : null; })()}{STATUS_META[r.status]?.label || r.status || 'Unknown'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : !submittedUserSearch ? <div className="empty-state" style={{ padding: 32 }}><div className="empty-icon"><Search size={32} aria-hidden="true" /></div><h3>Enter a user ID and load the referral tree</h3></div> : error ? null : <div className="empty-state" style={{ padding: 32 }}><h3>No referral tree data available</h3></div>}
          </div>
        )}

        {tab === 'list' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {['', 'pending', 'credited', 'expired'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`btn btn-sm ${statusFilter === s ? 'btn-gold' : 'btn-outline'}`} style={{ fontSize: 11 }}>
                  {s || 'All'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--admin-muted-content)', marginBottom: 10 }}>{total} referral records · Page {page}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16, fontSize: 12, color: 'var(--admin-muted-content)' }}>
              <label htmlFor="referral-credit-amount">Manual credit amount (KES)</label>
              <input id="referral-credit-amount" type="number" min="0.01" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} style={{ width: 140, padding: '8px 10px', border: '1px solid rgba(10,51,64,.15)', borderRadius: 8, background: '#fff', color: '#0a3340' }} />
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
            ) : error ? null : referrals.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}><div className="empty-icon"><Users size={32} aria-hidden="true" /></div><h3>No referrals found</h3></div>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 12 }}>
                  {referrals.map(r => {
                    const referralId = r._id || r.id;
                    const meta = STATUS_META[r.status] || { label: r.status || 'Unknown', icon: Users, color: '#0a3340' };
                    return (
                      <div key={referralId || `${r.referrer?.email || 'referrer'}-${r.referee?.email || 'referee'}-${r.createdAt || ''}`} style={{ background: '#FFFFFF', border: '1px solid rgba(10, 51, 64, 0.07)', borderRadius: 14, padding: '18px 22px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0a3340', marginBottom: 4 }}>
                              {r.referrer?.name || 'Unknown'} <span style={{ color: 'var(--admin-muted-content)', fontWeight: 400 }}>→</span> {r.referee?.name || 'Unknown'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--admin-muted-content)' }}>
                              {r.referrer?.email} · {r.referee?.email}
                              {r.bonusAmount > 0 && <> · Bonus: {formatKES(r.bonusAmount)}</>}
                              {r.creditedAt && <> · Credited: {new Date(r.creditedAt).toLocaleDateString()}</>}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: meta.color }}><meta.icon size={12} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />{meta.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 10 }} onClick={() => setSelected((selected?._id || selected?.id) === referralId ? null : r)}>
                            {(selected?._id || selected?.id) === referralId ? 'Less' : 'Details'}
                          </button>
                          {r.status === 'pending' && (
                            <>
                              {Number.isFinite(Number(creditAmount)) && Number(creditAmount) > 0 && (
                                <button className="btn btn-gold btn-sm" style={{ fontSize: 10 }} disabled={actionId !== null || !referralId} onClick={() => handleCredit(referralId)}>
                                  {actionId === (r._id || r.id) ? '…' : `Credit KES ${creditAmount}`}
                                </button>
                              )}
                              <button className="btn btn-outline btn-sm" style={{ fontSize: 10, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }} disabled={actionId !== null || !referralId} onClick={() => handleExpire(referralId)}>
                                {actionId === (r._id || r.id) ? '…' : 'Expire'}
                              </button>
                            </>
                          )}
                        </div>
                        {(selected?._id || selected?.id) === referralId && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(10, 51, 64, 0.06)', fontSize: 11, color: 'var(--admin-muted-content)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            <div>Referrer Code: {r.referrer?.referralCode || '—'}</div>
                            <div>Referrer ID: {r.referrer?._id}</div>
                            <div>Referee ID: {r.referee?._id}</div>
                            <div>Created: {new Date(r.createdAt).toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {pages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
                    <span style={{ fontSize: 12, color: 'var(--admin-muted-content)' }}>Page {page} of {pages} · {total} referrals</span>
                    <button className="btn btn-outline btn-sm" disabled={page >= pages || loading} onClick={() => setPage(p => Math.min(pages, p + 1))}>Next</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
