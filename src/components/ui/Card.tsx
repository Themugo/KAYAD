import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg' | 'flush';
  interactive?: boolean;
  hoverEffect?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  interactive = false,
  hoverEffect = false,
  className = '',
  style,
  onClick,
}) => {
  const paddingMap: Record<string, string> = {
    sm: 'var(--space-4)',
    md: 'var(--space-card-padding)',
    lg: 'var(--space-8)',
    flush: '0',
  };

  const baseStyle: React.CSSProperties = {
    display: 'block',
    padding: paddingMap[padding],
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-sm)',
    transition: hoverEffect || interactive 
      ? 'box-shadow var(--transition-normal), border-color var(--transition-normal), transform var(--transition-normal)'
      : undefined,
    cursor: interactive || onClick ? 'pointer' : 'default',
  };

  const hoverStyle: React.CSSProperties = interactive || hoverEffect
    ? {
        ':hover': {
          boxShadow: 'var(--shadow-md)',
          borderColor: 'var(--color-border-strong)',
          transform: 'translateY(-2px)',
        },
      }
    : {};

  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      className={className}
      style={{ ...baseStyle, ...hoverStyle, ...style }}
      onClick={onClick}
    >
      {children}
    </Component>
  );
};

export default Card;

// Card Header Component
export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
  style,
}) => {
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-4)',
    paddingBottom: 'var(--space-4)',
    marginBottom: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border-soft)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--text-h3)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 'var(--text-body-sm)',
    color: 'var(--color-text-muted)',
    margin: 'var(--space-1) 0 0 0',
  };

  return (
    <div className={className} style={{ ...headerStyle, ...style }}>
      <div>
        <h3 style={titleStyle}>{title}</h3>
        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

// Card Footer Component
export interface CardFooterProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  align = 'right',
  className = '',
  style,
}) => {
  const footerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
    gap: 'var(--space-3)',
    paddingTop: 'var(--space-4)',
    marginTop: 'var(--space-4)',
    borderTop: '1px solid var(--color-border-soft)',
  };

  return (
    <div className={className} style={{ ...footerStyle, ...style }}>
      {children}
    </div>
  );
};
