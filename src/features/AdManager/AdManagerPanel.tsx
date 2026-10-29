import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trash2, Plus, Eye, EyeOff, Loader2, Megaphone, RefreshCw } from 'lucide-react';
import {
  AdSlot, AdPlacement, AdDisplayMode, AdSlotInput, AdStat,
  getAllAdSlots, getAdStats, createAdSlot, updateAdSlot, deleteAdSlot, AdApiError,
} from '../../services/adApi';

interface AdManagerPanelProps {
  onClose?: () => void;
  embedded?: boolean;
}

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  top_ticker: 'Top Scrolling Strip',
  left_rail: 'Left Floating Rail',
  right_rail: 'Right Floating Rail',
  mid_grid: 'Mid-Grid Card',
  sidebar: 'Filter Sidebar',
};

const EMPTY_DRAFT: AdSlotInput = {
  placement: 'top_ticker',
  title: '',
  tagline: '',
  priceTag: '',
  buttonText: '',
  buttonUrl: '',
  backgroundColor: '#176B87',
  textColor: '#FFFFFF',
  opacity: 100,
  sortOrder: 0,
  displayMode: 'scroll',
  scrollDurationSeconds: 28,
  fadeDurationMs: 4500,
  status: 'active',
  isVisible: true,
  startAt: null,
  endAt: null,
};

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const dateFromLocal = (value: string) => value ? new Date(value).toISOString() : null;
const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export const AdManagerPanel: React.FC<AdManagerPanelProps> = ({ onClose, embedded = false }) => {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<AdSlotInput>({ ...EMPTY_DRAFT });
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState<AdStat[]>([]);
  const requestSequence = useRef(0);
  const mounted = useRef(false);

  const refreshStats = useCallback(async () => {
    try {
      const nextStats = await getAdStats();
      if (!Array.isArray(nextStats)) throw new Error('The advertising service returned unexpected statistics.');
      if (mounted.current) {
        setStats(nextStats);
        setStatsError(null);
      }
    } catch (err) {
      if (mounted.current) setStatsError(errorMessage(err, 'Ad statistics are unavailable.'));
    }
  }, []);

  const loadSlots = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(null);
    const [slotsResult, statsResult] = await Promise.allSettled([getAllAdSlots(), getAdStats()]);
    if (!mounted.current || sequence !== requestSequence.current) return;
    if (slotsResult.status === 'fulfilled' && Array.isArray(slotsResult.value)) {
      setSlots(slotsResult.value);
      setError(null);
    } else {
      setError(slotsResult.status === 'rejected'
        ? errorMessage(slotsResult.reason, 'Ad campaigns could not be loaded. Retry.')
        : 'The advertising service returned an unexpected campaign list. Retry.');
    }
    if (statsResult.status === 'fulfilled' && Array.isArray(statsResult.value)) {
      setStats(statsResult.value);
      setStatsError(null);
    } else {
      setStatsError(statsResult.status === 'rejected'
        ? errorMessage(statsResult.reason, 'Ad statistics are unavailable.')
        : 'The advertising service returned unexpected statistics.');
    }
    setLoading(false);
  }, [refreshStats]);

  useEffect(() => {
    mounted.current = true;
    void loadSlots();
    return () => {
      mounted.current = false;
      requestSequence.current += 1;
    };
  }, [loadSlots]);

  const handleFieldChange = (
    id: string,
    field: keyof AdSlotInput,
    value: string | number | boolean | null,
  ) => {
    setSlots((prev) => prev.map((slot) => slot.id === id ? { ...slot, [field]: value } : slot));
  };

  const handleSave = async (slot: AdSlot) => {
    setSavingId(slot.id);
    setError(null);
    try {
      const updated = await updateAdSlot(slot.id, {
        placement: slot.placement,
        title: slot.title,
        tagline: slot.tagline,
        priceTag: slot.priceTag,
        buttonText: slot.buttonText,
        buttonUrl: slot.buttonUrl,
        backgroundColor: slot.backgroundColor,
        textColor: slot.textColor,
        opacity: slot.opacity,
        isVisible: slot.isVisible,
        status: slot.status || 'active',
        startAt: slot.startAt || null,
        endAt: slot.endAt || null,
        sortOrder: slot.sortOrder,
        displayMode: slot.displayMode,
        scrollDurationSeconds: slot.scrollDurationSeconds,
        fadeDurationMs: slot.fadeDurationMs,
      });
      setSlots((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      await refreshStats();
    } catch (err) {
      setError(errorMessage(err, 'Could not save this ad configuration.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleVisible = async (slot: AdSlot) => {
    setSavingId(slot.id);
    setError(null);
    try {
      const updated = await updateAdSlot(slot.id, { isVisible: !slot.isVisible });
      setSlots((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      await refreshStats();
    } catch (err) {
      setError(errorMessage(err, 'Could not update ad visibility.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (slot: AdSlot) => {
    if (!window.confirm(`Remove "${slot.title}" permanently? This cannot be undone.`)) return;
    setSavingId(slot.id);
    setError(null);
    try {
      await deleteAdSlot(slot.id);
      setSlots((prev) => prev.filter((item) => item.id !== slot.id));
      setStats((prev) => prev.filter((item) => item.id !== slot.id));
      await refreshStats();
    } catch (err) {
      setError(errorMessage(err, 'Could not remove this ad.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      setError('An ad title is required.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await createAdSlot({ ...draft, title: draft.title.trim() });
      setSlots((prev) => [...prev, created]);
      setDraft({ ...EMPTY_DRAFT });
      setShowAddForm(false);
      await refreshStats();
    } catch (err) {
      setError(errorMessage(err, 'Could not create this ad.'));
    } finally {
      setCreating(false);
    }
  };

  const setDraftField = <K extends keyof AdSlotInput,>(field: K, value: AdSlotInput[K]) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const metrics = [
    { label: 'Impressions', value: statsError ? '—' : stats.reduce((sum, stat) => sum + (Number(stat.impressions) || 0), 0).toLocaleString() },
    { label: 'Clicks', value: statsError ? '—' : stats.reduce((sum, stat) => sum + (Number(stat.clicks) || 0), 0).toLocaleString() },
    { label: 'Click-through rate', value: statsError ? '—' : (() => {
      const impressions = stats.reduce((sum, stat) => sum + (Number(stat.impressions) || 0), 0);
      const clicks = stats.reduce((sum, stat) => sum + (Number(stat.clicks) || 0), 0);
      return impressions ? `${((clicks / impressions) * 100).toFixed(2)}%` : '0.00%';
    })() },
  ];

  const renderTimingControls = (
    values: Pick<AdSlotInput, 'displayMode' | 'scrollDurationSeconds' | 'fadeDurationMs'>,
    update: (field: 'displayMode' | 'scrollDurationSeconds' | 'fadeDurationMs', value: string | number) => void,
  ) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <label className="text-xs text-[#64748B]">Ticker animation
        <select value={values.displayMode || 'scroll'} onChange={(event) => update('displayMode', event.target.value)} className="mt-1 block w-full border border-[#D7E7E4] rounded-lg px-3 py-2 bg-white">
          <option value="scroll">Scroll right to left</option>
          <option value="fade">Fade between notices</option>
        </select>
      </label>
      {values.displayMode === 'fade' ? (
        <label className="text-xs text-[#64748B]">Fade duration
          <select value={values.fadeDurationMs || 4500} onChange={(event) => update('fadeDurationMs', Number(event.target.value))} className="mt-1 block w-full border border-[#D7E7E4] rounded-lg px-3 py-2 bg-white">
            <option value={2500}>2.5 seconds</option><option value={4500}>4.5 seconds</option><option value={6500}>6.5 seconds</option><option value={9000}>9 seconds</option>
          </select>
        </label>
      ) : (
        <label className="text-xs text-[#64748B]">Scroll duration
          <select value={values.scrollDurationSeconds || 28} onChange={(event) => update('scrollDurationSeconds', Number(event.target.value))} className="mt-1 block w-full border border-[#D7E7E4] rounded-lg px-3 py-2 bg-white">
            <option value={18}>Fast · 18s</option><option value={28}>Normal · 28s</option><option value={40}>Slow · 40s</option><option value={55}>Very slow · 55s</option>
          </select>
        </label>
      )}
    </div>
  );

  const shellClass = embedded
    ? 'w-full min-w-0'
    : 'fixed inset-0 bg-[#0A3340]/50 z-[60] flex items-center justify-center p-4';
  const cardClass = embedded
    ? 'bg-white rounded-2xl w-full min-w-0 shadow-sm border border-[#D7E7E4]'
    : 'bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl';

  return (
    <div className={shellClass}>
      <section className={cardClass}>
        <header className={`${embedded ? 'bg-white' : 'sticky top-0 bg-white'} border-b border-[#D7E7E4] px-5 py-4 flex items-center justify-between gap-4 rounded-t-2xl`}>
          <div>
            <h2 className="text-base font-bold text-[#176B87]">Ad Traffic Control</h2>
            <p className="text-xs text-[#64748B] mt-1">Manage persisted ad placements, campaign visibility, scheduling, destination links, presentation and delivery metrics.</p>
          </div>
          {!embedded && onClose && <button type="button" onClick={onClose} aria-label="Close Ad Manager" className="p-1.5 hover:bg-[#EEF7F5] rounded-lg"><X className="w-5 h-5 text-[#64748B]" /></button>}
        </header>

        <div className="p-4 md:p-5 space-y-4">
          {error && <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center justify-between gap-3">
            <span>{error}</span><button type="button" onClick={() => void loadSlots()} className="underline whitespace-nowrap">Retry</button>
          </div>}
          {statsError && <div role="status" className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">Campaign settings loaded, but delivery statistics are unavailable: {statsError}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {metrics.map((metric) => <div key={metric.label} className="rounded-xl bg-[#F6FAF9] border border-[#D7E7E4] p-3">
              <div className="text-[10px] uppercase tracking-wide text-[#64748B]">{metric.label}</div>
              <div className="text-lg font-bold text-[#0A3340]">{metric.value}</div>
            </div>)}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold text-[#0A3340]">Configured ad placements <span className="text-xs font-normal text-[#64748B]">({slots.length})</span></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void loadSlots()} disabled={loading} className="inline-flex items-center gap-1.5 border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs font-semibold text-[#176B87] disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
              <button type="button" onClick={() => { setShowAddForm((shown) => !shown); setDraft({ ...EMPTY_DRAFT }); setError(null); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold bg-[#176B87] hover:bg-[#0A3340] text-white"><Plus className="w-4 h-4" /> New Campaign</button>
            </div>
          </div>

          {loading && <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-[#94A3B8] animate-spin" /><span className="ml-2 text-xs text-[#64748B]">Loading ad configuration…</span></div>}
          {!loading && error && slots.length === 0 && <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">Campaigns could not be loaded. Retry after checking admin access and API availability.</div>}
          {!loading && !error && slots.length === 0 && <div className="text-center py-10 border border-dashed border-[#D7E7E4] rounded-xl">
            <Megaphone className="w-8 h-8 text-[#94A3B8] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#0A3340]">No ad slots configured</p>
            <p className="text-xs text-[#64748B] mt-1">Create a slot to control where and how advertising appears across the marketplace.</p>
          </div>}

          {!loading && slots.map((slot) => (
            <article key={slot.id} className="border border-[#D7E7E4] rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select aria-label={`Placement for ${slot.title}`} value={slot.placement} onChange={(event) => handleFieldChange(slot.id, 'placement', event.target.value as AdPlacement)} className="text-xs font-bold text-[#176B87] border border-[#D7E7E4] rounded-lg px-2 py-2">
                    {Object.entries(PLACEMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void handleToggleVisible(slot)} disabled={savingId === slot.id} aria-label={slot.isVisible ? 'Hide ad' : 'Show ad'} className={`p-2 rounded-lg disabled:opacity-50 ${slot.isVisible ? 'text-emerald-700 bg-emerald-50' : 'text-[#64748B] bg-[#EEF7F5]'}`}>{slot.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                  <button type="button" onClick={() => void handleDelete(slot)} disabled={savingId === slot.id} aria-label="Delete ad" className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <input aria-label="Ad title" maxLength={120} value={slot.title || ''} onChange={(event) => handleFieldChange(slot.id, 'title', event.target.value)} placeholder="Campaign title" className="w-full border border-[#D7E7E4] rounded-lg px-3 py-2 text-sm font-semibold" />
              <input aria-label="Ad tagline" maxLength={240} value={slot.tagline || ''} onChange={(event) => handleFieldChange(slot.id, 'tagline', event.target.value)} placeholder="Tagline or notice text" className="w-full border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input aria-label="Price tag" maxLength={80} value={slot.priceTag || ''} onChange={(event) => handleFieldChange(slot.id, 'priceTag', event.target.value)} placeholder="Price tag" className="border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
                <input aria-label="Button text" maxLength={50} value={slot.buttonText || ''} onChange={(event) => handleFieldChange(slot.id, 'buttonText', event.target.value)} placeholder="Button text" className="border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
              </div>
              <input aria-label="Destination URL" maxLength={2048} value={slot.buttonUrl || ''} onChange={(event) => handleFieldChange(slot.id, 'buttonUrl', event.target.value)} placeholder="Destination URL (https://...)" className="w-full border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="text-xs text-[#64748B]">Status
                  <select value={slot.status || 'active'} onChange={(event) => handleFieldChange(slot.id, 'status', event.target.value as 'draft' | 'active' | 'paused' | 'expired')} className="mt-1 block w-full border border-[#D7E7E4] rounded-lg px-3 py-2 bg-white">
                    <option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="expired">Expired</option>
                  </select>
                </label>
                <label className="text-xs text-[#64748B]">Display order
                  <input type="number" min={0} max={100000} step={1} value={slot.sortOrder ?? 0} onChange={(event) => handleFieldChange(slot.id, 'sortOrder', Number(event.target.value))} className="mt-1 block w-full border border-[#D7E7E4] rounded-lg px-3 py-2" />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="text-xs text-[#64748B]">Starts (local time)
                  <input type="datetime-local" value={toDateTimeLocal(slot.startAt)} onChange={(event) => handleFieldChange(slot.id, 'startAt', dateFromLocal(event.target.value))} className="mt-1 block w-full border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
                </label>
                <label className="text-xs text-[#64748B]">Ends (local time)
                  <input type="datetime-local" value={toDateTimeLocal(slot.endAt)} onChange={(event) => handleFieldChange(slot.id, 'endAt', dateFromLocal(event.target.value))} className="mt-1 block w-full border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
                </label>
              </div>
              {slot.placement === 'top_ticker' && renderTimingControls(slot, (field, value) => handleFieldChange(slot.id, field, value))}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-[#64748B]">Background <input type="color" value={slot.backgroundColor || '#176B87'} onChange={(event) => handleFieldChange(slot.id, 'backgroundColor', event.target.value)} className="w-8 h-8 rounded border border-[#D7E7E4]" /></label>
                <label className="flex items-center gap-2 text-xs text-[#64748B]">Text <input type="color" value={slot.textColor || '#FFFFFF'} onChange={(event) => handleFieldChange(slot.id, 'textColor', event.target.value)} className="w-8 h-8 rounded border border-[#D7E7E4]" /></label>
                <label className="flex items-center gap-2 text-xs text-[#64748B] flex-1 min-w-[160px]">Opacity <input type="range" min={0} max={100} value={slot.opacity ?? 100} onChange={(event) => handleFieldChange(slot.id, 'opacity', Number(event.target.value))} className="flex-1" /><span>{slot.opacity ?? 100}%</span></label>
              </div>
              <div className="rounded-lg px-3 py-3 text-xs font-semibold" style={{ backgroundColor: slot.backgroundColor || '#176B87', color: slot.textColor || '#FFFFFF', opacity: (slot.opacity ?? 100) / 100 }}>
                {slot.title || 'Ad preview'}{slot.tagline ? ` — ${slot.tagline}` : ''}{slot.buttonText ? ` · ${slot.buttonText}` : ''}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#64748B]">{slot.isVisible ? 'Visibility enabled' : 'Hidden from visitors'} · {slot.status || 'active'}</span>
                <button type="button" onClick={() => void handleSave(slot)} disabled={savingId === slot.id} className="bg-[#176B87] hover:bg-[#0A3340] text-white text-xs font-bold rounded-lg px-4 py-2 disabled:opacity-50">
                  {savingId === slot.id ? 'Saving…' : 'Save Configuration'}
                </button>
              </div>
            </article>
          ))}

          {showAddForm && <form onSubmit={handleCreate} className="border-2 border-dashed border-[#176B87]/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-[#0A3340]">New ad campaign</h3><button type="button" onClick={() => setShowAddForm(false)} className="text-xs font-semibold text-[#64748B]">Cancel</button></div>
            <select aria-label="New campaign placement" value={draft.placement} onChange={(event) => setDraftField('placement', event.target.value as AdPlacement)} className="text-xs font-bold text-[#176B87] border border-[#D7E7E4] rounded-lg px-3 py-2">
              {Object.entries(PLACEMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input aria-label="New campaign title" value={draft.title} maxLength={120} onChange={(event) => setDraftField('title', event.target.value)} placeholder="Campaign title *" required className="w-full border border-[#D7E7E4] rounded-lg px-3 py-2 text-sm" />
            <input aria-label="New campaign tagline" value={draft.tagline || ''} maxLength={240} onChange={(event) => setDraftField('tagline', event.target.value)} placeholder="Tagline or notice text" className="w-full border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input aria-label="New price tag" value={draft.priceTag || ''} maxLength={80} onChange={(event) => setDraftField('priceTag', event.target.value)} placeholder="Price tag" className="border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
              <input aria-label="New button text" value={draft.buttonText || ''} maxLength={50} onChange={(event) => setDraftField('buttonText', event.target.value)} placeholder="Button text" className="border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
            </div>
            <input aria-label="New destination URL" value={draft.buttonUrl || ''} maxLength={2048} onChange={(event) => setDraftField('buttonUrl', event.target.value)} placeholder="Destination URL (https://...)" className="w-full border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label className="text-xs text-[#64748B]">Status
                <select value={draft.status || 'active'} onChange={(event) => setDraftField('status', event.target.value as 'draft' | 'active' | 'paused' | 'expired')} className="mt-1 block w-full border border-[#D7E7E4] rounded-lg px-3 py-2 bg-white"><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="expired">Expired</option></select>
              </label>
              <label className="text-xs text-[#64748B]">Starts (local time)
                <input type="datetime-local" value={toDateTimeLocal(draft.startAt)} onChange={(event) => setDraftField('startAt', dateFromLocal(event.target.value))} className="mt-1 block w-full border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
              </label>
              <label className="text-xs text-[#64748B]">Ends (local time)
                <input type="datetime-local" value={toDateTimeLocal(draft.endAt)} onChange={(event) => setDraftField('endAt', dateFromLocal(event.target.value))} className="mt-1 block w-full border border-[#D7E7E4] rounded-lg px-3 py-2 text-xs" />
              </label>
            </div>
            {draft.placement === 'top_ticker' && renderTimingControls(draft, (field, value) => setDraftField(field, value as never))}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
              <label className="flex items-center gap-2">Background <input type="color" value={draft.backgroundColor || '#176B87'} onChange={(event) => setDraftField('backgroundColor', event.target.value)} /></label>
              <label className="flex items-center gap-2">Text <input type="color" value={draft.textColor || '#FFFFFF'} onChange={(event) => setDraftField('textColor', event.target.value)} /></label>
              <label className="flex items-center gap-2 flex-1">Opacity <input type="range" min={0} max={100} value={draft.opacity ?? 100} onChange={(event) => setDraftField('opacity', Number(event.target.value))} /><span>{draft.opacity ?? 100}%</span></label>
            </div>
            <div className="rounded-lg px-3 py-3 text-xs font-semibold" style={{ backgroundColor: draft.backgroundColor || '#176B87', color: draft.textColor || '#FFFFFF', opacity: (draft.opacity ?? 100) / 100 }}>{draft.title || 'Campaign preview'}{draft.tagline ? ` — ${draft.tagline}` : ''}{draft.buttonText ? ` · ${draft.buttonText}` : ''}</div>
            <div className="flex gap-2"><button type="submit" disabled={creating || !draft.title.trim()} className="bg-[#176B87] hover:bg-[#0A3340] text-white text-xs font-bold rounded-lg px-4 py-2 disabled:opacity-50">{creating ? 'Creating…' : 'Create Campaign'}</button><button type="button" onClick={() => { setDraft({ ...EMPTY_DRAFT }); setShowAddForm(false); }} className="text-xs font-semibold text-[#64748B] px-4 py-2">Cancel</button></div>
          </form>}
        </div>
      </section>
    </div>
  );
};

export default AdManagerPanel;
