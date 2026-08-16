import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({ label, hint, type = 'text', value, onChange, placeholder, required, autoComplete }) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const isPwd = type === 'password';
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPwd && show ? 'text' : type}
          value={value} onChange={onChange} placeholder={placeholder}
          required={required} autoComplete={autoComplete}
          style={{
            width: '100%', padding: isPwd ? '12px 44px 12px 14px' : '12px 14px',
            borderRadius: 10, border: `1px solid ${focused ? 'rgba(212,196,168,0.45)' : 'rgba(255,255,255,0.1)'}`,
            background: focused ? 'rgba(212,196,168,0.03)' : 'rgba(255,255,255,0.04)',
            color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
          }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
        {isPwd && (
          <button type="button" onClick={() => setShow(v => !v)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 5 }}>{hint}</div>}
    </div>
  );
}
