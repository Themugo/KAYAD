import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Badge } from './ui';

/**
 * Conversion Bar - Sticky bar with key CTAs shown on car detail pages
 * Encourages users to: contact seller, book inspection, start escrow, save listing
 */
export default function ConversionBar({ car, onSave, onCompare, isSaved = false }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!car) return null;
  
  const price = car.currentBid > 0 ? car.currentBid : car.price;
  const isAuction = car.auction_status === 'live' || car.isAuction;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#FFFFFF',
      borderTop: '1px solid rgba(15, 23, 42, 0.08)',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
      zIndex: 100,
      padding: '12px 24px',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        {/* Price & Basic Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAuction ? 'Current Bid' : 'Price'}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--blue-500)' }}>
              KES {price?.toLocaleString()}
            </div>
          </div>
          {car.views > 0 && (
            <Badge variant="muted" style={{ fontSize: 11 }}>
              👁 {car.views} views
            </Badge>
          )}
          {car.totalBids > 0 && (
            <Badge variant="orange" style={{ fontSize: 11 }}>
              🔨 {car.totalBids} bids
            </Badge>
          )}
        </div>
        
        {/* Primary Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {isAuction ? (
            <Link to={`/auction/${car.id}`}>
              <Button variant="primary" icon="🔴" size="lg">
                Place Bid
              </Button>
            </Link>
          ) : (
            <Link to={`/escrow?carId=${car.id}`}>
              <Button variant="primary" icon="💳" size="lg">
                Buy with Escrow
              </Button>
            </Link>
          )}
          
          <Link to={`/inspection?carId=${car.id}`}>
            <Button variant="outline" icon="🔍" size="lg">
              Book Inspection
            </Button>
          </Link>
          
          <Link to={`/chat?seller=${car.dealer?.id}`}>
            <Button variant="secondary" icon="💬" size="lg">
              Message
            </Button>
          </Link>
          
          <Button 
            variant={isSaved ? "primary" : "secondary"} 
            icon={isSaved ? "♥" : "♡"} 
            size="lg"
            onClick={onSave}
          >
            {isSaved ? 'Saved' : 'Save'}
          </Button>
          
          {onCompare && (
            <Button 
              variant="secondary" 
              icon="⚖️" 
              size="lg"
              onClick={() => onCompare(car)}
            >
              Compare
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Trust Badge Row - Shows trust indicators on listing cards and detail pages
 */
export function TrustBadgeRow({ 
  isVerified = false, 
  hasInspection = false, 
  isNTSAVerified = false,
  hasLogbook = false,
  trustScore = null,
  compact = false 
}) {
  const badges = [
    isVerified && { label: 'Verified', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    hasInspection && { label: 'Inspected', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    isNTSAVerified && { label: 'NTSA', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    hasLogbook && { label: 'Logbook', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    trustScore && trustScore >= 80 && { label: 'Highly Trusted', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    trustScore && trustScore >= 60 && trustScore < 80 && { label: 'Trusted', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  ].filter(Boolean);
  
  if (badges.length === 0) return null;
  
  return (
    <div style={{
      display: 'flex',
      gap: compact ? 4 : 8,
      flexWrap: 'wrap',
      marginTop: 8,
    }}>
      {badges.map((badge, i) => (
        <span
          key={i}
          style={{
            fontSize: compact ? 9 : 11,
            fontWeight: 600,
            color: badge.color,
            background: badge.bg,
            padding: compact ? '2px 6px' : '4px 10px',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ✓ {badge.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Price Comparison - Shows how price compares to market
 */
export function PriceComparison({ price, marketPrice, avgMarketPrice }) {
  const marketComparison = marketPrice 
    ? ((price - marketPrice) / marketPrice * 100)
    : avgMarketPrice 
      ? ((price - avgMarketPrice) / avgMarketPrice * 100)
      : null;
  
  if (marketComparison === null || Math.abs(marketComparison) <= 5) return null;
  
  const isBelow = marketComparison < 0;
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      fontWeight: 700,
      color: isBelow ? '#22c55e' : '#ef4444',
      background: isBelow ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      padding: '2px 8px',
      borderRadius: 4,
    }}>
      {isBelow ? '↓' : '↑'} {isBelow ? 'Below' : 'Above'} Market {Math.abs(marketComparison).toFixed(0)}%
    </div>
  );
}

/**
 * Deal Rating Badge - Shows deal quality
 */
export function DealRatingBadge({ rating }) {
  if (!rating) return null;
  
  const config = {
    great: { label: 'Great Deal', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    good: { label: 'Good Deal', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    fair: { label: 'Fair', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  }[rating];
  
  if (!config) return null;
  
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      color: config.color,
      background: config.bg,
      padding: '2px 6px',
      borderRadius: 4,
      textTransform: 'uppercase',
    }}>
      {config.label}
    </span>
  );
}

/**
 * Social Proof - Shows activity on a listing
 */
export function SocialProof({ views, bids, inquiries }) {
  const items = [
    views > 0 && { icon: '👁', value: views, label: 'views' },
    bids > 0 && { icon: '🔨', value: bids, label: 'bids' },
    inquiries > 0 && { icon: '💬', value: inquiries, label: 'inquiries' },
  ].filter(Boolean);
  
  if (items.length === 0) return null;
  
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      fontSize: 12,
      color: 'var(--text-muted)',
    }}>
      {items.map((item, i) => (
        <span key={i}>
          {item.icon} {item.value} {item.label}
        </span>
      ))}
    </div>
  );
}
