import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import useMediaQuery from '../../hooks/useMediaQuery';

describe('useMediaQuery', () => {
  afterEach(() => { cleanup(); });

  it('returns true for matching query', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(max-width: 768px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('returns false for non-matching query', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { result } = renderHook(() => useMediaQuery('(min-width: 2000px)'));
    expect(result.current).toBe(false);
  });

  it('listens for changes', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener,
      removeEventListener,
    }));
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    unmount();
    expect(removeEventListener).toHaveBeenCalled();
  });
});
