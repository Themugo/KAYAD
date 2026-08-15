import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// App imports BrowserRouter internally, so we just render it once and
// confirm the provider stack + Suspense fallback render without crashing.
// Deep route/page tests live in their own files; this is a smoke test.

// Mock the api module so AppLayout's getConfig doesn't try to hit the network.
vi.mock('../api/api', async () => {
  const actual = await vi.importActual('../api/api');
  return {
    ...actual,
    adminAPI: { ...(actual.adminAPI || {}), getConfig: vi.fn().mockResolvedValue({ config: {} }) },
  };
});

// Mock socket.io so SocketProvider doesn't try to open a real connection.
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: () => {}, off: () => {}, emit: () => {}, close: () => {}, disconnect: () => {},
    connected: false,
  }),
}));

// Mock SWUpdateBanner to avoid PWA virtual module import issues
vi.mock('../components/SWUpdateBanner', () => ({
  default: () => null,
}));

// Mock BrandingContext to avoid async state updates after test teardown
vi.mock('../context/BrandingContext', () => ({
  BrandingProvider: ({ children }) => children,
  useBranding: () => ({ branding: {}, loading: false }),
}));

import App from '../App';
import { AuthProvider } from '../context/AuthContext';

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    // App now calls useAuth() internally (KAYAD Fusion Phase 3), so it
    // must be wrapped in AuthProvider here the same way main.tsx wraps
    // it for real - matches the actual app's provider tree rather than
    // testing App in isolation from a provider it now genuinely depends
    // on. AuthProvider's own session-restoration fetch() call is
    // expected to fail in this test environment (no backend reachable,
    // no fetch mock provided) - confirmed this is handled gracefully
    // (caught, logged via console.warn, user set to null) rather than
    // thrown further, so this remains a true smoke test, not one that
    // requires mocking the auth network call to pass.
    const { container } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    // App renders Suspense fallback while pages are loading. Either way,
    // the tree commits without throwing — that is the smoke-test contract.
    expect(container.firstChild).toBeTruthy();
  });

  it('Phase 7: attempts to load real vehicle data from GET /api/cars on mount', () => {
    // Confirms App.tsx's new hybrid data-loading effect genuinely calls
    // the real backend endpoint - not asserting on deep UI content
    // (fragile given this component's size), just that the real
    // network call this phase added is actually made, matching the
    // same verification standard used throughout this program's other
    // API client tests (assert on the real call, not just "doesn't
    // crash").
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false }),
    });
    global.fetch = fetchMock;

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const carsCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/api/cars'));
    expect(carsCall).toBeTruthy();
  });
});
