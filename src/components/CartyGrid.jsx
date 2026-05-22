// src/components/CartyGrid.jsx  (or rename to CarGridItem.jsx)
import { useState, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { useToast } from '../context/ToastContext';
import { favoritesAPI } from '../api/api';
import { timeAgo } from '../utils/helpers';
import { MapPin, Gauge, Settings, ShieldCheck, Heart, Eye, Zap, Flame, BarChart3, ChevronRight } from 'lucide-react';
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
  const [isFav, setIsFav] = useState(false);
  const [hovered, setHovered] = useState(false);

  const navigate = useNavigate();
  const { isAuth } = useAuth();
  const { toast } = useToast();
  const { isComparing, toggleCar, compareCount, maxCompare } = useCompare();

  if (!car) return null;

  const isCompared = isComparing(car._id);
  const isLive = car.auctionStatus === 'live' || car.allowBid || car.isAuction;
  const linkTo = isLive ? `/auction/${car._id}` : `/cars/${car._id}`;
  const img = firstImage(car);
  const city = car.location?.city || car.location || 'Nairobi';
  const price = Number(car.currentBid || car.price || 0);

  const handleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuth) {
      navigate(`/register?redirect=/showroom`);
      return;
    }
    try {
      const res = await favoritesAPI.toggle(car._id);
      const nowFav = res.favorited === true || res.favorited === 'true';
      setIsFav(nowFav);
      toast(nowFav ? 'Saved to wishlist' : 'Removed from wishlist', 'success');
    } catch {
      toast('Failed to update wishlist', 'error');
    }
  };

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
              {isLive && (
                <div className="badge badge-red flex items-center gap-1.5 text-xs font-bold">
                  <span className="live-dot" /> LIVE
                </div>
              )}
              {car.ntsaVerified && (
                <div className="badge badge-green text-xs">NTSA OK</div>
              )}
            </div>

            {car.isDemo && (
              <div className="absolute top-3 right-3 badge badge-orange text-xs">DEMO</div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-5 flex flex-col">
            <div className="flex justify-between items-start gap-4">
              <h3 className="text-lg font-semibold line-clamp-2 flex-1">
                {car.year && <span className="text-text-muted">{car.year} </span>}
                {car.title}
              </h3>

              <div className="text-right">
                <div className="text-xs text-text-muted uppercase tracking-widest">
                  {isLive ? 'Current Bid' : 'Price'}
                </div>
                <div className="price-tag text-2xl font-bold text-gold-light">
                  KES {price.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-muted mt-3">
              {car.mileage && (
                <span className="flex items-center gap-1.5">
                  <Gauge size={15} /> {car.mileage.toLocaleString()} km
                </span>
              )}
              {car.fuel && (
                <span className="flex items-center gap-1.5">
                  <span>{fuelIcon}</span> {car.fuel}
                </span>
              )}
              {car.transmission && (
                <span className="flex items-center gap-1.5">
                  <Settings size={15} /> {car.transmission}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin size={15} /> {city}
              </span>
            </div>

            {/* Bottom Bar */}
            <div className="mt-auto pt-5 border-t border-border flex items-center justify-between text-sm">
              <div className="text-text-muted text-xs">
                {car.views && `${car.views} views • `}
                {car.createdAt && `${timeAgo(car.createdAt)}`}
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handleFav} className="p-2 hover:bg-surface rounded-xl transition-colors">
                  <Heart size={18} className={isFav ? 'fill-red-500 text-red-500' : 'text-text-muted'} />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCar(car._id); }}
                  className={`p-2 rounded-xl transition-colors ${isCompared ? 'bg-gold text-black' : 'hover:bg-surface text-text-muted'}`}
                >
                  <BarChart3 size={18} />
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
    >
      <Link to={linkTo} className="block">
        <div className="card h-full flex flex-col overflow-hidden">
          {/* Image */}
          <div className="car-img-wrap relative">
            <LazyImage
              src={img}
              fallback={FALLBACK}
              alt={car.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {isLive && <div className="badge badge-red flex items-center gap-1.5"><span className="live-dot" /> LIVE</div>}
              {car.ntsaVerified && <div className="badge badge-green text-xs">NTSA</div>}
            </div>

            {car.isDemo && (
              <div className="absolute top-3 right-3 badge badge-orange">DEMO</div>
            )}

            {car.year && (
              <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-bold px-2.5 py-1 rounded">
                {car.year}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-5 flex-1 flex flex-col">
            <h3 className="font-semibold text-lg leading-tight mb-3 line-clamp-2 group-hover:text-gold transition-colors">
              {car.title}
            </h3>

            <div className="flex items-center gap-4 text-sm text-text-muted mb-4">
              {car.mileage && (
                <span className="flex items-center gap-1">
                  <Gauge size={15} /> {(car.mileage / 1000).toFixed(0)}k km
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin size={15} /> {city}
              </span>
            </div>

            <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
              <div className="price-tag text-2xl font-bold text-gold-light">
                KES {price.toLocaleString()}
              </div>
              <ChevronRight className="text-gold opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </Link>

      {/* Floating Action Buttons */}
      <button
        onClick={handleFav}
        className="absolute top-4 right-4 z-20 p-2.5 bg-black/70 hover:bg-black backdrop-blur-md rounded-full transition-all hover:scale-110"
      >
        <Heart size={18} className={isFav ? 'fill-red-500 text-red-500' : 'text-white'} />
      </button>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCar(car._id); }}
        className={`absolute top-16 right-4 z-20 p-2.5 rounded-full backdrop-blur-md transition-all hover:scale-110 border ${
          isCompared ? 'bg-gold text-black border-gold' : 'bg-black/70 border-border hover:border-gold'
        }`}
      >
        <BarChart3 size={18} />
      </button>
    </motion.div>
  );
});

export default CarGridItem;
