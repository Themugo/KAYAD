import React, { useEffect, useId, useRef, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { inspectionApi, automotiveApi } from '../InspectionMarketplace/services/api';
import type { ServiceTaxonomy } from '../InspectionMarketplace/types/inspection';
import { isPlausiblePhone } from './inspectionJourney';

interface Props {
  isOpen: boolean;
  signedIn: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}

const fieldClass =
  'w-full px-3.5 py-3 bg-slate-50 text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#176B87] focus:bg-white';

/** Provider application: authenticated, reviewed by KAYAD, grants no access by itself. */
export const ProviderApplicationModal: React.FC<Props> = ({ isOpen, signedIn, onClose, onOpenAuth }) => {
  const uid = useId();
  const [form, setForm] = useState({ companyName: '', phone: '', county: '', town: '', address: '' });
  const [hasWorkshop, setHasWorkshop] = useState(false);
  const [offersMobile, setOffersMobile] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [taxonomy, setTaxonomy] = useState<ServiceTaxonomy | null>(null);
  const [taxonomyError, setTaxonomyError] = useState(false);
  const [partial, setPartial] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!isOpen || taxonomy) return;
    let alive = true;
    automotiveApi.getServiceTaxonomy().then((t) => { if (alive) setTaxonomy(t); }).catch(() => { if (alive) setTaxonomyError(true); });
    return () => { alive = false; };
  }, [isOpen, taxonomy]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((v) => ({ ...v, [key]: e.target.value }));
  const phoneInvalid = touched && !isPlausiblePhone(form.phone);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    setTouched(true);
    if (!isPlausiblePhone(form.phone)) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = (await inspectionApi.registerProvider({
        companyName: form.companyName.trim() || undefined,
        phone: form.phone.trim(),
        country: 'Kenya',
        county: form.county.trim() || undefined,
        town: form.town.trim() || undefined,
        address: form.address.trim() || undefined,
        hasWorkshop,
        offersMobile,
      })) as unknown;
      // The registration call returns the business id. Services are then declared against the canonical taxonomy.
      const providerId = typeof result === 'string' ? result : (result as { id?: string; providerId?: string } | null)?.id || (result as { providerId?: string } | null)?.providerId;
      const failed: string[] = [];
      if (providerId) {
        for (const code of chosen) {
          try { await automotiveApi.declareCapability(providerId, { category: code, allMakes: true, travelsToCustomer: offersMobile }); }
          catch { failed.push(taxonomy?.categories.find((c) => c.code === code)?.label || code); }
        }
      } else if (chosen.length) {
        failed.push(...chosen);
      }
      if (failed.length) setPartial(`Your application was submitted, but these services could not be recorded yet: ${failed.join(', ')}. You can add them again once you are signed in to your business.`);
      const serverMessage = result && typeof result === 'object' ? (result as { message?: unknown }).message : undefined;
      setDone(typeof serverMessage === 'string' && serverMessage ? serverMessage : 'Your provider application was submitted to KAYAD for review.');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'The application could not be submitted. Please try again.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const text = (key: keyof typeof form, label: string, extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}) => (
    <div className="space-y-1.5">
      <label htmlFor={`${uid}-${key}`} className="text-xs font-bold text-slate-600 block">{label}</label>
      <input id={`${uid}-${key}`} className={fieldClass} value={form[key]} onChange={set(key)} disabled={submitting} {...extra} />
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!submitting) onClose(); }} title="Apply to list your automotive business" size="lg">
      {!signedIn ? (
        <div className="py-4 text-center space-y-4">
          <BriefcaseBusiness className="w-8 h-8 mx-auto text-[#176B87]" aria-hidden="true" />
          <p className="text-sm text-slate-600 max-w-md mx-auto">Provider applications are tied to a KAYAD account and reviewed by KAYAD. Sign in or create an account to apply.</p>
          <Button variant="primary" onClick={onOpenAuth}>Sign in / Create account</Button>
        </div>
      ) : done ? (
        <div role="status" className="py-4 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 mx-auto text-[#13B8A6]" aria-hidden="true" />
          <p className="text-sm text-slate-700">{done}</p>
          {chosen.length > 0 && !partial && <p className="text-xs text-slate-500">The services you chose are recorded as declared, not verified. KAYAD verifies each one separately.</p>}
          {partial && <p role="alert" className="text-xs text-amber-800">{partial}</p>}
          <p className="text-xs text-slate-500">Submitting an application does not grant provider access. KAYAD decides the outcome.</p>
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4" aria-busy={submitting}>
          <p className="rounded-xl bg-[#F5F8F8] border border-slate-200 p-3.5 text-xs text-slate-600">Share the business details you are comfortable providing. Submitting an application does not grant provider access; KAYAD reviews it and decides.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {text('companyName', 'Business / trading name', { autoComplete: 'organization' })}
            <div className="space-y-1.5">
              <label htmlFor={`${uid}-phone`} className="text-xs font-bold text-slate-600 block">Contact phone</label>
              <input
                id={`${uid}-phone`} type="tel" inputMode="tel" autoComplete="tel" className={`${fieldClass} ${phoneInvalid ? 'border-rose-400' : ''}`}
                value={form.phone} onChange={set('phone')} onBlur={() => setTouched(true)} disabled={submitting} aria-required="true"
                aria-invalid={phoneInvalid || undefined} aria-describedby={phoneInvalid ? `${uid}-phone-error` : undefined}
              />
              {phoneInvalid && <p id={`${uid}-phone-error`} className="text-xs font-semibold text-rose-600">Enter a valid phone number (9–15 digits).</p>}
            </div>
            {text('county', 'County')}
            {text('town', 'Town / city')}
          </div>
          {text('address', 'Business / workshop address', { autoComplete: 'street-address' })}
          <fieldset className="space-y-2" disabled={submitting}>
            <legend className="text-xs font-bold text-slate-600">Services you offer</legend>
            <p className="text-xs text-slate-500">These are your claims. KAYAD verifies each service separately from evidence you provide; until then it is shown as “declared”.</p>
            {taxonomyError && <p role="alert" className="text-xs text-rose-700">The service list could not be loaded. You can submit now and add services later.</p>}
            <div className="grid sm:grid-cols-2 gap-1">
              {(taxonomy?.categories || []).map((c) => (
                <label key={c.code} className="flex items-start gap-2 text-sm min-h-[44px] items-center">
                  <input type="checkbox" className="w-4 h-4 accent-[#176B87]" checked={chosen.includes(c.code)} onChange={(e) => setChosen((v) => (e.target.checked ? [...v, c.code] : v.filter((x) => x !== c.code)))} />
                  <span>{c.label}{c.highRisk ? ' (needs evidence)' : ''}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-1" disabled={submitting}>
            <legend className="text-xs font-bold text-slate-600">How you work</legend>
            <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" className="w-4 h-4 accent-[#176B87]" checked={hasWorkshop} onChange={(e) => setHasWorkshop(e.target.checked)} /> I have a workshop or premises customers can visit</label>
            <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" className="w-4 h-4 accent-[#176B87]" checked={offersMobile} onChange={(e) => setOffersMobile(e.target.checked)} /> I travel to the vehicle</label>
            {!hasWorkshop && <p className="text-xs text-slate-500">No premises? That is fine. KAYAD has an evidence-based route for legitimate businesses without customer-facing premises; you will be asked for a registration or tax number and supporting documents.</p>}
          </fieldset>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ProviderApplicationModal;
