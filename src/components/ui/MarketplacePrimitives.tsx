import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items = [] }: { items?: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 && <span aria-hidden="true">/</span>}
          {item.href && index < items.length - 1 ? (
            <a href={item.href} className="hover:text-slate-800 transition-colors">{item.label}</a>
          ) : (
            <span className={index === items.length - 1 ? 'font-semibold text-slate-700' : ''}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function PriceTag({ value = 0, size = 'md', sub }: { value?: number; size?: 'sm' | 'md' | 'lg'; sub?: React.ReactNode }) {
  const sizes = { sm: 'text-sm', md: 'text-xl', lg: 'text-2xl' };
  return (
    <div>
      <div className={`font-black text-[#1E3063] ${sizes[size]}`}>KES {Number(value || 0).toLocaleString('en-KE')}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export function MapPlaceholder({ label = 'Location unavailable', pin = '📍', height = 180 }: { label?: string; pin?: React.ReactNode; height?: number }) {
  return (
    <div role="img" aria-label={label} className="rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
      <span className="mr-2" aria-hidden="true">{pin}</span>{label}
    </div>
  );
}

export function FilterChip({ label, active = false, onToggle, onRemove }: { label: string; active?: boolean; onToggle?: () => void; onRemove?: () => void }) {
  return (
    <button type="button" onClick={onToggle || onRemove} aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active ? 'border-[#1E3063] bg-[#1E3063] text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
      {label}{active && onRemove && <span aria-hidden="true">×</span>}
    </button>
  );
}

export function RangeSlider({ label, min, max, step = 1, value, onChange, formatValue = (v: number) => String(v) }: {
  label: string; min: number; max: number; step?: number; value: number; onChange: (value: number) => void; formatValue?: (value: number) => string;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex justify-between text-xs font-semibold text-slate-600"><span>{label}</span><span>{formatValue(value)}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full" aria-label={label} />
    </label>
  );
}

export function Segmented({ options, value, onChange }: { options: Array<{ id: string; label?: string; icon?: React.ReactNode }>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="group">
      {options.map(option => (
        <button key={option.id} type="button" onClick={() => onChange(option.id)} aria-pressed={value === option.id}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${value === option.id ? 'bg-[#1E3063] text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
          {option.icon}{option.label && <span className="ml-1">{option.label}</span>}
        </button>
      ))}
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: string; children?: React.ReactNode; footer?: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="p-5 border-b flex items-center justify-between"><h2 className="font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Close">×</button></div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="p-5 border-t flex gap-2 justify-end">{footer}</div>}
      </aside>
    </div>
  );
}

export function StatCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">{icon} {label}</div><div className="mt-1 text-xl font-black text-[#1E3063]">{value}</div></div>;
}
