import { Shield, CircleDashed } from 'lucide-react';
import type { ProviderCapability, ServiceTaxonomy } from '../types/inspection';

/** Label lookup against the canonical taxonomy. Unknown codes degrade to a readable string, never to nothing. */
export function categoryLabel(taxonomy: ServiceTaxonomy | null, code: string): string {
  return taxonomy?.categories.find((c) => c.code === code)?.label || code.replace(/_/g, ' ');
}

export function capabilityScope(cap: ProviderCapability): string {
  const makes = cap.vehicleMakes === 'all' ? 'all makes' : cap.vehicleMakes.length ? cap.vehicleMakes.join(', ') : 'makes not stated';
  const pts = cap.powertrains.length ? ` · ${cap.powertrains.map((p) => p.replace(/_/g, ' ')).join(', ')}` : '';
  return `${makes}${pts}`;
}

/**
 * One badge per capability. "Verified by KAYAD" is shown only for capabilities an
 * administrator verified; everything else is plainly "Declared by the business".
 */
export default function CapabilityBadges({ capabilities, taxonomy, max }: { capabilities?: ProviderCapability[]; taxonomy: ServiceTaxonomy | null; max?: number }) {
  const list = (capabilities || []).slice().sort((a, b) => Number(b.status === 'verified') - Number(a.status === 'verified'));
  if (!list.length) return <p className="text-xs text-[#64748B]">No services published yet.</p>;
  const shown = typeof max === 'number' ? list.slice(0, max) : list;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Services">
      {shown.map((cap, i) => {
        const verified = cap.status === 'verified';
        return (
          <li
            key={`${cap.category}-${cap.subcategory || ''}-${i}`}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${verified ? 'bg-[#E7F7F4] border-[#13B8A6] text-[#12576d]' : 'bg-white border-[#BDE5DE] text-[#64748B]'}`}
            title={`${verified ? 'Verified by KAYAD' : 'Declared by the business, not verified by KAYAD'} · ${capabilityScope(cap)}`}
          >
            {verified ? <Shield size={12} aria-hidden /> : <CircleDashed size={12} aria-hidden />}
            <span>{categoryLabel(taxonomy, cap.category)}</span>
            <span className="sr-only">{verified ? ' (verified by KAYAD)' : ' (declared by the business, not verified)'}</span>
            <span aria-hidden className="opacity-70">· {verified ? 'verified' : 'declared'}</span>
          </li>
        );
      })}
      {typeof max === 'number' && list.length > max && <li className="text-xs text-[#64748B] self-center">+{list.length - max} more</li>}
    </ul>
  );
}
