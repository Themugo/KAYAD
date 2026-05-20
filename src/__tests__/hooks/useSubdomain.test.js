import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useSubdomain } from '../../hooks/useSubdomain';

describe('useSubdomain', () => {
  afterEach(() => { cleanup(); });

  it('returns null for localhost', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      configurable: true,
    });
    const { result } = renderHook(() => useSubdomain());
    expect(result.current).toBeNull();
  });

  it('returns null for www domain', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'www.kayad.space' },
      configurable: true,
    });
    const { result } = renderHook(() => useSubdomain());
    expect(result.current).toBeNull();
  });

  it('extracts subdomain', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'dealername.kayad.space' },
      configurable: true,
    });
    const { result } = renderHook(() => useSubdomain());
    expect(result.current).toBe('dealername');
  });

  it('returns null for plain domain', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'kayad.space' },
      configurable: true,
    });
    const { result } = renderHook(() => useSubdomain());
    expect(result.current).toBeNull();
  });
});
