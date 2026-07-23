import React from 'react';

// Stitch Design System Input
// Aligns with Heritage Tech design language

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

// Stitch: 48px height for mobile touch, teal focus glow
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      size = 'md',
      icon,
      iconPosition = 'left',
      fullWidth = true,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    // Stitch: Height based on size (48px mobile)
    const inputHeights: Record<string, string> = {
      sm: '32px',
      md: '40px',
      lg: '48px', // Stitch: 48px for mobile touch
    };

    const inputPadding: Record<string, string> = {
      sm: 'var(--space-2) var(--space-3)',
      md: 'var(--space-3) var(--space-4)',
      lg: '12px var(--space-4)',
    };

    // Stitch: White background with surface-dim border
    const inputBaseStyle: React.CSSProperties = {
      display: 'block',
      width: fullWidth ? '100%' : 'auto',
      padding: inputPadding[size],
      minHeight: inputHeights[size],
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--on-surface)',
      background: 'var(--surface-container-lowest, #ffffff)',
      border: `1px solid ${error ? 'var(--color-error)' : 'var(--surface-dim)'}`,
      borderRadius: 'var(--radius-md)', // Stitch: 8px
      boxShadow: 'none',
      // Stitch: Teal focus ring
      transition: 'border-color 200ms ease, box-shadow 200ms ease',
      outline: 'none',
      boxSizing: 'border-box',
    };

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      width: fullWidth ? '100%' : 'auto',
    };

    // Stitch: Outfit font for labels
    const labelStyle: React.CSSProperties = {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'var(--on-surface)',
    };

    const hintStyle: React.CSSProperties = {
      fontSize: 'var(--text-sm)',
      color: 'var(--on-surface-variant)',
    };

    // Stitch: Error with red
    const errorStyle: React.CSSProperties = {
      fontSize: 'var(--text-sm)',
      color: 'var(--color-error)',
      fontWeight: 500,
    };

    const iconWrapperStyle: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    };

    const inputWithIconStyle: React.CSSProperties = {
      ...inputBaseStyle,
      paddingLeft: icon && iconPosition === 'left' ? 'calc(var(--space-4) + 24px)' : undefined,
      paddingRight: icon && iconPosition === 'right' ? 'calc(var(--space-4) + 24px)' : undefined,
    };

    const iconWrapperInternalStyle: React.CSSProperties = {
      position: 'absolute',
      left: iconPosition === 'left' ? 'var(--space-3)' : undefined,
      right: iconPosition === 'right' ? 'var(--space-3)' : undefined,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--on-surface-variant)',
      pointerEvents: 'none',
    };

    // Stitch: Focus state with teal glow
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!error) {
        e.target.style.borderColor = 'var(--brand)';
        e.target.style.boxShadow = '0 0 0 3px rgba(22, 196, 164, 0.15)';
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!error) {
        e.target.style.borderColor = 'var(--surface-dim)';
        e.target.style.boxShadow = 'none';
      }
    };

    return (
      <div style={containerStyle} className={className}>
        {label && <label style={labelStyle}>{label}</label>}
        <div style={iconWrapperStyle}>
          {icon && <span style={iconWrapperInternalStyle}>{icon}</span>}
          <input
            ref={ref}
            style={icon ? inputWithIconStyle : inputBaseStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        </div>
        {hint && !error && <span style={hintStyle}>{hint}</span>}
        {error && <span style={errorStyle}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
