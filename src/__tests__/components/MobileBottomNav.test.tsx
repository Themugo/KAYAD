import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileBottomNav from '../../components/MobileBottomNav';

describe('MobileBottomNav (approved KAYAD buyer dock)', () => {
  it('exposes exactly Home, Search, Sell, Messages, Account in order', () => {
    render(<MobileBottomNav activeNav="marketplace" onNavigate={vi.fn()} />);
    const labels = screen.getAllByRole('button').map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Home', 'Search', 'Sell', 'Messages', 'Account']);
  });

  it('routes Search to the existing marketplace results surface', () => {
    const onNavigate = vi.fn();
    const scrollIntoView = vi.fn();
    const originalRaf = window.requestAnimationFrame;
    const originalGetElementById = document.getElementById;
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => { callback(0); return 1; }) as typeof window.requestAnimationFrame;
    document.getElementById = ((id: string) => id === 'market-results' ? ({ scrollIntoView } as unknown as HTMLElement) : null) as typeof document.getElementById;
    render(<MobileBottomNav activeNav="marketplace" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    expect(onNavigate).toHaveBeenCalledWith('marketplace');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    window.requestAnimationFrame = originalRaf;
    document.getElementById = originalGetElementById;
  });

  it('routes Sell, Messages and Account to the existing platform destinations', () => {
    const onNavigate = vi.fn();
    render(<MobileBottomNav activeNav="marketplace" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /^Sell$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Messages/i }));
    fireEvent.click(screen.getByRole('button', { name: /Account/i }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, 'dashboard:create-listing');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'chat');
    expect(onNavigate).toHaveBeenNthCalledWith(3, 'dashboard:account');
  });

  it('marks only the active tab as current', () => {
    render(<MobileBottomNav activeNav="chat" onNavigate={vi.fn()} />);
    const current = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('Messages');
  });
});

describe('MobileBottomNav for business accounts', () => {
  it('does not replace the independent dealer workspace navigation with the personal dock', () => {
    const { container } = render(<MobileBottomNav activeNav="dealer-dashboard" onNavigate={vi.fn()} authUser={{ id: 'd1', role: 'dealer' }} />);
    expect(container.querySelector('nav[aria-label="Personal account navigation"]')).toBeNull();
  });
});
