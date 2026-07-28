import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn().mockRejectedValue({ code: 'ECONNABORTED' }),
    post: vi.fn().mockRejectedValue({ code: 'ECONNABORTED' }),
    put: vi.fn().mockRejectedValue({ code: 'ECONNABORTED' }),
    delete: vi.fn().mockRejectedValue({ code: 'ECONNABORTED' }),
    patch: vi.fn().mockRejectedValue({ code: 'ECONNABORTED' }),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: { headers: {} },
  };
  return { default: mockAxios };
});

describe('api module', () => {
  let api;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    // Set environment variable to enable demo mode for testing
    vi.stubEnv('VITE_ENABLE_DEMO', 'true');
    api = await import('../../api/api');
    // Wait for startup check to settle
    await vi.dynamicImportSettled?.();
  });

  it('formatKES formats numbers as KES currency', () => {
    expect(api.formatKES(1000)).toBe('KES 1,000');
    expect(api.formatKES(0)).toBe('KES 0');
    expect(api.formatKES(2500000)).toBe('KES 2,500,000');
    expect(api.formatKES(null)).toBe('KES 0');
    expect(api.formatKES(undefined)).toBe('KES 0');
  });

  it('formatKES handles string numbers', () => {
    expect(api.formatKES('1500')).toBe('KES 1,500');
  });

  it('isDemoMode returns false by default', () => {
    expect(api.isDemoMode()).toBe(false);
  });

  it('enableDemoMode sets demo mode', () => {
    api.enableDemoMode();
    expect(api.isDemoMode()).toBe(true);
    // Reset for other tests by re-importing
    vi.resetModules();
  });
});
