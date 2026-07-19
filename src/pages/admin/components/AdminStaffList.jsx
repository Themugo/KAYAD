import { Users, Edit3, Trash2 } from 'lucide-react';
import { ORG } from './AdminStaffOrgChart';

export default function AdminStaffList({ staff, loading, isSuperAdmin, onEdit, onToggleBan, onDelete, onShowAdd }) {
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>;
  }

  if (staff.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', background: '#0C0C0C', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
        <Users size={40} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 14 }} />
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No staff accounts yet</div>
        {isSuperAdmin && <button onClick={onShowAdd} style={{ marginTop: 16, padding: '10px 24px', background: 'var(--gold)', border: 'none', borderRadius: 10, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>Add First Staff Member</button>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {staff.map(m => {
        const orgRole = ORG.find(r => r.role === m.role) || { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)', title: m.role, icon: '👤' };
        return (
          <div key={m._id} style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: orgRole.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{orgRole.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{m.name}</span>
                {m.isBanned && <span style={{ fontSize: 9, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontWeight: 700, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.06em' }}>SUSPENDED</span>}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{m.email}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: orgRole.color, padding: '4px 10px', background: orgRole.bg, borderRadius: 6 }}>
              {orgRole.title}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
              {m.lastLogin ? new Date(m.lastLogin).toLocaleDateString('en-KE') : 'Never logged in'}
            </div>
            {isSuperAdmin && m.role !== 'superadmin' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => onEdit(m)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={13} />
                </button>
                <button onClick={() => onToggleBan(m._id, m.isBanned)} style={{ width: 32, height: 32, borderRadius: 8, background: m.isBanned ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${m.isBanned ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`, color: m.isBanned ? '#22c55e' : '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  {m.isBanned ? '↑' : '⊘'}
                </button>
                <button onClick={() => onDelete(m._id, m.name)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
