import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileBottomNav, { OPEN_MOBILE_MENU_EVENT } from '../../components/MobileBottomNav';

describe('MobileBottomNav (canonical KAYAD dock)', () => {
  it('exposes exactly Home, Search, Auction, Inspection, Menu in order', () => {
    render(<MobileBottomNav activeNav="marketplace" onNavigate={vi.fn()} />);
    const labels = screen.getAllByRole('button').map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Home', 'Search', 'Auction', 'Inspection', 'Menu']);
  });

  it('routes Auction and Inspection to the canonical existing surfaces', () => {
    const onNavigate = vi.fn();
    render(<MobileBottomNav activeNav="marketplace" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Auction/i }));
    fireEvent.click(screen.getByRole('button', { name: /Inspection/i }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, 'discovery');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'inspections');
  });

  it('marks only the active tab as current', () => {
    render(<MobileBottomNav activeNav="inspections" onNavigate={vi.fn()} />);
    const current = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('Inspection');
  });

  it('Menu opens the existing navigation drawer through the shared event', () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_MOBILE_MENU_EVENT, listener);
    render(<MobileBottomNav activeNav="marketplace" onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Menu/i }));
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_MOBILE_MENU_EVENT, listener);
  });
});
