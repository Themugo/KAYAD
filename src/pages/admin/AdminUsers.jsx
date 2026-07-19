import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo, formatDate, initials } from '../../utils/helpers';
import { AdminUserRow } from '../../components/AdminTableRow';
import { Button, Badge, SpinnerPage, Pagination } from '../../components/ui';

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

  const handleBan = useCallback(async (u) => {
    const action = u.isBanned ? 'Unban' : 'Ban';
    if (!window.confirm(`${action} ${u.name}?`)) return;
    setActionId(u._id + '-ban');
    try {
      await adminAPI.toggleBan(u._id);
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isBanned: !x.isBanned } : x));
      if (selected?._id === u._id) setSelected(prev => prev ? { ...prev, isBanned: !prev.isBanned } : prev);
      toast(u.isBanned ? '✅ User unbanned' : '🚫 User banned', 'success');
    } catch { toast('Failed', 'error'); }
    finally { setActionId(null); }
  }, [selected, toast]);

  const handleApprove = useCallback(async (u) => {
    setActionId(u._id + '-app');
    try {
      await adminAPI.approveDealer(u._id);
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, approved: true } : x));
      toast('✅ Dealer approved', 'success');
    } catch { toast('Failed', 'error'); }
    finally { setActionId(null); }
  }, [toast]);

  const filteredStats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.role === 'admin' || u.role === 'superadmin').length;
    const dealers = users.filter(u => u.role === 'dealer').length;
    const banned = users.filter(u => u.is_banned).length;
    const pending = users.filter(u => u.role === 'dealer' && !u.approved).length;
    return { total, admins, dealers, banned, pending };
  }, [users]);

  if (loading) return <SpinnerPage label="Loading users..." />;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <h2 style={{ marginBottom: 24 }}>👥 User Management</h2>

        <div className="stat-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Users', value: filteredStats.total, color: 'var(--gold)' },
            { label: 'Admins', value: filteredStats.admins, color: 'var(--red-400)' },
            { label: 'Dealers', value: filteredStats.dealers, color: 'var(--gold)' },
            { label: 'Banned', value: filteredStats.banned, color: 'var(--red-500)' },
            { label: 'Pending Approval', value: filteredStats.pending, color: 'var(--orange-400)' },
          ].map(s => (
            <div key={s.label} className="stat-box" style={{ textAlign: 'center', padding: 16 }}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="data-table-controls" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input" placeholder="🔍 Search users..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: '1 1 260px', maxWidth: 360 }} aria-label="Search users" />
          <select className="input" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            style={{ width: 'auto' }} aria-label="Filter by role">
            <option value="all">All Roles</option>
            <option value="user">Users</option>
            <option value="dealer">Dealers</option>
            <option value="admin">Admins</option>
          </select>
          <select className="input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ width: 'auto' }} aria-label="Filter by status">
            <option value="all">All Status</option>
            <option value="pending">Pending Approval</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Status</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <AdminUserRow
                  key={u._id}
                  user={u}
                  onBan={handleBan}
                  onApprove={handleApprove}
                  onSelect={setSelected}
                  actionId={actionId}
                  selected={selected}
                />
              ))}
              {users.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>{total} total users</span>
          <Pagination page={page} totalPages={Math.ceil(total / 20)} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
