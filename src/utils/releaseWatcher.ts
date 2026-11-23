/**
 * Release consistency helpers.
 *  - `getRunningReleaseId()` – id of the bundle that is executing.
 *  - `startReleaseWatcher()` – asks /release.json (never cached) whether a newer release exists and tells the UI; it never reloads by itself.
 *  - `installStaleChunkRecovery()` – a chunk that no longer exists on the host triggers ONE reload per release (loop-guarded).
 *  - `refreshLegacyServiceWorkers()` – older installs may still have a service worker; ask each to update so it self-heals.
 */
export type ReleaseInfo = { releaseId?: string; commit?: string; generatedAt?: string };

const UNKNOWN = new Set(['', 'dev', 'unknown']);

export function getRunningReleaseId(): string {
  try { return typeof __KAYAD_RELEASE_ID__ === 'string' ? __KAYAD_RELEASE_ID__ : 'dev'; } catch { return 'dev'; }
}

export function isNewerRelease(running: string, remote?: string | null): boolean {
  if (!remote || UNKNOWN.has(running) || UNKNOWN.has(remote)) return false;
  return running !== remote;
}

export async function fetchRemoteRelease(fetchImpl: typeof fetch = fetch): Promise<ReleaseInfo | null> {
  try {
    const res = await fetchImpl(`/release.json?_=${Date.now()}`, { cache: 'no-store', headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('json')) return null; // an SPA fallback returns HTML: treat as "unknown", never as a new release
    return (await res.json()) as ReleaseInfo;
  } catch { return null; }
}

export function startReleaseWatcher(opts: {
  onNewRelease: (info: ReleaseInfo) => void;
  running?: string; fetchImpl?: typeof fetch; intervalMs?: number; doc?: Document; win?: Window;
}): () => void {
  const running = opts.running ?? getRunningReleaseId();
  const doc = opts.doc ?? document; const win = opts.win ?? window;
  let announced = false; let stopped = false;
  const check = async () => {
    if (announced || stopped || doc.visibilityState === 'hidden') return;
    const info = await fetchRemoteRelease(opts.fetchImpl);
    if (info && isNewerRelease(running, info.releaseId)) { announced = true; opts.onNewRelease(info); }
  };
  const onVisible = () => { if (doc.visibilityState === 'visible') void check(); };
  doc.addEventListener('visibilitychange', onVisible);
  win.addEventListener('focus', onVisible);
  const timer = win.setInterval(() => void check(), opts.intervalMs ?? 10 * 60 * 1000);
  void check();
  return () => { stopped = true; doc.removeEventListener('visibilitychange', onVisible); win.removeEventListener('focus', onVisible); win.clearInterval(timer); };
}

const RELOAD_KEY = 'kayad_chunk_reload';
export const STALE_CHUNK_EVENT = 'kayad:stale-chunk';

/**
 * A lazy chunk that no longer exists on the host (old HTML after a deploy) fails to load. Recovery = ONE reload per 60 s.
 * Never reload automatically once the user has typed into the page: unsaved listing/offer/payment input must not be lost.
 * In that case the page is left as is and STALE_CHUNK_EVENT lets the UI ask the user to refresh when ready.
 */
export function installStaleChunkRecovery(win: Window = window): () => void {
  let edited = false;
  const markEdited = () => { edited = true; };
  win.addEventListener('input', markEdited, true);
  const handler = (event: Event) => {
    if (edited) { win.dispatchEvent(new Event(STALE_CHUNK_EVENT)); return; }
    try {
      const last = Number(win.sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last < 60_000) return; // already tried a moment ago: show the normal error UI instead of looping
      win.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch { return; }
    event.preventDefault();
    win.location.reload();
  };
  win.addEventListener('vite:preloadError', handler);
  return () => { win.removeEventListener('vite:preloadError', handler); win.removeEventListener('input', markEdited, true); };
}

export async function refreshLegacyServiceWorkers(nav: Navigator = navigator): Promise<number> {
  try {
    if (!nav.serviceWorker?.getRegistrations) return 0;
    const regs = await nav.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.update().catch(() => undefined)));
    return regs.length;
  } catch { return 0; }
}
