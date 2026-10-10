import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const svc = vi.hoisted(() => ({ fetchList: vi.fn() }));
vi.mock('../../services/auctionService', () => ({ fetchList: svc.fetchList }));
vi.mock('../../services/favoriteApi', () => ({ getFavorites: vi.fn().mockResolvedValue({ favorites: [] }), toggleFavorite: vi.fn(), FavoriteApiError: class extends Error {} }));
import AuctionsView from '../../features/AuctionsView';

const live = { id: 'a1', carId: 'a1', status: 'active', startingBid: 100, highestBid: 150, startTime: null, endTime: new Date(Date.now() + 3600_000).toISOString(), bidIncrement: 10, bidCount: 2, allowBid: true, allowBuy: false, car: { title: 'Toyota Prado', brand: 'Toyota', model: 'Prado' } };
const ended = { ...live, id: 'a2', carId: 'a2', status: 'ended', endTime: new Date(Date.now() - 3600_000).toISOString(), car: { title: 'Nissan X-Trail' } };
const boom = () => Object.assign(new Error('Internal server error'), { status: 500 });
const renderView = () => render(<MemoryRouter><AuctionsView user={null} /></MemoryRouter>);

beforeEach(() => { vi.clearAllMocks(); window.history.replaceState({}, '', '/'); });

describe('AuctionsView load failure handling', () => {
  it('one failing list (scheduled) does not blank live/completed and is not shown as zero', async () => {
    svc.fetchList.mockImplementation(async ({ status }: { status: string }) => {
      if (status === 'draft') throw boom();
      return { auctions: status === 'live' ? [live] : [ended] };
    });
    renderView();
    await screen.findByText(/Starting soon: Internal server error/);
    expect(screen.getAllByText('Toyota Prado').length).toBeGreaterThan(0);          // live data still shown
    const scheduledTab = screen.getByRole('tab', { name: /Starting soon/ });
    expect(scheduledTab.textContent).toContain('—');                                 // unavailable, not 0
    expect(scheduledTab.textContent).not.toMatch(/\b0\b/);
    fireEvent.click(scheduledTab);
    expect(screen.queryByText('No auctions are scheduled yet.')).toBeNull();          // no false "empty" claim
    expect(screen.getByText(/Other sections remain available — use Refresh to try again/)).toBeTruthy();
    expect(screen.getByText('Starting-soon auctions are temporarily unavailable')).toBeTruthy();
    expect(screen.getByText(/Starting soon list could not be loaded, but the other auction sections responded/)).toBeTruthy();
  });

  it('when everything fails the error is shown and nothing claims the floor is empty', async () => {
    svc.fetchList.mockRejectedValue(boom());
    renderView();
    await screen.findByText(/Internal server error/);
    expect(screen.queryByText(/The auction floor is quiet right now/)).toBeNull();
    expect(screen.queryByText('Nothing live this moment.')).toBeNull();
    expect(screen.getByText(/Live auctions are temporarily unavailable/)).toBeTruthy();
  });

  it('reports the error beside each failed section instead of attributing one error to every section', async () => {
    svc.fetchList.mockImplementation(async ({ status }: { status: string }) => {
      if (status === 'draft') throw Object.assign(new Error('setup table unavailable'), { status: 503 });
      if (status === 'ended') throw Object.assign(new Error('database timeout'), { status: 504 });
      return { auctions: [live] };
    });
    renderView();
    await screen.findByText(/Starting soon: setup table unavailable/);
    expect(screen.getByText(/Completed: database timeout/)).toBeTruthy();
    expect(screen.getAllByText('Toyota Prado').length).toBeGreaterThan(0);
  });

  it('a genuinely empty, healthy backend still says the floor is quiet', async () => {
    svc.fetchList.mockResolvedValue({ auctions: [] });
    renderView();
    await waitFor(() => expect(screen.getAllByText(/auction floor is quiet right now/i).length).toBeGreaterThan(0));
    expect(screen.queryByText(/could not be loaded/)).toBeNull();
  });
});
