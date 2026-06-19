import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, renderHook, act, cleanup, screen } from '@testing-library/react';
import { CompareProvider, useCompare } from '../../context/CompareContext';

function TestComponent() {
  const ctx = useCompare();
  return (
    <div>
      <span data-testid="count">{ctx.compareCount}</span>
      <span data-testid="ids">{JSON.stringify(ctx.compareIds)}</span>
      <button data-testid="add" onClick={() => ctx.addCar('car1')}>Add</button>
      <button data-testid="remove" onClick={() => ctx.removeCar('car1')}>Remove</button>
      <button data-testid="toggle" onClick={() => ctx.toggleCar('car2')}>Toggle</button>
      <button data-testid="clear" onClick={ctx.clearAll}>Clear</button>
      <span data-testid="comparing">{String(ctx.isComparing('car1'))}</span>
    </div>
  );
}

describe('CompareProvider', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { cleanup(); });

  it('starts with empty compare list', () => {
    render(<CompareProvider><TestComponent /></CompareProvider>);
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('adds a car', () => {
    render(<CompareProvider><TestComponent /></CompareProvider>);
    act(() => screen.getByTestId('add').click());
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('comparing').textContent).toBe('true');
  });

  it('does not add duplicate car', () => {
    render(<CompareProvider><TestComponent /></CompareProvider>);
    act(() => screen.getByTestId('add').click());
    act(() => screen.getByTestId('add').click());
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('removes a car', () => {
    render(<CompareProvider><TestComponent /></CompareProvider>);
    act(() => screen.getByTestId('add').click());
    act(() => screen.getByTestId('remove').click());
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('toggles a car', () => {
    render(<CompareProvider><TestComponent /></CompareProvider>);
    act(() => screen.getByTestId('toggle').click());
    expect(screen.getByTestId('count').textContent).toBe('1');
    act(() => screen.getByTestId('toggle').click());
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('clears all', () => {
    render(<CompareProvider><TestComponent /></CompareProvider>);
    act(() => screen.getByTestId('add').click());
    act(() => screen.getByTestId('toggle').click());
    expect(screen.getByTestId('count').textContent).toBe('2');
    act(() => screen.getByTestId('clear').click());
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('persists to localStorage', () => {
    render(<CompareProvider><TestComponent /></CompareProvider>);
    act(() => screen.getByTestId('add').click());
    const stored = JSON.parse(localStorage.getItem('kayad_compare_ids'));
    expect(stored).toEqual(['car1']);
  });

  it('restores from localStorage', () => {
    localStorage.setItem('kayad_compare_ids', JSON.stringify(['car1', 'car2']));
    render(<CompareProvider><TestComponent /></CompareProvider>);
    expect(screen.getByTestId('count').textContent).toBe('2');
  });
});

describe('useCompare', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { cleanup(); });

  it('throws error outside provider', () => {
    const { result } = renderHook(() => useCompare());
    expect(result.error).toBeDefined();
    expect(result.error.message).toBe('useCompare must be used within CompareProvider');
  });

  it('returns context within provider', () => {
    const { result } = renderHook(() => useCompare(), { wrapper: CompareProvider });
    expect(result.current.compareCount).toBe(0);
    expect(result.current.maxCompare).toBe(4);
  });
});
