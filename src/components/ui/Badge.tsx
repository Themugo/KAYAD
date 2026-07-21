import React from 'react';

export type BadgeVariant = 'brand' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  outline?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  outline = false,
  icon,
  className = '',
  style,
}) => {
  const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
    sm: {
      padding: 'var(--space-1) var(--space-2)',
      fontSize: 'var(--text-caption)',
    },
    md: {
      padding: 'var(--space-1) var(--space-3)',
      fontSize: 'var(--text-caption)',
    },
  };

  const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    brand: {
      background: outline ? 'transparent' : 'var(--color-brand-subtle)',
      color: outline ? 'var(--color-brand)' : 'var(--color-brand-dark)',
      border: outline ? '1px solid var(--color-brand)' : '1px solid transparent',
    },
    success: {
      background: outline ? 'transparent' : 'var(--color-success-subtle)',
      color: outline ? 'var(--color-success)' : 'var(--color-success-dark)',
      border: outline ? '1px solid var(--color-success)' : '1px solid transparent',
    },
    danger: {
      background: outline ? 'transparent' : 'var(--color-danger-subtle)',
      color: outline ? 'var(--color-danger)' : 'var(--color-danger-dark)',
      border: outline ? '1px solid var(--color-danger)' : '1px solid transparent',
    },
    warning: {
      background: outline ? 'transparent' : 'var(--color-warning-subtle)',
      color: outline ? 'var(--color-warning)' : 'var(--color-warning-dark)',
      border: outline ? '1px solid var(--color-warning)' : '1px solid transparent',
    },
    info: {
      background: outline ? 'transparent' : 'var(--color-info-subtle)',
      color: outline ? 'var(--color-info)' : 'var(--color-info-dark)',
      border: outline ? '1px solid var(--color-info)' : '1px solid transparent',
    },
    neutral: {
      background: outline ? 'transparent' : 'var(--color-bg-secondary)',
      color: outline ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)',
      border: outline ? '1px solid var(--color-border)' : '1px solid transparent',
    },
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius-full)',
    whiteSpace: 'nowrap',
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  const dotStyle: React.CSSProperties = {
    content: '""',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'currentColor',
  };

  return (
    <span className={className} style={{ ...baseStyle, ...style }}>
      {dot && <span style={dotStyle} />}
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;

// Status Badge with live dot animation
export interface StatusBadgeProps {
  status: 'live' | 'pending' | 'sold' | 'reserved' | 'active' | 'inactive';
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  className = '',
  style,
}) => {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    live: { variant: 'danger', label: 'LIVE' },
    pending: { variant: 'warning', label: 'PENDING' },
    sold: { variant: 'success', label: 'SOLD' },
    reserved: { variant: 'info', label: 'RESERVED' },
    active: { variant: 'success', label: 'ACTIVE' },
    inactive: { variant: 'neutral', label: 'INACTIVE' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant={config.variant} dot={status === 'live'} className={className} style={style}>
      {children || config.label}
    </Badge>
  );
};
