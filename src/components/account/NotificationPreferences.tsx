import { useCallback, useEffect, useState } from 'react';
import { communicationsAPI } from '../../api/api.exports';

type Key = 'emailTransactional' | 'smsTransactional' | 'whatsappTransactional' | 'emailMarketing' | 'smsMarketing' | 'whatsappMarketing';

const ROWS: { key: Key; label: string; desc: string }[] = [
  { key: 'emailTransactional', label: 'Email - account & transaction updates', desc: 'Bids, escrow, payments and other activity on your account' },
  { key: 'smsTransactional', label: 'SMS - account & transaction updates', desc: 'The same updates by text message' },
  { key: 'whatsappTransactional', label: 'WhatsApp - account & transaction updates', desc: 'The same updates on WhatsApp' },
  { key: 'emailMarketing', label: 'Email - news & offers', desc: 'Market updates and promotions' },
  { key: 'smsMarketing', label: 'SMS - news & offers', desc: 'Promotions by text message' },
  { key: 'whatsappMarketing', label: 'WhatsApp - news & offers', desc: 'Promotions on WhatsApp' },
];

/** Real, persisted communication preferences (the same table the delivery gateway checks before sending). */
export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Record<string, any> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Key | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    communicationsAPI.preferences()
      .then((d: any) => setPrefs(d?.data ?? d))
      .catch(() => setLoadError('Could not load your notification preferences.'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (key: Key) => {
    if (!prefs || busy) return;
    const next = !prefs[key];
    setBusy(key); setError(null);
    try {
      const saved: any = await communicationsAPI.updatePreferences({ [key]: next });
      setPrefs(saved?.data ?? saved);   // show what the server stored, not what we hoped for
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not save that change. Your previous setting is unchanged.');
    } finally {
      setBusy(null);
    }
  };

  if (loadError) return (
    <div role="alert" className="text-sm text-red-600">{loadError} <button className="underline" onClick={load}>Retry</button></div>
  );
  if (!prefs) return <p role="status" className="text-sm text-warm-400">Loading preferences…</p>;

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {ROWS.map(({ key, label, desc }) => (
        <div key={key} className="flex items-center justify-between p-4 bg-[#F6FAF9] rounded-xl">
          <div>
            <p className="font-sans text-sm font-semibold text-[#0A3340]">{label}</p>
            <p className="font-sans text-xs text-warm-400 mt-0.5">{desc}</p>
          </div>
          <input type="checkbox" role="switch" aria-label={label} checked={Boolean(prefs[key])} disabled={busy !== null} onChange={() => toggle(key)} className="h-5 w-5 accent-[#13B8A6]" />
        </div>
      ))}
      <p className="text-xs text-warm-400">Security codes and essential system messages are always sent. A channel only delivers if it is switched on here and enabled by the platform.</p>
    </div>
  );
}
