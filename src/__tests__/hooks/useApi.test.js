import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import {
  useApi, useDebounce, usePagination, useLocalStorage, useWindowSize,
} from '../../hooks/useApi';

describe('useApi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('starts loading when immediate=true', async () => {
    const fn = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useApi(fn, [], { immediate: true }));
    expect(result.current.loading).toBe(true);
  });

  it('starts not loading when immediate=false', () => {
    const fn = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useApi(fn, [], { immediate: false }));
    expect(result.current.loading).toBe(false);
  });

  it('fetches data and returns it', async () => {
    const fn = vi.fn().mockResolvedValue('hello');
    const { result } = renderHook(() => useApi(fn, [], { immediate: true }));
    await vi.waitFor(() => {
      expect(result.current.data).toBe('hello');
    });
    expect(result.current.loading).toBe(false);
  });

  it('sets error on reject', async () => {
    const err = new Error('fail');
    const fn = vi.fn().mockRejectedValue(err);
    const { result } = renderHook(() => useApi(fn, [], { immediate: true }));
    await vi.waitFor(() => {
      expect(result.current.error).toBe(err);
    });
  });

  it('refetch works', async () => {
    const fn = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useApi(fn, [], { immediate: true }));
    await vi.waitFor(() => expect(result.current.data).toBe('data'));
    fn.mockResolvedValue('updated');
    await act(async () => { await result.current.refetch(); });
    expect(result.current.data).toBe('updated');
  });
});

describe('useDebounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); cleanup(); });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('updates after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );
    rerender({ value: 'world', delay: 500 });
    expect(result.current).toBe('hello');
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe('world');
  });
});

describe('useLocalStorage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('uses initial value', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('reads stored value', () => {
    localStorage.setItem('test', '"stored"');
    const { result } = renderHook(() => useLocalStorage('test', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('updates and persists', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'default'));
    act(() => { result.current[1]('new'); });
    expect(result.current[0]).toBe('new');
    expect(JSON.parse(localStorage.getItem('test'))).toBe('new');
  });
});

describe('useWindowSize', () => {
  afterEach(() => { cleanup(); });

  it('returns current window size', () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).toHaveProperty('w');
    expect(result.current).toHaveProperty('h');
  });

  it('updates on resize', () => {
    const { result } = renderHook(() => useWindowSize());
    act(() => { window.innerWidth = 800; window.dispatchEvent(new Event('resize')); });
    expect(result.current.w).toBe(800);
  });
});
