import { announceBrandingUpdated } from '../../context/BrandingContext';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { adminAPI } from '../../api/api';
import { Button } from '../../components/ui';
import { startPreview } from '../../services/designPreview';

// No-code public-site design editor. The server is the authority for every value, revision and publication.
// Supported surface (each control below changes a setting that a public component really reads): brand text + logo, colours,
// fonts, hero background/overlay/info cards/rotation, announcement strip. Section order/visibility and header layouts are NOT supported
// by the current components and are deliberately not offered.
const FONTS = ['Plus Jakarta Sans', 'Outfit', 'Georgia', 'system-ui', 'Arial'];
const COLOR_LABELS = {
  primaryColor: 'Primary', primaryLight: 'Primary light', primaryDark: 'Primary dark', primaryGlow: 'Primary glow (rgba)', accentColor: 'Accent',
  backgroundColor: 'Page background', surfaceColor: 'Surface', cardColor: 'Card', textColor: 'Text', textMutedColor: 'Muted text', textDimColor: 'Dim text',
  borderColor: 'Border', successColor: 'Success', dangerColor: 'Danger', warningColor: 'Warning', infoColor: 'Info',
};
const TABS = [['brand', 'Brand & logo'], ['colors', 'Colours'], ['typography', 'Fonts'], ['hero', 'Hero'], ['announcement', 'Announcement strip']];
const draftKey = (id) => `kayad_design_draft_${id}`;
const readLocal = (id) => { try { return JSON.parse(window.localStorage.getItem(draftKey(id)) || 'null'); } catch { return null; } };
const writeLocal = (id, v) => { try { v ? window.localStorage.setItem(draftKey(id), JSON.stringify(v)) : window.localStorage.removeItem(draftKey(id)); } catch { /* storage unavailable: server draft still works */ } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const apiMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : '-');

export function Confirm({ title, body, confirmLabel, danger, busy, onConfirm, onCancel }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, background: 'rgba(7,30,38,.55)', zIndex: 9999, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card" style={{ maxWidth: 440, width: '100%', padding: 22 }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ fontSize: 14 }}>{body}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Working...' : confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export function DesignPreviewPane({ config, mobile }) {
  const { brand, colors, typography, hero, announcement } = config;
  const font = (f) => `'${f}', system-ui, sans-serif`;
  return (
    <div data-testid="preview-pane" data-viewport={mobile ? 'mobile' : 'desktop'} style={{ width: mobile ? 360 : '100%', maxWidth: '100%', margin: '0 auto', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: colors.backgroundColor, color: colors.textColor, fontFamily: font(typography.fontBody) }}>
      {announcement.enabled && (
        <div data-testid="preview-announcement" style={{ background: announcement.backgroundColor, color: announcement.textColor, height: announcement.heightPx, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{announcement.text}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: colors.cardColor, borderBottom: `1px solid ${colors.borderColor}` }}>
        {brand.logoType === 'image' && brand.logoUrl ? <img data-testid="preview-logo" src={brand.logoUrl} alt={`${brand.logoText} logo`} style={{ height: 34, maxWidth: 120, objectFit: 'contain' }} />
          : <span data-testid="preview-logo-text" style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 8, background: colors.primaryColor, color: '#fff', fontWeight: 800 }}>{(brand.logoText || 'K').slice(0, 1)}</span>}
        <div style={{ lineHeight: 1.1 }}><strong style={{ fontFamily: font(typography.fontDisplay), color: colors.primaryDark }}>{brand.logoText}</strong><div style={{ fontSize: 10, color: colors.textMutedColor }}>{brand.brandTagline}</div></div>
      </div>
      <div data-testid="preview-hero" style={{ position: 'relative', minHeight: mobile ? 150 : 190, background: hero.backgroundUrl ? `url(${hero.backgroundUrl}) center/cover` : colors.surfaceColor, display: 'grid', alignItems: 'center', padding: 18 }}>
        <div style={{ position: 'absolute', inset: 0, background: hero.overlayColor, opacity: hero.overlayOpacityPct / 100 }} />
        <div style={{ position: 'relative' }}>
          <h4 style={{ margin: 0, fontFamily: font(typography.fontDisplay), fontSize: mobile ? 20 : 26, color: colors.primaryDark }}>Find your next vehicle</h4>
          <button type="button" style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, border: 0, background: colors.primaryColor, color: '#fff', fontWeight: 700 }}>Browse marketplace</button>
          {hero.showVehicleInfoCards && <div data-testid="preview-info-card" style={{ marginTop: 10, display: 'inline-block', padding: '6px 10px', borderRadius: 8, background: colors.cardColor, border: `1px solid ${colors.borderColor}`, fontSize: 11 }}>Toyota Land Cruiser · KES 12.5M</div>}
        </div>
      </div>
      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 }}>
        {[1, 2].map((n) => <div key={n} style={{ background: colors.cardColor, border: `1px solid ${colors.borderColor}`, borderRadius: 10, padding: 10, fontSize: 12 }}><strong style={{ color: colors.primaryDark }}>Sample listing {n}</strong><div style={{ color: colors.textMutedColor }}>Nairobi · Automatic</div><span style={{ color: colors.accentColor, fontWeight: 700 }}>Verified</span></div>)}
      </div>
      <div style={{ padding: 12, background: colors.primaryDark, color: '#fff', fontSize: 11 }}>{brand.footerDescription}<div style={{ opacity: .7, marginTop: 4 }}>{brand.footerCopyright}</div></div>
    </div>
  );
}

