import { describe, test, expect, vi, beforeEach } from 'vitest';

const post = vi.fn(async () => ({ data: { success: true } }));
vi.mock('../../api/httpClient', () => ({ api: { post: (...a: any[]) => post(...(a as [])) } }));

import * as t from '../../services/analyticsTracker';

const setNav = (o: Record<string, unknown>) => { for (const [k, v] of Object.entries(o)) Object.defineProperty(navigator, k, { value: v, configurable: true }); };
beforeEach(() => { post.mockClear(); localStorage.clear(); sessionStorage.clear(); setNav({ doNotTrack: null, globalPrivacyControl: false }); t.__resetTrackerForTests(); });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('analytics tracker', () => {
  test('a guest page view posts anonymous random ids only', async () => {
    t.trackPageView('/', '?nav=marketplace'); await flush();
    expect(post).toHaveBeenCalledTimes(1);
    const [url, body] = post.mock.calls[0] as any;
    expect(url).toBe('/analytics/collect');
    expect(body).toMatchObject({ type: 'page_view', path: '/?nav=marketplace' });
    expect(body.visitorId).toMatch(/^[0-9a-f-]{36}$/); expect(body.sessionId).toMatch(/^[0-9a-f-]{36}$/); expect(body.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(Object.keys(body).sort()).toEqual(['eventId', 'path', 'sessionId', 'type', 'visitorId']);
  });
  test('visitor id persists across pages; session id persists inside the idle window and rotates after 30 minutes', () => {
    const v = t.getVisitorId(); expect(t.getVisitorId()).toBe(v);
    const s = t.getSessionId(1_000); expect(t.getSessionId(1_000 + 60_000)).toBe(s);
    expect(t.getSessionId(1_000 + 60_000 + t.SESSION_IDLE_MS + 1)).not.toBe(s);
  });
  test('the same route is not re-sent; a new route is', async () => {
    t.trackPageView('/', ''); t.trackPageView('/', ''); t.trackPageView('/about', ''); await flush();
    expect(post).toHaveBeenCalledTimes(2);
  });
  test.each([['Do Not Track', { doNotTrack: '1' }], ['Global Privacy Control', { globalPrivacyControl: true }]])('%s sends nothing', async (_n, nav) => {
    setNav(nav); t.trackPageView('/', ''); await flush(); expect(post).not.toHaveBeenCalled();
  });
  test('local opt-out sends nothing and forgets the visitor id; opting back in works', async () => {
    t.getVisitorId(); t.setAnalyticsOptOut(true);
    t.trackPageView('/', ''); await flush(); expect(post).not.toHaveBeenCalled();
    expect(localStorage.getItem('kayad_vid')).toBeNull();
    t.setAnalyticsOptOut(false); t.trackPageView('/x', ''); await flush(); expect(post).toHaveBeenCalledTimes(1);
  });
  test('admin, api and token pages are never tracked', async () => {
    for (const p of ['/admin', '/admin/users', '/api/x', '/reset-password']) t.trackPageView(p, '?token=abc'); await flush();
    expect(post).not.toHaveBeenCalled();
  });
  test('query strings other than nav are never sent (no tokens/e-mail leaks); utm fields are forwarded separately', async () => {
    t.trackPageView('/', '?email=a@b.c&utm_source=news&utm_medium=email'); await flush();
    const body = (post.mock.calls[0] as any)[1];
    expect(body.path).toBe('/'); expect(JSON.stringify(body)).not.toContain('a@b.c'); expect(body.utm).toEqual({ source: 'news', medium: 'email' });
  });
  test('vehicle and auction pages are classified, with the public listing id only', () => {
    const id = '3f2b8c1e-1111-4222-8333-444455556666';
    expect(t.classifyRoute(`/car/${id}`)).toEqual({ type: 'listing_view', listingId: id });
    expect(t.classifyRoute(`/auctions/${id}`)).toEqual({ type: 'auction_view', listingId: id });
    expect(t.classifyRoute('/auctions')).toEqual({ type: 'auction_view' });
    expect(t.classifyRoute('/about')).toEqual({ type: 'page_view' });
  });
  test('registration and login heartbeat events', async () => {
    t.trackRegistration(); t.trackLoginHeartbeat('/'); await flush();
    expect(post.mock.calls.map((c: any) => c[1].type)).toEqual(['registration', 'heartbeat']);
    const [a, b] = post.mock.calls.map((c: any) => c[1]);
    expect(a.visitorId).toBe(b.visitorId); expect(a.sessionId).toBe(b.sessionId); // same browser, same session: no double counting
  });
  test('a failing analytics endpoint never throws into the page', async () => {
    post.mockRejectedValueOnce(new Error('down')); expect(() => t.trackPageView('/z', '')).not.toThrow(); await flush();
  });
  test('heartbeat only fires while the tab is visible', async () => {
    vi.useFakeTimers();
    const stop = t.startHeartbeat(() => '/');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    vi.advanceTimersByTime(t.HEARTBEAT_MS); expect(post).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.advanceTimersByTime(t.HEARTBEAT_MS); expect(post).toHaveBeenCalledTimes(1);
    stop(); vi.useRealTimers();
  });
});
