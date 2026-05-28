import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';

function TestComp({ options }) {
  const [ref, entry] = useIntersectionObserver(options);
  return (
    <div ref={ref} data-testid="sentinel">
      {entry ? `intersecting:${entry.isIntersecting}` : 'no-entry'}
    </div>
  );
}

describe('useIntersectionObserver', () => {
  let observe, disconnect;

  beforeEach(() => {
    observe = vi.fn();
    disconnect = vi.fn();
    global.IntersectionObserver = vi.fn((cb) => ({
      observe, disconnect, unobserve: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a ref and entry', () => {
    render(<TestComp />);
    expect(screen.getByTestId('sentinel')).toBeDefined();
    expect(screen.getByText('no-entry')).toBeDefined();
  });

  it('creates IntersectionObserver with default options', () => {
    render(<TestComp />);
    expect(global.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { threshold: 0, rootMargin: '200px' }
    );
  });

  it('creates IntersectionObserver with custom options', () => {
    render(<TestComp options={{ threshold: 0.5, rootMargin: '100px' }} />);
    expect(global.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { threshold: 0.5, rootMargin: '100px' }
    );
  });

  it('calls disconnect when once=true and intersecting', () => {
    render(<TestComp options={{ once: true }} />);
    const cb = global.IntersectionObserver.mock.calls[0][0];
    act(() => { cb([{ isIntersecting: true }]); });
    expect(disconnect).toHaveBeenCalled();
  });

  it('updates entry on intersection', () => {
    render(<TestComp />);
    const cb = global.IntersectionObserver.mock.calls[0][0];
    const entry = { isIntersecting: true, boundingClientRect: {} };
    act(() => { cb([entry]); });
    expect(screen.getByText('intersecting:true')).toBeDefined();
  });
});
