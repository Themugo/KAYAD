import { ORG } from './AdminStaffOrgChart';

const creatableRoles = ORG.filter(r => r.canCreate !== false && r.role !== 'superadmin').map(r => r.role);

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

export default function AdminStaffEditModal({ member, setMember, onSave, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose} role="presentation">
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 32, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()} role="presentation">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.2rem', color: '#fff', margin: 0 }}>Edit: {member.name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <Field label="Change Role">
          <select defaultValue={member.role}
            onChange={e => setMember(p => ({ ...p, role: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: '#0a0a0a', color: '#fff', fontSize: 13, outline: 'none' }}>
            {creatableRoles.map(r => {
              const org = ORG.find(o => o.role === r);
              return <option key={r} value={r} style={{ background: '#111' }}>{org?.icon} {org?.title || r}</option>;
            })}
          </select>
        </Field>
        <button onClick={onSave} style={{ width: '100%', padding: '12px', background: 'var(--gold)', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Save Changes
        </button>
      </div>
    </div>
  );
}
