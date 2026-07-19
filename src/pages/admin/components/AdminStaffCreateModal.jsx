import { useState } from 'react';
import { ORG } from './AdminStaffOrgChart';

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function SI({ value, onChange, placeholder, type = 'text' }) {
  const [f, setF] = useState(false);
  const [v, setV] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input type={type === 'password' && v ? 'text' : type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: type === 'password' ? '10px 40px 10px 12px' : '10px 12px', borderRadius: 9, border: `1px solid ${f ? 'rgba(212,196,168,0.4)' : 'rgba(255,255,255,0.09)'}`, background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
        onFocus={() => setF(true)} onBlur={() => setF(false)} />
      {type === 'password' && (
        <button type="button" onClick={() => setV(x => !x)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
          {v ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  );
}

import { Eye, EyeOff } from 'lucide-react';

const creatableRoles = ORG.filter(r => r.canCreate !== false && r.role !== 'superadmin').map(r => r.role);

export default function AdminStaffCreateModal({ form, set, saving, onSubmit, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 32, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.3rem', color: '#fff', margin: 0 }}>Add Staff Member</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <Field label="Full Name"><SI value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Wanjiku" /></Field>
          <Field label="Email Address"><SI type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@kayad.space" /></Field>
          <Field label="Temporary Password"><SI type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 characters" /></Field>
          <Field label="Role">
            <select value={form.role} onChange={e => set('role', e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: '#0a0a0a', color: '#fff', fontSize: 13, outline: 'none' }}>
              {creatableRoles.map(r => {
                const org = ORG.find(o => o.role === r);
                return <option key={r} value={r} style={{ background: '#111' }}>{org?.icon} {org?.title || r}</option>;
              })}
            </select>
          </Field>
          {form.role && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {ORG.find(o => o.role === form.role)?.desc}
            </div>
          )}
          <button type="submit" disabled={saving} style={{ width: '100%', padding: '13px', background: 'var(--gold)', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 900, cursor: saving ? 'wait' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {saving ? 'Creating…' : 'Create Staff Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
