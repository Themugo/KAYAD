import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/api';
import { Button } from '../../components/ui';

// "Is a subscription required to list?" The server is the authority. Default is FREE listing so dealers can populate the marketplace;
// plans stay optional and are granted per dealer (User Management > Plan) or switched on here later.
export default function AdminSettingsListing() {
  const [state, setState] = useState({ status: 'loading' });
  const [required, setRequired] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await adminAPI.getDealerListingPolicy();
      setRequired(res.subscriptionRequired === true);
      setSaved(res.subscriptionRequired === true);
      setState({ status: 'ready' });
    } catch {
      setState({ status: 'error' });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await adminAPI.updateDealerListingPolicy({ subscriptionRequired: required });
      setSaved(res.subscriptionRequired === true);
      setRequired(res.subscriptionRequired === true);
      setNotice({ kind: 'ok', text: res.message || 'Saved.' });
    } catch (e) {
      setNotice({ kind: 'error', text: e?.response?.data?.message || 'Could not save. Nothing was changed.' });
    } finally {
      setSaving(false);
    }
  };

  if (state.status === 'loading') return <p role="status">Loading listing settings…</p>;
  if (state.status === 'error') {
    return (
      <div role="alert">
        <p>Listing settings could not be loaded.</p>
        <Button onClick={load}>Reload settings</Button>
      </div>
    );
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(10, 51, 64, 0.07)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h3 style={{ fontSize: '1rem', margin: 0, color: '#0a3340' }}>Listing &amp; subscription plans</h3>
        <p style={{ fontSize: 13, color: 'var(--admin-muted-content)', marginTop: 6 }}>
          Decide whether approved dealers need a subscription plan before they can publish vehicles. Plans are never applied automatically.
        </p>
      </div>
      <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} style={{ marginTop: 4 }} />
        <span>
          <strong>Require an active subscription to list vehicles</strong>
          <span style={{ display: 'block', fontSize: 13, color: 'var(--admin-muted-content)' }}>
            {required
              ? 'ON: dealers without an active plan cannot publish. Grant plans from User Management > Plan, or let dealers buy one.'
              : 'OFF (default): every approved dealer lists for free, with no plan and no listing cap. Plans stay optional.'}
          </span>
        </span>
      </label>
      <p style={{ fontSize: 12, color: 'var(--admin-muted-content)', margin: 0 }}>
        Admins can still grant or remove a plan for any dealer at any time (User Management &gt; Plan). The &ldquo;listings locked&rdquo; switch always blocks publishing.
      </p>
      <div>
        <Button onClick={save} disabled={saving || required === saved}>{saving ? 'Saving…' : 'Save listing policy'}</Button>
      </div>
      {notice && <p role={notice.kind === 'error' ? 'alert' : 'status'} style={{ margin: 0 }}>{notice.text}</p>}
    </div>
  );
}
