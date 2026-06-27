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

describe('App', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    const { container } = render(<App />);
    // App renders Suspense fallback while pages are loading. Either way,
    // the tree commits without throwing — that is the smoke-test contract.
    expect(container.firstChild).toBeTruthy();
  });
});
