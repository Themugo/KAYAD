import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { createCar, updateCar, VehicleApiError } from '../../../services/vehicleApi';
import type { BackendCar, CreateCarPayload } from '../../../services/vehicleApi';
import DealerListingPhotos from './DealerListingPhotos';

/**
 * Phase 14.4 dealer listing create/edit form.
 *
 * Uses only the existing, server-authoritative contracts:
 *   POST /api/cars        (multipart, >=1 image, <=10)   -> createCar
 *   PUT  /api/cars/:id    (partial JSON, owner-or-staff) -> updateCar
 * Client validation mirrors backend/validation/car.schema.js for fast
 * feedback only; the server remains the authority (ownership, dealer
 * verification, entitlement, auction-field locks). Photos of an existing
 * listing are managed by DealerListingPhotos (separate image routes).
 */

export const LISTING_FUELS = ['Gasoline', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Electric'];
export const LISTING_TRANSMISSIONS = ['Automatic', 'Manual', 'CVT', 'Dual-Clutch'];
export const LISTING_CONDITIONS = ['New', 'Like New', 'Excellent', 'Good', 'Fair'];
const MAX_IMAGES = 10;

interface FormState {
  title: string;
  brand: string;
  model: string;
  year: string;
  price: string;
  mileage: string;
  fuel: string;
  transmission: string;
  color: string;
  condition: string;
  city: string;
  description: string;
}

type FieldErrors = Partial<Record<keyof FormState | 'images', string>>;

const EMPTY: FormState = {
  title: '', brand: '', model: '', year: '', price: '', mileage: '',
  fuel: '', transmission: '', color: '', condition: '', city: '', description: '',
};

function fromCar(car: BackendCar): FormState {
  const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  return {
    title: str(car.title), brand: str(car.brand), model: str(car.model),
    year: str(car.year), price: str(car.price), mileage: str(car.mileage),
    fuel: str(car.fuel), transmission: str(car.transmission), color: str(car.color),
    condition: str(car.condition), city: str(car.city ?? car.location_city),
    description: str(car.description),
  };
}

export function validateListing(form: FormState, mode: 'create' | 'edit', imageCount: number): FieldErrors {
  const errors: FieldErrors = {};
  const title = form.title.trim();
  if (title.length < 2) errors.title = 'Title must be at least 2 characters.';
  else if (title.length > 200) errors.title = 'Title must be 200 characters or fewer.';
  if (!form.brand.trim()) errors.brand = 'Brand is required.';
  if (form.year.trim() !== '') {
    const y = Number(form.year);
    if (!Number.isInteger(y) || y < 1900 || y > 2030) errors.year = 'Enter a whole-number year between 1900 and 2030.';
  }
  if (form.price.trim() !== '') {
    const p = Number(form.price);
    if (!Number.isFinite(p) || p <= 0) errors.price = 'Price must be greater than zero.';
    else if (p > 100_000_000) errors.price = 'Price must not exceed 100,000,000.';
  }
  if (form.mileage.trim() !== '') {
    const m = Number(form.mileage);
    if (!Number.isFinite(m) || m < 0) errors.mileage = 'Mileage cannot be negative.';
  }
  if (form.description.length > 5000) errors.description = 'Description must be 5000 characters or fewer.';
  if (mode === 'create') {
    if (imageCount < 1) errors.images = 'Add at least one photo.';
    else if (imageCount > MAX_IMAGES) errors.images = `You can upload at most ${MAX_IMAGES} photos.`;
  }
  return errors;
}

function toPayload(form: FormState): CreateCarPayload {
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
  return {
    title: form.title.trim(),
    brand: form.brand.trim(),
    model: form.model.trim() || undefined,
    year: num(form.year),
    price: num(form.price),
    mileage: num(form.mileage),
    fuel: form.fuel || undefined,
    transmission: form.transmission || undefined,
    color: form.color.trim() || undefined,
    condition: form.condition || undefined,
    city: form.city.trim() || undefined,
    description: form.description.trim() || undefined,
  };
}

function describeError(err: unknown): string {
  if (err instanceof VehicleApiError) {
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.status === 403) return err.message || 'You do not have permission to do this.';
    if (err.kind === 'not_found') return 'This listing no longer exists.';
    if (err.kind === 'network') return 'Unable to reach KAYAD. Check your connection and try again.';
    return err.message || 'The listing could not be saved. Please try again.';
  }
  return 'The listing could not be saved. Please try again.';
}

export interface DealerListingFormProps {
  mode: 'create' | 'edit';
  car?: BackendCar | null;
  onSaved: (car?: BackendCar) => void;
  onCancel: () => void;
  onPhotosChanged?: () => void;
}

const inputCls = 'w-full px-3 py-2 border border-[#B9D3CF] rounded-lg text-sm text-[#0A3340] bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0A3340]';

