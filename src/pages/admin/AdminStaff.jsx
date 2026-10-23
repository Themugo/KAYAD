import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Search, RefreshCw, ShieldAlert, Users, LockKeyhole } from 'lucide-react';
import AdminStaffOrgChart from './components/AdminStaffOrgChart';
import AdminStaffList from './components/AdminStaffList';
import AdminStaffPermMatrix from './components/AdminStaffPermMatrix';
import AdminStaffCreateModal from './components/AdminStaffCreateModal';
import AdminStaffEditModal from './components/AdminStaffEditModal';

const STAFF_ROLES = ['admin', 'marketing', 'technical_support', 'hr', 'accounts', 'escrow_officer', 'ad_manager', 'moderator', 'ghost_checker'];
// Keep account creation aligned with POST /api/admin/staff. ghost_checker remains
// a supported catalog/edit role, but the current create endpoint deliberately excludes it.
const CREATABLE_STAFF_ROLES = STAFF_ROLES.filter(role => role !== 'ghost_checker');

export default function AdminStaff() {
  const { user: me } = useAuth();
  const isSystemOwner = me?.isOwner === true;
  const { toast } = useToast();
  const [staff, setStaff] = useState([]);
  const [roleCatalog, setRoleCatalog] = useState(STAFF_ROLES.map(role => ({ role, permissions: [] }))); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('directory');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' });
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const loadStaff = useCallback(async ({ quiet = false } = {}) => {
    const id = ++requestId.current;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const d = await adminAPI.getStaff();
      if (id !== requestId.current) return;
      setStaff(Array.isArray(d.staff) ? d.staff : []);
    } catch (err) {
      if (id !== requestId.current) return;
      const message = err?.response?.data?.message || 'Staff directory could not be loaded. Your changes have not been assumed.';
      setError(message);
      toast(message, 'error');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isSystemOwner) {
      loadStaff();
      adminAPI.getStaffRoleCatalog().then(result => { if (Array.isArray(result.roles)) setRoleCatalog(result.roles); }).catch(err => { toast(err?.response?.data?.message || 'Canonical role catalog unavailable; role changes must be verified by the backend.', 'error'); });
    } else setLoading(false);
    return () => { requestId.current += 1; };
  }, [isSystemOwner, loadStaff, toast]);

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter(member => {
      const matchesQuery = !q || [member.name, member.email, member.role].some(value => String(value || '').toLowerCase().includes(q));
      const matchesRole = roleFilter === 'all' || member.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'suspended' ? member.isBanned === true : member.isBanned !== true);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [staff, query, roleFilter, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email || !form.password || !form.role) { toast('Complete all required fields.', 'error'); return; }
    if (name.length > 120 || form.password.length < 12 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('Use a valid email, a name up to 120 characters, and an initial password of at least 12 characters.', 'error'); return;
    }
    if (!CREATABLE_STAFF_ROLES.includes(form.role)) { toast('Select a staff role supported by the account-creation endpoint.', 'error'); return; }
    const reason = window.prompt('Reason for creating this staff account (recorded in the audit trail):');
    if (!reason?.trim()) { toast('A reason is required; no staff account was created.', 'info'); return; }
    if (!window.confirm(`Create a ${form.role.replaceAll('_', ' ')} account for ${email}? This uses the existing initial-password endpoint, not an email invitation.`)) return;
    setSaving(true);
    try {
      await adminAPI.createStaff({ name, email, password: form.password, role: form.role, reason: reason.trim().slice(0, 500) });
      setForm({ name: '', email: '', password: '', role: 'admin' });
      setShowAdd(false);
      toast('Staff account created. The initial password was not displayed or logged.', 'success');
      await loadStaff({ quiet: true });
    } catch (err) {
      toast(err?.response?.data?.message || 'Staff account could not be created.', 'error');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (id, updates) => {
    const current = staff.find(s => s._id === id);
    if (!current) return;
    const nextRole = updates.role ?? current.role;
    const nextBanned = updates.isBanned ?? current.isBanned === true;
    const changes = [];
    if (updates.name && updates.name !== current.name) changes.push(`name: ${current.name} → ${updates.name}`);
    if (nextRole !== current.role) changes.push(`role: ${current.role} → ${nextRole}`);
    if (nextBanned !== (current.isBanned === true)) changes.push(`access: ${nextBanned ? 'suspend' : 'restore'}`);
    if (!changes.length) { setEditMember(null); return; }
    if (current.role === 'superadmin' || current.isOwner === true) { toast('System Owner / Super Admin identity cannot be changed through staff editing.', 'error'); return; }
    const reason = window.prompt(`Reason for changing access for ${current.email} (recorded in the audit trail):`);
    if (!reason?.trim()) { toast('A reason is required; no staff changes were made.', 'info'); return; }
    if (!window.confirm(`Confirm staff access change for ${current.email}?\n\n${changes.join('\n')}\n\nThis action will be sent to the server and audited.`)) return;
    setSaving(true);
    try {
      await adminAPI.updateStaff(id, { ...(updates.name !== undefined ? { name: updates.name } : {}), ...(updates.role !== undefined ? { role: updates.role } : {}), ...(updates.isBanned !== undefined ? { isBanned: updates.isBanned } : {}), reason: reason.trim().slice(0, 500) });
      setEditMember(null);
      toast('Staff record updated.', 'success');
      await loadStaff({ quiet: true });
    } catch (err) {
      toast(err?.response?.data?.message || 'Staff record could not be updated.', 'error');
    } finally { setSaving(false); }
  };

  if (!isSystemOwner) return <div role="alert" style={{ maxWidth: 760, margin: '48px auto', padding: 28, background: '#fff', border: '1px solid #dbe7e8', borderRadius: 16, color: '#0a3340' }}><LockKeyhole size={32} /><h2>System Owner governance</h2><p>Only a verified active System Owner can manage staff records and permissions. This page-level check is not a substitute for backend authorization.</p></div>;

  return (
    <main style={{ maxWidth: 1320, minWidth: 0, margin: '0 auto', padding: '24px clamp(12px, 3vw, 32px)', color: '#0a3340' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div><div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.14em', color: '#176b87' }}>System Owner · Access governance</div><h1 style={{ fontSize: 'clamp(24px, 3vw, 34px)', margin: '8px 0' }}>Staff directory & access</h1><p style={{ margin: 0, color: '#64748b', maxWidth: 720 }}>Manage existing staff identities, supported roles, suspensions and permission assignments. Role labels describe access policy; they do not certify a separate HR, accounting or sales subsystem.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" onClick={() => loadStaff()} disabled={loading} style={buttonStyle('secondary')}><RefreshCw size={15} /> Refresh</button><button type="button" onClick={() => setShowAdd(true)} style={buttonStyle('primary')}><Plus size={16} /> Create staff account</button></div>
      </header>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {[['directory', 'Staff directory'], ['hierarchy', 'Role overview'], ['permissions', 'Permission matrix']].map(([key, label]) => <button type="button" key={key} onClick={() => setTab(key)} aria-pressed={tab === key} style={{ ...buttonStyle(tab === key ? 'primary' : 'secondary'), background: tab === key ? '#0a3340' : '#fff', color: tab === key ? '#fff' : '#0a3340' }}>{label}</button>)}
      </div>
      {error && <div role="alert" style={{ padding: 12, marginBottom: 16, borderRadius: 10, border: '1px solid #fecaca', background: '#fff1f2', color: '#9f1239' }}><ShieldAlert size={16} style={{ display: 'inline', marginRight: 8 }} />{error}</div>}
      {tab === 'directory' && <>
        <section aria-label="Staff filters" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, padding: 14, marginBottom: 16, border: '1px solid #dbe7e8', borderRadius: 14, background: '#fff' }}>
          <label style={labelStyle}>Search staff<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, email or role" style={inputStyle} /></label>
          <label style={labelStyle}>Role<select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={inputStyle}><option value="all">All roles</option>{roleCatalog.map(({ role }) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></label>
          <label style={labelStyle}>Account status<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}><option value="all">All statuses</option><option value="active">Not suspended</option><option value="suspended">Suspended</option></select></label>
          <div style={{ alignSelf: 'end', color: '#64748b', fontSize: 13, padding: '10px 0' }}><Users size={15} style={{ display: 'inline', marginRight: 6 }} />{filteredStaff.length} of {staff.length} staff</div>
        </section>
        {loading ? <div role="status" style={{ padding: 48, textAlign: 'center' }}>Loading staff records…</div> : <AdminStaffList staff={filteredStaff} loading={false} isSuperAdmin onEdit={setEditMember} onToggleBan={(id, banned) => handleUpdate(id, { isBanned: !banned })} onShowAdd={() => setShowAdd(true)} />}
        <p style={{ color: '#64748b', fontSize: 12, marginTop: 12 }}>Department assignment and email invitations are not currently represented by verified backend contracts. This directory does not fabricate either capability. “Suspended” maps to the existing `isBanned` field.</p>
      </>}
      {tab === 'hierarchy' && <AdminStaffOrgChart staff={staff} isSuperAdmin onAddStaff={(role) => { setForm(p => ({ ...p, role })); setShowAdd(true); }} />}
      {tab === 'permissions' && <AdminStaffPermMatrix />}
      {showAdd && <AdminStaffCreateModal form={form} set={set} roles={roleCatalog} saving={saving} onSubmit={handleCreate} onClose={() => !saving && setShowAdd(false)} />}
      {editMember && <AdminStaffEditModal member={editMember} setMember={setEditMember} roles={roleCatalog} saving={saving} onSave={() => handleUpdate(editMember._id, { name: editMember.name, role: editMember.role })} onClose={() => !saving && setEditMember(null)} />}
    </main>
  );
}

function buttonStyle(kind) { return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: kind === 'primary' ? '1px solid #0a3340' : '1px solid #dbe7e8', background: kind === 'primary' ? '#0a3340' : '#fff', color: kind === 'primary' ? '#fff' : '#0a3340', fontWeight: 700, fontSize: 13, cursor: 'pointer' }; }
const labelStyle = { display: 'grid', gap: 6, color: '#475569', fontSize: 12, fontWeight: 700 };
const inputStyle = { width: '100%', minWidth: 0, padding: '10px 11px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#0a3340', fontSize: 13 };
