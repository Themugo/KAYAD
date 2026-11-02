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
        style={{ width: '100%', padding: type === 'password' ? '10px 40px 10px 12px' : '10px 12px', borderRadius: 9, border: `1px solid ${f ? 'rgba(23, 107, 135, 0.4)' : 'rgba(255,255,255,0.09)'}`, background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
        onFocus={() => setF(true)} onBlur={() => setF(false)} />
      {type === 'password' && (
        <button type="button" onClick={() => setV(x => !x)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
          {v ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  );
}

import { Eye, EyeOff, X } from 'lucide-react';


export default function AdminStaffCreateModal({ form, set, roles = [], levels = [], emailDomain = '', requireCompanyEmail = false, saving, onSubmit, onClose }) {
  const level = String(form.role || '').startsWith('level:') ? levels.find(l => `level:${l.key}` === form.role) : null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 51, 64, 0.8)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose} role="presentation">
      <div style={{ background: '#0a3340', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 32, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()} role="presentation">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.3rem', color: '#fff', margin: 0 }}>Add Staff Member</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20 }} aria-label="Close" title="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        <form onSubmit={onSubmit}>
          <Field label="Full Name"><SI value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Wanjiku" /></Field>
          <Field label={emailDomain ? `Company email (type the name, or a full address)` : 'Email Address'}>
            <SI type={emailDomain ? 'text' : 'email'} value={form.email} onChange={e => set('email', e.target.value)} placeholder={emailDomain ? `jane` : 'jane@kayad.space'} />
            {emailDomain && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>{form.email && !form.email.includes('@') ? `Will be created as ${form.email.trim().toLowerCase()}@${emailDomain}` : `Company domain: @${emailDomain}${requireCompanyEmail ? ' (required)' : ''}`}</div>}
          </Field>
          <Field label="Initial Password (12+ characters)"><SI type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="At least 12 characters" /></Field>
          <Field label="Role">
            <select value={form.role} onChange={e => set('role', e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: '#0a3340', color: '#fff', fontSize: 13, outline: 'none' }}>
              {roles.filter(({ role }) => role !== 'superadmin' && role !== 'webhoist' && role !== 'owner' && role !== 'ghost_checker').map(({ role: r }) => {
                const org = ORG.find(o => o.role === r);
                return <option key={r} value={r} style={{ background: '#0a3340' }}>{org?.icon} {org?.title || r}</option>;
              })}
              {levels.length > 0 && <optgroup label="Employment levels">
                {levels.map(l => <option key={l.key} value={`level:${l.key}`} style={{ background: '#0a3340' }}>{l.label}</option>)}
              </optgroup>}
            </select>
          </Field>
          {form.role && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {level ? (level.description || `${level.label}: ${level.permissions.length} permission(s) on the ${level.baseRole.replaceAll('_', ' ')} base role.`) : ORG.find(o => o.role === form.role)?.desc}
            </div>
          )}
          <button type="submit" disabled={saving} style={{ width: '100%', padding: '13px', background: 'var(--brand)', border: 'none', borderRadius: 10, color: '#0a3340', fontSize: 13, fontWeight: 900, cursor: saving ? 'wait' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {saving ? 'Creating…' : 'Create Staff Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
