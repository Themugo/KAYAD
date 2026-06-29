import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCompare } from '../context/CompareContext';
import { timeAgo } from '../utils/helpers';
import { MapPin, Gauge, Settings, BarChart3, ChevronRight, Gavel, ShieldCheck, Zap } from 'lucide-react';
import LazyImage from './LazyImage';

const FALLBACK = 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1200&auto=format&fit=crop';

interface CarImage {
  url?: string;
}

interface CarLocation {
  city?: string;
}

interface Car {
  _id: string;
  title: string;
  image?: string;
  images?: (string | CarImage)[];
  auctionStartTime?: string;
  auctionEnd?: string;
  currentBid?: number;
  price?: number;
  location?: string | CarLocation;
  year?: number;
  fuel?: string;
  transmission?: string;
  mileage?: number;
  views?: number;
  createdAt?: string;
  ntsaVerified?: boolean;
  isVerifiedDealer?: boolean;
  isDemo?: boolean;
  dealer?: { role?: string };
}

function firstImage(car: Car): string | null {
  if (car.image) return car.image;
  const imgs = car.images || [];
  for (const img of imgs) {
    if (typeof img === 'string' && img) return img;
    if (typeof img === 'object' && img?.url) return img.url;
  }
  return null;
}

interface CarGridItemProps {
  car: Car;
  listView?: boolean;
  isMobile?: boolean;
}

