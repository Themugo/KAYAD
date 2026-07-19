import { useState, useRef, useEffect } from 'react';

export default function Dropdown({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  variant = 'outline',
  size = 'md',
  full = true,
  error,
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find(o => o.value === value);
  const classes = [
    'ui-select-wrapper',
    open ? 'ui-select-wrapper--open' : '',
    error ? 'ui-select-wrapper--error' : '',
    `ui-select-wrapper--${variant}`,
    `ui-select-wrapper--${size}`,
    full ? 'ui-select-wrapper--full' : '',
    disabled ? 'ui-select-wrapper--disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={classes} ref={ref}>
      {label && <label className="ui-select__label">{label}</label>}
      <button
        type="button"
        className="ui-select__trigger"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`ui-select__value ${!selected ? 'ui-select__value--placeholder' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="ui-select__arrow">▾</span>
      </button>
      {open && (
        <ul className="ui-select__menu" role="listbox">
          {options.map((opt, i) => (
            <li
              key={opt.value ?? i}
              role="option"
              aria-selected={value === opt.value}
              className={`ui-select__option ${value === opt.value ? 'ui-select__option--selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </li>
          ))}
          {options.length === 0 && (
            <li className="ui-select__option ui-select__option--empty">No options</li>
          )}
        </ul>
      )}
      {error && <p className="ui-select__error" role="alert">{error}</p>}
    </div>
  );
}