const Field = ({ label, error, children, hint }) => (
  <label style={{ display: 'grid', gap: 4, fontSize: 13 }}><span style={{ fontWeight: 600 }}>{label}</span>{children}{hint && <small style={{ color: 'var(--text-muted)' }}>{hint}</small>}{error && <small role="alert" style={{ color: '#b91c1c' }}>{error}</small>}</label>
);

export default function AdminSiteDesigns() {
  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState([]);
  const [state, setState] = useState({ status: 'loading' });
  const [selectedId, setSelectedId] = useState(null);
  const [design, setDesign] = useState(null); // server copy
  const [draft, setDraft] = useState(null); // edited copy
  const [meta, setMeta] = useState({ name: '', description: '' });
  const [tab, setTab] = useState('brand');
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [create, setCreate] = useState({ open: false, name: '', description: '', source: 'current' });
  const [restored, setRestored] = useState(false);
  const [uploading, setUploading] = useState(false);
  const loadSeq = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [o, h] = await Promise.all([adminAPI.siteDesigns(), adminAPI.siteDesignHistory()]);
      setOverview(o); setHistory(h.history || []); setState({ status: 'ready' });
      return o;
    } catch (e) { setState({ status: 'error', message: apiMessage(e, 'Designs could not be loaded.') }); return null; }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const open = useCallback(async (id, { keepNotice = false } = {}) => {
    const seq = ++loadSeq.current; if (!keepNotice) setNotice(null); setErrors({}); setRestored(false);
    try {
      const res = await adminAPI.siteDesign(id);
      if (seq !== loadSeq.current) return;
      const d = res.design; setSelectedId(id); setDesign(d); setMeta({ name: d.name, description: d.description || '' });
      const local = readLocal(id);
      if (local && local.baseRevision === d.revision && !same(local.config, d.config)) { setDraft(local.config); setMeta(local.meta || { name: d.name, description: d.description || '' }); setRestored(true); }
      else { setDraft(d.config); if (local) writeLocal(id, null); }
    } catch (e) { setNotice({ kind: 'error', text: apiMessage(e, 'The design could not be opened.') }); }
  }, []);

  const dirty = !!design && (!same(draft, design.config) || meta.name !== design.name || meta.description !== (design.description || ''));
  // Persist unsaved edits locally so a refresh or navigation does not lose them (the server copy is the saved draft).
  useEffect(() => { if (!design) return; writeLocal(design.id, dirty ? { baseRevision: design.revision, config: draft, meta } : null); }, [dirty, draft, meta, design]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (section, key, value) => setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));
  const err = (section, key) => errors[`${section}.${key}`];
  const run = async (fn, okText) => {
    setBusy(true); setNotice(null);
    try { const r = await fn(); if (okText) setNotice({ kind: 'success', text: okText }); return r; }
    catch (e) { const data = e?.response?.data || {}; setErrors(data.errors || {}); setNotice({ kind: 'error', text: apiMessage(e, 'The action failed. Nothing was changed.') }); return null; }
    finally { setBusy(false); }
  };

  const save = async () => {
    const r = await run(() => adminAPI.siteDesignSave(design.id, { expectedRevision: design.revision, config: draft, name: meta.name, description: meta.description }), 'Draft saved. The public site has not changed.');
    if (r) { setErrors({}); setDesign(r.design); setDraft(r.design.config); setMeta({ name: r.design.name, description: r.design.description || '' }); writeLocal(r.design.id, null); setRestored(false); await refresh(); }
  };
  const createDesign = async () => {
    const from = create.source === 'current' ? { type: 'current' } : create.source.startsWith('starter:') ? { type: 'starter', id: create.source.slice(8) } : { type: 'design', id: create.source.slice(7) };
    const r = await run(() => adminAPI.siteDesignCreate({ name: create.name, description: create.description || undefined, from }), 'Design created.');
    if (r) { setCreate({ open: false, name: '', description: '', source: 'current' }); await refresh(); await open(r.design.id, { keepNotice: true }); }
  };
  const duplicate = async () => { const r = await run(() => adminAPI.siteDesignDuplicate(design.id), 'Design duplicated.'); if (r) { await refresh(); await open(r.design.id, { keepNotice: true }); } };
  const doDelete = async () => {
    const r = await run(() => adminAPI.siteDesignDelete(design.id), 'Design deleted.');
    setDialog(null); if (r) { writeLocal(design.id, null); setDesign(null); setDraft(null); setSelectedId(null); await refresh(); }
  };
  const doPublish = async () => {
    const r = await run(() => adminAPI.siteDesignPublish(design.id, design.revision), `"${design.name}" is now live on the public site.`);
    setDialog(null); if (r) { announceBrandingUpdated(); await refresh(); await open(design.id, { keepNotice: true }); }
  };
  const doRollback = async () => {
    const pub = dialog.pub; const r = await run(() => adminAPI.siteDesignRollback(pub.id), `Restored "${pub.designName}" from ${fmt(pub.publishedAt)}. It is now live.`);
    setDialog(null); if (r) { announceBrandingUpdated(); await refresh(); if (design) await open(design.id, { keepNotice: true }); }
  };
  const previewOnSite = () => { startPreview({ designId: design.id, name: meta.name || design.name, config: draft }); window.open('/', '_blank', 'noopener'); };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0]; const input = e.target; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setNotice({ kind: 'error', text: 'Choose a PNG, JPEG or WebP logo.' }); input.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { setNotice({ kind: 'error', text: 'Logo must be 5 MB or smaller.' }); input.value = ''; return; }
    const form = new FormData(); form.append('logo', file); setUploading(true);
    try {
      const res = await adminAPI.siteDesignUploadLogo(form);
      if (!res?.url) throw new Error('The upload response did not include a logo URL.');
      setDraft((d) => ({ ...d, brand: { ...d.brand, logoType: 'image', logoUrl: res.url } }));
      setNotice({ kind: 'success', text: 'Logo uploaded to this draft. The live logo changes only when you publish.' });
    } catch (x) { setNotice({ kind: 'error', text: `Logo upload failed: ${apiMessage(x, 'try again')}. The current logo was not changed.` }); }
    finally { setUploading(false); input.value = ''; }
  };

  const published = overview?.published;
  const summary = useMemo(() => (published ? `Live now: ${published.designName} (${published.kind === 'rollback' ? 'restored' : 'published'} ${fmt(published.publishedAt)})` : 'No design has been published from this editor yet. The site shows its existing settings.'), [published]);

  if (state.status === 'loading') return <p role="status">Loading designs...</p>;
  if (state.status === 'error') return <div role="alert" style={{ padding: 12 }}>{state.message}</div>;

  return (
    <div data-testid="site-designs" style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0 }}>Site Designs</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Create and preview designs, then publish one to change the public site. Supported: brand text and logo, colours, fonts, hero background and overlay, and the announcement strip. Page sections and header layouts are not configurable here.</p>
        <p data-testid="published-summary" style={{ margin: '8px 0 0', fontWeight: 700 }}>{summary}</p>
        {published && !published.liveMatchesPublication && <p role="note" data-testid="drift-note" style={{ margin: '4px 0 0', fontSize: 13, color: '#92400E' }}>The live settings were changed outside this editor (for example in Settings) after the last publish, so the live site no longer matches "{published.designName}".</p>}
      </div>
      {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} data-testid="notice" style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, background: notice.kind === 'error' ? 'var(--admin-status-danger-bg)' : 'var(--admin-status-success-bg)' }}>{notice.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 16, alignItems: 'start' }} className="site-designs-grid">
        <aside className="card" style={{ padding: 14, display: 'grid', gap: 10 }} aria-label="Saved designs">
          <Button onClick={() => setCreate({ ...create, open: true })} disabled={busy}>New design</Button>
          {overview.designs.length === 0 && <p style={{ fontSize: 13 }}>No saved designs yet. Create one from the current site or a starter.</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            {overview.designs.map((d) => (
              <li key={d.id}><button type="button" onClick={() => (dirty && selectedId !== d.id ? setDialog({ type: 'discard', next: d.id }) : open(d.id))} aria-current={selectedId === d.id} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: `1px solid ${selectedId === d.id ? 'var(--brand)' : 'var(--border)'}`, background: 'var(--card)', cursor: 'pointer' }}>
                <strong>{d.name}</strong>
                {d.isPublished && <span data-testid={`badge-live-${d.name}`} style={{ marginLeft: 6, fontSize: 11, color: '#15803d', fontWeight: 800 }}>LIVE</span>}
                {d.hasUnpublishedChanges && <span style={{ marginLeft: 6, fontSize: 11, color: '#92400E' }}>unpublished edits</span>}
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updated {fmt(d.updatedAt)}</div></button></li>
            ))}
          </ul>
        </aside>

        <section style={{ display: 'grid', gap: 12 }}>
          {!design && <div className="card" style={{ padding: 18 }}>Select a design to edit it, or create a new one.</div>}
          {design && draft && (
            <>
              <div className="card" style={{ padding: 14, display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  <Field label="Design name"><input aria-label="Design name" className="input" maxLength={80} value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} /></Field>
                  <Field label="Description (optional)"><input aria-label="Design description" className="input" maxLength={300} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></Field>
                </div>
                {restored && <p role="note" data-testid="restored-note" style={{ margin: 0, fontSize: 13 }}>Restored unsaved edits from this browser. <button type="button" onClick={() => { writeLocal(design.id, null); setDraft(design.config); setMeta({ name: design.name, description: design.description || '' }); setRestored(false); }} style={{ textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer' }}>Discard them</button></p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button onClick={save} disabled={busy || !dirty}>{busy ? 'Saving...' : 'Save draft'}</Button>
                  <Button variant="outline" onClick={previewOnSite} disabled={busy}>Preview on the site</Button>
                  <Button variant="primary" onClick={() => setDialog({ type: 'publish' })} disabled={busy || dirty}>Publish</Button>
                  <Button variant="outline" onClick={duplicate} disabled={busy || dirty}>Duplicate</Button>
                  <Button variant="outline" onClick={() => setDialog({ type: 'delete' })} disabled={busy}>Delete</Button>
                </div>
                {dirty && <small data-testid="dirty-note">You have unsaved changes. Save the draft before publishing or duplicating.</small>}
              </div>

              <div role="tablist" aria-label="Design settings" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TABS.map(([id, label]) => <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: tab === id ? 'var(--brand)' : 'var(--card)', color: tab === id ? '#fff' : 'inherit', cursor: 'pointer' }}>{label}</button>)}
              </div>

              <div className="card" style={{ padding: 14, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }} role="tabpanel">
                {tab === 'brand' && (<>
                  <Field label="Logo type" error={err('brand', 'logoType')}><select aria-label="Logo type" className="input" value={draft.brand.logoType} onChange={(e) => set('brand', 'logoType', e.target.value)}><option value="image">Image</option><option value="text">Text</option><option value="icon">Icon</option></select></Field>
                  <Field label="Upload logo" hint="PNG, JPEG or WebP, up to 5 MB. Applied to this draft only." error={err('brand', 'logoUrl')}><input type="file" aria-label="Upload logo" accept="image/png,image/jpeg,image/webp" disabled={uploading || busy} onChange={uploadLogo} />{uploading && <small role="status">Uploading logo...</small>}</Field>
                  <Field label="Logo text" error={err('brand', 'logoText')}><input aria-label="Logo text" className="input" maxLength={40} value={draft.brand.logoText} onChange={(e) => set('brand', 'logoText', e.target.value)} /></Field>
                  <Field label="Tagline" error={err('brand', 'brandTagline')}><input aria-label="Tagline" className="input" maxLength={80} value={draft.brand.brandTagline} onChange={(e) => set('brand', 'brandTagline', e.target.value)} /></Field>
                  <Field label="Footer description" error={err('brand', 'footerDescription')}><textarea aria-label="Footer description" className="input" maxLength={300} rows={3} value={draft.brand.footerDescription} onChange={(e) => set('brand', 'footerDescription', e.target.value)} /></Field>
                  <Field label="Footer copyright" error={err('brand', 'footerCopyright')}><input aria-label="Footer copyright" className="input" maxLength={120} value={draft.brand.footerCopyright} onChange={(e) => set('brand', 'footerCopyright', e.target.value)} /></Field>
                </>)}
                {tab === 'colors' && Object.keys(COLOR_LABELS).map((k) => (
                  <Field key={k} label={COLOR_LABELS[k]} error={err('colors', k)}><div style={{ display: 'flex', gap: 6 }}>
                    {/^#[0-9A-Fa-f]{6}$/.test(draft.colors[k]) && <input type="color" aria-label={`${COLOR_LABELS[k]} picker`} value={draft.colors[k]} onChange={(e) => set('colors', k, e.target.value)} />}
                    <input aria-label={COLOR_LABELS[k]} className="input" value={draft.colors[k]} onChange={(e) => set('colors', k, e.target.value)} style={{ fontFamily: 'monospace' }} /></div></Field>))}
                {tab === 'typography' && (<>
                  <Field label="Heading font" error={err('typography', 'fontDisplay')}><select aria-label="Heading font" className="input" value={draft.typography.fontDisplay} onChange={(e) => set('typography', 'fontDisplay', e.target.value)}>{FONTS.map((f) => <option key={f}>{f}</option>)}</select></Field>
                  <Field label="Body font" error={err('typography', 'fontBody')}><select aria-label="Body font" className="input" value={draft.typography.fontBody} onChange={(e) => set('typography', 'fontBody', e.target.value)}>{FONTS.map((f) => <option key={f}>{f}</option>)}</select></Field>
                  <small style={{ gridColumn: '1 / -1' }}>Only fonts the site actually loads are offered.</small>
                </>)}
                {tab === 'hero' && (<>
                  <Field label="Background image path" hint="A bundled /hero/ or /branding/ path, or an image uploaded through the platform." error={err('hero', 'backgroundUrl')}><input aria-label="Hero background" className="input" value={draft.hero.backgroundUrl} onChange={(e) => set('hero', 'backgroundUrl', e.target.value)} /></Field>
                  <Field label="Overlay colour" error={err('hero', 'overlayColor')}><input aria-label="Overlay colour" className="input" value={draft.hero.overlayColor} onChange={(e) => set('hero', 'overlayColor', e.target.value)} /></Field>
                  <Field label={`Overlay strength (${draft.hero.overlayOpacityPct}%)`} error={err('hero', 'overlayOpacityPct')}><input aria-label="Overlay strength" type="range" min="0" max="100" value={draft.hero.overlayOpacityPct} onChange={(e) => set('hero', 'overlayOpacityPct', Number(e.target.value))} /></Field>
                  <Field label="Rotation seconds (0 = off, otherwise 3-60)" error={err('hero', 'rotationSeconds')}><input aria-label="Rotation seconds" className="input" type="number" min="0" max="60" step="0.5" value={draft.hero.rotationSeconds} onChange={(e) => set('hero', 'rotationSeconds', Number(e.target.value))} /></Field>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" aria-label="Show vehicle info cards" checked={draft.hero.showVehicleInfoCards} onChange={(e) => set('hero', 'showVehicleInfoCards', e.target.checked)} /> Show vehicle info cards</label>
                </>)}
                {tab === 'announcement' && (<>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" aria-label="Show announcement strip" checked={draft.announcement.enabled} onChange={(e) => set('announcement', 'enabled', e.target.checked)} /> Show announcement strip</label>
                  <Field label="Text" error={err('announcement', 'text')}><input aria-label="Announcement text" className="input" maxLength={200} value={draft.announcement.text} onChange={(e) => set('announcement', 'text', e.target.value)} /></Field>
                  <Field label="Background" error={err('announcement', 'backgroundColor')}><input aria-label="Announcement background" className="input" value={draft.announcement.backgroundColor} onChange={(e) => set('announcement', 'backgroundColor', e.target.value)} /></Field>
                  <Field label="Text colour" error={err('announcement', 'textColor')}><input aria-label="Announcement text colour" className="input" value={draft.announcement.textColor} onChange={(e) => set('announcement', 'textColor', e.target.value)} /></Field>
                  <Field label="Height (28-60 px)" error={err('announcement', 'heightPx')}><input aria-label="Announcement height" className="input" type="number" min="28" max="60" value={draft.announcement.heightPx} onChange={(e) => set('announcement', 'heightPx', Number(e.target.value))} /></Field>
                  <Field label="Scroll time (10-90 s)" error={err('announcement', 'scrollSeconds')}><input aria-label="Scroll seconds" className="input" type="number" min="10" max="90" value={draft.announcement.scrollSeconds} onChange={(e) => set('announcement', 'scrollSeconds', Number(e.target.value))} /></Field>
                  <Field label="Direction"><select aria-label="Direction" className="input" value={draft.announcement.direction} onChange={(e) => set('announcement', 'direction', e.target.value)}><option value="left">Left</option><option value="right">Right</option></select></Field>
                  <Field label="Transition"><select aria-label="Transition" className="input" value={draft.announcement.transition} onChange={(e) => set('announcement', 'transition', e.target.value)}>{['scroll', 'fade', 'pop', 'slide'].map((t) => <option key={t}>{t}</option>)}</select></Field>
                </>)}
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <strong>Preview (your edits, not live)</strong>
                  <div role="group" aria-label="Preview size"><Button variant={mobile ? 'outline' : 'primary'} onClick={() => setMobile(false)} aria-pressed={!mobile}>Desktop</Button> <Button variant={mobile ? 'primary' : 'outline'} onClick={() => setMobile(true)} aria-pressed={mobile}>Mobile</Button></div>
                </div>
                <DesignPreviewPane config={draft} mobile={mobile} />
              </div>
            </>
          )}

          <div className="card" style={{ padding: 14 }} data-testid="history">
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Publication history</h3>
            {history.length === 0 ? <p style={{ fontSize: 13 }}>Nothing has been published from this editor yet.</p> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                {history.map((p, i) => (
                  <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
                    <span><strong>{p.designName}</strong> - {p.kind === 'rollback' ? 'restored' : 'published'} {fmt(p.publishedAt)}{i === 0 && <em> (live)</em>}</span>
                    {i > 0 && <Button variant="outline" onClick={() => setDialog({ type: 'rollback', pub: p })} disabled={busy}>Restore this version</Button>}
                  </li>))}
              </ul>)}
          </div>
        </section>
      </div>

      {create.open && (
        <div role="dialog" aria-modal="true" aria-label="New design" style={{ position: 'fixed', inset: 0, background: 'rgba(7,30,38,.55)', zIndex: 9999, display: 'grid', placeItems: 'center', padding: 16 }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: 22, display: 'grid', gap: 10 }}>
            <h3 style={{ margin: 0 }}>New design</h3>
            <Field label="Name"><input aria-label="New design name" className="input" maxLength={80} value={create.name} onChange={(e) => setCreate({ ...create, name: e.target.value })} /></Field>
            <Field label="Description (optional)"><input aria-label="New design description" className="input" maxLength={300} value={create.description} onChange={(e) => setCreate({ ...create, description: e.target.value })} /></Field>
            <Field label="Start from"><select aria-label="Start from" className="input" value={create.source} onChange={(e) => setCreate({ ...create, source: e.target.value })}>
              <option value="current">The current live site</option>
              {overview.starters.map((s) => <option key={s.id} value={`starter:${s.id}`}>Starter: {s.name}</option>)}
              {overview.designs.map((d) => <option key={d.id} value={`design:${d.id}`}>Copy of: {d.name}</option>)}
            </select></Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="outline" onClick={() => setCreate({ ...create, open: false })}>Cancel</Button><Button onClick={createDesign} disabled={busy || !create.name.trim()}>Create design</Button></div>
          </div>
        </div>
      )}
      {dialog?.type === 'publish' && <Confirm title="Publish this design?" body={`"${design.name}" will replace the design that is live on the public site for every visitor. You can restore the previous version from the publication history.`} confirmLabel="Publish to the public site" busy={busy} onConfirm={doPublish} onCancel={() => setDialog(null)} />}
      {dialog?.type === 'delete' && <Confirm danger title="Delete this design?" body={`"${design.name}" will be permanently deleted. The live site is not affected. ${design.id === published?.designId ? 'This design is live, so the server will refuse to delete it.' : ''}`} confirmLabel="Delete design" busy={busy} onConfirm={doDelete} onCancel={() => setDialog(null)} />}
      {dialog?.type === 'rollback' && <Confirm title="Restore this version?" body={`"${dialog.pub.designName}" (${fmt(dialog.pub.publishedAt)}) will replace the live design for every visitor.`} confirmLabel="Restore and publish" busy={busy} onConfirm={doRollback} onCancel={() => setDialog(null)} />}
      {dialog?.type === 'discard' && <Confirm title="Discard unsaved changes?" body="Your unsaved edits to this design are kept in this browser, but they will not be shown while you work on another design." confirmLabel="Switch design" onConfirm={() => { const id = dialog.next; setDialog(null); open(id); }} onCancel={() => setDialog(null)} />}
    </div>
  );
}
