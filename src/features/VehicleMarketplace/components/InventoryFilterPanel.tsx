import React, { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * One filter panel for the whole marketplace: the desktop sidebar and the mobile sheet render this same component, so a visitor
 * gets identical fields, labels and behaviour everywhere. Every text-like field accepts MANUAL ENTRY as well as the suggestions
 * the system offers (suggestions come from live inventory; typing is never limited to them).
 */
export const ANY = 'All';

export type FilterValues = {
  make: string; model: string; body: string; fuel: string; transmission: string; condition: string; color: string; seller: string;
  minPrice: number; maxPrice: number; minYear: number; maxYear: number; maxMileage: number; auction: boolean;
};
export type FilterLimits = { priceMax: number; yearMax: number; mileageMax: number };
export type FilterOptions = {
  makes: string[]; models: string[]; bodies: string[]; fuels: string[]; transmissions: string[]; conditions: string[]; colors: string[]; sellers: string[];
  priceSteps: number[]; yearFrom: number; mileageSteps: number[];
};

type Props = {
  idPrefix: string;
  values: FilterValues;
  limits: FilterLimits;
  options: FilterOptions;
  onChange: (patch: Partial<FilterValues>) => void;
  onReset: () => void;
  /** Sheet = full-width fields for touch; sidebar = compact. */
  variant: 'sheet' | 'sidebar';
};

const noAny = (list: string[]) => list.filter((v) => v && v !== ANY);
const labelCls = 'mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.06em] text-[#0A3340]';
const inputCls = 'w-full h-11 rounded-xl border border-[#CBDAD7] bg-[#F8FCFB] px-3 text-[14px] font-medium text-[#0A3340] outline-none transition-colors placeholder:text-[#94A3B8] hover:border-[#176B87] focus:border-[#176B87] focus:bg-white focus:ring-2 focus:ring-[#13B8A6]/30';

/** Typed value with suggestions. Commits after a short pause, on Enter and on blur, so the server is not queried per keystroke. */
export function ComboField({ id, label, value, suggestions, placeholder, onCommit, inputMode }: {
  id: string; label: string; value: string; suggestions: string[]; placeholder: string; onCommit: (v: string) => void; inputMode?: 'text' | 'search';
}) {
  const listId = useId();
  const shown = value === ANY ? '' : value;
  const [draft, setDraft] = useState(shown);
  const timer = useRef<number | undefined>(undefined);
  const last = useRef(shown);
  useEffect(() => { if (shown !== last.current) { last.current = shown; setDraft(shown); } }, [shown]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const commit = (v: string) => {
    window.clearTimeout(timer.current);
    const next = v.trim();
    last.current = next;
    if ((next || ANY) !== value) onCommit(next || ANY);
  };
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode={inputMode || 'text'}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="search"
          list={listId}
          value={draft}
          placeholder={placeholder}
          maxLength={40}
          aria-label={`${label} filter`}
          className={`${inputCls} ${draft ? 'pr-9' : ''}`}
          onChange={(e) => { setDraft(e.target.value); window.clearTimeout(timer.current); const v = e.target.value; timer.current = window.setTimeout(() => commit(v), 450); }}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(draft); } }}
        />
        {draft && (
          <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { setDraft(''); commit(''); }} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#64748B] hover:bg-[#EAF4F2]">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <datalist id={listId}>{suggestions.slice(0, 200).map((s) => <option key={s} value={s} />)}</datalist>
      </div>
    </div>
  );
}

/** A number typed by hand, shown with thousands separators. Empty means "no limit". */
export function NumberField({ id, label, value, emptyValue, placeholder, max, onCommit }: {
  id: string; label: string; value: number; emptyValue: number; placeholder: string; max: number; onCommit: (n: number) => void;
}) {
  const fmt = (n: number) => (n === emptyValue || !n ? '' : n.toLocaleString('en-KE'));
  const [draft, setDraft] = useState(fmt(value));
  const last = useRef(value);
  useEffect(() => { if (value !== last.current) { last.current = value; setDraft(fmt(value)); } }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (text: string) => {
    const digits = text.replace(/[^\d]/g, '');
    const n = digits ? Math.min(Number(digits), max) : emptyValue;
    last.current = n;
    setDraft(fmt(n));
    if (n !== value) onCommit(n);
  };
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        placeholder={placeholder}
        value={draft}
        aria-label={label}
        className={`${inputCls} tabular-nums`}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d,\s]/g, ''))}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(draft); } }}
      />
    </div>
  );
}

