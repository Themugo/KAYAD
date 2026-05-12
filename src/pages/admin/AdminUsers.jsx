// src/pages/admin/AdminUsers.jsx
import { useState, useEffect, useCallback } from 'react';
import { adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo, formatDate, initials } from '../../utils/helpers';

const ROLE_BADGE  = { user: 'badge-blue', dealer: 'badge-gold', admin: 'badge-red' };
const ROLE_ICON   = { user: '👤', dealer: '🏪', admin: '🔑' };

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter === 'banned') params.banned = true;
      if (statusFilter === 'pending') params.pendingApproval = true;
      const data = await adminAPI.users(params);
      setUsers(data.users || data.data || []);
      setTotal(data.pagination?.total || data.total || 0);
    } catch { toast('Failed to load users', 'error'); }
    finally { setLoading(false); }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleBan = async (u) => {
    const action = u.isBanned ? 'Unban' : 'Ban';
    if (!window.confirm(`${action} ${u.name}?`)) return;
    setActionId(u._id + '-ban');
    try {
      await adminAPI.toggleBan(u._id);
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isBanned: !x.isBanned } : x));
      if (selected?._id === u._id) setSelected(x => ({ ...x, isBanned: !x.isBanned }));
      toast(u.isBanned ? '✅ User unbanned' : '🚫 User banned', 'success');
    } catch { toast('Failed', 'error'); }
    finally { setActionId(null); }
  };

  const handleApprove = async (u) => {
    setActionId(u._id + '-approve');
    try {
      await adminAPI.approveDealer(u._id);
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, approved: true } : x));
      if (selected?._id === u._id) setSelected(x => ({ ...x, approved: true }));
      toast('✅ Dealer approved!', 'success');
    } catch { toast('Failed', 'error'); }
    finally { setActionId(null); }
  };

  const totalPages = Math.ceil(total / 20);
  const pendingCount = users.filter(u => u.role === 'dealer' && !u.approved).length;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>

        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Users <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 400 }}>({total.toLocaleString()} total)</span></h2>
        </div>

        {/* Pending dealers alert */}
        {pendingCount > 0 && (
          <div style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--orange)', fontWeight: 600 }}>⏳ {pendingCount} dealer{pendingCount !== 1 ? 's' : ''} awaiting approval</span>
            <button className="btn btn-outline btn-sm" onClick={() => { setRoleFilter('dealer'); setStatusFilter('pending'); }}>Show Pending</button>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input className="input" placeholder="Search name or email..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: 280 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'user', 'dealer', 'admin'].map(r => (
              <button key={r} className={`btn btn-sm ${roleFilter === r ? 'btn-gold' : 'btn-outline'}`}
                onClick={() => { setRoleFilter(r); setPage(1); }}>
                {ROLE_ICON[r] || '📋'} {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'banned', 'pending'].map(s => (
              <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-outline' : 'btn-ghost'}`}
                style={{ color: statusFilter === s ? 'var(--gold)' : undefined }}
                onClick={() => { setStatusFilter(s); setPage(1); }}>
                {s === 'banned' ? '🚫' : s === 'pending' ? '⏳' : '✓'} {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div className="loading-center" style={{ padding: 48 }}><div className="spinner" /></div>
            ) : users.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-icon">👥</div>
                <h3>No users found</h3>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>User</th><th>Role</th><th>Phone</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} style={{ cursor: 'pointer', background: u.isBanned ? 'rgba(239,68,68,0.02)' : '' }}
                      onClick={() => setSelected(u)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            background: u.isBanned ? 'var(--red)' : 'var(--gold)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, color: '#0A1628', fontWeight: 700,
                          }}>{initials(u.name)}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                            {u.businessName && <div style={{ fontSize: 11, color: 'var(--gold)' }}>{u.businessName}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-muted'}`}>{ROLE_ICON[u.role]} {u.role}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{u.phone || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {u.isBanned && <span className="badge badge-red">🚫 Banned</span>}
                          {u.role === 'dealer' && !u.approved && <span className="badge badge-orange">⏳ Pending</span>}
                          {u.role === 'dealer' &&  u.approved && <span className="badge badge-green">✓ Approved</span>}
                          {!u.isBanned && (u.role !== 'dealer' || u.approved) && !u.isBanned && <span className="badge badge-green">Active</span>}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{u.createdAt ? timeAgo(u.createdAt) : '—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, flexDirection: 'column', minWidth: 110 }}>
                          {u.role === 'dealer' && !u.approved && (
                            <button className="btn btn-gold btn-sm" disabled={actionId === u._id + '-approve'}
                              onClick={() => handleApprove(u)}>
                              {actionId === u._id + '-approve' ? '...' : '✅ Approve'}
                            </button>
                          )}
                          {u.role !== 'admin' && (
                            <button className={`btn btn-sm ${u.isBanned ? 'btn-outline' : 'btn-danger'}`}
                              disabled={actionId === u._id + '-ban'}
                              onClick={() => handleBan(u)}>
                              {actionId === u._id + '-ban' ? '...' : u.isBanned ? '✓ Unban' : '🚫 Ban'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* User detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: selected.isBanned ? 'var(--red)' : 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#0A1628', fontWeight: 700 }}>
                  {initials(selected.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.email}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Role',          val: `${ROLE_ICON[selected.role]} ${selected.role}` },
                { label: 'Status',        val: selected.isBanned ? '🚫 Banned' : '✅ Active' },
                { label: 'Phone',         val: selected.phone || '—', mono: true },
                { label: 'Location',      val: selected.location || '—' },
                { label: 'Business',      val: selected.businessName || '—' },
                { label: 'Joined',        val: selected.createdAt ? formatDate(selected.createdAt) : '—' },
                { label: 'User ID',       val: `#${selected._id?.slice(-10)}`, mono: true },
                { label: 'Dealer Status', val: selected.role === 'dealer' ? (selected.approved ? '✅ Approved' : '⏳ Pending') : 'N/A' },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</div>
                  <div style={{ fontWeight: 600, marginTop: 4, fontSize: 13, fontFamily: r.mono ? 'monospace' : undefined }}>{r.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {selected.role === 'dealer' && !selected.approved && (
                <button className="btn btn-gold" style={{ flex: 1 }}
                  onClick={() => handleApprove(selected)} disabled={actionId === selected._id + '-approve'}>
                  {actionId === selected._id + '-approve' ? '...' : '✅ Approve Dealer'}
                </button>
              )}
              {selected.role !== 'admin' && (
                <button className={`btn ${selected.isBanned ? 'btn-outline' : 'btn-danger'}`} style={{ flex: 1 }}
                  onClick={() => handleBan(selected)} disabled={actionId === selected._id + '-ban'}>
                  {actionId === selected._id + '-ban' ? '...' : selected.isBanned ? '✓ Unban User' : '🚫 Ban User'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
