import React, { useRef, useState } from 'react';
import { Loader2, Trash2, Upload, AlertCircle, Star } from 'lucide-react';
import {
  addCarImages, deleteCarImage, setCoverImage, VehicleApiError,
  LISTING_IMAGE_TYPES, LISTING_IMAGE_MAX_BYTES, LISTING_IMAGE_MAX_PER_REQUEST, LISTING_IMAGE_MAX_PER_LISTING,
} from '../../../services/vehicleApi';
import type { ListingImage } from '../../../services/vehicleApi';

/**
 * Existing-listing photo management. Uses only the existing owner-enforced routes
 * (POST /api/cars/:id/images, DELETE /api/cars/:id/images/:index). Every change is
 * confirmed by the server response; nothing is shown as saved until the server says so.
 * Buttons are type="button": this renders inside the listing <form>.
 */
export function validatePhotoFiles(files: File[], existingCount: number): string | null {
  if (files.length === 0) return 'Choose at least one photo to upload.';
  if (files.length > LISTING_IMAGE_MAX_PER_REQUEST) return `Upload at most ${LISTING_IMAGE_MAX_PER_REQUEST} photos at a time.`;
  if (existingCount + files.length > LISTING_IMAGE_MAX_PER_LISTING) return `A listing can have at most ${LISTING_IMAGE_MAX_PER_LISTING} photos (it has ${existingCount}).`;
  const wrongType = files.find((f) => !LISTING_IMAGE_TYPES.includes(f.type));
  if (wrongType) return `${wrongType.name}: only JPG, PNG or WEBP photos are accepted.`;
  const tooBig = files.find((f) => f.size > LISTING_IMAGE_MAX_BYTES);
  if (tooBig) return `${tooBig.name}: each photo must be 5 MB or smaller.`;
  return null;
}

function describe(err: unknown, fallback: string): string {
  if (err instanceof VehicleApiError) {
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.status === 403) return err.message || 'You do not have permission to change this listing.';
    if (err.kind === 'not_found') return 'This listing no longer exists.';
    if (err.kind === 'network') return 'Unable to reach KAYARD KE. Check your connection and try again.';
    return err.message || fallback;
  }
  return fallback;
}

export interface DealerListingPhotosProps {
  carId: string;
  initialImages: ListingImage[];
  disabled?: boolean;
  onChanged?: (images: ListingImage[]) => void;
}

const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340] disabled:opacity-60';

