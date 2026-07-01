import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gauge, MapPin, ArrowRight } from 'lucide-react';
import LazyImage from './LazyImage';

const FALLBACK = 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1200&auto=format&fit=crop';

interface CarImage { url?: string; }
interface CarLocation { city?: string; }

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

  if (!car) return null;

  const now = Date.now();
  const auctionStartTime = car.auctionStartTime ? new Date(car.auctionStartTime).getTime() : 0;
  const auctionEnd = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const isLiveNow = auctionStartTime > 0 && auctionEnd > 0 && auctionStartTime <= now && auctionEnd > now;
  const isOnAuction = isLiveNow || (auctionStartTime > now);

  const detailTo = `/cars/${car._id}`;
  const img = firstImage(car) || undefined;
  const city = typeof car.location === 'string' ? car.location : (car.location?.city || 'Nairobi');
  const price = Number(car.currentBid || car.price || 0);
  const sellerName = car.dealer?.name || car.seller?.name || 'Private Seller';

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
          }}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
        >
          <div style={{
            width: isMobile ? '100%' : 300, height: isMobile ? 200 : 200,
            flexShrink: 0, position: 'relative', overflow: 'hidden', background: '#0A0A0A',
          }}>
            <LazyImage src={img} fallback={FALLBACK} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.5), transparent)', opacity: hovered ? 0 : 1 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }} />
            {isLiveNow && (
              <div style={{ position: 'absolute', top: 10, left: 10, padding: '3px 9px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,0.92)', color: '#fff', letterSpacing: '0.06em' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite', marginRight: 4 }} />
                LIVE
              </div>
            )}
            {car.isDemo && (
              <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', background: 'rgba(245,158,11,0.92)', color: '#1a1200', padding: '2px 7px', borderRadius: 4 }}>DEMO</span>
              </div>
            )}
          </div>
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3, margin: 0, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                  {car.year && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>{car.year} </span>}
                  {car.title}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                  {car.mileage && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Gauge size={12} /> {car.mileage.toLocaleString()} km</span>}
                  {car.transmission && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>⚙️ {car.transmission}</span>}
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
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <Link to={detailTo} className="block no-underline">
        <div className="overflow-hidden rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', background: '#0A0A0A' }}>
            <LazyImage src={img} fallback={FALLBACK} alt={car.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }} />
            {car.escrowEnabled && (
              <div style={{ position: 'absolute', top: 10, left: 10, padding: '3px 10px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: 'rgba(34,197,94,0.92)', color: '#fff', letterSpacing: '0.06em', backdropFilter: 'blur(4px)' }}>
                Escrow Protected
              </div>
            )}
            {isLiveNow && (
              <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,0.92)', color: '#fff', letterSpacing: '0.06em', backdropFilter: 'blur(4px)' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
                LIVE
              </div>
            )}
            {car.isPromoted && (
              <div style={{ position: 'absolute', bottom: 10, left: 10, padding: '2px 8px', borderRadius: 9999, fontSize: 8, fontWeight: 700, background: 'rgba(212,196,168,0.9)', color: '#000', letterSpacing: '0.08em' }}>
                Featured
              </div>
            )}
          </div>

          <div style={{ padding: '14px 16px 16px' }}>
            <div style={{ marginBottom: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 2px', fontFamily: 'var(--font-display)', fontStyle: 'italic', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {car.year && <>{car.year} </>}{car.title}
              </h3>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{sellerName}</div>
            </div>

            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)', marginBottom: 10, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              KES {price.toLocaleString()}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>
              {car.mileage && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Gauge size={11} /> {(car.mileage / 1000).toFixed(0)}k km</span>}
              {car.fuel && <span>{car.fuel}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} /> {city}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>
              View Details <ArrowRight size={12} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

export default CarGridItem;
