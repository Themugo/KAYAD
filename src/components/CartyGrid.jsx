import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { useToast } from '../context/ToastContext';
import { favoritesAPI } from '../api/api';
import { MapPin, Gauge, ChevronRight, ShieldCheck, Zap, Heart, Eye, BarChart3, Fuel, Calendar, Settings, Flame } from 'lucide-react';
import LazyImage from './LazyImage';

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

function formatPrice(price) {
  if (!price) return '—';
  return price.toLocaleString('en-KE');
}

function daysAgo(date) {
  if (!date) return '';
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function CartyGrid({ car, listView, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [isFav, setIsFav] = useState(false);

  const navigate = useNavigate();
  const { isAuth } = useAuth();
  const { toast } = useToast();
  const { isComparing: ctxIsComparing, toggleCar, compareCount, maxCompare } = useCompare();
  const isCompared = ctxIsComparing(car._id);

  if (!car) return null;

  const handleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuth) { navigate(`/register?redirect=/showroom`); return; }
    try {
      const res = await favoritesAPI.toggle(car._id);
      const now = res.favorited === true || res.favorited === 'true';
      setIsFav(now);
      toast(now ? 'Saved to wishlist' : 'Removed from wishlist', 'success');
    } catch { toast('Failed to save', 'error'); }
  };

  const isLive    = car.auctionStatus === 'live';
  const isElite   = isLive || car.allowBid || car.isAuction;
  const linkTo    = isLive ? `/auction/${car._id}` : `/cars/${car._id}`;
  const img       = firstImage(car);
  const city      = car.location?.city || car.location || 'Nairobi';
  const d         = car.dealer || {};
  const price     = Number(car.currentBid || car.price || 0);
  const fuelIcon  = car.fuel?.toLowerCase() === 'diesel' ? '🛢️' : car.fuel?.toLowerCase() === 'electric' ? '⚡' : '⛽';

  if (listView) {
    return (
      <Link to={linkTo} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          background: '#0A0A0A',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          transition: 'background 0.2s',
          minHeight: isMobile ? 'auto' : 200,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#111'; setHovered(true); }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0A0A0A'; setHovered(false); }}
        >
          <div style={{
            width: isMobile ? '100%' : 220,
            height: isMobile ? 180 : 'auto',
            flexShrink: 0, overflow: 'hidden', position: 'relative',
          }}>
            <LazyImage src={img} fallback={FALLBACK} alt=""
              style={{ width: '100%', height: '100%', transform: hovered ? 'scale(1.05)' : 'none', transition: 'transform 0.4s ease' }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.5) 100%)',
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
                  border: '1px solid rgba(212,196,168,0.25)',
                  borderRadius: 6, padding: '3px 7px',
                }}>
                  <Zap size={7} style={{ color: 'var(--gold)' }} />
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>Auction</span>
                </div>
              )}
              {car.ntsaVerified && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  background: 'rgba(34,197,94,0.92)', backdropFilter: 'blur(8px)',
                  borderRadius: 6, padding: '3px 7px',
                }}>
                  <ShieldCheck size={7} style={{ color: '#fff' }} />
                  <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>NTSA OK</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', minWidth: 0, justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <h3 style={{
                  fontSize: 15, fontWeight: 700, color: '#fff',
                  margin: 0, lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {car.year && <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{car.year} </span>}
                  {car.title}
                </h3>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                    {isElite ? 'Current Bid' : 'Price'}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                    KES {formatPrice(price)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                {car.mileage != null && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                    <Gauge size={11} style={{ color: 'rgba(212,196,168,0.4)' }} />
                    {car.mileage.toLocaleString()} km
                  </span>
                )}
                {car.fuel && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                    <span style={{ fontSize: 11 }}>{fuelIcon}</span>
                    {car.fuel}
                  </span>
                )}
                {car.transmission && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                    <Settings size={11} style={{ color: 'rgba(212,196,168,0.4)' }} />
                    {car.transmission}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                  <MapPin size={11} style={{ color: 'rgba(212,196,168,0.4)' }} />
                  {city}
                </span>
                {car.bodyType && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                    {car.bodyType}
                  </span>
                )}
              </div>

              {car.description && (
                <p style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.35)',
                  margin: '0 0 8px', lineHeight: 1.5,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {car.description}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                  {daysAgo(car.createdAt)}
                </span>
                {car.views > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                    <Eye size={10} /> {car.views}
                  </span>
                )}
                {car.bidsCount > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                    <Flame size={10} /> {car.bidsCount} bids
                  </span>
                )}
                {car.isVerifiedDealer && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#3b82f6' }}>
                    <ShieldCheck size={10} /> Verified dealer
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={handleFav} title={isFav ? 'Remove from wishlist' : 'Save to wishlist'} style={{
                  padding: '6px 10px', borderRadius: 6,
                  background: isFav ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isFav ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  color: isFav ? '#ef4444' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', fontSize: 10, fontWeight: 600, transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 4,
                  opacity: hovered ? 1 : 0.6,
                }}>
                  <Heart size={11} fill={isFav ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); toggleCar(car._id); }}
                  title={isCompared ? 'Remove from compare' : compareCount >= maxCompare ? 'Max for comparison' : 'Add to compare'}
                  style={{
                    padding: '6px 10px', borderRadius: 6,
                    background: isCompared ? 'rgba(212,196,168,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isCompared ? 'rgba(212,196,168,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    color: isCompared ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
                    cursor: compareCount >= maxCompare && !isCompared ? 'not-allowed' : 'pointer',
                    fontSize: 10, fontWeight: 600, transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: 4,
                    opacity: compareCount >= maxCompare && !isCompared ? 0.4 : hovered ? 1 : 0.6,
                  }}
                >
                  <BarChart3 size={11} /> {isCompared ? 'Added' : 'Compare'}
                </button>
                <span style={{
                  padding: '6px 14px', borderRadius: 6,
                  background: 'rgba(212,196,168,0.1)',
                  color: 'var(--gold)', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'all 0.2s',
                }}>
                  View Details <ChevronRight size={11} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  const isComparedGrid = ctxIsComparing(car._id);

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
    <Link to={linkTo} style={{ display: 'block', textDecoration: 'none' }}>
      <div className="car-card-premium" style={{
        background: '#0C0C0C',
        border: `1px solid ${hovered ? 'rgba(212,196,168,0.25)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'transform 0.35s cubic-bezier(0.2,0,0,1), border-color 0.35s ease, box-shadow 0.35s ease',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,196,168,0.08)' : '0 4px 12px rgba(0,0,0,0.2)',
      }}>
        <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden', background: '#111' }}>
          <div style={{ width: '100%', height: '100%', transform: hovered ? 'scale(1.06)' : 'none', transition: 'transform 0.6s cubic-bezier(0.2,0,0,1)' }}>
            <LazyImage src={img} fallback={FALLBACK} alt={car.title || 'Vehicle'} style={{ width: '100%', height: '100%' }} />
          </div>

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
                border: '1px solid rgba(212,196,168,0.25)',
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
            {car.ntsaVerified && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: 'rgba(34,197,94,0.92)', backdropFilter: 'blur(8px)',
                borderRadius: 6, padding: '3px 7px',
              }}>
                <ShieldCheck size={7} style={{ color: '#fff' }} />
                <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>NTSA OK</span>
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
            {car.mileage != null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                <Gauge size={9} style={{ color: 'rgba(212,196,168,0.5)', flexShrink: 0 }} />
                {(car.mileage / 1000).toFixed(0)}k km
              </span>
            )}
            {car.mileage != null && city && <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'block', flexShrink: 0 }} />}
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              <MapPin size={9} style={{ color: 'rgba(212,196,168,0.5)', flexShrink: 0 }} />
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
                KES {formatPrice(price)}
              </div>
            </div>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: hovered ? 'rgba(212,196,168,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${hovered ? 'rgba(212,196,168,0.2)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s ease',
            }}>
              <ChevronRight size={13} style={{ color: hovered ? 'var(--gold)' : 'rgba(255,255,255,0.4)', transition: 'color 0.3s ease' }} />
            </div>
          </div>
        </div>
      </div>
    </Link>
    <button onClick={handleFav} title={isFav ? 'Remove from wishlist' : 'Save to wishlist'} style={{
      position: 'absolute', top: 8, right: 8, zIndex: 10,
      background: isFav ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.55)',
      border: `1px solid ${isFav ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: 6, padding: '3px 7px',
      color: isFav ? '#fff' : 'rgba(255,255,255,0.65)',
      cursor: 'pointer', display: 'flex',
      backdropFilter: 'blur(6px)', transition: 'all 0.25s ease',
    }}>
      <Heart size={10} fill={isFav ? 'currentColor' : 'none'} />
    </button>
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); toggleCar(car._id); }}
      title={isComparedGrid ? 'Remove from compare' : compareCount >= maxCompare ? 'Max for comparison' : 'Add to compare'}
      style={{
        position: 'absolute', top: 36, right: 8,
        background: isComparedGrid ? 'var(--gold)' : 'rgba(0,0,0,0.55)',
        border: `1px solid ${isComparedGrid ? 'var(--gold)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 6, padding: '3px 7px', fontSize: 10,
        color: isComparedGrid ? '#000' : 'rgba(255,255,255,0.65)',
        cursor: compareCount >= maxCompare && !isComparedGrid ? 'not-allowed' : 'pointer',
        fontWeight: 700, opacity: compareCount >= maxCompare && !isComparedGrid ? 0.4 : hovered ? 1 : 0.6,
        backdropFilter: 'blur(6px)', zIndex: 10,
        transition: 'all 0.25s ease',
      }}
    >
      {isComparedGrid ? '✓' : <BarChart3 size={10} />}
    </button>
    </div>
  );
}
