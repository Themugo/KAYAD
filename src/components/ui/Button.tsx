
// Stitch Design System Button
// Aligns with Heritage Tech design language

import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'accent' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = 'left',
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Stitch Design: 8px radius for buttons
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      lineHeight: 1,
      letterSpacing: '0.02em',
      border: '1px solid transparent',
      borderRadius: 'var(--radius-md)',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.5 : 1,
      // Stitch transition: cubic-bezier for spring effect
      transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      width: fullWidth ? '100%' : 'auto',
    };

    // Stitch Design: 48px height for mobile touch targets
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        padding: 'var(--space-2) var(--space-4)',
        minHeight: '32px',
        fontSize: 'var(--text-xs)',
      },
      md: {
        padding: 'var(--space-3) var(--space-6)',
        minHeight: '40px',
        fontSize: 'var(--text-sm)',
      },
      lg: {
        padding: '12px var(--space-6)',
        minHeight: '48px', // Stitch: 48px for mobile
        fontSize: 'var(--text-base)',
      },
    };

    // Stitch Design: Primary gradient with teal glow
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(135deg, #16C4A4, #0C7B68)',
        color: '#ffffff',
        borderColor: 'transparent',
        // Stitch: Primary glow shadow
        boxShadow: '0 4px 15px rgba(22, 196, 164, 0.25)',
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
        background: 'var(--color-error)',
        color: '#ffffff',
        borderColor: 'var(--color-error)',
      },
      outline: {
        background: 'transparent',
        color: 'var(--text-primary)',
        borderColor: 'var(--border, #cbd5e1)',
      },
      accent: {
        background: 'var(--color-accent, #C85A32)',
        color: '#ffffff',
        borderColor: 'transparent',
      },
      success: {
        background: 'var(--color-success, #059669)',
        color: '#ffffff',
        borderColor: 'transparent',
      },
    };

    const style: React.CSSProperties = {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };

    // Stitch spinner
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
            {leftIcon}
            {children}
            {rightIcon}
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
