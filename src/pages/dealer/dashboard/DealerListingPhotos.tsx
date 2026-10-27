import React, { useRef, useState } from 'react';
import { Loader2, Trash2, Upload, AlertCircle } from 'lucide-react';
import {
  addCarImages, deleteCarImage, VehicleApiError,
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
    if (err.kind === 'network') return 'Unable to reach KAYAD. Check your connection and try again.';
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
  const [picked, setPicked] = useState<File[]>([]);
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
      setPicked([]);
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
              <img src={img.thumb || img.url} alt={`Photo ${i + 1}${i === 0 ? ' (cover)' : ''}`} className="w-full h-24 object-cover rounded-md" />
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
                <button
                  type="button" disabled={working || onlyOne} onClick={() => setConfirmIndex(i)}
                  title={onlyOne ? 'A listing needs at least one photo' : undefined}
                  className={`${btn} mt-2 border border-[#B9D3CF] text-[#B42318] flex items-center gap-1`}
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" /> Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {onlyOne && images.length === 1 && <p className="mt-2 text-xs text-[#475569]">A listing needs at least one photo, so the last one cannot be removed. Add another first.</p>}

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="listing-add-photos" className="text-sm text-[#0A3340]">Add photos</label>
        <input
          id="listing-add-photos" ref={inputRef} type="file" multiple accept={LISTING_IMAGE_TYPES.join(',')} disabled={working}
          onChange={(e) => { setPicked(Array.from(e.target.files || [])); setError(null); setNotice(null); setRetry(null); }}
          className="text-sm max-w-full"
          aria-describedby="listing-add-photos-hint"
        />
        <button type="button" disabled={working || picked.length === 0} onClick={() => upload(picked)} aria-busy={busy === 'upload'}
          className={`${btn} bg-[#176B87] text-white flex items-center justify-center gap-1`}>
          {busy === 'upload' ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Upload className="w-3 h-3" aria-hidden="true" />}
          {busy === 'upload' ? 'Uploading…' : `Upload${picked.length ? ` ${picked.length}` : ''}`}
        </button>
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
