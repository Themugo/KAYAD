import React, { useState } from 'react';
import { Camera, CarFront, Maximize2 } from 'lucide-react';

interface Props {
  title: string;
  images?: string[];
  className: string;
  onOpen: () => void;
  /** Badges and the save button, drawn over the top of the photo. */
  top: React.ReactNode;
  /** Optional strip along the bottom of the photo (live auction bid). */
  bottom?: React.ReactNode;
}

const MAX_THUMBS = 4;

/**
 * Photo stage for an inventory card. The desktop look is unchanged (cover-filled
 * stage). On phones the whole photo is fitted (never cropped), a photo counter and
 * an expand control sit on the photo, and a thumbnail strip with a "+N More" tile
 * sits beneath it. Presentation only: it shows the listing's own photos.
 */
const InventoryCardMedia: React.FC<Props> = ({ title, images = [], className, onOpen, top, bottom }) => {
  const [index, setIndex] = useState(0);
  const total = images.length;
  const current = Math.min(index, Math.max(total - 1, 0));
  const extra = total > MAX_THUMBS ? total - MAX_THUMBS : 0;

  return (
    <>
      <div className={`kayad-vc-media relative bg-[#EEF4F3] shrink-0 overflow-hidden ${className}`}>
        {total > 0 ? (
          <img
            src={images[current]}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035] max-sm:object-contain max-sm:group-hover:scale-100"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#64748B]">
            <CarFront className="h-8 w-8 text-[#176B87]/60" aria-hidden="true" />
            <span className="text-xs font-semibold">Photo not available</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">{top}</div>
        {total > 0 && (
          <span
            data-testid="card-photo-counter"
            className="absolute bottom-2.5 left-2.5 z-[2] hidden items-center gap-1.5 rounded-full bg-[#071F2A]/80 px-2.5 py-1 text-[12px] font-bold text-white backdrop-blur-sm max-sm:inline-flex"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" /> {current + 1}/{total}
          </span>
        )}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${title}`}
          className="absolute bottom-2.5 right-2.5 z-[2] hidden h-10 w-10 items-center justify-center rounded-full bg-[#071F2A]/80 text-white backdrop-blur-sm max-sm:flex"
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
        {bottom}
      </div>

      {total > 1 && (
        <div data-testid="card-thumbnails" className="hidden grid-cols-4 gap-2 px-3 pt-2.5 max-sm:grid" role="group" aria-label="Vehicle photos">
          {images.slice(0, MAX_THUMBS).map((src, i) => {
            const isMore = extra > 0 && i === MAX_THUMBS - 1;
            return (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={isMore ? onOpen : () => setIndex(i)}
                aria-label={isMore ? `Show ${extra} more photos` : `Show photo ${i + 1} of ${total}`}
                aria-pressed={!isMore && i === current}
                className={`relative aspect-[4/3] min-h-0 overflow-hidden rounded-lg border-2 bg-[#EEF4F3] p-0 ${!isMore && i === current ? 'border-[#176B87]' : 'border-transparent'}`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                {isMore && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center bg-[#071F2A]/70 text-[13px] font-extrabold leading-tight text-white">
                    +{extra}<span className="text-[12px] font-bold">More</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

export default InventoryCardMedia;
