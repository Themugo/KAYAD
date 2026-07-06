import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { Plus } from 'lucide-react';
import AdminStaffOrgChart from './components/AdminStaffOrgChart';
import AdminStaffList from './components/AdminStaffList';
import AdminStaffPermMatrix from './components/AdminStaffPermMatrix';
import AdminStaffCreateModal from './components/AdminStaffCreateModal';
import AdminStaffEditModal from './components/AdminStaffEditModal';

export default function AdminStaff() {
  const { user: me, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [staff,   setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('hierarchy');
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'admin' });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({...p, [k]:v}));

  useEffect(() => {
    adminAPI.getStaff?.().then(d => setStaff(d.staff || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.role) { toast('All fields required', 'error'); return; }
    setSaving(true);
    try {
      const d = await adminAPI.createStaff?.(form);
      setStaff(p => [...p, d.user || { ...form, _id: Date.now(), createdAt: new Date() }]);
      setForm({ name:'', email:'', password:'', role:'admin' });
      setShowAdd(false);
      toast(`Staff account created: ${form.email}`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create staff', 'error');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (id, updates) => {
    try {
      await adminAPI.updateStaff?.(id, updates);
      setStaff(p => p.map(s => s._id === id ? {...s, ...updates} : s));
      setEditMember(null);
      toast('Staff updated', 'success');
    } catch { toast('Failed to update', 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}'s account permanently?`)) return;
    try {
      await adminAPI.deleteStaff?.(id);
      setStaff(p => p.filter(s => s._id !== id));
      toast('Staff account deleted', 'info');
    } catch (err) {
      toast(err.response?.data?.message || 'Cannot delete this account', 'error');
    }
  };

  return (
    <div style={{ background:'#050505', minHeight:'100vh' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'36px 0 0' }}>
        <div style={{ maxWidth:1300, margin:'0 auto', padding:'0 32px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ fontSize:9, color:'var(--gold)', fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:6 }}>Admin Centre</div>
              <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontStyle:'italic', fontSize:'clamp(1.6rem,3vw,2.2rem)', color:'#fff', margin:'0 0 6px' }}>
                Staff <span style={{ color:'var(--gold)' }}>Hierarchy</span>
              </h1>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13, margin:0 }}>
                Manage platform staff, roles and access levels · {staff.length} active staff
              </p>
            </div>
            {isSuperAdmin && (
              <button onClick={() => setShowAdd(true)} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:'var(--gold)', border:'none', borderRadius:10, color:'#000', fontSize:13, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                <Plus size={14}/> Add Staff
              </button>
            )}
          </div>
          <div style={{ display:'flex', gap:2 }}>
            {[{id:'hierarchy', label:'Org Chart'}, {id:'staff', label:'All Staff'}, {id:'permissions', label:'Permission Matrix'}].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:'11px 18px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight: tab===t.id ? 700 : 500, color: tab===t.id ? '#fff' : 'rgba(255,255,255,0.4)', borderBottom:`2px solid ${tab===t.id ? 'var(--gold)' : 'transparent'}`, transition:'all 0.2s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:'0 auto', padding:'32px 32px' }}>

        {tab === 'hierarchy' && (
          <AdminStaffOrgChart staff={staff} isSuperAdmin={isSuperAdmin}
            onAddStaff={(role) => { setForm(p => ({...p, role})); setShowAdd(true); }} />
        )}

        {tab === 'staff' && (
          <AdminStaffList staff={staff} loading={loading} isSuperAdmin={isSuperAdmin}
            onEdit={(m) => setEditMember(m)}
            onToggleBan={(id, isBanned) => handleUpdate(id, { isBanned: !isBanned })}
            onDelete={(id, name) => handleDelete(id, name)}
            onShowAdd={() => setShowAdd(true)} />
        )}

        {tab === 'permissions' && <AdminStaffPermMatrix />}
      </div>

      {showAdd && isSuperAdmin && (
        <AdminStaffCreateModal form={form} set={set} saving={saving}
          onSubmit={handleCreate} onClose={() => setShowAdd(false)} />
      )}

      {editMember && (
        <AdminStaffEditModal member={editMember} setMember={setEditMember}
          onSave={() => handleUpdate(editMember._id, { role: editMember.role })}
          onClose={() => setEditMember(null)} />
      )}
    </div>
  );
}
