import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, renderHook, act, cleanup } from '@testing-library/react';
import { useCountdown } from '../../hooks/useCountdown';
import { CountdownDisplay } from '../../components/features/auction/CountdownDisplay';

describe('useCountdown', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); cleanup(); });

  it('returns expired=true with no endTime', () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current.expired).toBe(true);
    expect(result.current.h).toBe(0);
  });

  it('returns expired=false for future time', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.expired).toBe(false);
    expect(result.current.h).toBeGreaterThan(0);
  });

  it('returns expired=true for past time', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const { result } = renderHook(() => useCountdown(past));
    expect(result.current.expired).toBe(true);
  });

  it('counts down every second', () => {
    const future = new Date(Date.now() + 5000).toISOString();
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.s).toBe(5);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.s).toBe(4);
  });
});

describe('CountdownDisplay', () => {
  afterEach(() => { cleanup(); });

  it('renders Auction Ended when expired', () => {
    const { container } = render(<CountdownDisplay endTime={new Date(Date.now() - 1000).toISOString()} />);
    expect(container.textContent).toContain('Auction Ended');
  });

  it('renders countdown when future', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    const { container } = render(<CountdownDisplay endTime={future} />);
    // New timer renders Hrs/Min/Sec labels with tabular digit blocks
    expect(container.textContent).toMatch(/Hrs/i);
    expect(container.textContent).toMatch(/Sec/i);
  });
});
