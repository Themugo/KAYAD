import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import LazyImage from './LazyImage';

/**
 * AdvertisementBanner Component
 * 
 * Reusable advertisement banner supporting:
 * - Image ads
 * - HTML ads
 * - Sponsored dealers
 * - Sponsored vehicles
 * 
 * Admin configurable via props
 */

export default function AdvertisementBanner({
  type = 'image', // 'image' | 'html' | 'dealer' | 'vehicle'
  content = null,
  imageUrl = '',
  htmlContent = '',
  linkUrl = '',
  altText = 'Advertisement',
  position = 'horizontal', // 'horizontal' | 'vertical' | 'square'
  size = 'medium', // 'small' | 'medium' | 'large'
  dismissible = false,
  sponsoredLabel = true,
  className = '',
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
    if (linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const sizeClasses = {
    horizontal: {
      small: 'h-24',
      medium: 'h-32',
      large: 'h-48',
    },
    vertical: {
      small: 'w-32 h-64',
      medium: 'w-48 h-80',
      large: 'w-64 h-96',
    },
    square: {
      small: 'w-32 h-32',
      medium: 'w-48 h-48',
      large: 'w-64 h-64',
    },
  };

  const containerClass = sizeClasses[position]?.[size] || 'h-32';

  const renderContent = () => {
    switch (type) {
      case 'image':
        return (
          <LazyImage
            src={imageUrl}
            alt={altText}
            className="w-full h-full object-cover"
          />
        );

      case 'html':
        return (
          <div
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            className="w-full h-full flex items-center justify-center"
          />
        );

      case 'dealer':
        return content?.dealer ? (
          <SponsoredDealerCard dealer={content.dealer} />
        ) : null;

      case 'vehicle':
        return content?.vehicle ? (
          <SponsoredVehicleCard vehicle={content.vehicle} />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-lg cursor-pointer ${containerClass} ${className}`}
      onClick={handleClick}
    >
      {renderContent()}

      {sponsoredLabel && (
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
          <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
            Sponsored
          </span>
        </div>
      )}

      {dismissible && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
          aria-label="Dismiss advertisement"
        >
          <X size={12} className="text-white" />
        </button>
      )}
    </motion.div>
  );
}

// Sponsored Dealer Card Component
function SponsoredDealerCard({ dealer }) {
  return (
    <div className="w-full h-full flex items-center gap-4 p-4 bg-gradient-to-r from-gold/10 to-transparent">
      {dealer.logo && (
        <img
          src={dealer.logo}
          alt={dealer.name}
          className="w-16 h-16 rounded-lg object-cover"
        />
      )}
      <div className="flex-1">
        <h3 className="font-display font-bold text-white text-sm mb-1">
          {dealer.name}
        </h3>
        <p className="text-white/60 text-xs mb-2">{dealer.location}</p>
        <div className="flex items-center gap-2">
          {dealer.verified && (
            <span className="text-[10px] text-gold font-bold">✓ Verified</span>
          )}
          <span className="text-[10px] text-white/40">
            {dealer.listingsCount || 0} listings
          </span>
        </div>
      </div>
    </div>
  );
}

// Sponsored Vehicle Card Component
function SponsoredVehicleCard({ vehicle }) {
  return (
    <div className="w-full h-full relative">
      <LazyImage
        src={vehicle.images?.[0] || '/placeholder-car.jpg'}
        alt={`${vehicle.brand} ${vehicle.title}`}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-display font-bold text-white text-sm mb-1">
          {vehicle.brand} {vehicle.title}
        </h3>
        {vehicle.price && (
          <p className="text-gold font-bold text-sm">
            KES {vehicle.price.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
