import { Car, Building2, Gavel, Building, Star, Image, Wifi, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

const TYPES = {
  'no-vehicles':  { icon: Car,     title: 'No vehicles found',        message: 'There are no vehicles available at the moment. Check back later or adjust your filters.' },
  'no-dealers':   { icon: Building2, title: 'No dealers found',       message: 'No dealers match your search. Try broadening your criteria.' },
  'no-auctions':  { icon: Gavel,   title: 'No active auctions',       message: 'There are no live auctions right now. Upcoming auctions will appear here.' },
  'no-partners':  { icon: Building, title: 'No partners listed',      message: 'We haven\'t added any partners yet. Check back soon.' },
  'no-reviews':   { icon: Star,    title: 'No reviews yet',           message: 'This listing has no reviews. Be the first to leave one!' },
  'missing-images': { icon: Image, title: 'Images not available',     message: 'Images for this item could not be loaded. The seller may not have uploaded any.' },
  'api-failure':  { icon: Wifi,    title: 'Failed to load data',      message: 'We couldn\'t fetch data from the server. Check your connection and try again.' },
  'generic':      { icon: Inbox,   title: 'Nothing here yet',         message: 'This section is currently empty.' },
};

export default function EmptyState({ type = 'generic', title, message, action, icon: IconOverride }) {
  const config = TYPES[type] || TYPES.generic;
  const Icon = IconOverride || config.icon;
  const displayTitle = title ?? config.title;
  const displayMessage = message ?? config.message;

  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14,
    background: '#D4C4A8', color: '#0A0A0A',
    textDecoration: 'none', transition: 'opacity 0.2s',
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: 48, gap: 16,
      background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)',
      minHeight: 300,
    }}>
      <div style={{ opacity: 0.35 }}>
        <Icon size={56} strokeWidth={1.2} />
      </div>
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#fff' }}>{displayTitle}</h3>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)', maxWidth: 420 }}>{displayMessage}</p>
      {action && (
        <div style={{ marginTop: 8 }}>
          <Link to={action.to} style={btnStyle} onMouseOver={e => e.currentTarget.style.opacity = '0.85'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
            {action.label}
          </Link>
        </div>
      )}
    </div>
  );
}
