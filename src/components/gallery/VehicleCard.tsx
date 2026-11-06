import { useState } from 'react';
import type { FC, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Fuel,
  Settings2,
  MapPin,
  CheckCircle2,
  Gavel,
  ChevronRight as ArrowRight,
  CarFront,
} from 'lucide-react';
import { Vehicle } from '../../types';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Skeleton } from '../ui/Skeleton';

interface VehicleCardProps {
  vehicle: Vehicle;
  viewMode?: 'grid' | 'list';
}

/**
 * The shared gallery/home/dashboard/dealer-profile listing card. Everything it shows comes from the vehicle record:
 * a missing mileage, fuel, transmission or location is left out (never replaced by a made-up default), a verified
 * badge needs `vehicle.verified`, and a missing photo shows a neutral placeholder rather than unrelated stock imagery.
 */
export const VehicleCard: FC<VehicleCardProps> = ({ vehicle, viewMode = 'grid' }) => {
  const { savedVehicleIds, toggleSaveVehicle, navigateTo } = useMarketplace();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);

  const isSaved = savedVehicleIds.includes(vehicle.id);
  const images = (Array.isArray(vehicle.images) && vehicle.images.length > 0 ? vehicle.images : vehicle.image ? [vehicle.image] : []).filter(Boolean);
  const activeImage = images[currentImgIndex] || images[0];

  const step = (delta: number) => (e: MouseEvent) => {
    e.stopPropagation();
    if (images.length < 2) return;
    setIsImgLoading(true);
    setImgFailed(false);
    setCurrentImgIndex((prev) => (prev + delta + images.length) % images.length);
  };

  const lifecycle = vehicle.auctionLifecycle;
  const isAuction = vehicle.listingType === 'auction' || vehicle.listingType === 'both' || vehicle.isAuction === true || (!!lifecycle && lifecycle !== 'none');
  const showBid = isAuction && lifecycle === 'live' && typeof vehicle.currentBid === 'number' && vehicle.currentBid > 0;
  const priceVal = showBid ? (vehicle.currentBid as number) : vehicle.price;
  const priceText = Number.isFinite(priceVal) && priceVal > 0 ? `Ksh ${Number(priceVal).toLocaleString()}` : 'Price on request';
  const priceLabel = showBid ? 'Current bid' : isAuction ? 'Starting price' : 'Asking price';

  const fullTitle = vehicle.title
    ? (vehicle.title.startsWith(String(vehicle.year)) ? vehicle.title : `${vehicle.year} ${vehicle.title}`)
    : `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  const availability = vehicle.status === 'sold' ? { text: 'Sold', tone: 'sold' } : vehicle.status === 'pending' ? { text: 'Pending', tone: 'pending' } : vehicle.status === 'active' ? { text: 'Available', tone: 'ok' } : null;
  const auctionBadge = lifecycle === 'live' ? 'Live auction' : lifecycle === 'draft' ? 'Upcoming auction' : lifecycle === 'ended' ? 'Auction ended' : isAuction ? 'Auction' : null;

  const mileageText = vehicle.mileage > 0 ? `${vehicle.mileage.toLocaleString()} km` : '';
  const location = vehicle.location ? vehicle.location.split(',')[0].trim() : '';
  const specs = [
    mileageText && { key: 'mileage', icon: <Gauge className="w-3.5 h-3.5" aria-hidden="true" />, text: mileageText },
    vehicle.fuelType && { key: 'fuel', icon: <Fuel className="w-3.5 h-3.5" aria-hidden="true" />, text: String(vehicle.fuelType) },
    vehicle.transmission && { key: 'trans', icon: <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />, text: String(vehicle.transmission) },
    location && { key: 'loc', icon: <MapPin className="w-3.5 h-3.5" aria-hidden="true" />, text: location },
  ].filter(Boolean) as { key: string; icon: ReactNode; text: string }[];

  const open = () => navigateTo('vehicle_detail', vehicle.id);
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };
  const list = viewMode === 'list';

  return (
    <article
      onClick={open}
      onKeyDown={onKey}
      tabIndex={0}
      role="link"
      aria-label={`${fullTitle}, ${priceText}${availability ? `, ${availability.text}` : ''}. View vehicle details`}
      data-testid="gallery-vehicle-card"
      className={`group bg-white border border-[#D7E7E4] rounded-2xl p-2.5 sm:p-3 shadow-xs hover:border-[#176B87]/50 hover:shadow-md transition-[box-shadow,border-color] duration-200 cursor-pointer flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#176B87] focus-visible:ring-offset-2 ${
        list ? 'sm:flex-row sm:items-stretch sm:gap-4' : 'gap-3'
      }`}
    >
      {/* Photo: fixed aspect ratio so nothing shifts while it loads */}
      <div className={`relative rounded-xl overflow-hidden bg-[#EEF7F5] shrink-0 ${list ? 'sm:w-64 lg:w-72 aspect-[4/3] sm:aspect-auto sm:min-h-[11rem]' : 'w-full aspect-[4/3]'}`}>
        {activeImage && !imgFailed ? (
          <>
            {isImgLoading && <Skeleton className="absolute inset-0 w-full h-full" />}
            <img
              src={activeImage}
              alt={`${fullTitle}${images.length > 1 ? `, photo ${currentImgIndex + 1} of ${images.length}` : ''}`}
              width={400}
              height={300}
              loading="lazy"
              decoding="async"
              onLoad={() => setIsImgLoading(false)}
              onError={() => { setImgFailed(true); setIsImgLoading(false); }}
              className={`absolute inset-0 w-full h-full object-cover motion-safe:group-hover:scale-[1.03] motion-safe:transition-transform motion-safe:duration-500 ${isImgLoading ? 'opacity-0' : 'opacity-100'}`}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[#64748B]" data-testid="gallery-card-no-photo">
            <CarFront className="w-8 h-8 text-[#176B87]/60" aria-hidden="true" />
            <span className="text-xs font-semibold">Photo not available</span>
          </div>
        )}

        {/* Arrows: always reachable on touch and by keyboard, revealed on hover for mouse users */}
        {activeImage && !imgFailed && images.length > 1 && (
          <div className="absolute inset-x-1.5 top-1/2 -translate-y-1/2 flex items-center justify-between md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity z-10 pointer-events-none">
            <button type="button" onClick={step(-1)} aria-label="Previous photo" className="pointer-events-auto w-8 h-8 grid place-items-center rounded-full bg-white/90 text-[#0A3340] shadow-sm hover:bg-white focus-visible:ring-2 focus-visible:ring-[#176B87]">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={step(1)} aria-label="Next photo" className="pointer-events-auto w-8 h-8 grid place-items-center rounded-full bg-white/90 text-[#0A3340] shadow-sm hover:bg-white focus-visible:ring-2 focus-visible:ring-[#176B87]">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1.5 max-w-[75%]">
          {auctionBadge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0A3340]/90 px-2.5 py-1 text-[11px] font-bold text-white">
              <Gavel className="w-3 h-3" aria-hidden="true" />{auctionBadge}
            </span>
          )}
          {vehicle.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-xs">
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />Verified listing
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleSaveVehicle(vehicle.id); }}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${fullTitle} from saved` : `Save ${fullTitle}`}
          title={isSaved ? 'Remove from saved' : 'Save vehicle'}
          className={`absolute top-2 right-2 z-10 w-9 h-9 grid place-items-center rounded-full shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#176B87] ${isSaved ? 'bg-rose-500 text-white' : 'bg-white/95 text-[#12576D] hover:text-rose-500'}`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
        </button>

        {images.length > 1 && (
          <span className="absolute bottom-2 left-2 z-10 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">{currentImgIndex + 1}/{images.length}</span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col min-w-0 gap-2">
        {availability && (
          <span className={`self-start inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${availability.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : availability.tone === 'sold' ? 'bg-slate-200 text-slate-700' : 'bg-amber-50 text-amber-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${availability.tone === 'ok' ? 'bg-emerald-500' : availability.tone === 'sold' ? 'bg-slate-500' : 'bg-amber-500'}`} aria-hidden="true" />
            {availability.text}
          </span>
        )}
        <h3 className="text-base sm:text-[1.05rem] font-bold text-[#0A3340] leading-snug line-clamp-2 break-words">{fullTitle}</h3>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[#64748B]">{priceLabel}</p>
          <p className="text-xl font-extrabold text-[#12576D] tracking-tight break-words">{priceText}</p>
        </div>
        {specs.length > 0 && (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-medium text-[#475569] list-none p-0 m-0">
            {specs.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 min-w-0">
                <span className="text-[#176B87] shrink-0">{s.icon}</span>
                <span className="truncate">{s.text}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); open(); }}
            className="w-full min-h-11 px-3 rounded-xl bg-[#176B87] hover:bg-[#0A3340] text-white text-sm font-bold transition-colors flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-[#176B87] focus-visible:ring-offset-2"
          >
            <span>{isAuction && lifecycle === 'live' ? 'View auction' : 'View vehicle details'}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};
