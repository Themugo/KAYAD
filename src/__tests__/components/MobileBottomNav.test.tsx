import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileBottomNav from '../../components/MobileBottomNav';

describe('MobileBottomNav (canonical KAYAD dock)', () => {
  it('exposes exactly Home, Showroom, Auction, Services, Saved in order', () => {
    render(<MobileBottomNav activeNav="marketplace" onNavigate={vi.fn()} />);
    const labels = screen.getAllByRole('button').map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Home', 'Showroom', 'Auction', 'Services', 'Saved']);
  });

  it('routes Auction and Services to the canonical existing surfaces', () => {
    const onNavigate = vi.fn();
    render(<MobileBottomNav activeNav="marketplace" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Auction/i }));
    fireEvent.click(screen.getByRole('button', { name: /Services/i }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, 'discovery');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'inspections');
  });

  it('marks only the active tab as current', () => {
    render(<MobileBottomNav activeNav="inspections" onNavigate={vi.fn()} />);
    const current = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('Services');
  });

  it('routes Saved to the existing authenticated saved-vehicles surface', () => {
    const onNavigate = vi.fn();
    render(<MobileBottomNav activeNav="marketplace" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Saved/i }));
    expect(onNavigate).toHaveBeenCalledWith('saved');
  });
});


describe('MobileBottomNav Showroom flow', () => {
  it('keeps Showroom on the canonical marketplace destination and scrolls to results', () => {
    const onNavigate = vi.fn();
    const scrollIntoView = vi.fn();
    const originalRaf = window.requestAnimationFrame;
    const originalGetElementById = document.getElementById;
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => { callback(0); return 1; }) as typeof window.requestAnimationFrame;
    document.getElementById = ((id: string) => id === 'market-results' ? ({ scrollIntoView } as unknown as HTMLElement) : null) as typeof document.getElementById;
    render(<MobileBottomNav activeNav="marketplace" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Showroom/i }));
    expect(onNavigate).toHaveBeenCalledWith('marketplace');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    window.requestAnimationFrame = originalRaf;
    document.getElementById = originalGetElementById;
  });
});