const DealerListingPhotos: React.FC<DealerListingPhotosProps> = ({ carId, initialImages, disabled, onChanged }) => {
  const [images, setImages] = useState<ListingImage[]>(initialImages);
  const [busy, setBusy] = useState<null | 'upload' | number>(null);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [retry, setRetry] = useState<null | (() => void)>(null);

  const apply = (next: ListingImage[] | undefined) => {
    if (!next) return;
    setImages(next);
    onChanged?.(next);
  };

  const upload = async (files: File[]) => {
    if (busyRef.current) return;
    const problem = validatePhotoFiles(files, images.length);
    if (problem) { setError(problem); setRetry(null); return; }
    busyRef.current = true; setBusy('upload'); setError(null); setNotice(null); setRetry(null);
    try {
      const res = await addCarImages(carId, files);
      if (res.success === false) throw new VehicleApiError(res.message || 'Photos could not be uploaded.', 'server');
      apply(res.data?.images);
      if (inputRef.current) inputRef.current.value = '';
      setNotice(`${files.length} photo${files.length === 1 ? '' : 's'} added.`);
    } catch (err) {
      setError(describe(err, 'Photos could not be uploaded. Your selection is kept — try again.'));
      setRetry(() => () => { void upload(files); });
    } finally { busyRef.current = false; setBusy(null); }
  };

  const remove = async (index: number) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(index); setError(null); setNotice(null); setRetry(null);
    try {
      const res = await deleteCarImage(carId, index);
      if (res.success === false) throw new VehicleApiError(res.message || 'The photo could not be removed.', 'server');
      apply(res.data?.images);
      setConfirmIndex(null);
      setNotice('Photo removed.');
    } catch (err) {
      setError(describe(err, 'The photo could not be removed. Try again.'));
      setRetry(() => () => { void remove(index); });
    } finally { busyRef.current = false; setBusy(null); }
  };

  const poster = async (index: number) => {
    if (busyRef.current || index === 0) return;
    busyRef.current = true; setBusy(index); setError(null); setNotice(null); setRetry(null);
    try {
      const res = await setCoverImage(carId, index);
      if (res.success === false) throw new VehicleApiError(res.message || 'The poster could not be changed.', 'server');
      apply(res.data?.images);
      setNotice('Poster updated. Buyers now see this photo first.');
    } catch (err) {
      setError(describe(err, 'The poster could not be changed. Try again.'));
      setRetry(() => () => { void poster(index); });
    } finally { busyRef.current = false; setBusy(null); }
  };

  const atLimit = images.length >= LISTING_IMAGE_MAX_PER_LISTING;
  const working = busy !== null;
  const onlyOne = images.length <= 1;

  return (
    <fieldset className="sm:col-span-2 min-w-0 w-full border border-[#D7E7E4] rounded-xl p-4" disabled={disabled}>
      <legend className="px-1 text-sm font-medium text-[#0A3340]">Photos ({images.length}/{LISTING_IMAGE_MAX_PER_LISTING})</legend>
      {images.length === 0 ? (
        <p className="text-sm text-[#475569]">This listing has no photos yet.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Current photos">
          {images.map((img, i) => (
            <li key={img.public_id || img.url} className="min-w-0 rounded-lg border border-[#D7E7E4] p-2 bg-[#F6FAF9]">
              <div className="relative">
                <img src={img.thumb || img.url} alt={`Photo ${i + 1}${i === 0 ? ' (poster)' : ''}`} className="w-full h-24 object-cover rounded-md" />
                {i === 0 && <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-[#176B87] px-1.5 py-0.5 text-[10px] font-bold text-white"><Star className="w-3 h-3" aria-hidden="true" />Poster</span>}
              </div>
              {confirmIndex === i ? (
                <div className="mt-2 space-y-1" role="group" aria-label={`Confirm removing photo ${i + 1}`}>
                  <p className="text-xs text-[#7A271A]">Remove this photo?</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={working} onClick={() => remove(i)} className={`${btn} bg-[#B42318] text-white flex items-center gap-1`}>
                      {busy === i && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />} Remove
                    </button>
                    <button type="button" disabled={working} onClick={() => setConfirmIndex(null)} className={`${btn} border border-[#B9D3CF] text-[#0A3340]`}>Keep</button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1">
                {i !== 0 && (
                  <button type="button" disabled={working} onClick={() => poster(i)} aria-label={`Make photo ${i + 1} the poster`} className={`${btn} bg-[#176B87] text-white flex items-center gap-1`}>
                    {busy === i && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />} Make poster
                  </button>
                )}
                <button
                  type="button" disabled={working || onlyOne} onClick={() => setConfirmIndex(i)}
                  title={onlyOne ? 'A listing needs at least one photo' : undefined}
                  className={`${btn} border border-[#B9D3CF] text-[#B42318] flex items-center gap-1`}
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" /> Remove
                </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {onlyOne && images.length === 1 && <p className="mt-2 text-xs text-[#475569]">A listing needs at least one photo, so the last one cannot be removed. Add another first.</p>}

      <div className="relative mt-4 flex flex-wrap items-center gap-3">
        <label
          htmlFor="listing-add-photos"
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#176B87] px-4 text-sm font-bold text-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#0A3340] ${working || atLimit ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-[#12576D]'}`}
        >
          {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />}
          {busy === 'upload' ? 'Uploading…' : 'Add photos'}
        </label>
        <input
          id="listing-add-photos" ref={inputRef} type="file" multiple accept={LISTING_IMAGE_TYPES.join(',')} disabled={working || atLimit}
          onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ''; setError(null); setNotice(null); setRetry(null); if (files.length) void upload(files); }}
          className="sr-only"
          aria-describedby="listing-add-photos-hint"
        />
        <span className="text-xs text-[#475569]" aria-live="polite">{atLimit ? `This listing has the maximum of ${LISTING_IMAGE_MAX_PER_LISTING} photos. Remove one to add another.` : `${LISTING_IMAGE_MAX_PER_LISTING - images.length} more can be added. Photos upload as soon as you choose them.`}</span>
      </div>
      <p id="listing-add-photos-hint" className="mt-1 text-xs text-[#475569]">JPG, PNG or WEBP, up to 5 MB each, {LISTING_IMAGE_MAX_PER_REQUEST} at a time. Existing photos are kept when you save the details.</p>

      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          {retry && <button type="button" onClick={retry} disabled={working} className={`${btn} border border-[#7A271A]`}>Try again</button>}
        </div>
      )}
      {notice && <p role="status" className="mt-3 text-sm text-emerald-800">{notice}</p>}
    </fieldset>
  );
};

export default DealerListingPhotos;
