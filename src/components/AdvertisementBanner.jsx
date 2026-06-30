import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Crown } from 'lucide-react';
import LazyImage from './LazyImage';

const ZONE_LABELS = {
  A: 'Featured Partner',
  B: 'Sponsored Content',
  C: 'Promoted',
};

const ZONE_STYLES = {
  A: { borderColor: 'rgba(212,196,168,0.3)', background: 'rgba(212,196,168,0.03)' },
  B: { borderColor: 'rgba(255,255,255,0.1)', background: 'transparent' },
  C: { borderColor: 'rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.03)' },
};

export default function AdvertisementBanner({
  type = 'image',
  content = null,
  imageUrl = '',
  htmlContent = '',
  linkUrl = '',
  altText = 'Advertisement',
  position = 'horizontal',
  size = 'medium',
  dismissible = false,
  sponsoredLabel = true,
  className = '',
  zone = 'B',
  onDismiss = null,
  onClick = null,
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  const handleClick = () => {
    if (onClick) onClick();
    if (linkUrl) window.open(linkUrl, '_blank', 'noopener,noreferrer');
  };

  const sizeClasses = {
    horizontal: { small: 'h-24', medium: 'h-32', large: 'h-48' },
    vertical: { small: 'w-32 h-64', medium: 'w-48 h-80', large: 'w-64 h-96' },
    square: { small: 'w-32 h-32', medium: 'w-48 h-48', large: 'w-64 h-64' },
  };

  const containerClass = sizeClasses[position]?.[size] || 'h-32';
  const zoneStyle = ZONE_STYLES[zone] || ZONE_STYLES.B;

  const renderContent = () => {
    switch (type) {
      case 'image':
        return <LazyImage src={imageUrl} alt={altText} className="w-full h-full object-cover" />;
      case 'html':
        return <div dangerouslySetInnerHTML={{ __html: htmlContent }} className="w-full h-full flex items-center justify-center" />;
      case 'dealer':
        return content?.dealer ? <SponsoredDealerCard dealer={content.dealer} /> : null;
      case 'vehicle':
        return content?.vehicle ? <SponsoredVehicleCard vehicle={content.vehicle} /> : null;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl cursor-pointer border ${containerClass} ${className}`}
      style={{ ...zoneStyle }}
      onClick={handleClick}
    >
      {renderContent()}

      {sponsoredLabel && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded px-2.5 py-1">
          {zone === 'A' && <Crown size={10} className="text-gold" />}
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: zone === 'A' ? 'var(--gold)' : 'rgba(255,255,255,0.6)' }}>
            {ZONE_LABELS[zone] || 'Sponsored'}
          </span>
        </div>
      )}

      {dismissible && (
        <button onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
          aria-label="Dismiss"
        >
          <X size={12} className="text-white" />
        </button>
      )}
    </motion.div>
  );
}

function SponsoredDealerCard({ dealer }) {
  return (
    <div className="w-full h-full flex items-center gap-4 p-4 bg-gradient-to-r from-gold/10 to-transparent">
      {dealer.logo && <img src={dealer.logo} alt={dealer.name} className="w-14 h-14 rounded-lg object-cover" />}
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-white text-sm mb-0.5">{dealer.name}</h3>
        <p className="text-white/50 text-xs mb-1.5">{dealer.location}</p>
        <div className="flex items-center gap-2 text-[10px]">
          {dealer.verified && <span className="text-gold font-bold">Verified</span>}
          <span className="text-white/40">{dealer.listingsCount || 0} listings</span>
        </div>
      </div>
    </div>
  );
}

function SponsoredVehicleCard({ vehicle }) {
  return (
    <div className="w-full h-full relative">
      <LazyImage src={vehicle.images?.[0] || '/placeholder-car.jpg'} alt={`${vehicle.brand} ${vehicle.title}`} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-display font-bold text-white text-sm mb-0.5">{vehicle.brand} {vehicle.title}</h3>
        {vehicle.price && <p className="text-gold font-bold text-sm">KES {vehicle.price.toLocaleString()}</p>}
      </div>
    </div>
  );
}
