import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

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
    const inputHeights: Record<string, string> = {
      sm: 'var(--input-height-sm)',
      md: 'var(--input-height-md)',
      lg: 'var(--input-height-lg)',
    };

    const inputPadding: Record<string, string> = {
      sm: 'var(--space-2) var(--space-3)',
      md: 'var(--space-3) var(--space-4)',
      lg: 'var(--space-4) var(--space-4)',
    };

    const inputBaseStyle: React.CSSProperties = {
      display: 'block',
      width: fullWidth ? '100%' : 'auto',
      padding: inputPadding[size],
      minHeight: inputHeights[size],
      fontFamily: 'var(--font-sans)',
      fontSize: size === 'sm' ? 'var(--text-body-sm)' : 'var(--text-body)',
      color: 'var(--color-text-primary)',
      background: 'var(--color-bg-elevated)',
      border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-none)',
      transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
      outline: 'none',
      boxSizing: 'border-box',
    };

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      width: fullWidth ? '100%' : 'auto',
    };

    const labelStyle: React.CSSProperties = {
      fontSize: 'var(--text-body-sm)',
      fontWeight: 600,
      color: 'var(--color-text-primary)',
    };

    const hintStyle: React.CSSProperties = {
      fontSize: 'var(--text-caption)',
      color: 'var(--color-text-muted)',
    };

    const errorStyle: React.CSSProperties = {
      fontSize: 'var(--text-caption)',
      color: 'var(--color-danger)',
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
      color: 'var(--color-text-muted)',
      pointerEvents: 'none',
    };

    return (
      <div style={containerStyle} className={className}>
        {label && <label style={labelStyle}>{label}</label>}
        <div style={iconWrapperStyle}>
          {icon && <span style={iconWrapperInternalStyle}>{icon}</span>}
          <input
            ref={ref}
            style={icon ? inputWithIconStyle : inputBaseStyle}
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
