import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { isNewerRelease, fetchRemoteRelease, startReleaseWatcher, installStaleChunkRecovery, refreshLegacyServiceWorkers } from '../../utils/releaseWatcher';
import ReleaseUpdateBanner from '../../components/ReleaseUpdateBanner';

const json = (body: unknown, type = 'application/json') => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': type } });
afterEach(() => { cleanup(); vi.restoreAllMocks(); try { sessionStorage.clear(); } catch { /* ignore */ } });

describe('release comparison', () => {
  it('only a different, known id counts as newer', () => {
    expect(isNewerRelease('a-1', 'b-2')).toBe(true);
    expect(isNewerRelease('a-1', 'a-1')).toBe(false);
    expect(isNewerRelease('dev', 'b-2')).toBe(false);
    expect(isNewerRelease('a-1', undefined)).toBe(false);
    expect(isNewerRelease('a-1', 'unknown')).toBe(false);
  });
  it('an HTML SPA fallback or an error is never treated as a release', async () => {
    expect(await fetchRemoteRelease(vi.fn().mockResolvedValue(new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } })))).toBeNull();
    expect(await fetchRemoteRelease(vi.fn().mockResolvedValue(new Response('x', { status: 500 })))).toBeNull();
    expect(await fetchRemoteRelease(vi.fn().mockRejectedValue(new Error('offline')))).toBeNull();
  });
  it('requests release.json with no-store', async () => {
    const f = vi.fn().mockResolvedValue(json({ releaseId: 'x' }));
    await fetchRemoteRelease(f);
    expect(f.mock.calls[0][0]).toMatch(/^\/release\.json\?_=/);
    expect(f.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });
});

describe('startReleaseWatcher', () => {
  it('announces a newer release once and does not reload', async () => {
    const onNew = vi.fn();
    const reload = vi.fn(); const win = Object.assign(window, {}) as Window; void reload;
    const stop = startReleaseWatcher({ running: 'a-1', fetchImpl: vi.fn().mockResolvedValue(json({ releaseId: 'b-2' })), onNewRelease: onNew, intervalMs: 5, win });
    await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 30));
    expect(onNew).toHaveBeenCalledTimes(1);
    stop();
  });
  it('stays silent when the release matches', async () => {
    const onNew = vi.fn();
    const stop = startReleaseWatcher({ running: 'a-1', fetchImpl: vi.fn().mockResolvedValue(json({ releaseId: 'a-1' })), onNewRelease: onNew, intervalMs: 5 });
    await new Promise((r) => setTimeout(r, 30));
    expect(onNew).not.toHaveBeenCalled();
    stop();
  });
});

describe('stale chunk recovery', () => {
  it('reloads once, then stops (no loop)', () => {
    const reload = vi.fn();
    const win = { sessionStorage, location: { reload }, dispatchEvent: vi.fn(), addEventListener: (type: string, h: (e: Event) => void) => { if (type === 'vite:preloadError') (win as any).h = h; else (win as any).edit = h; }, removeEventListener: vi.fn() } as unknown as Window;
    installStaleChunkRecovery(win);
    const ev = () => ({ preventDefault: vi.fn() }) as unknown as Event;
    (win as any).h(ev()); (win as any).h(ev()); (win as any).h(ev());
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('stale chunk recovery never discards user input', () => {
  it('does not reload after the user has typed; asks the UI to prompt instead', () => {
    const reload = vi.fn(); const dispatchEvent = vi.fn();
    const win = { sessionStorage, location: { reload }, dispatchEvent, addEventListener: (type: string, h: (e: Event) => void) => { if (type === 'vite:preloadError') (win as any).h = h; else (win as any).edit = h; }, removeEventListener: vi.fn() } as unknown as Window;
    installStaleChunkRecovery(win);
    (win as any).edit(new Event('input'));
    const ev = { preventDefault: vi.fn() } as unknown as Event;
    (win as any).h(ev);
    expect(reload).not.toHaveBeenCalled();
    expect(ev.preventDefault).not.toHaveBeenCalled();
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });
});

describe('legacy service workers', () => {
  it('asks every registration to update', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const nav = { serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([{ update }, { update }]) } } as unknown as Navigator;
    expect(await refreshLegacyServiceWorkers(nav)).toBe(2);
    expect(update).toHaveBeenCalledTimes(2);
  });
  it('is a no-op without service-worker support', async () => {
    expect(await refreshLegacyServiceWorkers({} as Navigator)).toBe(0);
  });
});

describe('ReleaseUpdateBanner', () => {
  it('renders nothing while the running release is current/unknown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ releaseId: 'b-2' })));
    render(<ReleaseUpdateBanner />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('release-update-banner')).toBeNull(); // running id is "dev" under test
    vi.unstubAllGlobals();
  });
});
