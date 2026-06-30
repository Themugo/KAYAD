import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCompare } from '../context/CompareContext';
import { timeAgo } from '../utils/helpers';
import { MapPin, Gauge, Settings, BarChart3, ChevronRight, Gavel } from 'lucide-react';
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
  isDemo?: boolean;
  isPromoted?: boolean;
  escrowEnabled?: boolean;
  dealer?: { name?: string; logo?: string; _id?: string };
  seller?: { name?: string; avatar?: string; _id?: string };
}

function firstImage(car: Car): string | undefined {
  if (car.image) return car.image;
  const imgs = car.images || [];
  for (const img of imgs) {
    if (typeof img === 'string' && img) return img;
    if (typeof img === 'object' && img?.url) return img.url;
  }
  return undefined;
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
  const isLiveNow = auctionStartTime > 0 && auctionEnd > 0 && auctionStartTime <= now && auctionEnd > now;
  const isScheduled = auctionStartTime > now;
  const isOnAuction = isLiveNow || isScheduled;
  const isLiveAuction = isLiveNow;
  const isPromoted = car.isPromoted;

  const detailTo = `/cars/${car._id}`;
  const auctionTo = `/auction/${car._id}`;
  const img = firstImage(car) || undefined;
  const city = typeof car.location === 'string' ? car.location : (car.location?.city || 'Nairobi');
  const price = Number(car.currentBid || car.price || 0);
  const sellerName = car.dealer?.name || car.seller?.name || 'Private Seller';

  const fuelIcon = car.fuel?.toLowerCase() === 'diesel' ? '🛢️'
                 : car.fuel?.toLowerCase() === 'electric' ? '⚡' : '⛽';

  // ===================== LIST VIEW =====================
  if (listView) {
    return (
      <Link to={detailTo} className="block group">
        <motion.div
          whileHover={{ backgroundColor: '#111' }}
          style={{
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            background: '#0C0C0C', borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
        >
          {/* Image */}
          <div style={{
            width: isMobile ? '100%' : 300,
            height: isMobile ? 200 : 200,
            flexShrink: 0, position: 'relative', overflow: 'hidden',
            background: '#0A0A0A',
          }}>
            <LazyImage
              src={img}
              fallback={FALLBACK}
              alt={car.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.5), transparent)',
              transition: 'opacity 0.3s',
              opacity: hovered ? 0 : 1,
            }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }} />

            {/* Badges */}
            <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {isLiveNow && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,0.92)', color: '#fff', letterSpacing: '0.06em' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite', marginRight: 4 }} />
                  LIVE
                </div>
              )}
              {isScheduled && (
                <div style={{ padding: '3px 9px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: 'rgba(212,196,168,0.16)', color: 'var(--gold)', border: '1px solid rgba(212,196,168,0.3)', letterSpacing: '0.06em' }}>
                  Upcoming
                </div>
              )}
              {car.ntsaVerified && (
                <div style={{ padding: '3px 9px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: 'rgba(34,197,94,0.16)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)', letterSpacing: '0.06em' }}>
                  NTSA OK
                </div>
              )}
            </div>

            {car.isDemo && (
              <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', background: 'rgba(245,158,11,0.92)', color: '#1a1200', padding: '2px 7px', borderRadius: 4 }}>DEMO</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3, margin: 0, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                  {car.year && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>{car.year} </span>}
                  {car.title}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                  {car.mileage && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Gauge size={12} /> {car.mileage.toLocaleString()} km</span>
                  )}
                  {car.fuel && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span>{fuelIcon}</span> {car.fuel}</span>
                  )}
                  {car.transmission && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Settings size={12} /> {car.transmission}</span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {city}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {isOnAuction ? (car.currentBid && car.currentBid > 0 ? 'Current Bid' : 'Starting Bid') : 'Price'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold-light)', lineHeight: 1.2, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                  KES {price.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {car.views && `${car.views} views`}
                {car.views && car.createdAt && <span style={{ margin: '0 6px', opacity: 0.3 }}>·</span>}
                {car.createdAt && <span>{timeAgo(car.createdAt)}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCar(car._id); }}
                  title={isCompared ? 'Remove from compare' : 'Add to compare'}
                  style={{
                    padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    background: isCompared ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                    color: isCompared ? '#000' : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                  onMouseEnter={e => { if (!isCompared) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
                  onMouseLeave={e => { if (!isCompared) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
                >
                  <BarChart3 size={13} /> Compare
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  // ===================== GRID VIEW =====================
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className="group relative"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={isPromoted ? {
        border: '1px solid rgba(212,196,168,0.3)',
        boxShadow: '0 0 20px rgba(212,196,168,0.1)',
      } : {}}
    >
      <div className="card h-full flex flex-col overflow-hidden rounded-xl" style={isPromoted ? { background: 'linear-gradient(135deg, rgba(212,196,168,0.05) 0%, var(--card) 100%)' } : {}}>
        {/* Promoted badge */}
        {isPromoted && (
          <div className="absolute top-3 right-3 z-30">
            <span className="text-[8px] font-bold tracking-widest text-gold uppercase bg-gold/10 px-2.5 py-1 rounded-full border border-gold/20 backdrop-blur-md">
              Featured
            </span>
          </div>
        )}

        {/* Image */}
        <Link to={detailTo} className="block">
          <div className="car-img-wrap relative" style={{ height: isPromoted ? '220px' : '200px' }}>
            <LazyImage
              src={img}
              fallback={FALLBACK}
              alt={car.title}
              className="w-full h-full object-cover"
              style={{ objectFit: 'cover' }}
            />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
              {isLiveNow && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold"
                  style={{ background: 'rgba(239,68,68,0.92)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  LIVE
                </div>
              )}
              {isScheduled && (
                <div className="badge badge-gold text-[9px]" style={{ backdropFilter: 'blur(4px)' }}>Upcoming</div>
              )}
              {car.escrowEnabled && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold"
                  style={{ background: 'rgba(34,197,94,0.92)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                  Escrow
                </div>
              )}
              {car.isDemo && (
                <span style={{
                  fontSize: 7, fontWeight: 800, letterSpacing: '0.1em',
                  background: 'rgba(245,158,11,0.92)', color: '#1a1200',
                  padding: '2px 7px', borderRadius: 4, display: 'inline-block',
                  backdropFilter: 'blur(4px)',
                }}>DEMO</span>
              )}
            </div>

            {car.year && (
              <div style={{
                position: 'absolute', bottom: 10, right: 10,
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                color: '#fff', fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
              }}>
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

            {/* Dealer/Seller info */}
            <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
              <span className="font-medium text-white/70">{sellerName}</span>
            </div>

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
                <Gavel size={16} className={isLiveAuction ? 'text-red-400' : 'text-gold'} />
                <span className="text-[8px] font-bold uppercase tracking-wider mt-1 whitespace-nowrap">
                  {isLiveAuction ? 'Bid Live' : 'Auction'}
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
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCar(car._id); }}
        title={isCompared ? 'Remove from compare' : 'Add to compare'}
        className={`absolute top-3 right-3 z-20 p-2 rounded-full backdrop-blur-md transition-all hover:scale-110 border opacity-0 group-hover:opacity-100 ${
          isCompared ? 'bg-gold text-black border-gold opacity-100' : 'bg-black/60 text-white border-white/20 hover:border-gold'
        }`}
        style={isPromoted ? { top: '3.5rem' } : {}}
      >
        <BarChart3 size={15} />
      </button>
    </motion.div>
  );
});

export default CarGridItem;
