import { useState } from 'react';

const INPUT_VARIANTS = ['outline', 'filled', 'flushed'];
const INPUT_SIZES = ['sm', 'md', 'lg'];

export default function Input({
  label,
  error,
  hint,
  icon,
  iconRight,
  variant = 'outline',
  size = 'md',
  full = true,
  type = 'text',
  className = '',
  id,
  ...rest
}) {
  const [focused, setFocused] = useState(false);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const classes = [
    'ui-input-wrapper',
    focused ? 'ui-input-wrapper--focused' : '',
    error ? 'ui-input-wrapper--error' : '',
    `ui-input-wrapper--${variant}`,
    `ui-input-wrapper--${size}`,
    full ? 'ui-input-wrapper--full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {label && <label className="ui-input__label" htmlFor={inputId}>{label}</label>}
      <div className="ui-input">
        {icon && <span className="ui-input__icon ui-input__icon--left">{icon}</span>}
        <input
          id={inputId}
          type={type}
          className="ui-input__field"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
        {iconRight && <span className="ui-input__icon ui-input__icon--right">{iconRight}</span>}
      </div>
      {error && <p className="ui-input__error" id={`${inputId}-error`} role="alert">{error}</p>}
      {hint && !error && <p className="ui-input__hint" id={`${inputId}-hint`}>{hint}</p>}
    </div>
  );
}