const chip = (on: boolean) => `shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors ${on ? 'border-[#176B87] bg-[#176B87] text-white shadow-sm' : 'border-[#CBDAD7] bg-white text-[#12576D] hover:border-[#176B87]'}`;
const short = (v: number) => (v >= 1_000_000 ? `${Number((v / 1_000_000).toFixed(2))}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v));

export default function InventoryFilterPanel({ idPrefix, values: v, limits, options: o, onChange, onReset, variant }: Props) {
  const id = (n: string) => `${idPrefix}-${n}`;
  const two = variant === 'sheet' ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-2';
  return (
    <div className="space-y-4" data-testid={`${idPrefix}-filter-panel`}>
      <ComboField id={id('make')} label="Make" value={v.make} suggestions={noAny(o.makes)} placeholder="Any make — pick or type" onCommit={(make) => onChange({ make, model: ANY })} />
      <ComboField id={id('model')} label="Model" value={v.model} suggestions={noAny(o.models)} placeholder="Any model — pick or type" onCommit={(model) => onChange({ model })} />

      <fieldset className="space-y-2">
        <legend className={labelCls}>Price (KES)</legend>
        <div className={two}>
          <NumberField id={id('min-price')} label="Min price" value={v.minPrice} emptyValue={0} placeholder="No minimum" max={limits.priceMax} onCommit={(minPrice) => onChange({ minPrice })} />
          <NumberField id={id('max-price')} label="Max price" value={v.maxPrice} emptyValue={limits.priceMax} placeholder="No maximum" max={limits.priceMax} onCommit={(maxPrice) => onChange({ maxPrice })} />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick maximum price">
          {o.priceSteps.map((s) => <button key={s} type="button" aria-pressed={v.maxPrice === s} className={chip(v.maxPrice === s)} onClick={() => onChange({ maxPrice: s })}>{`< ${short(s)}`}</button>)}
          <button type="button" aria-pressed={v.maxPrice === limits.priceMax} className={chip(v.maxPrice === limits.priceMax)} onClick={() => onChange({ maxPrice: limits.priceMax })}>Any</button>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className={labelCls}>Year</legend>
        <div className={two}>
          <NumberField id={id('min-year')} label="From year" value={v.minYear} emptyValue={0} placeholder={String(o.yearFrom)} max={limits.yearMax} onCommit={(minYear) => onChange({ minYear })} />
          <NumberField id={id('max-year')} label="To year" value={v.maxYear} emptyValue={limits.yearMax} placeholder={String(limits.yearMax)} max={limits.yearMax} onCommit={(maxYear) => onChange({ maxYear })} />
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className={labelCls}>Mileage (km)</legend>
        <NumberField id={id('max-mileage')} label="Maximum mileage" value={v.maxMileage} emptyValue={limits.mileageMax} placeholder="No maximum" max={limits.mileageMax} onCommit={(maxMileage) => onChange({ maxMileage })} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick maximum mileage">
          {o.mileageSteps.map((s) => <button key={s} type="button" aria-pressed={v.maxMileage === s} className={chip(v.maxMileage === s)} onClick={() => onChange({ maxMileage: s })}>{`< ${short(s)}`}</button>)}
          <button type="button" aria-pressed={v.maxMileage === limits.mileageMax} className={chip(v.maxMileage === limits.mileageMax)} onClick={() => onChange({ maxMileage: limits.mileageMax })}>Any</button>
        </div>
      </fieldset>

      <div className={two}>
        <ComboField id={id('body')} label="Body style" value={v.body} suggestions={noAny(o.bodies)} placeholder="Any" onCommit={(body) => onChange({ body })} />
        <ComboField id={id('fuel')} label="Fuel" value={v.fuel} suggestions={noAny(o.fuels)} placeholder="Any" onCommit={(fuel) => onChange({ fuel })} />
        <ComboField id={id('transmission')} label="Transmission" value={v.transmission} suggestions={noAny(o.transmissions)} placeholder="Any" onCommit={(transmission) => onChange({ transmission })} />
        <ComboField id={id('condition')} label="Condition" value={v.condition} suggestions={noAny(o.conditions)} placeholder="Any" onCommit={(condition) => onChange({ condition })} />
      </div>
      <ComboField id={id('color')} label="Colour" value={v.color} suggestions={noAny(o.colors)} placeholder="Any colour — pick or type" onCommit={(color) => onChange({ color })} />

      <fieldset>
        <legend className={labelCls}>Seller</legend>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Seller type">
          {o.sellers.map((s) => { const on = v.seller === s; return <button key={s} type="button" aria-pressed={on} className={chip(on)} onClick={() => onChange({ seller: s })}>{s === ANY ? 'All sellers' : s}</button>; })}
        </div>
      </fieldset>

      <label className="flex items-center gap-3 rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] px-3 py-3 text-sm font-semibold text-[#12576D]">
        <input type="checkbox" checked={v.auction} onChange={(e) => onChange({ auction: e.target.checked })} className="h-4 w-4 accent-[#176B87]" />
        <span><span className="block text-xs font-bold text-[#0A3340]">Live auction listings</span><span className="mt-0.5 block text-[10px] font-normal text-[#64748B]">Only vehicles currently open for bidding</span></span>
      </label>

      <button type="button" onClick={onReset} className="w-full rounded-xl border border-[#CBDAD7] py-3 text-[13px] font-extrabold text-[#12576D] hover:bg-[#F0FAF8]">Reset all filters</button>
    </div>
  );
}
