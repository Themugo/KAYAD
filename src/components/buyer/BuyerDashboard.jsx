import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

/**
 * Buyer Dashboard Enhancements
 * Watchlist, alerts, price drops, and activity tracking
 */

// Price Alert Component
export function PriceAlert({ car, onRemove }) {
  const [currentPrice] = useState(car.price);
  const [previousPrice] = useState(car.previousPrice || car.price);
  
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = ((priceChange / previousPrice) * 100).toFixed(1);
  const isDrop = priceChange < 0;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: 16,
      background: isDrop ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
      border: `1px solid ${isDrop ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
      borderRadius: 12,
    }}>
      <img 
        src={car.image} 
        alt={car.title}
        style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8 }}
      />
      <div style={{ flex: 1 }}>
        <Link to={`/cars/${car.id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
          {car.title}
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontWeight: 700, color: 'var(--blue-500)' }}>
            KES {currentPrice.toLocaleString()}
          </span>
          <span style={{
            fontSize: 11,
            color: isDrop ? '#22c55e' : '#ef4444',
            background: isDrop ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            padding: '2px 8px',
            borderRadius: 4,
          }}>
            {isDrop ? '↓' : '↑'} {Math.abs(priceChangePercent)}%
          </span>
        </div>
      </div>
      {onRemove && (
        <button
          onClick={() => onRemove(car.id)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 8,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Saved Search Component
export function SavedSearchCard({ search, onDelete, onRun }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      background: 'var(--surface)',
      borderRadius: 8,
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 20 }}>🔍</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{search.query || 'Custom Search'}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {search.filters?.brand || 'All brands'} · {search.filters?.maxPrice ? `Up to KES ${(search.filters.maxPrice / 1000000).toFixed(1)}M` : 'Any price'}
        </div>
      </div>
      <button
        onClick={() => onRun?.(search)}
        style={{
          padding: '6px 12px',
          background: 'var(--blue-500)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        Run
      </button>
      <button
        onClick={() => onDelete?.(search.id)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          padding: 6,
        }}
      >
        🗑
      </button>
    </div>
  );
}

// Recently Viewed Component
export function RecentlyViewed({ cars, onClear }) {
  if (!cars || cars.length === 0) return null;
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} />
          Recently Viewed
        </h4>
        {onClear && (
          <button
            onClick={onClear}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 12,
            }}
          >
            Clear history
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {cars.slice(0, 6).map(car => (
          <Link
            key={car.id}
            to={`/cars/${car.id}`}
            style={{
              flexShrink: 0,
              width: 160,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <img
              src={car.image}
              alt={car.title}
              style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }}
            />
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {car.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--blue-500)', fontWeight: 600 }}>
              KES {car.price?.toLocaleString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Activity Notification Item
export function ActivityNotification({ notification }) {
  const icons = {
    price_drop: '💰',
    new_listing: '🚗',
    auction_ending: '🔨',
    escrow_update: '🔒',
    message: '💬',
    inspection_complete: '🔍',
  };
  
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: 12,
      background: notification.unread ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
      borderRadius: 8,
      transition: 'background 0.2s',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
      }}>
        {icons[notification.type] || '📌'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: notification.unread ? 600 : 400 }}>
          {notification.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {notification.description}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {notification.time}
        </div>
      </div>
      {notification.unread && (
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--blue-500)',
          flexShrink: 0,
        }} />
      )}
    </div>
  );
}

// Buyer Dashboard Quick Stats
export function BuyerQuickStats({ stats }) {
  const items = [
    { icon: '🚗', label: 'Cars Viewed', value: stats.viewed || 0 },
    { icon: '♡', label: 'Saved', value: stats.saved || 0 },
    { icon: '🔨', label: 'Auctions', value: stats.auctions || 0 },
    { icon: '💬', label: 'Inquiries', value: stats.inquiries || 0 },
  ];
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          padding: 16,
          background: 'var(--surface)',
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{item.value}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}
