import { ReactNode } from 'react';
import { LucideIcon, Car, Building2, Gavel, Building, Star, Image, Wifi, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

type PresetType = 'no-vehicles' | 'no-dealers' | 'no-auctions' | 'no-partners' | 'no-reviews' | 'missing-images' | 'api-failure' | 'generic';

const PRESETS: Record<PresetType, { icon: LucideIcon; title: string; message: string }> = {
  'no-vehicles': { icon: Car, title: 'No vehicles found', message: 'There are no vehicles available at the moment. Check back later or adjust your filters.' },
  'no-dealers': { icon: Building2, title: 'No dealers found', message: 'No dealers match your search. Try broadening your criteria.' },
  'no-auctions': { icon: Gavel, title: 'No active auctions', message: 'There are no live auctions right now. Upcoming auctions will appear here.' },
  'no-partners': { icon: Building, title: 'No partners listed', message: 'We haven\'t added any partners yet. Check back soon.' },
  'no-reviews': { icon: Star, title: 'No reviews yet', message: 'This listing has no reviews. Be the first to leave one!' },
  'missing-images': { icon: Image, title: 'Images not available', message: 'Images for this item could not be loaded.' },
  'api-failure': { icon: Wifi, title: 'Failed to load data', message: 'We couldn\'t fetch data from the server. Check your connection and try again.' },
  'generic': { icon: Inbox, title: 'Nothing here yet', message: 'This section is currently empty.' },
};

interface ActionLink {
  label: string;
  to: string;
}

interface EmptyStateProps {
  type?: PresetType;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  message?: string;
  action?: {
    label: string;
    onClick?: () => void;
    to?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function EmptyState({
  type,
  icon,
  title,
  description,
  message,
  action,
  secondaryAction,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const preset = type ? PRESETS[type] : null;

  if (preset) {
    const IconComp = icon || preset.icon;
    const displayTitle = title ?? preset.title;
    const displayMessage = message ?? description ?? preset.message;

    return (
      <div className={`empty-state ${className}`}>
        <div className="empty-state-icon" style={{ opacity: 0.35 }}>
          <IconComp size={48} strokeWidth={1.2} />
        </div>
        <h3 className="empty-state-title">{displayTitle}</h3>
        <p className="empty-state-text">{displayMessage}</p>
        {action && (
          <div style={{ marginTop: 8 }}>
            {action.to ? (
              <Link to={action.to} className="btn-gold px-6 py-2.5 rounded-full text-xs uppercase tracking-[0.06em] font-bold no-underline">
                {action.label}
              </Link>
            ) : (
              <button onClick={action.onClick}
                className="btn-gold px-6 py-2.5 rounded-full text-xs uppercase tracking-[0.06em] font-bold border-none cursor-pointer"
              >
                {action.label}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const IconComponent = typeof icon === 'string' ? null : (icon || Inbox);
  const iconContent = typeof icon === 'string' ? icon : null;
  const sz = size === 'sm' ? { pad: '40px 20px', iconSz: 40, titleSz: 18 } : size === 'lg' ? { pad: '80px 32px', iconSz: 72, titleSz: 28 } : { pad: '60px 28px', iconSz: 56, titleSz: 22 };

  return (
    <div className={className} style={{
      textAlign: 'center', padding: sz.pad, borderRadius: 16,
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {(icon || iconContent) && (
        <div style={{
          width: sz.iconSz, height: sz.iconSz, borderRadius: 16,
          background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          {IconComponent ? <IconComponent size={sz.iconSz * 0.5} style={{ color: 'var(--gold)' }} /> : <span style={{ fontSize: sz.iconSz * 0.5 }}>{iconContent}</span>}
        </div>
      )}
      <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: sz.titleSz, color: '#fff', margin: '0 0 12px' }}>
        {title || 'Nothing here yet'}
      </h3>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
        {description || message || 'This section is currently empty.'}
      </p>
      {action && (
        action.to ? (
          <Link to={action.to} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, background: 'var(--gold)', color: '#0A1628', textDecoration: 'none', cursor: 'pointer' }}>
            {action.label}
          </Link>
        ) : (
          <button onClick={action.onClick}
            style={{ padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, background: 'var(--gold)', color: '#0A1628', border: 'none', cursor: 'pointer' }}>
            {action.label}
          </button>
        )
      )}
      {secondaryAction && (
        <button onClick={secondaryAction.onClick}
          style={{ padding: '12px 28px', borderRadius: 10, fontWeight: 600, fontSize: 14, background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', marginLeft: action ? 12 : 0 }}>
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
