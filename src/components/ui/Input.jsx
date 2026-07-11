// src/components/ui/Input.jsx
export default function Input({
  label,
  hint,
  error,
  type = 'text',
  icon,
  iconRight,
  className = '',
  containerClassName = '',
  id,
  ...rest
}) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className={`ui-input-group ${containerClassName}`}>
      {label && (
        <label className="ui-input-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1,
          }}>
            {icon}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          className={`ui-input ${error ? 'ui-input--error' : ''} ${className}`}
          style={icon ? { paddingLeft: 36 } : undefined}
          aria-invalid={!!error}
          aria-describedby={hint || error ? `${inputId}-hint` : undefined}
          {...rest}
        />
        {iconRight && (
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: 'var(--text-muted)',
          }}>
            {iconRight}
          </span>
        )}
      </div>
      {(hint || error) && (
        <div className={`ui-input-hint ${error ? 'ui-input-hint--error' : ''}`} id={`${inputId}-hint`}>
          {error || hint}
        </div>
      )}
    </div>
  );
}
