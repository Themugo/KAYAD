import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Star, X, AlertCircle } from 'lucide-react';
import { LISTING_IMAGE_TYPES, LISTING_IMAGE_MAX_BYTES } from '../../../services/vehicleApi';

/**
 * Photo chooser for a NEW listing: shows a thumbnail of every selected photo, lets the dealer pick the poster (the first photo, which is
 * what buyers see on cards and search), remove a photo, and add more in several picks. The array order is the upload order, so the
 * server stores the poster first.
 */
export const photoKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

export function usePreviewUrls(files: File[]): string[] {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => { urls.forEach((u) => URL.revokeObjectURL(u)); }, [urls]);
  return urls;
}

/** Returns the files that may be added and a message for any that were skipped. */
export function acceptPhotos(current: File[], picked: File[], max: number): { next: File[]; message: string | null } {
  const seen = new Set(current.map(photoKey));
  const skipped: string[] = [];
  const next = [...current];
  for (const f of picked) {
    if (seen.has(photoKey(f))) continue;
    if (!LISTING_IMAGE_TYPES.includes(f.type)) { skipped.push(`${f.name}: only JPG, PNG or WEBP`); continue; }
    if (f.size > LISTING_IMAGE_MAX_BYTES) { skipped.push(`${f.name}: larger than 5 MB`); continue; }
    if (next.length >= max) { skipped.push(`${f.name}: limit of ${max} photos reached`); continue; }
    seen.add(photoKey(f)); next.push(f);
  }
  return { next, message: skipped.length ? `Not added — ${skipped.join('; ')}.` : null };
}

export const makePoster = (files: File[], index: number): File[] => (index <= 0 || index >= files.length ? files : [files[index], ...files.filter((_, i) => i !== index)]);

interface Props { files: File[]; onChange: (files: File[]) => void; max: number; disabled?: boolean; error?: string; inputId?: string }

const btn = 'px-2 py-1 rounded-md text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340] disabled:opacity-60';

const DealerListingPhotoPicker: React.FC<Props> = ({ files, onChange, max, disabled, error, inputId = 'listing-images' }) => {
  const urls = usePreviewUrls(files);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { next, message } = acceptPhotos(files, Array.from(e.target.files || []), max);
    setNote(message);
    onChange(next);
    if (inputRef.current) inputRef.current.value = ''; // allow picking the same file again after removing it
  };

  return (
    <div>
      <input id={inputId} ref={inputRef} type="file" accept={LISTING_IMAGE_TYPES.join(',')} multiple disabled={disabled} onChange={onPick}
        className="w-full px-3 py-2 border border-[#B9D3CF] rounded-lg text-sm text-[#0A3340] bg-white"
        aria-invalid={error ? true : undefined} aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`} />
      <p id={`${inputId}-hint`} className="text-xs text-[#475569] mt-1">
        {files.length === 0 ? `Add 1–${max} photos (JPG, PNG or WEBP, up to 5 MB each). The first photo is the poster buyers see first.` : `${files.length} of ${max} photos. The first photo is the poster — use “Make poster” to change it.`}
      </p>
      {note && <p role="status" className="flex items-start gap-1 text-xs text-[#7A271A] mt-1"><AlertCircle className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />{note}</p>}
      {files.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3" aria-label="Selected photos">
          {files.map((f, i) => (
            <li key={photoKey(f)} className={`min-w-0 rounded-lg border p-2 bg-[#F6FAF9] ${i === 0 ? 'border-[#176B87] ring-1 ring-[#176B87]' : 'border-[#D7E7E4]'}`}>
              <div className="relative">
                <img src={urls[i]} alt={`Photo ${i + 1}${i === 0 ? ' (poster)' : ''}: ${f.name}`} className="w-full h-24 object-cover rounded-md" />
                {i === 0 && <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-[#176B87] px-1.5 py-0.5 text-[10px] font-bold text-white"><Star className="w-3 h-3" aria-hidden="true" />Poster</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {i !== 0 && <button type="button" disabled={disabled} onClick={() => onChange(makePoster(files, i))} className={`${btn} bg-[#176B87] text-white`} aria-label={`Make photo ${i + 1} the poster`}>Make poster</button>}
                <button type="button" disabled={disabled} onClick={() => { setNote(null); onChange(files.filter((_, k) => k !== i)); }} className={`${btn} border border-[#B9D3CF] text-[#B42318] inline-flex items-center gap-1`} aria-label={`Remove photo ${i + 1}`}><X className="w-3 h-3" aria-hidden="true" />Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DealerListingPhotoPicker;
