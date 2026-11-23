import React, { useEffect, useState } from 'react';
import { installStaleChunkRecovery, refreshLegacyServiceWorkers, startReleaseWatcher, STALE_CHUNK_EVENT } from '../utils/releaseWatcher';

/** Non-disruptive "new version available" notice. It never reloads on its own, so forms, payments and listing creation are never interrupted. */
export default function ReleaseUpdateBanner() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [partial, setPartial] = useState(false);
  useEffect(() => {
    const stopChunk = installStaleChunkRecovery();
    void refreshLegacyServiceWorkers();
    const stopWatch = startReleaseWatcher({ onNewRelease: () => setAvailable(true) });
    const onStale = () => { setPartial(true); setAvailable(true); setDismissed(false); };
    window.addEventListener(STALE_CHUNK_EVENT, onStale);
    return () => { stopChunk(); stopWatch(); window.removeEventListener(STALE_CHUNK_EVENT, onStale); };
  }, []);
  if (!available || dismissed) return null;
  return (
    <div role="status" aria-live="polite" data-testid="release-update-banner" className="fixed inset-x-3 bottom-24 z-[2000] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[#0A3545] px-4 py-3 text-sm text-white shadow-xl lg:bottom-6">
      <span className="min-w-0 flex-1">{partial ? 'Part of this page could not load because a new version was released. Finish or save what you are doing, then refresh.' : 'A new version of KAYARD KE is available. Refresh when you are ready; nothing you are doing will be interrupted.'}</span>
      <button type="button" onClick={() => window.location.reload()} className="min-h-11 shrink-0 rounded-xl bg-[#11B8A6] px-4 font-black text-[#062A33]">Refresh</button>
      <button type="button" aria-label="Dismiss update notice" onClick={() => setDismissed(true)} className="min-h-11 min-w-11 shrink-0 rounded-xl border border-white/25 font-bold">Later</button>
    </div>
  );
}
