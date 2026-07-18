import { useState, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Gauge, Fuel, MapPin, Shield, Gavel, ChevronRight } from 'lucide-react';

function CarCardInner({ car, variant = 'default' }) {
  const [fav, setFav] = useState(false);

  const id = car._id || car.id;
  const images = car.images?.map(img => typeof img === 'string' ? img : img.url).filter(Boolean) || [];
  const primaryImage = images[0] || car.image || 'https://images.pexels.com/photos/3593922/pexels-photo-3593922.jpeg?auto=compress&cs=tinysrgb&w=800';

  const isAuction = car.auction_status === 'live' || car.isAuction || car.badges?.includes('auction');
  const isLive = car.auction_status === 'live' || car.isLive;
  const isVerified = car.is_verified_dealer || car.isVerified;
  const hasInspection = car.has_inspection || car.inspectionStatus === 'completed' || car.inspectionAvailable;
  const isNTSAVerified = car.ntsa_verified || car.ntsaVerified;
  const hasLogbook = car.logbook_verified || car.logbookVerified;
  const trustScore = car.trust_score || car.trustScore || null;
  const dealRating = car.deal_rating || car.dealRating || null;
  const marketPrice = car.market_price || car.marketPrice;
  const avgMarket = car.avg_market_price || car.avgMarketPrice;
  const carType = car.type || car.vehicleType;

  const price = isAuction && car.currentBid > 0 ? car.currentBid : car.price;
  const dealer = car.dealer?.business_name || car.dealer?.name || car.dealerName || 'Nairobi Auto Hub Ltd';
  const dealerRating = car.dealer?.rating || car.dealerRating || null;
  const mileage = car.mileage != null
    ? (typeof car.mileage === 'number' ? `${Math.round(car.mileage / 1000)}k km` : car.mileage)
    : null;
  const fuel = car.fuel || null;
  const year = car.year || null;
  const location = car.location?.city || (typeof car.location === 'string' ? car.location : null) || 'Nairobi';

  const priceVsMarket = marketPrice && price
    ? ((price - marketPrice) / marketPrice * 100)
    : avgMarket && price
      ? ((price - avgMarket) / avgMarket * 100)
      : null;

  const handleFav = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setFav(f => !f);
  }, []);

  const getTrustLabel = (score) => {
    if (score >= 80) return { text: 'Highly Trusted', color: '#22c55e' };
    if (score >= 60) return { text: 'Trusted', color: '#3b82f6' };
    if (score >= 40) return { text: 'Verified', color: '#f59e0b' };
    return null;
  };

  const trustLabel = trustScore ? getTrustLabel(trustScore) : null;

  // Premium variant styling (from zip)
  if (variant === 'premium') {
    return (
      <Link
        to={`/cars/${id}`}
        style={{ textDecoration: 'none', display: 'block' }}
      >
        <div className="premium-card">
          {/* Image */}
          <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '4/3' }}>
            <img
              src={primaryImage}
              alt={car.title}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.5s ease',
              }}
              className="group-hover:scale-105"
            />
            {/* Badges */}
            <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {isVerified && (
                  <span className="card-badge" style={{ background: 'rgba(13, 12, 10, 0.9)', color: 'white', backdropFilter: 'blur(4px)' }}>
                    <Shield size={10} /> ESCROW
                  </span>
                )}
              </div>
              {isAuction && (
                <span className="card-badge" style={{ background: 'var(--gold-600, #0D9488)', color: 'white' }}>
                  <Gavel size={10} /> AUCTION
                </span>
              )}
            </div>
            {carType && (
              <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
                <span style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', color: 'var(--warm-600)', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 9999 }}>
                  {carType}
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 4 }}>{car.make || car.title?.split(' ')[0]}</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--charcoal-900, #141210)', fontWeight: 600, marginBottom: 12 }}>
              {car.model || car.title}
            </h3>

            {/* Price */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontFamily: 'var(--font-sans)', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold-600, #0D9488)', textTransform: 'uppercase' }}>Price</p>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--charcoal-900, #141210)', fontWeight: 600 }}>
                KES {price?.toLocaleString('en-KE')}
              </p>
            </div>

            {/* Specs grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', paddingTop: 16, borderTop: '1px solid rgba(13, 148, 136, 0.2)' }}>
              {year && (
                <div>
                  <p style={{ fontSize: 9, fontFamily: 'var(--font-sans)', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--warm-400)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <Calendar size={9} /> Year
                  </p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--slate-900, #0F172A)' }}>{year}</p>
                </div>
              )}
              {mileage && (
                <div>
                  <p style={{ fontSize: 9, fontFamily: 'var(--font-sans)', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--warm-400)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <Gauge size={9} /> Mileage
                  </p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--slate-900, #0F172A)' }}>{mileage}</p>
                </div>
              )}
              {fuel && (
                <div>
                  <p style={{ fontSize: 9, fontFamily: 'var(--font-sans)', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--warm-400)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <Fuel size={9} /> Fuel
                  </p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--slate-900, #0F172A)' }}>{fuel}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: 9, fontFamily: 'var(--font-sans)', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--warm-400)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <MapPin size={9} /> City
                </p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--slate-900, #0F172A)' }}>{location}</p>
              </div>
            </div>

            {/* CTA */}
            <button style={{
              marginTop: 16,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--gold-600, #0D9488)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
              padding: '10px',
              border: '1px solid rgba(13, 148, 136, 0.3)',
              borderRadius: 12,
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}>
              View Details <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </Link>
    );
  }

  // Default variant - enhanced existing style
  return (
    <Link
      to={`/cars/${id}`}
      className="kd-car-card"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      {/* Image */}
      <div className="kd-car-card__img-wrap">
        <img
          src={primaryImage}
          alt={car.title}
          loading="lazy"
          className="kd-car-card__img"
        />
        {isLive && (
          <span className="kd-car-card__live-badge">
            <span className="live-dot" /> LIVE
          </span>
        )}
        
        {/* Trust badges overlay */}
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
        }}>
          {isVerified && (
            <span style={{
              background: 'rgba(34, 197, 94, 0.9)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              backdropFilter: 'blur(4px)',
            }}>
              ✓ Verified
            </span>
          )}
          {hasInspection && (
            <span style={{
              background: 'rgba(59, 130, 246, 0.9)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              backdropFilter: 'blur(4px)',
            }}>
              🔍 Inspected
            </span>
          )}
          {trustLabel && (
            <span style={{
              background: `rgba(${trustLabel.color === '#22c55e' ? '34,197,94' : trustLabel.color === '#3b82f6' ? '59,130,246' : '245,158,11'}, 0.9)`,
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              backdropFilter: 'blur(4px)',
            }}>
              🛡 {trustLabel.text}
            </span>
          )}
        </div>

        <button
          className={`kd-car-card__fav${fav ? ' kd-car-card__fav--active' : ''}`}
          onClick={handleFav}
          aria-label={fav ? 'Remove from favorites' : 'Save'}
        >
          {fav ? '♥' : '♡'}
        </button>
      </div>

      {/* Body */}
      <div className="kd-car-card__body">
        <h3 className="kd-car-card__title">{car.title}</h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
        }}>
          <span className="kd-car-card__dealer" style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 'calc(100% - 60px)',
          }}>
            {dealer}
          </span>
          {dealerRating && (
            <span style={{
              fontSize: 10,
              color: '#f59e0b',
              fontWeight: 600,
              flexShrink: 0,
            }}>
              ★ {dealerRating}
            </span>
          )}
        </div>
        
        {/* Price with market comparison */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
          <p className="kd-car-card__price">
            KES {(price || 0).toLocaleString()}
          </p>
          {priceVsMarket !== null && Math.abs(priceVsMarket) > 5 && (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              color: priceVsMarket < 0 ? '#22c55e' : '#ef4444',
              background: priceVsMarket < 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              padding: '1px 4px',
              borderRadius: 3,
            }}>
              {priceVsMarket < 0 ? '↓ Below Market' : '↑ Above Market'}
            </span>
          )}
          {dealRating && (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              color: dealRating === 'great' ? '#22c55e' : dealRating === 'good' ? '#3b82f6' : '#f59e0b',
              background: dealRating === 'great' ? 'rgba(34,197,94,0.1)' : dealRating === 'good' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
              padding: '1px 4px',
              borderRadius: 3,
              textTransform: 'uppercase',
            }}>
              {dealRating === 'great' ? 'Great Deal' : dealRating === 'good' ? 'Good' : 'Fair'}
            </span>
          )}
        </div>
        
        <div className="kd-car-card__meta">
          {mileage && (
            <span className="kd-car-card__meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              {mileage}
            </span>
          )}
          {fuel && (
            <span className="kd-car-card__meta-item">{fuel}</span>
          )}
          <span className="kd-car-card__meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {location}
          </span>
        </div>

        {/* Verification indicators */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}>
          {isNTSAVerified && (
            <span style={{
              fontSize: 9,
              color: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}>
              ✅ NTSA
            </span>
          )}
          {hasLogbook && (
            <span style={{
              fontSize: 9,
              color: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}>
              ✅ Logbook
            </span>
          )}
          {!isNTSAVerified && !hasLogbook && isVerified && (
            <span style={{
              fontSize: 9,
              color: 'var(--text-muted)',
            }}>
              Verified Dealer
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

const CarCard = memo(CarCardInner);
export default CarCard;
