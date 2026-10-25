import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/api';
import { Button } from '../../components/ui';

// STAGE 5 — Owner-controlled onboarding policy.
// The server is the authority: this page only displays what GET /admin/settings/onboarding returns
// and sends validated choices back with the revision it loaded (compare-and-swap). It never assumes
// a save worked: the saved state shown is whatever the server answered.
const FIELDS = [
  {
    key: 'privateSellerRegistration',
    label: 'Private seller registration',
    help: 'Whether individuals can create a private-seller account themselves. Seller features always require a verified email.',
    options: { enabled: 'Open — sellers can register themselves', disabled: 'Closed — no new private-seller registrations' },
  },
  {
    key: 'dealerOnboardingMode',
    label: 'Dealer onboarding',
    help: 'Self-onboarding lets a dealer register and list a few vehicles (up to 3) while unverified. Approval-required keeps dealers unable to list until you approve them.',
    options: {
      self_onboarding: 'Self-onboarding — register without an invitation, limited until approved',
      approval_required: 'Approval required — no listing until you approve',
      closed: 'Closed — no new dealer registrations',
    },
  },
  {
    key: 'listingModeration',
    label: 'Listing moderation',
    help: 'Hold every new listing for review, or publish automatically when the seller account is approved. Rejection is always an explicit decision.',
    options: { hold_for_review: 'Hold every new listing for review', auto_publish: 'Auto-publish for approved sellers' },
  },
  {
    key: 'dealerDecisionAuthority',
    label: 'Who approves or rejects dealers and sellers',
    help: 'Owner only is the safest launch setting.',
    options: { owner_only: 'Platform owner only', admins: 'Owner and administrators' },
  },
  {
    key: 'listingDecisionAuthority',
    label: 'Who approves or rejects listings',
    help: 'Owner only is the safest launch setting.',
    options: { owner_only: 'Platform owner only', admins: 'Owner and administrators' },
  },
];

const SOURCE_NOTE = {
  default: 'No settings have been saved yet. These are the launch defaults.',
  database: 'Saved settings.',
  invalid: 'The stored settings are damaged. Restrictive values are in force until you save.',
  unavailable: 'Settings could not be read. Restrictive values are in force: seller and dealer registration are closed and listings are held for review.',
};

export default function AdminSettingsOnboarding() {
  const [state, setState] = useState({ status: 'loading' }); // loading | ready | error
  const [policy, setPolicy] = useState(null); // what the server last reported
  const [draft, setDraft] = useState({});
  const [canChange, setCanChange] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: 'success'|'error'|'conflict', text }

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await adminAPI.getOnboardingSettings();
      setPolicy(res.policy);
      setCanChange(res.canChange === true);
      setDraft({});
      setState({ status: 'ready' });
    } catch (err) {
      setState({ status: 'error', message: err?.response?.data?.message || 'Could not load onboarding settings.' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state.status === 'loading') return <div className="loading-center"><div className="spinner" /></div>;
  if (state.status === 'error') {
    return (
      <div role="alert" style={{ padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 13 }}>
        {state.message} <button className="btn btn-sm btn-outline" onClick={load}>Retry</button>
      </div>
    );
  }

  const value = (k) => (draft[k] !== undefined ? draft[k] : policy[k]);
  const dirty = Object.keys(draft).filter((k) => draft[k] !== policy[k]);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const changes = Object.fromEntries(dirty.map((k) => [k, draft[k]]));
      const res = await adminAPI.updateOnboardingSettings({ ...changes, expectedRevision: policy.revision });
      setPolicy(res.policy);
      setDraft({});
      setNotice({ kind: 'success', text: 'Saved. The new settings apply to new requests immediately.' });
    } catch (err) {
      const data = err?.response?.data || {};
      if (err?.response?.status === 409 && data.current) {
        setPolicy(data.current);
        setDraft({});
        setNotice({ kind: 'conflict', text: 'These settings were changed by someone else. The latest values are shown — review them and save again if you still want your change.' });
      } else {
        setNotice({ kind: 'error', text: `Not saved: ${data.message || 'the server did not accept the change.'} Nothing was changed.` });
      }
    } finally {
      setSaving(false);
    }
  };

  const noticeStyle = {
    success: { background: 'var(--admin-status-success-bg)', border: '1px solid var(--admin-status-success-border)', color: 'var(--admin-status-success)' },
    conflict: { background: 'var(--admin-status-info-bg)', border: '1px solid var(--admin-status-info-border)', color: 'var(--admin-status-info)' },
    error: { background: 'var(--admin-status-danger-bg)', border: '1px solid var(--admin-status-danger-border)', color: 'var(--admin-status-danger)' },
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: '1rem', marginBottom: 6 }}>Onboarding &amp; moderation policy</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        {SOURCE_NOTE[policy.source] || ''} Revision {policy.revision}.
        {policy.updatedAt ? ` Last changed ${new Date(policy.updatedAt).toLocaleString()}.` : ''}
      </p>

      {!canChange && (
        <div role="note" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#F1F5F9', fontSize: 13 }}>
          You can view these settings. Only the platform owner can change them.
        </div>
      )}

      {notice && (
        <div role={notice.kind === 'error' ? 'alert' : 'status'} style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, ...noticeStyle[notice.kind] }}>
          {notice.text}
        </div>
      )}

      <div style={{ display: 'grid', gap: 20 }}>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`onb-${f.key}`} style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{f.label}</label>
            <select
              id={`onb-${f.key}`}
              value={value(f.key)}
              disabled={!canChange || saving}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              style={{ width: '100%', maxWidth: 560, padding: '10px 12px', fontSize: 14, border: '1px solid #94A3B8', borderRadius: 8, background: '#fff' }}
            >
              {Object.entries(f.options).map(([v, text]) => <option key={v} value={v}>{text}</option>)}
            </select>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{f.help}</div>
          </div>
        ))}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Email verification for sellers</div>
          <div style={{ fontSize: 14 }}>Always required — this cannot be switched off.</div>
        </div>
      </div>

      {canChange && (
        <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={save} disabled={saving || dirty.length === 0}>
            {saving ? 'Saving…' : dirty.length ? `Save ${dirty.length} change${dirty.length > 1 ? 's' : ''}` : 'No changes'}
          </Button>
          <Button variant="outline" onClick={() => { setDraft({}); setNotice(null); }} disabled={saving || dirty.length === 0}>Discard</Button>
          <Button variant="outline" onClick={load} disabled={saving}>Reload</Button>
        </div>
      )}
    </div>
  );
}
