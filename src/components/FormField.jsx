import { useState } from 'react';

const fieldStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const fieldFocusStyle = { borderColor: 'var(--gold)' };
const fieldErrorStyle = { borderColor: 'var(--red)' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 };
const errorStyle = { fontSize: 11, color: 'var(--red)', marginTop: 4 };

export function FormField({ label, name, type = 'text', value, onChange, placeholder, required, min, max, pattern, error, helpText, disabled, rows, options }) {
  const [focused, setFocused] = useState(false);

  const sharedProps = {
    name,
    value,
    onChange,
    placeholder,
    required,
    disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      ...fieldStyle,
      ...(focused ? fieldFocusStyle : {}),
      ...(error ? fieldErrorStyle : {}),
    },
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label htmlFor={name} style={labelStyle}>{label}</label>}
      {type === 'textarea' ? (
        <textarea id={name} rows={rows || 4} {...sharedProps} />
      ) : type === 'select' ? (
        <select id={name} {...sharedProps}>
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input id={name} type={type} min={min} max={max} pattern={pattern} {...sharedProps} />
      )}
      {error && <div style={errorStyle}>{error}</div>}
      {helpText && !error && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{helpText}</div>}
    </div>
  );
}
