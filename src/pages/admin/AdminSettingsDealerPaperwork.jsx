import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/api';
import { Button } from '../../components/ui';

// Owner-configured dealer paperwork. The server is the authority: this panel shows what GET /admin/settings/dealer-paperwork returns and
// saves with the revision it loaded (compare-and-swap). Nothing here is assumed to have saved until the server says so.
// Modes per item: "Not asked" (disabled) | "Optional" (asked, never blocks approval) | "Required" (must be supplied before approval).
const MODES = [
  { id: 'off', label: 'Not asked', enabled: false, required: false },
  { id: 'optional', label: 'Optional', enabled: true, required: false },
  { id: 'required', label: 'Required', enabled: true, required: true },
];
const modeOf = (i) => (!i.enabled ? 'off' : i.required ? 'required' : 'optional');
const toItem = (mode) => { const m = MODES.find((x) => x.id === mode); return { enabled: m.enabled, required: m.required }; };

export const previewFor = (items) => {
  const asked = items.filter((i) => i.mode !== 'off');
  const req = items.filter((i) => i.mode === 'required');
  const opt = items.filter((i) => i.mode === 'optional');
  if (!asked.length) return 'Dealers will not be asked for any paperwork. Approval is never blocked by documents.';
  const parts = [];
  parts.push(req.length ? `Dealers must provide: ${req.map((i) => i.label).join(', ')}. An application missing any of these cannot be approved.` : 'No document is mandatory. Approval is never blocked by missing documents.');
  if (opt.length) parts.push(`Dealers are also invited to provide (optional): ${opt.map((i) => i.label).join(', ')}.`);
  return parts.join(' ');
};

export default function AdminSettingsDealerPaperwork() {
  const [state, setState] = useState({ status: 'loading' });
  const [server, setServer] = useState(null); // { items, revision }
  const [draft, setDraft] = useState({}); // key -> mode
  const [canChange, setCanChange] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await adminAPI.getDealerPaperwork();
      setServer({ items: res.items, revision: res.revision });
      setCanChange(res.canChange === true);
      setDraft({});
      setState({ status: 'ready' });
    } catch (err) {
      setState({ status: 'error', message: err?.response?.data?.message || 'Could not load paperwork settings.' });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (state.status === 'loading') return <div className="loading-center"><div className="spinner" /></div>;
  if (state.status === 'error') {
    return (
      <div role="alert" style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 13 }}>
        {state.message} <button className="btn btn-sm btn-outline" onClick={load}>Retry</button>
      </div>
    );
  }

  const effective = server.items.map((i) => ({ ...i, mode: draft[i.key] ?? modeOf(i) }));
  const dirty = effective.filter((i) => i.mode !== modeOf(server.items.find((s) => s.key === i.key)));
  const setAll = (mode) => setDraft(Object.fromEntries(server.items.map((i) => [i.key, mode])));
  // phoneVerification is completed by one-time code, so it can be Optional or Not asked, never Required at submission.
  const modesFor = (i) => (i.kind === 'verification' ? MODES : MODES);

  const save = async () => {
    setSaving(true); setNotice(null);
    try {
      const items = Object.fromEntries(dirty.map((i) => [i.key, toItem(i.mode)]));
      const res = await adminAPI.updateDealerPaperwork({ expectedRevision: server.revision, items });
      setServer({ items: res.items, revision: res.revision });
      setDraft({});
      setNotice({ kind: 'success', text: 'Saved. Applications already in progress are measured against these rules from now on; nothing already submitted was deleted.' });
    } catch (err) {
      const data = err?.response?.data || {};
      if (err?.response?.status === 409) {
        setNotice({ kind: 'conflict', text: 'These settings were changed by someone else. Reloading the latest values — review them and save again if you still want your change.' });
        await load();
      } else {
        setNotice({ kind: 'error', text: `Not saved: ${data.message || 'the server did not accept the change.'} Nothing was changed.` });
      }
    } finally { setSaving(false); }
  };

  const colours = {
    success: { background: 'var(--admin-status-success-bg)', border: '1px solid var(--admin-status-success-border)', color: 'var(--admin-status-success)' },
    conflict: { background: 'var(--admin-status-info-bg)', border: '1px solid var(--admin-status-info-border)', color: 'var(--admin-status-info)' },
    error: { background: 'var(--admin-status-danger-bg)', border: '1px solid var(--admin-status-danger-border)', color: 'var(--admin-status-danger)' },
  };

  return (
    <div className="card" style={{ padding: 24, marginTop: 16 }} data-testid="dealer-paperwork">
      <h3 style={{ fontSize: '1rem', marginBottom: 6 }}>Dealer paperwork</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        Choose what dealers are asked for when they apply, and what must be supplied before you can approve them. Revision {server.revision}.
        Turning an item off or relaxing it never deletes anything a dealer already submitted.
      </p>
      {!canChange && <div role="note" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#F1F5F9', fontSize: 13 }}>You can view these settings. Only the platform owner can change them.</div>}
      {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, ...colours[notice.kind] }}>{notice.text}</div>}

      {canChange && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <Button variant="outline" onClick={() => setAll('off')} disabled={saving}>No paperwork at all</Button>
          <Button variant="outline" onClick={() => setAll('optional')} disabled={saving}>Ask for everything, require nothing</Button>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {effective.map((i) => (
          <div key={i.key}>
            <label htmlFor={`pw-${i.key}`} style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{i.label}</label>
            <select id={`pw-${i.key}`} value={i.mode} disabled={!canChange || saving} onChange={(e) => setDraft((d) => ({ ...d, [i.key]: e.target.value }))}
              style={{ width: '100%', maxWidth: 320, padding: '8px 10px', fontSize: 14, border: '1px solid #94A3B8', borderRadius: 8, background: '#fff' }}>
              {modesFor(i).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{i.help}{i.kind === 'verification' ? ' Completed by the dealer with a one-time code after submitting.' : ''}</div>
          </div>
        ))}
      </div>

      <div role="status" aria-label="Effect of these settings" style={{ marginTop: 18, padding: '10px 14px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 13 }}>
        <strong>{dirty.length ? 'If you save: ' : 'Currently: '}</strong>{previewFor(effective)}
      </div>

      {canChange && (
        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={save} disabled={saving || dirty.length === 0}>{saving ? 'Saving…' : dirty.length ? `Save ${dirty.length} change${dirty.length > 1 ? 's' : ''}` : 'No changes'}</Button>
          <Button variant="outline" onClick={() => { setDraft({}); setNotice(null); }} disabled={saving || dirty.length === 0}>Discard</Button>
          <Button variant="outline" onClick={load} disabled={saving}>Reload</Button>
        </div>
      )}
    </div>
  );
}
