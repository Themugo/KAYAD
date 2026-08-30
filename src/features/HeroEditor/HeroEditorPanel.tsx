import React, { useEffect, useState } from 'react';
import { X, Trash2, Plus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { HeroSlide, HeroSlideInput, getAllHeroSlides, createHeroSlide, updateHeroSlide, deleteHeroSlide, HeroApiError } from '../../services/heroApi';

interface HeroEditorPanelProps {
  onClose: () => void;
}

const EMPTY_DRAFT: HeroSlideInput = {
  eyebrowText: '',
  headline: '',
  subheadline: '',
  ctaPrimaryText: '',
  ctaPrimaryLink: '',
  ctaSecondaryText: '',
  ctaSecondaryLink: '',
  backgroundType: 'gradient',
  backgroundValue: '',
  overlayColor: '#1E3063',
  overlayOpacity: 40,
  displayMode: 'boxed',
  sortOrder: 0,
};

/**
 * Real, backend-connected Hero Editor - same deliberate pattern as
 * AdManagerPanel.tsx (real, backend-persisted, not the localStorage-
 * only pattern used for home-page section-visibility toggles
 * elsewhere), since every real visitor must see the admin's hero
 * edits. Supports everything asked for directly: full text editing,
 * adding more than one slide (a real slider - the marketplace page
 * auto-rotates between visible slides), a boxed-vs-fullscreen display
 * mode per slide ("windowed" vs "fit to screen"), and a real,
 * layered background (a base image/color/gradient layer plus a
 * separate overlay color+opacity layer on top of it) - all editable
 * here with no code change ever needed.
 */
export const HeroEditorPanel: React.FC<HeroEditorPanelProps> = ({ onClose }) => {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<HeroSlideInput>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);

  const loadSlides = () => {
    setLoading(true);
    setError(null);
    getAllHeroSlides()
      .then(setSlides)
      .catch((err) => setError(err instanceof HeroApiError ? err.message : 'Could not load the hero card.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSlides(); }, []);

  const handleFieldChange = (id: string, field: keyof HeroSlideInput | 'isVisible', value: string | number | boolean) => {
    setSlides((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = async (slide: HeroSlide) => {
    setSavingId(slide.id);
    try {
      const updated = await updateHeroSlide(slide.id, {
        eyebrowText: slide.eyebrowText,
        headline: slide.headline,
        subheadline: slide.subheadline,
        ctaPrimaryText: slide.ctaPrimaryText,
        ctaPrimaryLink: slide.ctaPrimaryLink,
        ctaSecondaryText: slide.ctaSecondaryText,
        ctaSecondaryLink: slide.ctaSecondaryLink,
        backgroundType: slide.backgroundType,
        backgroundValue: slide.backgroundValue,
        overlayColor: slide.overlayColor,
        overlayOpacity: slide.overlayOpacity,
        displayMode: slide.displayMode,
        isVisible: slide.isVisible,
        sortOrder: slide.sortOrder,
      });
      setSlides((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch (err) {
      setError(err instanceof HeroApiError ? err.message : 'Could not save this slide.');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleVisible = async (slide: HeroSlide) => {
    setSavingId(slide.id);
    try {
      const updated = await updateHeroSlide(slide.id, { isVisible: !slide.isVisible });
      setSlides((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch (err) {
      setError(err instanceof HeroApiError ? err.message : 'Could not update visibility.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (slide: HeroSlide) => {
    if (!window.confirm(`Remove "${slide.headline}" permanently? This cannot be undone.`)) return;
    setSavingId(slide.id);
    try {
      await deleteHeroSlide(slide.id);
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
    } catch (err) {
      setError(err instanceof HeroApiError ? err.message : 'Could not remove this slide.');
      setSavingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.headline.trim()) return;
    setCreating(true);
    try {
      const created = await createHeroSlide(draft);
      setSlides((prev) => [...prev, created]);
      setDraft(EMPTY_DRAFT);
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof HeroApiError ? err.message : 'Could not create this slide.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1E3063]">Hero Editor</h2>
            <p className="text-xs text-slate-500 mt-0.5">Edit the hero card's text, add slides for a real slider, choose windowed or fit-to-screen display, and layer background/overlay colors and opacity.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              {slides.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">
                  No real slides yet - the page shows a default hero until you add one here.
                </p>
              )}

              {slides.map((slide) => (
                <div key={slide.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1E3063]">Slide</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleVisible(slide)}
                        disabled={savingId === slide.id}
                        className={`p-1.5 rounded-lg ${slide.isVisible ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}
                        title={slide.isVisible ? 'Visible on page' : 'Hidden from page'}
                      >
                        {slide.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(slide)}
                        disabled={savingId === slide.id}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                        title="Remove slide"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    value={slide.eyebrowText || ''}
                    onChange={(e) => handleFieldChange(slide.id, 'eyebrowText', e.target.value)}
                    placeholder="Eyebrow text (small label above the headline)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                  <input
                    value={slide.headline}
                    onChange={(e) => handleFieldChange(slide.id, 'headline', e.target.value)}
                    placeholder="Headline"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold"
                  />
                  <textarea
                    value={slide.subheadline || ''}
                    onChange={(e) => handleFieldChange(slide.id, 'subheadline', e.target.value)}
                    placeholder="Subheadline"
                    rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={slide.ctaPrimaryText || ''}
                      onChange={(e) => handleFieldChange(slide.id, 'ctaPrimaryText', e.target.value)}
                      placeholder="Primary button text"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                    <input
                      value={slide.ctaPrimaryLink || ''}
                      onChange={(e) => handleFieldChange(slide.id, 'ctaPrimaryLink', e.target.value)}
                      placeholder="Primary button page (e.g. marketplace)"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                    <input
                      value={slide.ctaSecondaryText || ''}
                      onChange={(e) => handleFieldChange(slide.id, 'ctaSecondaryText', e.target.value)}
                      placeholder="Secondary button text"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                    <input
                      value={slide.ctaSecondaryLink || ''}
                      onChange={(e) => handleFieldChange(slide.id, 'ctaSecondaryLink', e.target.value)}
                      placeholder="Secondary button page"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      Display
                      <select
                        value={slide.displayMode}
                        onChange={(e) => handleFieldChange(slide.id, 'displayMode', e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1"
                      >
                        <option value="boxed">Windowed (compact)</option>
                        <option value="fullscreen">Fit to screen</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      Background
                      <select
                        value={slide.backgroundType}
                        onChange={(e) => handleFieldChange(slide.id, 'backgroundType', e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1"
                      >
                        <option value="gradient">Default gradient</option>
                        <option value="color">Solid color</option>
                        <option value="image">Image URL</option>
                      </select>
                    </label>
                  </div>

                  {slide.backgroundType === 'color' && (
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      Background color
                      <input
                        type="color"
                        value={slide.backgroundValue || '#1E3063'}
                        onChange={(e) => handleFieldChange(slide.id, 'backgroundValue', e.target.value)}
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                      />
                    </label>
                  )}
                  {slide.backgroundType === 'image' && (
                    <input
                      value={slide.backgroundValue || ''}
                      onChange={(e) => handleFieldChange(slide.id, 'backgroundValue', e.target.value)}
                      placeholder="Background image URL"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      Overlay color
                      <input
                        type="color"
                        value={slide.overlayColor}
                        onChange={(e) => handleFieldChange(slide.id, 'overlayColor', e.target.value)}
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 flex-1 min-w-[160px]">
                      Overlay opacity (layer over the background)
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={slide.overlayOpacity}
                        onChange={(e) => handleFieldChange(slide.id, 'overlayOpacity', Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="w-8 text-right">{slide.overlayOpacity}%</span>
                    </label>
                  </div>

                  <button
                    onClick={() => handleSave(slide)}
                    disabled={savingId === slide.id}
                    className="bg-[#1E3063] hover:bg-[#17244B] text-white text-xs font-bold rounded-lg px-4 py-2 disabled:opacity-50"
                  >
                    {savingId === slide.id ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              ))}

              {showAddForm ? (
                <form onSubmit={handleCreate} className="border-2 border-dashed border-[#C85A32]/40 rounded-xl p-4 space-y-3">
                  <input
                    value={draft.headline}
                    onChange={(e) => setDraft((d) => ({ ...d, headline: e.target.value }))}
                    placeholder="Headline"
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    value={draft.subheadline}
                    onChange={(e) => setDraft((d) => ({ ...d, subheadline: e.target.value }))}
                    placeholder="Subheadline"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={creating} className="bg-[#C85A32] hover:bg-[#B34E29] text-white text-xs font-bold rounded-lg px-4 py-2 disabled:opacity-50">
                      {creating ? 'Creating…' : 'Add Slide'}
                    </button>
                    <button type="button" onClick={() => setShowAddForm(false)} className="text-xs font-semibold text-slate-500 px-4 py-2">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-[#C85A32] rounded-xl py-3 text-xs font-bold text-slate-500 hover:text-[#C85A32] flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Slide
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroEditorPanel;
