import { useState, useEffect, useCallback } from 'react';
import { adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';

const STATUS_META = {
  pending:  { label: 'Pending',  icon: '⏳', color: '#f97316' },
  credited: { label: 'Credited', icon: '✅', color: '#22c55e' },
  expired:  { label: 'Expired',  icon: '⌛', color: 'rgba(255,255,255,0.3)' },
};

export default function AdminReferrals() {
  const { toast } = useToast();
  const [tab, setTab] = useState('list');
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [creditAmount, _setCreditAmount] = useState(500);
  const [userTree, setUserTree] = useState(null);
  const [userSearch, setUserSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'stats') {
        const d = await adminAPI.referralStats();
        setStats(d.stats);
      } else if (tab === 'user-tree') {
        if (userSearch) {
          const d = await adminAPI.userReferrals(userSearch);
          setUserTree(d);
        }
      } else {
        const params = { page, limit: 20 };
        if (statusFilter) params.status = statusFilter;
        const d = await adminAPI.referrals(params);
        setReferrals(d.referrals || []);
        setTotal(d.pagination?.total || 0);
      }
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [tab, page, statusFilter, userSearch, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusFilter, tab]);

  const handleCredit = async (id) => {
    if (!window.confirm(`Credit this referral with KES ${creditAmount}?`)) return;
    setActionId(id);
    try {
      await adminAPI.creditReferral(id, { amount: Number(creditAmount) });
      toast('✅ Referral credited', 'success');
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Credit failed', 'error');
    } finally { setActionId(null); }
  };

  const handleExpire = async (id) => {
    if (!window.confirm('Expire this pending referral?')) return;
    setActionId(id);
    try {
      await adminAPI.expireReferral(id);
      toast('⌛ Referral expired', 'success');
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Expire failed', 'error');
    } finally { setActionId(null); }
  };

  const pages = Math.ceil(total / 20);

  return (
    <div style={{ padding: '32px', background: '#050505', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, fontStyle: 'italic' }}> Referral Management</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 6 }}>Referral analytics, payout oversight, and user tree lookup</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {['list', 'stats', 'user-tree'].map(t => (
            <button key={t} onClick={() => { setTab(t); setSelected(null); }}
              className={`btn btn-sm ${tab === t ? 'btn-gold' : 'btn-outline'}`} style={{ fontSize: 11 }}>
              {t === 'list' ? ' All Referrals' : t === 'stats' ? ' Stats' : ' User Tree'}
            </button>
          ))}
        </div>

        {tab === 'stats' && (
          loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
          : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {[
                { label: 'Total Referrals', value: stats.totalReferrals, color: '#3b82f6' },
                { label: 'Pending', value: stats.pendingCount, color: '#f97316' },
                { label: 'Credited', value: stats.creditedCount, color: '#22c55e' },
                { label: 'Expired', value: stats.expiredCount, color: 'rgba(255,255,255,0.4)' },
                { label: 'Total Bonus Paid', value: formatKES(stats.totalBonus), color: 'var(--gold)' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 22 }}>
                  <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          ) : null
        )}

        {tab === 'user-tree' && (
          <div>
            <input placeholder="Enter user ID to look up referral tree…"
              value={userSearch} onChange={e => setUserSearch(e.target.value)}
              style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', marginBottom: 24 }} />
            {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
            : userTree ? (
              <div>
                <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{userTree.user?.name || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>Email: {userTree.user?.email}</div>
                    <div>Referral Code: {userTree.user?.referralCode || '—'}</div>
                    <div>Earnings: {formatKES(userTree.user?.referralEarnings || 0)}</div>
                    <div>Referrals: {userTree.user?.referralCount || 0}</div>
                    <div>Credits: {userTree.user?.credits || 0}</div>
                  </div>
                </div>
                {userTree.referredBy && (
                  <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Referred By</div>
                    <div style={{ fontSize: 13, color: 'var(--gold)' }}>{userTree.referredBy.referrer?.name || '—'} ({userTree.referredBy.referrer?.email || '—'})</div>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>People they referred ({userTree.referred?.length || 0})</div>
                {userTree.referred?.length === 0 ? (
                  <div className="empty-state" style={{ padding: 32 }}><div className="empty-icon">👥</div><h3>No referrals</h3></div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {userTree.referred?.map(r => (
                      <div key={r._id} style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{r.referee?.name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{r.referee?.email} · {new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_META[r.status]?.color || '#fff' }}>{STATUS_META[r.status]?.icon} {STATUS_META[r.status]?.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : userSearch ? <div className="empty-state" style={{ padding: 32 }}><div className="empty-icon">🔍</div><h3>Enter a user ID and press load</h3></div> : null}
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

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
            ) : referrals.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}><div className="empty-icon">👥</div><h3>No referrals found</h3></div>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 12 }}>
                  {referrals.map(r => {
                    const meta = STATUS_META[r.status] || { label: r.status, icon: '👥', color: '#fff' };
                    return (
                      <div key={r._id} style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 22px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                              {r.referrer?.name || 'Unknown'} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>→</span> {r.referee?.name || 'Unknown'}
                            </div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                              {r.referrer?.email} · {r.referee?.email}
                              {r.bonusAmount > 0 && <> · Bonus: {formatKES(r.bonusAmount)}</>}
                              {r.creditedAt && <> · Credited: {new Date(r.creditedAt).toLocaleDateString()}</>}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: meta.color }}>{meta.icon} {meta.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 10 }} onClick={() => setSelected(selected?._id === r._id ? null : r)}>
                            {selected?._id === r._id ? 'Less' : 'Details'}
                          </button>
                          {r.status === 'pending' && (
                            <>
                              {creditAmount > 0 && (
                                <button className="btn btn-gold btn-sm" style={{ fontSize: 10 }} disabled={actionId === r._id} onClick={() => handleCredit(r._id)}>
                                  {actionId === r._id ? '…' : `Credit KES ${creditAmount}`}
                                </button>
                              )}
                              <button className="btn btn-outline btn-sm" style={{ fontSize: 10, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }} disabled={actionId === r._id} onClick={() => handleExpire(r._id)}>
                                {actionId === r._id ? '…' : 'Expire'}
                              </button>
                            </>
                          )}
                        </div>
                        {selected?._id === r._id && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
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
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
                    {Array.from({ length: Math.min(pages, 10) }, (_, i) => (
                      <button key={i} onClick={() => setPage(i + 1)}
                        className={`btn btn-sm ${page === i + 1 ? 'btn-gold' : 'btn-outline'}`}
                        style={{ fontSize: 11 }}>{i + 1}</button>
                    ))}
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