const CarGridItem = memo(function CarGridItem({ car, listView = false, isMobile = false }: CarGridItemProps) {
  const [hovered, setHovered] = useState(false);
  const { isComparing, toggleCar } = useCompare();

  if (!car) return null;

  const isCompared = isComparing(car._id);
  const now = Date.now();
  const auctionStartTime = car.auctionStartTime ? new Date(car.auctionStartTime).getTime() : 0;
  const auctionEnd = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const isLiveNow   = auctionStartTime > 0 && auctionEnd > 0 && auctionStartTime <= now && auctionEnd > now;
  const isScheduled = auctionStartTime > now;
  const isOnAuction = isLiveNow || isScheduled;

  const detailTo  = `/cars/${car._id}`;
  const auctionTo = `/auction/${car._id}`;
  const img  = firstImage(car);
  const city = typeof car.location === 'string' ? car.location : (car.location?.city || 'Nairobi');
  const price = Number(car.currentBid || car.price || 0);
  const sellerRole = car.dealer?.role;
  const isPrivateSeller = sellerRole === 'individual_seller' || sellerRole === 'user';

  const fuelIcon = car.fuel?.toLowerCase() === 'diesel'   ? '🛢️'
                 : car.fuel?.toLowerCase() === 'electric' ? '⚡' : '⛽';

  // ═══════════════════════════════════════════════════════════════
  // LIST VIEW — premium horizontal card
  // ═══════════════════════════════════════════════════════════════
  if (listView) {
    const imgW = isMobile ? 130 : 290;
    const imgH = isMobile ? 110 : 190;

    return (
      <motion.div
        whileHover={{ borderColor: 'rgba(212,196,168,0.22)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        style={{
          display: 'flex',
          flexDirection: 'row',
          background: '#0C0C0C',
          borderRadius: isMobile ? 12 : 16,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}
      >
        {/* ─── Thumbnail ─── */}
        <Link
          to={isOnAuction ? auctionTo : detailTo}
          style={{ position: 'relative', flexShrink: 0, width: imgW, height: imgH, display: 'block', overflow: 'hidden', background: '#080808' }}
        >
          <LazyImage
            src={img}
            fallback={FALLBACK}
            alt={car.title}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.4s ease',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
            }}
          />

          {/* Status badges */}
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {isLiveNow && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, fontSize: 8, fontWeight: 800, background: 'rgba(239,68,68,0.92)', color: '#fff', letterSpacing: '0.06em' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                LIVE
              </div>
            )}
            {isScheduled && !isLiveNow && (
              <div style={{ padding: '3px 8px', borderRadius: 20, fontSize: 8, fontWeight: 700, background: 'rgba(212,196,168,0.16)', color: 'var(--gold)', border: '1px solid rgba(212,196,168,0.3)', letterSpacing: '0.06em' }}>
                Upcoming
              </div>
            )}
          </div>

          {/* Year tag */}
          {car.year && (
            <div style={{ position: 'absolute', bottom: 7, left: 8, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)' }}>
              {car.year}
            </div>
          )}

          {/* Demo sticker */}
          {car.isDemo && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', background: 'rgba(245,158,11,0.92)', color: '#1a1200', padding: '2px 6px', borderRadius: 4 }}>DEMO</span>
            </div>
          )}

          {/* Dark gradient on right edge for seamless blend */}
          {!isMobile && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(12,12,12,0.5) 100%)' }} />
          )}
        </Link>

        {/* ─── Content ─── */}
        <Link
          to={detailTo}
          style={{ flex: 1, padding: isMobile ? '10px 12px' : '14px 18px', display: 'flex', flexDirection: 'column', minWidth: 0, textDecoration: 'none', color: 'inherit' }}
        >
          {/* Top row — title + price */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: isMobile ? 4 : 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontSize: isMobile ? 13 : 16,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  color: hovered ? 'var(--gold-light)' : '#fff',
                  transition: 'color 0.2s',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: isMobile ? 'nowrap' : 'normal',
                  display: '-webkit-box',
                  WebkitLineClamp: isMobile ? 1 : 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {car.year && !isMobile && (
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginRight: 4 }}>{car.year}</span>
                )}
                {car.title}
              </h3>
            </div>

            {/* Price */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                {isOnAuction ? (car.currentBid && car.currentBid > 0 ? 'Current Bid' : 'Start') : 'Price'}
              </div>
              <div style={{ fontSize: isMobile ? 13 : 17, fontWeight: 800, color: 'var(--gold-light)', lineHeight: 1, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                KES {price.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Meta chips — fuel, mileage, transmission, location */}
          {!isMobile && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>
              {car.mileage ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Gauge size={11} /> {(car.mileage / 1000).toFixed(0)}k km
                </span>
              ) : null}
              {car.fuel ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{fuelIcon}</span> {car.fuel}
                </span>
              ) : null}
              {car.transmission ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Settings size={11} /> {car.transmission}
                </span>
              ) : null}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} /> {city}
              </span>
            </div>
          )}

          {/* Mobile minimal meta */}
          {isMobile && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              {city && <span><MapPin size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {city}</span>}
              {car.mileage ? <span>{(car.mileage / 1000).toFixed(0)}k km</span> : null}
            </div>
          )}

          {/* Trust badges row */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {car.ntsaVerified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 5, padding: '2px 8px', letterSpacing: '0.04em' }}>
                  <ShieldCheck size={9} /> NTSA OK
                </span>
              )}
              {car.isVerifiedDealer && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 5, padding: '2px 8px', letterSpacing: '0.04em' }}>
                  <Zap size={9} /> Verified Dealer
                </span>
              )}
              {isPrivateSeller && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, background: 'rgba(212,196,168,0.08)', color: 'var(--gold)', border: '1px solid rgba(212,196,168,0.18)', borderRadius: 5, padding: '2px 8px', letterSpacing: '0.04em' }}>
                  🔒 Escrow Protected
                </span>
              )}
            </div>
          )}

          {/* Footer — views/age + actions */}
          <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {!isMobile && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', display: 'flex', gap: 8 }}>
                {car.views ? <span>{car.views.toLocaleString()} views</span> : null}
                {car.createdAt ? <span>{timeAgo(car.createdAt)}</span> : null}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
              {/* Compare button */}
              {!isMobile && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); toggleCar(car._id); }}
                  title={isCompared ? 'Remove from compare' : 'Add to compare'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 10, fontWeight: 700,
                    background: isCompared ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                    color: isCompared ? '#000' : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!isCompared) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; } }}
                  onMouseLeave={e => { if (!isCompared) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; } }}
                >
                  <BarChart3 size={11} /> Compare
                </button>
              )}

              {/* Auction or view CTA */}
              {isOnAuction ? (
                <Link
                  to={auctionTo}
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 8, textDecoration: 'none',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
                    background: isLiveNow ? 'rgba(239,68,68,0.15)' : 'rgba(212,196,168,0.1)',
                    color: isLiveNow ? '#ef4444' : 'var(--gold)',
                    border: `1px solid ${isLiveNow ? 'rgba(239,68,68,0.3)' : 'rgba(212,196,168,0.25)'}`,
                  }}
                >
                  <Gavel size={11} />
                  {isLiveNow ? 'Bid Live' : 'View Auction'}
                </Link>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 700, color: hovered ? 'var(--gold)' : 'rgba(255,255,255,0.25)',
                  transition: 'color 0.2s',
                }}>
                  View <ChevronRight size={13} />
                </div>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // GRID VIEW — vertical card
  // ═══════════════════════════════════════════════════════════════
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className="group relative"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <div className="card h-full flex flex-col overflow-hidden">
        {/* Image */}
        <Link to={detailTo} className="block">
          <div className="car-img-wrap relative">
            <LazyImage
              src={img}
              fallback={FALLBACK}
              alt={car.title}
              className="w-full h-full"
            />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {isLiveNow && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold"
                  style={{ background: 'rgba(239,68,68,0.92)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  LIVE
                </div>
              )}
              {isScheduled && !isLiveNow && (
                <div className="badge badge-gold text-[9px]" style={{ backdropFilter: 'blur(4px)' }}>Upcoming</div>
              )}
              {car.isDemo && (
                <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', background: 'rgba(245,158,11,0.92)', color: '#1a1200', padding: '2px 7px', borderRadius: 4, display: 'inline-block', backdropFilter: 'blur(4px)' }}>DEMO</span>
              )}
            </div>

            {car.year && (
              <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
                {car.year}
              </div>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="p-4 flex-1 flex flex-col">
          <Link to={detailTo} className="block">
            <h3 className="font-semibold text-[15px] leading-snug mb-2 line-clamp-1 group-hover:text-gold transition-colors" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              {car.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
              {car.mileage && (
                <span className="flex items-center gap-1">
                  <Gauge size={13} /> {(car.mileage / 1000).toFixed(0)}k km
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {city}
              </span>
            </div>
          </Link>

          {/* Footer */}
          <div className="mt-auto pt-3 border-t border-border flex items-stretch">
            <Link to={detailTo} className="flex-1 min-w-0 block group/price">
              <div className="text-[9px] uppercase tracking-wider text-text-muted font-bold">
                {isOnAuction ? (car.currentBid && car.currentBid > 0 ? 'Current Bid' : 'Starting Bid') : 'Price'}
              </div>
              <div className="price-tag text-base font-bold text-gold-light leading-tight" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                KES {price.toLocaleString()}
              </div>
            </Link>

            {isOnAuction ? (
              <Link
                to={auctionTo}
                className="card-auction-enter flex flex-col items-center justify-center pl-3 ml-3 border-l border-border text-gold"
                title="Enter auction room"
              >
                <Gavel size={16} className={isLiveNow ? 'text-red-400' : 'text-gold'} />
                <span className="text-[8px] font-bold uppercase tracking-wider mt-1 whitespace-nowrap">
                  {isLiveNow ? 'Bid Live' : 'Auction'}
                </span>
              </Link>
            ) : (
              <Link to={detailTo} className="flex items-center pl-3 ml-3 border-l border-border">
                <ChevronRight size={18} className="text-gold opacity-40 group-hover:opacity-100 transition-opacity" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Compare button */}
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); toggleCar(car._id); }}
        title={isCompared ? 'Remove from compare' : 'Add to compare'}
        className={`absolute top-3 right-3 z-20 p-2 rounded-full backdrop-blur-md transition-all hover:scale-110 border opacity-0 group-hover:opacity-100 ${
          isCompared ? 'bg-gold text-black border-gold opacity-100' : 'bg-black/60 text-white border-white/20 hover:border-gold'
        }`}
      >
        <BarChart3 size={15} />
      </button>
    </motion.div>
  );
});

export default CarGridItem;
