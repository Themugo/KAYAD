import React from 'react';

/**
 * A simple, original side-profile car silhouette - not a photo or
 * trademarked logo of any specific vehicle, just a generic outline
 * shape, tinted to the brand palette, labeled with real, widely-known
 * popular Kenyan road vehicle names. Used to decorate the hero
 * without implying a licensed photo or endorsement from any
 * manufacturer.
 */
interface CarSilhouetteProps {
  label: string;
  className?: string;
  flip?: boolean;
}

export const CarSilhouette: React.FC<CarSilhouetteProps> = ({ label, className = '', flip = false }) => (
  <div className={`flex flex-col items-center gap-1.5 ${className}`}>
    <svg
      viewBox="0 0 120 50"
      className={`w-full h-auto ${flip ? 'scale-x-[-1]' : ''}`}
      fill="none"
    >
      <path
        d="M8 36 L14 22 Q18 14 30 14 L44 14 Q50 6 62 6 L78 6 Q88 6 94 14 L106 14 Q114 14 114 24 L114 36 Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M32 15 L46 15 L52 8 L64 8 L70 15 L92 15 L86 8 Q82 6 76 6 L62 6 Q52 6 46 14 Z"
        fill="currentColor"
        opacity="0.35"
      />
      <circle cx="28" cy="38" r="8" fill="currentColor" />
      <circle cx="28" cy="38" r="3.5" fill="white" opacity="0.7" />
      <circle cx="92" cy="38" r="8" fill="currentColor" />
      <circle cx="92" cy="38" r="3.5" fill="white" opacity="0.7" />
    </svg>
    <span className="text-[10px] font-semibold text-white/70 whitespace-nowrap">{label}</span>
  </div>
);

export default CarSilhouette;
