import { forwardRef, useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { PASSWORD_RULES } from './validation';

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
}

type InputProps = BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & { id?: string };

/** Labelled text input with an associated, announced error. */
export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { label, error, hint, optional, id, className, ...rest }, ref,
) {
  const auto = useId();
  const fieldId = id || auto;
  const describedBy = [error ? `${fieldId}-error` : '', hint ? `${fieldId}-hint` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="kayad-auth-field">
      <label htmlFor={fieldId}>{label}{optional && <span className="font-medium text-[#64748B]"> (optional)</span>}</label>
      <input
        ref={ref} id={fieldId} className={`kayad-auth-input ${className || ''}`.trim()}
        aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest}
      />
      {hint && !error && <p id={`${fieldId}-hint`} className="m-0 text-[11px] text-[#64748B]">{hint}</p>}
      {error && <p id={`${fieldId}-error`} className="kayad-auth-field-error m-0">{error}</p>}
    </div>
  );
});

/** Password input with a show/hide control and a live checklist of what is still missing. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<InputProps, 'type'> & { showRules?: boolean }>(function PasswordField(
  { label, error, showRules = false, id, value, ...rest }, ref,
) {
  const auto = useId();
  const fieldId = id || auto;
  const [show, setShow] = useState(false);
  const text = String(value ?? '');
  return (
    <div className="kayad-auth-field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="kayad-auth-password-wrap">
        <input
          ref={ref} id={fieldId} className="kayad-auth-input" type={show ? 'text' : 'password'} value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? `${fieldId}-error` : '', showRules ? `${fieldId}-rules` : ''].filter(Boolean).join(' ') || undefined}
          {...rest}
        />
        <button type="button" className="kayad-auth-password-toggle" aria-pressed={show} aria-controls={fieldId} onClick={() => setShow((v) => !v)}>
          {show ? 'Hide' : 'Show'}<span className="sr-only"> password</span>
        </button>
      </div>
      {showRules && (
        <ul id={`${fieldId}-rules`} className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-1 p-0 text-[11px]" aria-label="Password requirements">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(text);
            return <li key={r.id} className={ok ? 'text-emerald-700' : 'text-[#64748B]'}><span aria-hidden="true">{ok ? '✓' : '○'}</span> {r.label}<span className="sr-only">{ok ? ' — met' : ' — not yet'}</span></li>;
          })}
        </ul>
      )}
      {error && <p id={`${fieldId}-error`} className="kayad-auth-field-error m-0">{error}</p>}
    </div>
  );
});
