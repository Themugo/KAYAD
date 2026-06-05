import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import { ToastProvider, useToast } from '../../context/ToastContext';

function TestComponent() {
  const { toast } = useToast();
  return (
    <div>
      <button data-testid="toast-success" onClick={() => toast('Success!', 'success')}>Success</button>
      <button data-testid="toast-error" onClick={() => toast('Error!', 'error')}>Error</button>
      <button data-testid="toast-info" onClick={() => toast('Info!', 'info')}>Info</button>
      <button data-testid="toast-warn" onClick={() => toast('Warning!', 'warning')}>Warn</button>
      <button data-testid="toast-custom" onClick={() => toast('Custom', 'info', 100)}>Custom Duration</button>
    </div>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); cleanup(); });

  it('shows a toast on trigger', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    act(() => screen.getByTestId('toast-success').click());
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('shows correct icon per type', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    act(() => screen.getByTestId('toast-success').click());
    expect(screen.getByText('✅')).toBeInTheDocument();
    act(() => screen.getByTestId('toast-error').click());
    expect(screen.getByText('❌')).toBeInTheDocument();
    act(() => screen.getByTestId('toast-info').click());
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
    act(() => screen.getByTestId('toast-warn').click());
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('auto-dismisses after duration', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    act(() => screen.getByTestId('toast-custom').click());
    expect(screen.getByText('Custom')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(101); });
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
  });

  it('shows multiple toasts', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    act(() => screen.getByTestId('toast-success').click());
    act(() => screen.getByTestId('toast-error').click());
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });
});
