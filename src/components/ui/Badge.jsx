// src/components/ui/Badge.jsx
export default function Badge({
  children,
  variant = 'muted',
  icon,
  size = 'md',
  className = '',
  ...rest
}) {
  const classes = ['ui-badge', `ui-badge--${variant}`, className].filter(Boolean).join(' ');
  return (
    <span className={classes} {...rest}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
