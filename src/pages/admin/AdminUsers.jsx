import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { formatDate, initials } from '../../utils/helpers';

const ROLE_BADGE = { user: 'badge-blue', dealer: 'badge-gold', admin: 'badge-red', superadmin: 'badge-red', webhoist: 'badge-red', individual_seller: 'badge-blue' };
const isBanned = (u) => Boolean(u.isBanned ?? u.is_banned);
const getStatus = (u) => {
  if (isBanned(u)) return { label: 'Banned', className: 'badge-red' };
  if (u.status === 'rejected') return { label: 'Rejected', className: 'badge-red' };
  if (u.status === 'pending' || (u.role === 'dealer' && !u.approved)) return { label: 'Pending approval', className: 'badge-orange' };
  return { label: 'Active', className: 'badge-green' };
};

function UserRow({ user: u, onBan, onApprove, actionId }) {
  const banned = isBanned(u);
  const needsApproval = u.role === 'dealer' && (u.status === 'pending' || u.approved === false);
  const status = getStatus(u);
  return (
    <tr>
      <td><span className="kayad-user-avatar" aria-hidden="true">{initials(u.name || u.email || '?')}</span></td>
      <td>
        <div className="kayad-user-name">{u.name || 'Name unavailable'}</div>
        <div className="kayad-user-subtle">{u.location || 'Location not provided'}</div>
      </td>
      <td className="kayad-user-email">{u.email || '—'}</td>
      <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-muted'}`}>{(u.role || 'user').replaceAll('_', ' ')}</span></td>
      <td>{u.phone || '—'}</td>
      <td>{u.createdAt || u.created_at ? formatDate(u.createdAt || u.created_at) : '—'}</td>
      <td><span className={`badge ${status.className}`}>{status.label}</span></td>
      <td>
        <div className="kayad-user-row-actions">
          {needsApproval && (
            <button type="button" className="btn btn-sm btn-primary" disabled={actionId === `${u._id}-app`} onClick={() => onApprove(u)}>
              {actionId === `${u._id}-app` ? 'Approving…' : 'Approve'}
            </button>
          )}
          <button type="button" className="btn btn-sm btn-outline" disabled={actionId === `${u._id}-ban`} onClick={() => onBan(u)}>
            {actionId === `${u._id}-ban` ? 'Saving…' : banned ? 'Unban' : 'Ban'}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const [summary, setSummary] = useState(null);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter === 'banned') params.banned = true;
      if (statusFilter === 'pending') params.pendingApproval = true;
      const data = await adminAPI.users(params);
      const rows = data?.users ?? data?.data;
      if (!Array.isArray(rows)) throw new Error('The server returned an unexpected user-list response.');
      setUsers(rows);
      setTotal(Number.isFinite(Number(data?.pagination?.total ?? data?.total)) ? Number(data?.pagination?.total ?? data?.total) : rows.length);
      setSummary(data?.summary && typeof data.summary === 'object' ? data.summary : null);
      setHasLoaded(true);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'User records could not be loaded. Please retry.';
      setLoadError(message);
      setSummary(null);
      setTotal(null);
      toast('Could not load users. Existing records have not been changed.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter, toast]);

  useEffect(() => { load(); }, [load]);

  const handleBan = useCallback(async (u) => {
    const currentBanned = isBanned(u);
    const action = currentBanned ? 'Unban' : 'Ban';
    if (!window.confirm(`${action} ${u.name || u.email || 'this user'}?`)) return;
    setActionId(`${u._id}-ban`);
    try {
      const res = await adminAPI.toggleBan(u._id, !currentBanned);
      const confirmed = typeof res?.isBanned === 'boolean' ? res.isBanned : typeof res?.user?.isBanned === 'boolean' ? res.user.isBanned : null;
      if (confirmed === null) {
        await load();
        toast('Ban request returned no confirmed status. The list has been refreshed.', 'error');
        return;
      }
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isBanned: confirmed, is_banned: confirmed } : x));
      setSummary(prev => prev ? { ...prev, banned: Math.max(0, Number(prev.banned || 0) + (confirmed === currentBanned ? 0 : confirmed ? 1 : -1)) } : prev);
      toast(confirmed ? 'User banned' : 'User unbanned', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Could not change the ban status. No success was assumed.', 'error');
    } finally {
      setActionId(null);
    }
  }, [load, toast]);

  const handleApprove = useCallback(async (u) => {
    setActionId(`${u._id}-app`);
    try {
      await adminAPI.approveDealer(u._id);
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, approved: true, status: 'approved' } : x));
      setSummary(prev => prev ? { ...prev, pendingApproval: Math.max(0, Number(prev.pendingApproval || 0) - 1) } : prev);
      toast('Dealer approval saved', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Dealer approval failed. No change was assumed.', 'error');
    } finally {
      setActionId(null);
    }
  }, [toast]);

  const stats = [
    { label: 'Total users', value: summary?.totalUsers, note: 'All accounts', tone: 'brand', mark: 'U' },
    { label: 'Administrators', value: summary?.admins, note: 'Privileged roles', tone: 'purple', mark: 'A' },
    { label: 'Dealers', value: summary?.dealers, note: 'Dealer accounts', tone: 'blue', mark: 'D' },
    { label: 'Banned', value: summary?.banned, note: 'Restricted accounts', tone: 'danger', mark: '!' },
    { label: 'Pending approval', value: summary?.pendingApproval, note: 'Dealer and seller queue', tone: 'warning', mark: '…' },
  ];

  if (loading && !hasLoaded) {
    return <div className="page loading-center" role="status" aria-live="polite"><div className="spinner" /><span>Loading user management…</span></div>;
  }

  return (
    <div className="page kayad-users-page">
      <div className="kayad-users-heading">
        <div>
          <div className="section-eyebrow">Business operations</div>
          <h1>User Management</h1>
          <p>Review accounts, monitor access status and manage user actions from one workspace.</p>
        </div>
        <button type="button" className="btn btn-outline kayad-users-refresh" onClick={load} disabled={loading}>
          <span aria-hidden="true">↻</span> {loading ? 'Refreshing…' : 'Refresh records'}
        </button>
      </div>

      <div className="kayad-users-stat-grid" aria-label="User account summary">
        {stats.map(s => (
          <section className={`kayad-users-stat kayad-users-stat--${s.tone}`} key={s.label}>
            <div className="kayad-users-stat-top"><span>{s.label}</span><span className="kayad-users-stat-mark" aria-hidden="true">{s.mark}</span></div>
            <div className="kayad-users-stat-value">{Number.isFinite(Number(s.value)) && s.value !== null && s.value !== undefined ? Number(s.value).toLocaleString() : '—'}</div>
            <div className="kayad-users-stat-note">{s.note}</div>
          </section>
        ))}
      </div>

      {loadError && (
        <div className="kayad-users-error" role="alert">
          <div><strong>User records could not be refreshed.</strong><p>{loadError}</p><span>Summary values are not replaced with zero when the server is unavailable.</span></div>
          <button type="button" className="btn btn-outline" onClick={load} disabled={loading}>{loading ? 'Retrying…' : 'Retry'}</button>
        </div>
      )}

      <section className="kayad-users-workspace" aria-label="User records">
        <div className="kayad-users-workspace-heading">
          <div><h2>Accounts</h2><p>Search, filter and review account access.</p></div>
          <span className="kayad-users-record-count">{total === null ? 'Count unavailable' : `${total.toLocaleString()} matching ${total === 1 ? 'account' : 'accounts'}`}</span>
        </div>
        <div className="data-table-controls kayad-users-filters">
          <label className="kayad-users-search"><span className="kayad-users-search-icon" aria-hidden="true">⌕</span><input className="input" placeholder="Search name or email" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} aria-label="Search users by name or email" /></label>
          <label className="kayad-users-filter"><span>Role</span><select className="input" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} aria-label="Filter by role"><option value="all">All roles</option><option value="user">Users</option><option value="dealer">Dealers</option><option value="individual_seller">Private sellers</option><option value="admin">Admins</option><option value="superadmin">Super Admins</option></select></label>
          <label className="kayad-users-filter"><span>Status</span><select className="input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Filter by status"><option value="all">All statuses</option><option value="pending">Pending approval</option><option value="banned">Banned</option></select></label>
        </div>

        <div className="data-table kayad-users-table-wrap" aria-busy={loading}>
          <table>
            <thead><tr><th aria-label="Avatar" className="kayad-users-avatar-col"></th><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading && hasLoaded && <tr><td colSpan={8} className="kayad-users-table-message">Refreshing account records…</td></tr>}
              {!loading && !loadError && users.map(u => <UserRow key={u._id} user={u} onBan={handleBan} onApprove={handleApprove} actionId={actionId} />)}
              {!loading && !loadError && users.length === 0 && <tr><td colSpan={8} className="kayad-users-empty"><span className="kayad-users-empty-icon" aria-hidden="true">⌕</span><strong>{search || roleFilter !== 'all' || statusFilter !== 'all' ? 'No matching accounts' : 'No user records returned'}</strong><span>{search || roleFilter !== 'all' || statusFilter !== 'all' ? 'Try changing the search or filters.' : 'The request succeeded, but the server returned an empty user list.'}</span></td></tr>}
              {loadError && <tr><td colSpan={8} className="kayad-users-table-message">The table is unavailable until user records can be retrieved.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="kayad-users-pagination">
          <span>{total === null ? 'Total unavailable' : `${total.toLocaleString()} total matching accounts`}</span>
          <div className="kayad-users-page-controls">
            <button className="btn btn-sm btn-outline" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>← Previous</button>
            <span aria-current="page">Page {page}</span>
            <button className="btn btn-sm btn-outline" disabled={loading || total === null || page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </section>
    </div>
  );
}
