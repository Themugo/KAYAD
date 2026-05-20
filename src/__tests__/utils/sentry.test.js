import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Sentry utilities', () => {
  let sentry;

  beforeEach(async () => {
    vi.resetModules();
    delete import.meta.env.VITE_SENTRY_DSN;
    sentry = await import('../../utils/sentry');
  });

  it('does not initialize without DSN', async () => {
    expect(sentry.isSentryInitialized()).toBe(false);
  });

  it('handles import gracefully even with DSN', async () => {
    import.meta.env.VITE_SENTRY_DSN = 'https://key@sentry.io/123';
    await sentry.initSentry();
  });

  it('withSentryBoundary returns the component when not initialized', () => {
    const Comp = () => null;
    expect(sentry.withSentryBoundary(Comp)).toBe(Comp);
  });

  it('reportError logs to console when not initialized', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sentry.reportError(new Error('test'), { context: 'test' });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('setSentryUser and clearSentryUser do nothing when not initialized', () => {
    expect(() => sentry.setSentryUser({ id: '1', email: 'a@b.com' })).not.toThrow();
    expect(() => sentry.clearSentryUser()).not.toThrow();
  });

  it('isSentryInitialized returns false by default', () => {
    expect(sentry.isSentryInitialized()).toBe(false);
  });
});
