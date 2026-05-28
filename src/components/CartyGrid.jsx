// src/components/CartyGrid.jsx  (or rename to CarGridItem.jsx)
import { useState, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../utils/helpers';
import { MapPin, Gauge, Settings, BarChart3, ChevronRight, Gavel } from 'lucide-react';
import LazyImage from './LazyImage';

const FALLBACK = 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1200&auto=format&fit=crop';

function firstImage(car) {
  if (car.image) return car.image;
  const imgs = car.images || [];
  for (const img of imgs) {
    if (typeof img === 'string' && img) return img;
    if (img?.url) return img.url;
  }
  return null;
}

const CarGridItem = memo(function CarGridItem({ car, listView = false, isMobile = false }) {
  const [hovered, setHovered] = useState(false);

  const navigate = useNavigate();
  const { isAuth } = useAuth();
  const { toast } = useToast();
  const { isComparing, toggleCar, compareCount, maxCompare } = useCompare();

  if (!car) return null;

  const isCompared = isComparing(car._id);

  // Time-aware auction status
  const now = Date.now();
  const auctionStart = car.auctionStart ? new Date(car.auctionStart).getTime() : 0;
  const auctionEnd = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const isLiveNow = auctionStart > 0 && auctionEnd > 0 && auctionStart <= now && auctionEnd > now;
  const isScheduled = auctionStart > now;
  const isOnAuction = isLiveNow || isScheduled;
  const isLiveAuction = isLiveNow;

  const detailTo = `/cars/${car._id}`;
  const auctionTo = `/auction/${car._id}`;
  const linkTo = detailTo;
  const img = firstImage(car);
  const city = car.location?.city || car.location || 'Nairobi';
  const price = Number(car.currentBid || car.price || 0);

  const fuelIcon = car.fuel?.toLowerCase() === 'diesel' ? '🛢️' 
                 : car.fuel?.toLowerCase() === 'electric' ? '⚡' : '⛽';

  // ===================== LIST VIEW =====================
  if (listView) {
    return (
      <Link to={linkTo} className="block">
        <motion.div
          whileHover={{ backgroundColor: '#111' }}
          className="flex flex-col md:flex-row bg-card border-b border-border hover:border-gold/30 transition-all duration-300 min-h-[200px]"
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
        >
          {/* Image */}
          <div className="md:w-[220px] h-[180px] md:h-auto flex-shrink-0 relative overflow-hidden">
            <LazyImage
              src={img}
              fallback={FALLBACK}
              alt={car.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {isLiveNow && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold"
                  style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  LIVE
                </div>
              )}
              {isScheduled && <div className="badge badge-gold text-xs">Upcoming</div>}
              {car.ntsaVerified && (
                <div className="badge badge-green text-xs">NTSA OK</div>
              )}
            </div>

            {car.isDemo && (
              <div className="absolute top-3 right-3">
                <span style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: '0.08em',
                  background: 'rgba(249,115,22,0.85)', color: '#fff',
                  padding: '2px 6px', borderRadius: 4,
                }}>DEMO</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col">
            <div className="flex justify-between items-start gap-4">
              <h3 className="text-[15px] font-semibold line-clamp-1 flex-1">
                {car.year && <span className="text-text-muted">{car.year} </span>}
                {car.title}
              </h3>

              <div className="text-right">
                <div className="text-[9px] text-text-muted uppercase tracking-widest font-bold">
                  {isOnAuction ? (car.currentBid > 0 ? 'Current Bid' : 'Starting Bid') : 'Price'}
                </div>
                <div className="price-tag text-base font-bold text-gold-light leading-tight">
                  KES {price.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted mt-2">
              {car.mileage && (
                <span className="flex items-center gap-1.5">
                  <Gauge size={13} /> {car.mileage.toLocaleString()} km
                </span>
              )}
              {car.fuel && (
                <span className="flex items-center gap-1.5">
                  <span>{fuelIcon}</span> {car.fuel}
                </span>
              )}
              {car.transmission && (
                <span className="flex items-center gap-1.5">
                  <Settings size={13} /> {car.transmission}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin size={13} /> {city}
              </span>
            </div>

            {/* Bottom Bar */}
            <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-sm">
              <div className="text-text-muted text-xs">
                {car.views && `${car.views} views • `}
                {car.createdAt && `${timeAgo(car.createdAt)}`}
              </div>

              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCar(car._id); }}
                title={isCompared ? 'Remove from compare' : 'Add to compare'}
                className={`p-2 rounded-xl transition-colors ${isCompared ? 'bg-gold text-black' : 'hover:bg-surface text-text-muted'}`}
              >
                <BarChart3 size={16} />
              </button>
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
    >
      <div className="card h-full flex flex-col overflow-hidden">
        {/* Image + core info → car details */}
        <Link to={detailTo} className="block">
          <div className="car-img-wrap relative">
            <LazyImage
              src={img}
              fallback={FALLBACK}
              alt={car.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {isLiveNow && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold"
                  style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  LIVE
                </div>
              )}
              {isScheduled && <div className="badge badge-gold text-[9px]">Upcoming</div>}
              {car.isDemo && (
                <span style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: '0.08em',
                  background: 'rgba(249,115,22,0.85)', color: '#fff',
                  padding: '2px 6px', borderRadius: 4, display: 'inline-block',
                }}>DEMO</span>
              )}
            </div>

            {car.year && (
              <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-bold px-2.5 py-1 rounded">
                {car.year}
              </div>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="p-4 flex-1 flex flex-col">
          <Link to={detailTo} className="block">
            <h3 className="font-semibold text-[15px] leading-snug mb-2 line-clamp-1 group-hover:text-gold transition-colors">
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

          {/* ── Split footer: price → details · segment → auction room ── */}
          <div className="mt-auto pt-3 border-t border-border flex items-stretch">
            <Link to={detailTo} className="flex-1 min-w-0 block group/price">
              <div className="text-[9px] uppercase tracking-wider text-text-muted font-bold">
                {isOnAuction ? (car.currentBid > 0 ? 'Current Bid' : 'Starting Bid') : 'Price'}
              </div>
              <div className="price-tag text-base font-bold text-gold-light leading-tight">
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

      {/* Compare — subtle, appears on hover */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCar(car._id); }}
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
