import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'outline' | 'ghost' | 'danger' | 'green';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'gold',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      className = '',
      style = {},
      ...props
    },
    ref
  ) => {
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      borderRadius: 'var(--radius)',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      letterSpacing: '0.02em',
      transition: 'all 0.25s var(--ease)',
      whiteSpace: 'nowrap',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.5 : 1,
      ...style,
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '8px 16px', fontSize: '12px', minHeight: '36px' },
      md: { padding: '12px 24px', fontSize: '14.5px', minHeight: '44px' },
      lg: { padding: '14px 32px', fontSize: '16px', minHeight: '48px' },
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'var(--gold)',
        color: '#0A0A0A',
        fontWeight: 700,
        boxShadow: '0 4px 15px var(--gold-glow)',
      },
      gold: {
        background: 'linear-gradient(145deg, var(--gold), var(--gold-dark))',
        color: '#0A0A0A',
        fontWeight: 700,
        boxShadow: '0 4px 15px var(--gold-glow)',
      },
      outline: {
        background: 'transparent',
        border: '1px solid var(--border-soft)',
        color: 'var(--text)',
      },
      ghost: {
        background: 'transparent',
        border: 'none',
        color: 'var(--text-muted)',
      },
      danger: {
        background: 'rgba(239,68,68,0.12)',
        color: 'var(--danger)',
        border: '1px solid rgba(239,68,68,0.25)',
      },
      green: {
        background: '#22C55E',
        color: '#000',
        border: 'none',
        fontWeight: 700,
      },
    };

    const hoverStyles: Record<string, React.CSSProperties> = {
      primary: { transform: 'translateY(-2px) scale(1.02)', boxShadow: '0 12px 35px var(--gold-glow-strong)' },
      gold: { transform: 'translateY(-2px) scale(1.02)', boxShadow: '0 12px 35px var(--gold-glow-strong)' },
      outline: { borderColor: 'var(--gold)', color: 'var(--gold)', background: 'var(--gold-glow)' },
      ghost: { color: 'var(--text)' },
      danger: { background: 'rgba(239,68,68,0.2)' },
      green: { background: '#1EA34D', transform: 'translateY(-1px)' },
    };

    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth ? { width: '100%' } : {}),
    };

    const iconElement = icon && (
      <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
    );

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`}
        style={combinedStyles}
        onMouseEnter={(e) => {
          if (!disabled && !loading) {
            Object.assign(e.currentTarget.style, hoverStyles[variant]);
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading) {
            Object.assign(e.currentTarget.style, {
              transform: 'none',
              boxShadow: variantStyles[variant].boxShadow || 'none',
              borderColor: variantStyles[variant].borderColor || 'transparent',
              background: variantStyles[variant].background || 'transparent',
            });
          }
        }}
        {...props}
      >
        {loading && (
          <span className="spinner" style={{ width: size === 'sm' ? 14 : 18, height: size === 'sm' ? 14 : 18 }} />
        )}
        {!loading && iconPosition === 'left' && iconElement}
        {!loading && children}
        {!loading && iconPosition === 'right' && iconElement}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
