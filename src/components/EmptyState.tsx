import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon | string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
}

export default function EmptyState({ icon, title, description, action, secondaryAction, size = 'md' }: EmptyStateProps) {
  const sizeStyles = {
    sm: { padding: '40px 20px', iconSize: 40 },
    md: { padding: '60px 28px', iconSize: 56 },
    lg: { padding: '80px 32px', iconSize: 72 },
  };

  const IconComponent = typeof icon === 'string' ? null : icon;
  const iconContent = typeof icon === 'string' ? icon : null;

  return (
    <div style={{
      textAlign: 'center',
      padding: sizeStyles[size].padding,
      borderRadius: 16,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {icon && (
        <div style={{
          width: sizeStyles[size].iconSize,
          height: sizeStyles[size].iconSize,
          borderRadius: 16,
          background: 'rgba(212,196,168,0.1)',
          border: '1px solid rgba(212,196,168,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: sizeStyles[size].iconSize * 0.5,
        }}>
          {IconComponent ? <IconComponent size={sizeStyles[size].iconSize * 0.5} style={{ color: 'var(--gold)' }} /> : iconContent}
        </div>
      )}
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontWeight: 700,
        fontSize: size === 'sm' ? 18 : size === 'md' ? 22 : 28,
        color: '#fff',
        margin: '0 0 12px',
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 1.6,
        margin: '0 0 24px',
        maxWidth: 400,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '12px 28px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            background: 'var(--gold)',
            color: '#0A1628',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {action.label}
        </button>
      )}
      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          style={{
            padding: '12px 28px',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginLeft: action ? 12 : 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
