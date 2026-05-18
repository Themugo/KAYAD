import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';
import { MapPin, Gauge, ChevronRight, ShieldCheck, Zap, Heart, Eye, BarChart3 } from 'lucide-react';

function firstImage(car) {
  if (car.image) return car.image;
  const imgs = car.images || [];
  for (const img of imgs) {
    if (typeof img === 'string' && img) return img;
    if (img?.url) return img.url;
  }
  return null;
}

const FALLBACK = 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1200&auto=format&fit=crop';

export default function CartyGrid({ car, listView }) {
  const [imgErr, setImgErr] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (imgRef.current?.complete) setImgLoaded(true);
  }, []);

  if (!car) return null;

  const isLive    = car.auctionStatus === 'live';
  const isElite   = isLive || car.allowBid || car.isAuction;
  const linkTo    = isLive ? `/auction/${car._id}` : `/cars/${car._id}`;
  const img       = (!imgErr && firstImage(car)) || FALLBACK;
  const city      = car.location?.city || car.location || 'Nairobi';
  const d         = car.dealer || {};
  const price     = Number(car.currentBid || car.price || 0);
  const priceStr  = price >= 1_000_000
    ? `${(price / 1_000_000).toFixed(1)}M`
    : price >= 1000
      ? `${(price / 1000).toFixed(0)}K`
      : price.toLocaleString();

  if (listView) {
    return (
      <Link to={linkTo} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{
          display: 'flex', alignItems: 'stretch',
          background: '#0A0A0A', borderBottom: '1px solid rgba(255,255,255,0.05)',
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#111'}
          onMouseLeave={e => e.currentTarget.style.background = '#0A0A0A'}
        >
          <div style={{ width: 160, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
            <img src={img} onError={() => setImgErr(true)} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {isLive && (
              <div style={{
                position: 'absolute', top: 6, left: 6,
                background: '#ef4444', borderRadius: 4, padding: '2px 6px',
                fontSize: 8, color: '#fff', fontWeight: 800, letterSpacing: '0.06em',
              }}>LIVE</div>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', minWidth: 0 }}>
            <div style={{ minWidth: 0, marginRight: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {car.title}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {car.mileage && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{car.mileage.toLocaleString()} KM</span>}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{city}</span>
                {car.year && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{car.year}</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                {isElite ? 'Bid' : 'Price'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                KES {priceStr}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  const { isComparing: ctxIsComparing, toggleCar, compareCount, maxCompare } = useCompare();
  const isCompared = ctxIsComparing(car._id);
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
    <Link to={linkTo} style={{ display: 'block', textDecoration: 'none' }}>
      <div className="car-card-premium" style={{
        background: '#0C0C0C',
        border: `1px solid ${hovered ? 'rgba(212,168,67,0.25)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'transform 0.35s cubic-bezier(0.2,0,0,1), border-color 0.35s ease, box-shadow 0.35s ease',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,168,67,0.08)' : '0 4px 12px rgba(0,0,0,0.2)',
      }}>
        <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden', background: '#111' }}>
          {!imgLoaded && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
          )}
          <img ref={imgRef}
            src={img}
            onError={() => setImgErr(true)}
            onLoad={() => setImgLoaded(true)}
            alt={car.title || 'Vehicle'}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.6s cubic-bezier(0.2,0,0,1), opacity 0.4s ease',
              transform: hovered ? 'scale(1.06)' : 'none',
              opacity: imgLoaded ? 1 : 0.3,
            }}
          />

          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.6) 100%)',
            transition: 'opacity 0.3s ease',
            opacity: hovered ? 0.7 : 1,
          }} />

          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {isLive && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(239,68,68,0.92)', backdropFilter: 'blur(8px)',
                borderRadius: 6, padding: '3px 8px',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'block', animation: 'pulse 1.2s infinite' }} />
                <span style={{ fontSize: 8, color: '#fff', fontWeight: 800, letterSpacing: '0.08em' }}>LIVE</span>
              </div>
            )}
            {!isLive && isElite && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(212,168,67,0.25)',
                borderRadius: 6, padding: '3px 7px',
              }}>
                <Zap size={7} style={{ color: 'var(--gold)' }} />
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>Auction</span>
              </div>
            )}
            {d.verified && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: 'rgba(59,130,246,0.85)', backdropFilter: 'blur(8px)',
                borderRadius: 6, padding: '3px 7px',
              }}>
                <ShieldCheck size={7} style={{ color: '#fff' }} />
                <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>Verified</span>
              </div>
            )}
          </div>

          {car.year && (
            <div style={{
              position: 'absolute', bottom: 8, right: 8,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
              borderRadius: 6, padding: '3px 8px',
              fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 700,
            }}>{car.year}</div>
          )}

          {hovered && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: 0, animation: 'fadeIn 0.25s ease forwards',
            }}>
              <span style={{
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                color: '#fff', fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Eye size={12} /> Quick View
              </span>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 14px 14px' }}>
          <h3 style={{
            fontSize: 13, fontWeight: 700, color: '#fff',
            margin: '0 0 8px', lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {car.title}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {car.mileage && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                <Gauge size={9} style={{ color: 'rgba(212,168,67,0.5)', flexShrink: 0 }} />
                {(car.mileage / 1000).toFixed(0)}k km
              </span>
            )}
            {car.mileage && city && <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'block', flexShrink: 0 }} />}
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              <MapPin size={9} style={{ color: 'rgba(212,168,67,0.5)', flexShrink: 0 }} />
              {city}
            </span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                {isElite ? 'Current Bid' : 'Price'}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
                fontSize: '1rem', color: 'var(--gold)', lineHeight: 1,
              }}>
                KES {priceStr}
              </div>
            </div>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: hovered ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${hovered ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s ease',
            }}>
              <ChevronRight size={13} style={{ color: hovered ? 'var(--gold)' : 'rgba(255,255,255,0.4)', transition: 'color 0.3s ease' }} />
            </div>
          </div>
        </div>
      </div>
    </Link>
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); toggleCar(car._id); }}
      title={isCompared ? 'Remove from compare' : compareCount >= maxCompare ? 'Max for comparison' : 'Add to compare'}
      style={{
        position: 'absolute', top: 8, right: 8,
        background: isCompared ? 'var(--gold)' : 'rgba(0,0,0,0.55)',
        border: `1px solid ${isCompared ? 'var(--gold)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 6, padding: '3px 7px', fontSize: 10,
        color: isCompared ? '#000' : 'rgba(255,255,255,0.65)',
        cursor: compareCount >= maxCompare && !isCompared ? 'not-allowed' : 'pointer',
        fontWeight: 700, opacity: compareCount >= maxCompare && !isCompared ? 0.4 : hovered ? 1 : 0.6,
        backdropFilter: 'blur(6px)', zIndex: 10,
        transition: 'all 0.25s ease',
      }}
    >
      {isCompared ? '✓' : <BarChart3 size={10} />}
    </button>
    </div>
  );
}
