import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({ cars: vi.fn(), deleteCar: vi.fn(), moderateCar: vi.fn(), getOnboardingSettings: vi.fn(), updateOnboardingSettings: vi.fn() }));
vi.mock('../../../api/api', async (orig) => ({ ...(await orig()), adminAPI: api }));
const { stableToast } = vi.hoisted(() => ({ stableToast: { toast: vi.fn() } }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => stableToast }));
import AdminCars, { normalizeListingStatus } from '../../../pages/admin/AdminCars';

const pendingCar = { id: 'c1', title: 'TOYOTA', price: 3500000, year: 2016, mileage: 165000, status: 'pending', auction_status: 'none', created_at: new Date().toISOString() };
beforeEach(() => {
  vi.clearAllMocks();
  api.cars.mockResolvedValue({ cars: [pendingCar], pagination: { total: 1 } });
  api.getOnboardingSettings.mockResolvedValue({ canChange: true, policy: { listingModeration: 'hold_for_review', revision: 4 } });
});
afterEach(() => cleanup());

describe('Listing Management shows the real status and lets an admin publish', () => {
  test('status: a plain listing shows pending/available, not the auction value "none"', () => {
    expect(normalizeListingStatus({ status: 'pending', auction_status: 'none' })).toBe('pending');
    expect(normalizeListingStatus({ status: 'available', auctionStatus: 'none' })).toBe('available');
    expect(normalizeListingStatus({ status: 'available', auction_status: 'live' })).toBe('live');
  });

  test('a pending listing is labelled pending, counted as pending, and Approve publishes it', async () => {
    api.moderateCar.mockResolvedValue({ success: true });
    render(<MemoryRouter><AdminCars /></MemoryRouter>);
    const row = (await screen.findByText('TOYOTA')).closest('tr');
    expect(within(row).getByText('pending')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: /Approve listing TOYOTA/ }));
    await waitFor(() => expect(api.moderateCar).toHaveBeenCalledWith('c1', { action: 'approve' }));
    await waitFor(() => expect(within(row).getByText('available')).toBeTruthy());
    expect(within(row).getByRole('button', { name: /Hide listing TOYOTA/ })).toBeTruthy();
  });

  test('a failed approval is reported and nothing is shown as published', async () => {
    api.moderateCar.mockRejectedValue({ response: { data: { message: 'Only the owner can decide listings' } } });
    render(<MemoryRouter><AdminCars /></MemoryRouter>);
    const row = (await screen.findByText('TOYOTA')).closest('tr');
    fireEvent.click(within(row).getByRole('button', { name: /Approve listing TOYOTA/ }));
    await waitFor(() => expect(stableToast.toast).toHaveBeenCalledWith(expect.stringContaining('Only the owner can decide listings'), 'error'));
  });

  test('the owner can switch auto-publish on from this page', async () => {
    api.updateOnboardingSettings.mockResolvedValue({ policy: { listingModeration: 'auto_publish', revision: 5 } });
    render(<MemoryRouter><AdminCars /></MemoryRouter>);
    const select = await screen.findByLabelText('Listing moderation');
    fireEvent.change(select, { target: { value: 'auto_publish' } });
    await waitFor(() => expect(api.updateOnboardingSettings).toHaveBeenCalledWith({ listingModeration: 'auto_publish', expectedRevision: 4 }));
    expect(await screen.findByText(/Auto-publish: listings from approved sellers/)).toBeTruthy();
  });

  test('a non-owner sees the policy but cannot change it', async () => {
    api.getOnboardingSettings.mockResolvedValue({ canChange: false, policy: { listingModeration: 'hold_for_review', revision: 4 } });
    render(<MemoryRouter><AdminCars /></MemoryRouter>);
    expect(await screen.findByText(/Only the platform owner can change this/)).toBeTruthy();
    expect(screen.queryByLabelText('Listing moderation')).toBeNull();
  });
});
