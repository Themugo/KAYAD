import { beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  getAllAdSlots: vi.fn(),
  getAdStats: vi.fn(),
  createAdSlot: vi.fn(),
  updateAdSlot: vi.fn(),
  deleteAdSlot: vi.fn(),
}));

vi.mock('../../../services/adApi', () => ({
  getAllAdSlots: (...args) => h.getAllAdSlots(...args),
  getAdStats: (...args) => h.getAdStats(...args),
  createAdSlot: (...args) => h.createAdSlot(...args),
  updateAdSlot: (...args) => h.updateAdSlot(...args),
  deleteAdSlot: (...args) => h.deleteAdSlot(...args),
  AdApiError: class AdApiError extends Error {},
}));

import AdManager from '../../../pages/admin/AdManager';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  h.getAllAdSlots.mockResolvedValue([]);
  h.getAdStats.mockResolvedValue([]);
  h.createAdSlot.mockImplementation(async (input) => ({ id: 'new-ad', ...input }));
  h.updateAdSlot.mockImplementation(async (id, input) => ({ id, placement: 'top_ticker', title: 'Updated', backgroundColor: '#176B87', textColor: '#FFFFFF', opacity: 100, displayMode: 'scroll', scrollDurationSeconds: 28, fadeDurationMs: 4500, isVisible: true, sortOrder: 0, ...input }));
  h.deleteAdSlot.mockResolvedValue(undefined);
});

describe('Ad Manager end-to-end control surface', () => {
  test('uses the canonical persisted ad-slot service and renders a real empty state only after a successful response', async () => {
    render(<AdManager />);
    expect(await screen.findByText('No ad slots configured')).toBeTruthy();
    expect(h.getAllAdSlots).toHaveBeenCalledTimes(1);
    expect(h.getAdStats).toHaveBeenCalled();
  });

  test('shows API failure instead of a misleading empty state and supports retry', async () => {
    h.getAllAdSlots.mockRejectedValueOnce(new Error('scheduled maintenance'));
    render(<AdManager />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/scheduled maintenance/i);
    expect(screen.queryByText('No ad slots configured')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('No ad slots configured')).toBeTruthy();
  });

  test('creates a campaign with persisted placement and display settings', async () => {
    render(<AdManager />);
    await screen.findByText('No ad slots configured');
    fireEvent.click(screen.getByRole('button', { name: /new campaign/i }));
    fireEvent.change(screen.getByLabelText('New campaign title'), { target: { value: 'Homepage launch notice' } });
    fireEvent.change(screen.getByLabelText('New campaign placement'), { target: { value: 'top_ticker' } });
    fireEvent.change(screen.getByLabelText('New destination URL'), { target: { value: 'https://example.com/campaign' } });
    fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));
    await waitFor(() => expect(h.createAdSlot).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Homepage launch notice',
      placement: 'top_ticker',
      buttonUrl: 'https://example.com/campaign',
    })));
  });

  test('does not hide existing slot controls when only metrics fail', async () => {
    h.getAllAdSlots.mockResolvedValue([{ id: 'ad-1', placement: 'top_ticker', title: 'Real campaign', isVisible: true, status: 'active', backgroundColor: '#176B87', textColor: '#FFFFFF', opacity: 100, displayMode: 'scroll', scrollDurationSeconds: 28, fadeDurationMs: 4500, sortOrder: 0 }]);
    h.getAdStats.mockRejectedValueOnce(new Error('stats service down'));
    render(<AdManager />);
    expect(await screen.findByDisplayValue('Real campaign')).toBeTruthy();
    expect(await screen.findByRole('status')).toHaveTextContent(/statistics are unavailable/i);
    expect(screen.getByRole('button', { name: /save configuration/i })).toBeTruthy();
  });
});
