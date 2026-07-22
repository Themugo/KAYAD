import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-button)',
      fontWeight: 600,
      lineHeight: 1,
      letterSpacing: '0.02em',
      border: '1px solid transparent',
      borderRadius: 'var(--radius-md)',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.5 : 1,
      transition: 'all var(--transition-normal)',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      width: fullWidth ? '100%' : 'auto',
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        padding: 'var(--space-2) var(--space-4)',
        minHeight: 'var(--button-height-sm)',
        fontSize: 'var(--text-caption)',
      },
      md: {
        padding: 'var(--space-3) var(--space-6)',
        minHeight: 'var(--button-height-md)',
      },
      lg: {
        padding: 'var(--space-4) var(--space-8)',
        minHeight: 'var(--button-height-lg)',
        fontSize: 'var(--text-body)',
      },
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(135deg, #16C4A4, #0C7B68)',
        color: '#ffffff',
        borderColor: 'transparent',
        boxShadow: '0 4px 14px 0 rgba(22, 196, 164, 0.25)',
      },
      secondary: {
        background: 'transparent',
        color: 'var(--brand)',
        borderColor: 'var(--brand)',
      },
      ghost: {
        background: 'transparent',
        color: 'var(--text-secondary)',
        borderColor: 'transparent',
      },
      danger: {
        background: 'var(--color-danger)',
        color: '#ffffff',
        borderColor: 'var(--color-danger)',
      },
    };

    const style: React.CSSProperties = {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };

    const spinnerStyle: React.CSSProperties = {
      width: 16,
      height: 16,
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    };

    return (
      <button
        ref={ref}
        style={style}
        className={className}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span style={spinnerStyle} />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            {children}
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