const Field: React.FC<{ id: string; label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }> = ({ id, label, required, error, hint, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-[#0A3340] mb-1">
      {label}{required && <span aria-hidden="true" className="text-[#B42318]"> *</span>}
    </label>
    {children}
    {hint && !error && <p id={`${id}-hint`} className="text-xs text-[#475569] mt-1">{hint}</p>}
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-[#B42318] mt-1">{error}</p>}
  </div>
);

const DealerListingForm: React.FC<DealerListingFormProps> = ({ mode, car, onSaved, onCancel, onPhotosChanged }) => {
  const initial = useMemo(() => (mode === 'edit' && car ? fromCar(car) : EMPTY), [mode, car]);
  const [form, setForm] = useState<FormState>(initial);
  const [images, setImages] = useState<File[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const submittingRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setForm(initial); setDirty(false); setErrors({}); setServerError(null); }, [initial]);

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setDirty(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return; // duplicate-submit guard
    const found = validateListing(form, mode, images.length);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      const el = document.getElementById(`listing-${first}`);
      el?.focus();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setServerError(null);
    try {
      const payload = toPayload(form);
      const res = mode === 'create'
        ? await createCar({ ...payload, images })
        : await updateCar(String(car?.id || car?._id || ''), payload);
      if (res && res.success === false) {
        setServerError(res.message || 'The listing could not be saved. Please try again.');
        return;
      }
      setDirty(false);
      onSaved(res?.data);
    } catch (err) {
      setServerError(describeError(err));
      setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const cancel = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    onCancel();
  };

  const err = (k: keyof FieldErrors) => errors[k];
  const aria = (k: keyof FieldErrors, hint = false) => ({
    'aria-invalid': err(k) ? true : undefined,
    'aria-describedby': err(k) ? `listing-${k}-error` : hint ? `listing-${k}-hint` : undefined,
  });
  const withCurrent = (list: string[], current: string) => (current && !list.includes(current) ? [...list, current] : list);

  return (
    <form onSubmit={submit} noValidate aria-label={mode === 'create' ? 'Add vehicle' : 'Edit vehicle'} className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={cancel} className="flex items-center gap-1 text-sm font-medium text-[#176B87] hover:text-[#12576D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to inventory
        </button>
        <h3 className="text-xl font-bold text-[#0A3340]">{mode === 'create' ? 'Add vehicle' : 'Edit vehicle'}</h3>
      </div>

      {serverError && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{serverError} Your entries have been kept — you can correct them and submit again.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field id="listing-title" label="Title" required error={err('title')}>
            <input id="listing-title" className={inputCls} value={form.title} onChange={set('title')} maxLength={200} disabled={submitting} {...aria('title')} />
          </Field>
        </div>
        <Field id="listing-brand" label="Brand" required error={err('brand')}>
          <input id="listing-brand" className={inputCls} value={form.brand} onChange={set('brand')} disabled={submitting} {...aria('brand')} />
        </Field>
        <Field id="listing-model" label="Model">
          <input id="listing-model" className={inputCls} value={form.model} onChange={set('model')} disabled={submitting} />
        </Field>
        <Field id="listing-year" label="Year" error={err('year')}>
          <input id="listing-year" inputMode="numeric" className={inputCls} value={form.year} onChange={set('year')} disabled={submitting} {...aria('year')} />
        </Field>
        <Field id="listing-price" label="Price (Ksh)" error={err('price')}>
          <input id="listing-price" inputMode="decimal" className={inputCls} value={form.price} onChange={set('price')} disabled={submitting} {...aria('price')} />
        </Field>
        <Field id="listing-mileage" label="Mileage (km)" error={err('mileage')}>
          <input id="listing-mileage" inputMode="numeric" className={inputCls} value={form.mileage} onChange={set('mileage')} disabled={submitting} {...aria('mileage')} />
        </Field>
        <Field id="listing-color" label="Colour">
          <input id="listing-color" className={inputCls} value={form.color} onChange={set('color')} disabled={submitting} />
        </Field>
        <Field id="listing-fuel" label="Fuel">
          <select id="listing-fuel" className={inputCls} value={form.fuel} onChange={set('fuel')} disabled={submitting}>
            <option value="">Not specified</option>
            {withCurrent(LISTING_FUELS, form.fuel).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field id="listing-transmission" label="Transmission">
          <select id="listing-transmission" className={inputCls} value={form.transmission} onChange={set('transmission')} disabled={submitting}>
            <option value="">Not specified</option>
            {withCurrent(LISTING_TRANSMISSIONS, form.transmission).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field id="listing-condition" label="Condition">
          <select id="listing-condition" className={inputCls} value={form.condition} onChange={set('condition')} disabled={submitting}>
            <option value="">Not specified</option>
            {withCurrent(LISTING_CONDITIONS, form.condition).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field id="listing-city" label="City">
          <input id="listing-city" className={inputCls} value={form.city} onChange={set('city')} disabled={submitting} />
        </Field>
        <div className="sm:col-span-2">
          <Field id="listing-description" label="Description" error={err('description')} hint={`${form.description.length}/5000`}>
            <textarea id="listing-description" rows={5} className={inputCls} value={form.description} onChange={set('description')} disabled={submitting} {...aria('description', true)} />
          </Field>
        </div>
        {mode === 'create' ? (
          <div className="sm:col-span-2">
            <Field id="listing-images" label="Photos" required error={err('images')} hint={`Add 1–${MAX_IMAGES} photos. ${images.length} selected.`}>
              <input
                id="listing-images" type="file" accept="image/jpeg,image/png,image/webp" multiple
                className={inputCls} disabled={submitting}
                onChange={(e) => { setImages(Array.from(e.target.files || [])); setDirty(true); }}
                {...aria('images', true)}
              />
            </Field>
          </div>
        ) : (
          <DealerListingPhotos
            carId={String(car?.id || car?._id || '')}
            initialImages={(car?.images || []).filter((i): i is NonNullable<typeof i> => Boolean(i && i.url))}
            disabled={submitting}
            onChanged={() => onPhotosChanged?.()}
          />
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button type="button" onClick={cancel} disabled={submitting} className="px-4 py-2 rounded-xl border border-[#B9D3CF] text-[#0A3340] font-medium hover:bg-[#F3FAF9] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">Cancel</button>
        <button type="submit" disabled={submitting} aria-busy={submitting} className="px-4 py-2 rounded-xl bg-[#176B87] text-white font-medium hover:bg-[#12576D] disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {submitting ? 'Saving…' : mode === 'create' ? 'Publish vehicle' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

export default DealerListingForm;
