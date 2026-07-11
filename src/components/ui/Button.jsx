import { useCallback } from 'react';

const VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success'];
const SIZES = ['xs', 'sm', 'lg', 'icon'];

export default function Button({
  children,
  variant = 'primary',
  size,
  full,
  icon,
  iconRight,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...rest
}) {
  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    size ? `ui-btn--${size}` : '',
    full ? 'ui-btn--full' : '',
    className,
  ].filter(Boolean).join(' ');

  const handleClick = useCallback((e) => {
    if (disabled || loading) return;
    if (onClick) onClick(e);
  }, [onClick, disabled, loading]);

  return (
    <button
      type={type}
      className={classes}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && <span className="ui-spinner ui-spinner--sm" style={{ marginRight: 6 }} />}
      {!loading && icon && <span aria-hidden="true">{icon}</span>}
      {children}
      {!loading && iconRight && <span aria-hidden="true">{iconRight}</span>}
    </button>
  );
}
